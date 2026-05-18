// Outbound prospecting loader.
//
// Pipeline:
//   1. discover         · Google Places searchText for an industry + city,
//                         returns normalized candidates (no DB write).
//   2. dedupe-preview   · checks each candidate against existing leads by
//                         place_id (canonical) and lower(business_name)+city
//                         (fuzzy fallback), returns annotated list.
//   3. load             · INSERT OR IGNORE into leads with source='outbound',
//                         lead_stage='new'. Writes a system activity row per
//                         insert. Computes a first-pass fit score via
//                         computeFitScore() from enrich.js.
//   4. status           · daily Places usage + outbound counts per (industry, city).
//   5. sweep            · convenience wrapper that runs 1 -> 2 -> 3 in one shot.
//
// Mounted by src/index.js at /api/admin/prospecting/*.
// Requires:
//   env.GOOGLE_PLACES_API_KEY (worker secret · same key the enricher uses)
//   env.TOKENS                (KV · daily cap counter, key prospecting:places:YYYY-MM-DD)
//   env.DB                    (D1)

import { computeFitScore, enrichWithPlaces, normalizePhone } from "./enrich.js";

const DAILY_PLACES_CAP = 500;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 60;

// Industry seed queries · pick one distinctive Spanish phrase per industry.
// Lower-case dashed slugs in code; display form is up to the UI.
const INDUSTRY_SEEDS = {
  "dental": "clínica dental",
  "legal": "abogado",
  "hoteles-boutique": "hotel boutique",
  "turismo": "agencia de viajes",
};

// City slug -> display form (proper accents) used in the Places textQuery.
const CITY_DISPLAY = {
  "medellin": "Medellín",
  "bogota": "Bogotá",
  "barranquilla": "Barranquilla",
};

// TODO: re-map to /sitio-web-<industry>-<city>/ if those landings come back.
const LANDING_PAGE_FALLBACK = "https://pymewebpro.com/sitios-web/";

function landingPageFor(/* industry, city */) {
  return LANDING_PAGE_FALLBACK;
}

export async function handleProspecting(request, env, ctx, helpers) {
  const { json, isAdmin } = helpers;
  if (!isAdmin(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);

  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    if (path === "/api/admin/prospecting/status" && method === "GET") {
      return await getStatus(env, json);
    }
    if (path === "/api/admin/prospecting/discover" && method === "POST") {
      return await discover(request, env, json);
    }
    if (path === "/api/admin/prospecting/dedupe-preview" && method === "POST") {
      return await dedupePreview(request, env, json);
    }
    if (path === "/api/admin/prospecting/load" && method === "POST") {
      return await load(request, env, json, helpers);
    }
    if (path === "/api/admin/prospecting/sweep" && method === "POST") {
      return await sweep(request, env, json, helpers);
    }
    return json({ ok: false, error: "Not found" }, 404);
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e) }, 500);
  }
}

// ---- Status --------------------------------------------------------------

async function getStatus(env, json) {
  const today = new Date().toISOString().slice(0, 10);
  const used = parseInt((await env.TOKENS.get("prospecting:places:" + today)) || "0", 10);

  const total = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM leads WHERE source = 'outbound'"
  ).first();

  const breakdown = await env.DB.prepare(
    "SELECT category AS industry, city, COUNT(*) AS count, " +
    "       AVG(score) AS avg_score, " +
    "       SUM(CASE WHEN UPPER(heat) = 'HOT' THEN 1 ELSE 0 END) AS hot_count " +
    "  FROM leads " +
    " WHERE source = 'outbound' " +
    " GROUP BY category, city " +
    " ORDER BY count DESC"
  ).all();

  return json({
    ok: true,
    today,
    places_used_today: used,
    places_remaining_today: Math.max(0, DAILY_PLACES_CAP - used),
    daily_cap: DAILY_PLACES_CAP,
    total_outbound_leads: (total && total.n) || 0,
    outbound_by_industry_city: (breakdown.results || []).map((r) => ({
      industry: r.industry,
      city: r.city,
      count: r.count,
      avg_score: r.avg_score != null ? Math.round(r.avg_score * 10) / 10 : null,
      hot_count: r.hot_count || 0,
    })),
  });
}

// ---- Discover ------------------------------------------------------------

async function discover(request, env, json) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

  const parsed = parseIndustryCityLimit(body);
  if (parsed.error) return json({ ok: false, error: parsed.error }, 400);

  if (!env.GOOGLE_PLACES_API_KEY) {
    return json({ ok: false, error: "GOOGLE_PLACES_API_KEY not set on worker" }, 500);
  }

  // Daily cap check before we burn any quota.
  const today = new Date().toISOString().slice(0, 10);
  const used = parseInt((await env.TOKENS.get("prospecting:places:" + today)) || "0", 10);
  if (used >= DAILY_PLACES_CAP) {
    return json({
      ok: false,
      error: "Daily Places cap reached for prospecting",
      used,
      cap: DAILY_PLACES_CAP,
    }, 429);
  }

  const result = await runDiscover(env, parsed.industry, parsed.city, parsed.limit);
  if (!result.ok) return json({ ok: false, error: result.error }, result.status || 500);

  // Bump the daily counter by 1 (we made one Places call regardless of result count).
  await env.TOKENS.put(
    "prospecting:places:" + today,
    String(used + 1),
    { expirationTtl: 172800 },
  );

  return json({
    ok: true,
    industry: parsed.industry,
    city: parsed.city,
    seed_query: result.seed_query,
    discovered: result.results.length,
    results: result.results,
    places_used_today: used + 1,
    places_remaining_today: Math.max(0, DAILY_PLACES_CAP - (used + 1)),
  });
}

async function runDiscover(env, industry, city, limit) {
  const seed = INDUSTRY_SEEDS[industry];
  const cityDisplay = CITY_DISPLAY[city];
  const seedQuery = seed + ", " + cityDisplay + ", Colombia";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.regularOpeningHours.weekdayDescriptions,places.businessStatus",
      },
      body: JSON.stringify({
        textQuery: seedQuery,
        languageCode: "es",
        regionCode: "CO",
        maxResultCount: limit,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return {
        ok: false,
        status: 502,
        error: "Places API " + resp.status + ": " + errText.slice(0, 200),
      };
    }
    const data = await resp.json();
    const places = Array.isArray(data && data.places) ? data.places : [];
    const results = places.map((p) => normalizePlace(p)).filter(Boolean);
    return { ok: true, seed_query: seedQuery, results };
  } catch (e) {
    return {
      ok: false,
      status: 504,
      error: "Places fetch failed: " + String(e && e.message || e),
    };
  } finally {
    clearTimeout(timer);
  }
}

function normalizePlace(p) {
  if (!p) return null;
  const name = p.displayName && (p.displayName.text || (typeof p.displayName === "string" ? p.displayName : null));
  if (!name) return null;
  const hoursArr = p.regularOpeningHours && Array.isArray(p.regularOpeningHours.weekdayDescriptions)
    ? p.regularOpeningHours.weekdayDescriptions
    : null;
  return {
    business_name: name,
    phone: normalizePhone(p.internationalPhoneNumber) || null,
    address: (p.formattedAddress && String(p.formattedAddress).trim()) || null,
    website: (p.websiteUri && String(p.websiteUri).trim()) || null,
    rating: typeof p.rating === "number" ? p.rating : null,
    review_count: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
    hours: hoursArr,
    place_id: (p.id && String(p.id).trim()) || null,
    place_status: p.businessStatus || null,
  };
}

// ---- Dedupe preview ------------------------------------------------------

async function dedupePreview(request, env, json) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
  const candidates = Array.isArray(body && body.candidates) ? body.candidates : null;
  if (!candidates) return json({ ok: false, error: "Send { candidates: [...] }" }, 400);

  const annotated = [];
  for (const c of candidates) {
    annotated.push(await annotateOne(env, c));
  }
  const existsCount = annotated.filter((c) => c.exists).length;
  return json({
    ok: true,
    total: annotated.length,
    exists_count: existsCount,
    new_count: annotated.length - existsCount,
    candidates: annotated,
  });
}

async function annotateOne(env, candidate) {
  const out = { ...candidate, exists: false };
  // 1. Canonical match on place_id.
  if (candidate.place_id) {
    const hit = await env.DB.prepare(
      "SELECT id FROM leads WHERE place_id = ? LIMIT 1"
    ).bind(candidate.place_id).first();
    if (hit) {
      out.exists = true;
      out.existing_lead_id = hit.id;
      out.match_reason = "place_id";
      return out;
    }
  }
  // 2. Fuzzy match on lower(business_name) + city.
  if (candidate.business_name) {
    const name = String(candidate.business_name).toLowerCase().trim();
    const city = candidate._city || candidate.city || null;
    let row;
    if (city) {
      row = await env.DB.prepare(
        "SELECT id FROM leads WHERE LOWER(business_name) = ? AND LOWER(city) = ? LIMIT 1"
      ).bind(name, String(city).toLowerCase().trim()).first();
    } else {
      row = await env.DB.prepare(
        "SELECT id FROM leads WHERE LOWER(business_name) = ? LIMIT 1"
      ).bind(name).first();
    }
    if (row) {
      out.exists = true;
      out.existing_lead_id = row.id;
      out.match_reason = "name_city";
      return out;
    }
  }
  return out;
}

// ---- Load ----------------------------------------------------------------

async function load(request, env, json, helpers) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
  const candidates = Array.isArray(body && body.candidates) ? body.candidates : null;
  if (!candidates || !candidates.length) {
    return json({ ok: false, error: "Send { candidates: [...], industry, city }" }, 400);
  }
  const industry = String(body.industry || "").toLowerCase().trim();
  const city = String(body.city || "").toLowerCase().trim();
  if (!industry || !INDUSTRY_SEEDS[industry]) {
    return json({ ok: false, error: "Unknown industry. Allowed: " + Object.keys(INDUSTRY_SEEDS).join(", ") }, 400);
  }
  if (!city || !CITY_DISPLAY[city]) {
    return json({ ok: false, error: "Unknown city. Allowed: " + Object.keys(CITY_DISPLAY).join(", ") }, 400);
  }

  const cityDisplay = CITY_DISPLAY[city];
  const seedQuery = INDUSTRY_SEEDS[industry] + ", " + cityDisplay + ", Colombia";
  const landingPage = landingPageFor(industry, city);

  const lead_ids = [];
  let inserted = 0;
  let skipped = 0;

  for (const c of candidates) {
    if (!c || !c.business_name) { skipped += 1; continue; }
    if (c.exists) { skipped += 1; continue; }

    const id = crypto.randomUUID();
    const now = Date.now();

    // Build minimal lead state to score; computeFitScore reads what's set.
    const leadState = {
      business_name: c.business_name,
      city: cityDisplay,
      category: industry,
      phone: c.phone || null,
      whatsapp: null,
      current_site: c.website || null,
      cms: null,
      address: c.address || null,
      rating: typeof c.rating === "number" ? c.rating : null,
      review_count: typeof c.review_count === "number" ? c.review_count : null,
      followers: null,
      instagram: null,
      facebook_url: null,
    };
    const { heat, score } = computeFitScore(leadState);

    const metadata = JSON.stringify({
      landing_page: landingPage,
      prospected_at: now,
      seed_query: seedQuery,
      place_status: c.place_status || null,
    });

    const hoursJson = Array.isArray(c.hours) && c.hours.length ? JSON.stringify(c.hours) : null;

    try {
      const res = await env.DB.prepare(
        "INSERT OR IGNORE INTO leads (" +
        "  id, source, business_name, language, status, lead_stage, " +
        "  phone, address, " +
        "  category, city, current_site, " +
        "  heat, score, " +
        "  on_today_list, touches_count, " +
        "  place_id, rating, review_count, hours, " +
        "  metadata, " +
        "  created_at, updated_at, last_enriched_at" +
        ") VALUES (" +
        "  ?, 'outbound', ?, 'es', 'new', 'new', " +
        "  ?, ?, " +
        "  ?, ?, ?, " +
        "  ?, ?, " +
        "  0, 0, " +
        "  ?, ?, ?, ?, " +
        "  ?, " +
        "  ?, ?, ?)"
      ).bind(
        id,
        c.business_name,
        c.phone || null,
        c.address || null,
        industry,
        cityDisplay,
        c.website || null,
        heat,
        score,
        c.place_id || null,
        typeof c.rating === "number" ? c.rating : null,
        typeof c.review_count === "number" ? c.review_count : null,
        hoursJson,
        metadata,
        now, now, now,
      ).run();

      // D1 returns meta.changes; INSERT OR IGNORE returns 0 when the row collided.
      const changes = res && res.meta && typeof res.meta.changes === "number" ? res.meta.changes : 1;
      if (changes === 0) { skipped += 1; continue; }

      lead_ids.push(id);
      inserted += 1;

      // Audit activity row.
      await env.DB.prepare(
        "INSERT INTO activities (id, kind, subject, body, lead_id, owner, occurred_at, created_at, updated_at) " +
        "VALUES (?, 'note', ?, ?, ?, 'system', ?, ?, ?)"
      ).bind(
        crypto.randomUUID(),
        "Outbound: imported from Google Places",
        JSON.stringify({
          industry,
          city: cityDisplay,
          place_id: c.place_id || null,
          rating: c.rating || null,
          review_count: c.review_count || null,
        }),
        id,
        now, now, now,
      ).run();
    } catch (e) {
      skipped += 1;
      console.warn("prospecting: insert failed for " + c.business_name + ": " + (e && e.message || e));
    }
  }

  return json({
    ok: true,
    inserted,
    skipped,
    lead_ids,
  });
}

// ---- Sweep (discover -> dedupe -> load) ----------------------------------

async function sweep(request, env, json, helpers) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

  const parsed = parseIndustryCityLimit(body);
  if (parsed.error) return json({ ok: false, error: parsed.error }, 400);
  const dryRun = !!body.dry_run;

  if (!env.GOOGLE_PLACES_API_KEY) {
    return json({ ok: false, error: "GOOGLE_PLACES_API_KEY not set on worker" }, 500);
  }

  const today = new Date().toISOString().slice(0, 10);
  const used = parseInt((await env.TOKENS.get("prospecting:places:" + today)) || "0", 10);
  if (used >= DAILY_PLACES_CAP) {
    return json({
      ok: false,
      error: "Daily Places cap reached for prospecting",
      used,
      cap: DAILY_PLACES_CAP,
    }, 429);
  }

  // 1. Discover.
  const discovered = await runDiscover(env, parsed.industry, parsed.city, parsed.limit);
  if (!discovered.ok) return json({ ok: false, error: discovered.error }, discovered.status || 500);
  await env.TOKENS.put(
    "prospecting:places:" + today,
    String(used + 1),
    { expirationTtl: 172800 },
  );

  // 2. Dedupe-preview.
  const cityDisplay = CITY_DISPLAY[parsed.city];
  const annotated = [];
  for (const c of discovered.results) {
    annotated.push(await annotateOne(env, { ...c, _city: cityDisplay }));
  }
  const existsCount = annotated.filter((c) => c.exists).length;
  const fresh = annotated.filter((c) => !c.exists);

  if (dryRun) {
    return json({
      ok: true,
      dry_run: true,
      industry: parsed.industry,
      city: parsed.city,
      seed_query: discovered.seed_query,
      discovered: annotated.length,
      exists_count: existsCount,
      new_count: fresh.length,
      candidates: annotated,
      places_used_today: used + 1,
    });
  }

  // 3. Load.
  const loadReq = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({
      candidates: fresh,
      industry: parsed.industry,
      city: parsed.city,
    }),
  });
  const loadResp = await load(loadReq, env, json, helpers);
  let loadBody = {};
  try { loadBody = await loadResp.clone().json(); } catch {}

  return json({
    ok: true,
    dry_run: false,
    industry: parsed.industry,
    city: parsed.city,
    seed_query: discovered.seed_query,
    discovered: annotated.length,
    exists_count: existsCount,
    new_count: fresh.length,
    inserted: loadBody.inserted || 0,
    skipped: loadBody.skipped || 0,
    lead_ids: loadBody.lead_ids || [],
    places_used_today: used + 1,
  });
}

// ---- Helpers -------------------------------------------------------------

function parseIndustryCityLimit(body) {
  const industry = String((body && body.industry) || "").toLowerCase().trim();
  const city = String((body && body.city) || "").toLowerCase().trim();
  if (!industry || !INDUSTRY_SEEDS[industry]) {
    return { error: "industry must be one of: " + Object.keys(INDUSTRY_SEEDS).join(", ") };
  }
  if (!city || !CITY_DISPLAY[city]) {
    return { error: "city must be one of: " + Object.keys(CITY_DISPLAY).join(", ") };
  }
  let limit = parseInt((body && body.limit), 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  return { industry, city, limit };
}
