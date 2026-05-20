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

import { computeFitScore, computeLandingScore, enrichWithPlaces, normalizePhone } from "./enrich.js";

const DAILY_PLACES_CAP = 500;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 60;

// Separate, generous daily cap for the server-side bulk runner so it does not
// starve the interactive enrich/prospecting caps. Key: prospecting:bulk:<date>.
const DAILY_BULK_CAP = 2000;
// Per-invocation safety limits for the bulk runner (Cloudflare Worker
// subrequest budget is 1000/invocation; ~60 Places + up to ~600 D1 ops is safe).
const BULK_MAX_PLACES_CALLS = 60;
const BULK_MAX_INSERTS = 400;

// Industry seed queries · pick one distinctive Spanish phrase per vertical.
// Lower-case dashed slugs in code; display form is up to the UI.
// The original 4 ICPs (dental, legal, hoteles-boutique, turismo) stay first so
// existing callers keep working; the rest are a BROAD general-SMB set.
const INDUSTRY_SEEDS = {
  // Original 4 ICPs.
  "dental": "clínica dental",
  "legal": "abogado",
  "hoteles-boutique": "hotel boutique",
  "turismo": "agencia de viajes",
  // Broad general-SMB verticals.
  "restaurante": "restaurante",
  "cafe": "café",
  "tienda-ropa": "tienda de ropa",
  "gimnasio": "gimnasio",
  "inmobiliaria": "inmobiliaria",
  "spa": "spa",
  "salon-belleza": "salón de belleza",
  "barberia": "barbería",
  "clinica-dental": "clínica dental",
  "clinica-estetica": "clínica estética",
  "consultorio-medico": "consultorio médico",
  "veterinaria": "veterinaria",
  "abogados": "abogado",
  "contador": "contador",
  "ferreteria": "ferretería",
  "panaderia": "panadería",
  "hotel-boutique": "hotel boutique",
  "agencia-viajes": "agencia de viajes",
  "agencia-marketing": "agencia de marketing",
  "constructora": "constructora",
  "autopartes": "repuestos para autos",
  "escuela-idiomas": "escuela de idiomas",
  "joyeria": "joyería",
  "floristeria": "floristería",
  "optica": "óptica",
};

// City slug -> display form (proper accents) used in the Places textQuery.
// 5 metros.
const CITY_DISPLAY = {
  "medellin": "Medellín",
  "bogota": "Bogotá",
  "barranquilla": "Barranquilla",
  "cali": "Cali",
  "cartagena": "Cartagena",
};

// The 25-vertical broad SMB set used by the bulk runner when no explicit list
// is supplied. Excludes the legacy duplicate slugs (dental, legal,
// hoteles-boutique, turismo) which alias newer ones (clinica-dental, abogados,
// hotel-boutique, agencia-viajes) to avoid double-pulling the same searches.
const BULK_DEFAULT_VERTICALS = [
  "restaurante", "cafe", "tienda-ropa", "gimnasio", "inmobiliaria",
  "spa", "salon-belleza", "barberia", "clinica-dental", "clinica-estetica",
  "consultorio-medico", "veterinaria", "abogados", "contador", "ferreteria",
  "panaderia", "hotel-boutique", "agencia-viajes", "agencia-marketing", "constructora",
  "autopartes", "escuela-idiomas", "joyeria", "floristeria", "optica",
];

const BULK_DEFAULT_CITIES = ["medellin", "bogota", "barranquilla", "cali", "cartagena"];

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
    if (path === "/api/admin/prospecting/bulk-start" && method === "POST") {
      return await bulkStart(request, env, json);
    }
    if (path === "/api/admin/prospecting/bulk-status" && method === "GET") {
      return await bulkStatus(env, json);
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
    const { landing_heat, landing_score } = computeLandingScore(leadState);

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
        "  heat, score, landing_heat, landing_score, " +
        "  on_today_list, touches_count, " +
        "  place_id, rating, review_count, hours, " +
        "  metadata, " +
        "  created_at, updated_at, last_enriched_at" +
        ") VALUES (" +
        "  ?, 'outbound', ?, 'es', 'new', 'new', " +
        "  ?, ?, " +
        "  ?, ?, ?, " +
        "  ?, ?, ?, ?, " +
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
        landing_heat,
        landing_score,
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

// ---- Bulk job: arm + status (HTTP) ---------------------------------------

// POST /api/admin/prospecting/bulk-start
// Inserts a prospecting_jobs row so a large pull is armed. The cron's
// runBulkProspectBatch picks it up and chews through it over many runs.
async function bulkStart(request, env, json) {
  let body = {};
  try { body = await request.json(); } catch {}

  let target = parseInt(body && body.target, 10);
  if (!Number.isFinite(target) || target <= 0) target = 5000;

  let verticals = Array.isArray(body && body.verticals) && body.verticals.length
    ? body.verticals.map((v) => String(v).toLowerCase().trim()).filter((v) => INDUSTRY_SEEDS[v])
    : BULK_DEFAULT_VERTICALS.slice();
  if (!verticals.length) verticals = BULK_DEFAULT_VERTICALS.slice();

  let cities = Array.isArray(body && body.cities) && body.cities.length
    ? body.cities.map((c) => String(c).toLowerCase().trim()).filter((c) => CITY_DISPLAY[c])
    : BULK_DEFAULT_CITIES.slice();
  if (!cities.length) cities = BULK_DEFAULT_CITIES.slice();

  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO prospecting_jobs (id, status, target, inserted, skipped, cursor, cities, verticals, notes, created_at, updated_at) " +
    "VALUES (?, 'running', ?, 0, 0, NULL, ?, ?, ?, ?, ?)"
  ).bind(
    id,
    target,
    JSON.stringify(cities),
    JSON.stringify(verticals),
    (body && body.notes) ? String(body.notes) : null,
    now, now,
  ).run();

  return json({
    ok: true,
    job: { id, status: "running", target, inserted: 0, skipped: 0, cities, verticals },
  });
}

// GET /api/admin/prospecting/bulk-status
// Returns the active (running) job if any, else the most recent job.
async function bulkStatus(env, json) {
  let job = await env.DB.prepare(
    "SELECT * FROM prospecting_jobs WHERE status = 'running' ORDER BY created_at ASC LIMIT 1"
  ).first();
  if (!job) {
    job = await env.DB.prepare(
      "SELECT * FROM prospecting_jobs ORDER BY created_at DESC LIMIT 1"
    ).first();
  }
  if (!job) return json({ ok: true, job: null });

  const today = new Date().toISOString().slice(0, 10);
  const bulkUsed = parseInt((await env.TOKENS.get("prospecting:bulk:" + today)) || "0", 10);

  return json({
    ok: true,
    job: {
      ...job,
      cities: safeParseArr(job.cities),
      verticals: safeParseArr(job.verticals),
      cursor: safeParseObj(job.cursor),
    },
    bulk_places_used_today: bulkUsed,
    bulk_places_remaining_today: Math.max(0, DAILY_BULK_CAP - bulkUsed),
    bulk_daily_cap: DAILY_BULK_CAP,
  });
}

// ---- Bulk job: server-side batch runner (called by the cron) --------------

// Loads the oldest running job and pulls another batch of leads, resuming from
// the saved cursor. Capped per invocation by maxPlacesCalls (Places calls) and
// BULK_MAX_INSERTS (rows). Uses a SEPARATE daily KV cap (prospecting:bulk:<date>)
// so it never starves the interactive enrich/prospecting caps. Returns a
// summary object; never throws to the caller (the cron wraps in try/catch too).
export async function runBulkProspectBatch(env, opts) {
  const maxPlacesCalls = Math.max(1, (opts && opts.maxPlacesCalls) || BULK_MAX_PLACES_CALLS);

  if (!env.GOOGLE_PLACES_API_KEY) {
    return { ran: false, reason: "GOOGLE_PLACES_API_KEY not set" };
  }

  // 1. Oldest running job.
  const job = await env.DB.prepare(
    "SELECT * FROM prospecting_jobs WHERE status = 'running' ORDER BY created_at ASC LIMIT 1"
  ).first();
  if (!job) return { ran: false, reason: "no running job" };

  // Separate daily KV cap for bulk.
  const today = new Date().toISOString().slice(0, 10);
  let bulkUsed = parseInt((await env.TOKENS.get("prospecting:bulk:" + today)) || "0", 10);
  if (bulkUsed >= DAILY_BULK_CAP) {
    return { ran: false, reason: "bulk daily cap reached", bulk_used: bulkUsed, cap: DAILY_BULK_CAP };
  }

  const verticals = safeParseArr(job.verticals).filter((v) => INDUSTRY_SEEDS[v]);
  const cities = safeParseArr(job.cities).filter((c) => CITY_DISPLAY[c]);
  if (!verticals.length || !cities.length) {
    await markJobDone(env, job.id, job, "no valid verticals/cities");
    return { ran: false, reason: "job has no valid verticals/cities", job_id: job.id };
  }

  let cursor = safeParseObj(job.cursor) || { vIndex: 0, cIndex: 0, pageToken: null };
  if (typeof cursor.vIndex !== "number") cursor.vIndex = 0;
  if (typeof cursor.cIndex !== "number") cursor.cIndex = 0;

  let inserted = 0;
  let skipped = 0;
  let placesCalls = 0;
  const remainingTarget = Math.max(0, (job.target || 0) - (job.inserted || 0));

  // Iterate verticals x cities from the cursor, paginating each combo via
  // nextPageToken until we hit a per-invocation budget or finish the grid.
  let exhausted = false;
  while (true) {
    if (placesCalls >= maxPlacesCalls) break;
    if (bulkUsed + placesCalls >= DAILY_BULK_CAP) break;
    if (inserted >= BULK_MAX_INSERTS) break;
    if (inserted >= remainingTarget) break;

    if (cursor.vIndex >= verticals.length) { exhausted = true; break; }

    const vSlug = verticals[cursor.vIndex];
    const cSlug = cities[cursor.cIndex];

    const search = await bulkPlacesSearch(env, vSlug, cSlug, cursor.pageToken);
    placesCalls += 1;

    if (!search.ok) {
      // On a search error, advance past this combo so one bad query does not
      // wedge the whole job. Drop any pageToken.
      cursor.pageToken = null;
      ({ cursor, exhausted } = advanceCursor(cursor, verticals, cities));
      if (exhausted) break;
      continue;
    }

    const cityDisplay = CITY_DISPLAY[cSlug];
    const seedQuery = INDUSTRY_SEEDS[vSlug] + ", " + cityDisplay + ", Colombia";

    for (const cand of search.results) {
      if (inserted >= BULK_MAX_INSERTS || inserted >= remainingTarget) break;
      const annotated = await annotateOne(env, { ...cand, _city: cityDisplay });
      if (annotated.exists) { skipped += 1; continue; }
      const ins = await insertBulkLead(env, annotated, vSlug, cityDisplay, seedQuery, job.id);
      if (ins) inserted += 1;
      else skipped += 1;
    }

    // Advance pagination: follow nextPageToken on the same combo, else move on.
    if (search.nextPageToken) {
      cursor.pageToken = search.nextPageToken;
    } else {
      cursor.pageToken = null;
      const adv = advanceCursor(cursor, verticals, cities);
      cursor = adv.cursor;
      if (adv.exhausted) { exhausted = true; break; }
    }
  }

  // Persist the bulk daily counter.
  if (placesCalls > 0) {
    await env.TOKENS.put(
      "prospecting:bulk:" + today,
      String(bulkUsed + placesCalls),
      { expirationTtl: 172800 },
    );
  }

  // One summary activity row per run (not per lead) to avoid bloating activities.
  if (inserted > 0 || skipped > 0) {
    try {
      const now = Date.now();
      await env.DB.prepare(
        "INSERT INTO activities (id, kind, subject, body, owner, occurred_at, created_at, updated_at, done) " +
        "VALUES (?, 'note', ?, ?, 'system', ?, ?, ?, 1)"
      ).bind(
        crypto.randomUUID(),
        "Outbound: bulk Places import",
        JSON.stringify({
          bulk_job_id: job.id,
          inserted, skipped,
          places_calls: placesCalls,
          vertical: verticals[Math.min(cursor.vIndex, verticals.length - 1)] || null,
          city: cities[Math.min(cursor.cIndex, cities.length - 1)] || null,
        }),
        now, now, now,
      ).run();
    } catch (e) {
      console.warn("prospecting bulk: summary activity insert failed: " + (e && e.message || e));
    }
  }

  // Update the job row.
  const newInserted = (job.inserted || 0) + inserted;
  const newSkipped = (job.skipped || 0) + skipped;
  const done = exhausted || newInserted >= (job.target || 0);
  const now = Date.now();
  await env.DB.prepare(
    "UPDATE prospecting_jobs SET inserted = ?, skipped = ?, cursor = ?, status = ?, updated_at = ? WHERE id = ?"
  ).bind(
    newInserted,
    newSkipped,
    done ? null : JSON.stringify(cursor),
    done ? "done" : "running",
    now,
    job.id,
  ).run();

  return {
    ran: true,
    job_id: job.id,
    inserted,
    skipped,
    places_calls: placesCalls,
    total_inserted: newInserted,
    target: job.target,
    status: done ? "done" : "running",
  };
}

// Advance the (vIndex, cIndex) grid cursor by one city, wrapping to the next
// vertical. Returns { cursor, exhausted }.
function advanceCursor(cursor, verticals, cities) {
  const next = { vIndex: cursor.vIndex, cIndex: cursor.cIndex + 1, pageToken: null };
  if (next.cIndex >= cities.length) {
    next.cIndex = 0;
    next.vIndex = cursor.vIndex + 1;
  }
  return { cursor: next, exhausted: next.vIndex >= verticals.length };
}

async function markJobDone(env, jobId, job, note) {
  const now = Date.now();
  await env.DB.prepare(
    "UPDATE prospecting_jobs SET status = 'done', cursor = NULL, notes = ?, updated_at = ? WHERE id = ?"
  ).bind(
    [job.notes, note].filter(Boolean).join(" · ") || note,
    now,
    jobId,
  ).run();
}

// Places searchText for one vertical+city, returning normalized candidates plus
// the nextPageToken for pagination. Wrapped in try/catch + 10s AbortController.
async function bulkPlacesSearch(env, vSlug, cSlug, pageToken) {
  const seed = INDUSTRY_SEEDS[vSlug];
  const cityDisplay = CITY_DISPLAY[cSlug];
  const seedQuery = seed + ", " + cityDisplay + ", Colombia";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const reqBody = {
      textQuery: seedQuery,
      languageCode: "es",
      regionCode: "CO",
      maxResultCount: MAX_LIMIT,
    };
    if (pageToken) reqBody.pageToken = pageToken;
    const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": "nextPageToken,places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.regularOpeningHours.weekdayDescriptions,places.businessStatus",
      },
      body: JSON.stringify(reqBody),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.warn("prospecting bulk: Places " + resp.status + ": " + errText.slice(0, 200));
      return { ok: false, results: [], nextPageToken: null };
    }
    const data = await resp.json();
    const places = Array.isArray(data && data.places) ? data.places : [];
    return {
      ok: true,
      results: places.map((p) => normalizePlace(p)).filter(Boolean),
      nextPageToken: (data && data.nextPageToken) || null,
    };
  } catch (e) {
    console.warn("prospecting bulk: Places fetch failed · " + (e && e.message || e));
    return { ok: false, results: [], nextPageToken: null };
  } finally {
    clearTimeout(timer);
  }
}

// Insert a single bulk candidate with dual scores. Returns true on insert,
// false on skip/collision. Never throws.
async function insertBulkLead(env, c, vSlug, cityDisplay, seedQuery, jobId) {
  if (!c || !c.business_name) return false;
  const id = crypto.randomUUID();
  const now = Date.now();
  const landingPage = landingPageFor(vSlug, cityDisplay);

  const leadState = {
    business_name: c.business_name,
    city: cityDisplay,
    category: vSlug,
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
  const { landing_heat, landing_score } = computeLandingScore(leadState);

  const metadata = JSON.stringify({
    landing_page: landingPage,
    prospected_at: now,
    seed_query: seedQuery,
    bulk_job_id: jobId,
    place_status: c.place_status || null,
  });
  const hoursJson = Array.isArray(c.hours) && c.hours.length ? JSON.stringify(c.hours) : null;

  try {
    const res = await env.DB.prepare(
      "INSERT OR IGNORE INTO leads (" +
      "  id, source, business_name, language, status, lead_stage, " +
      "  phone, address, " +
      "  category, city, current_site, " +
      "  heat, score, landing_heat, landing_score, " +
      "  on_today_list, touches_count, " +
      "  place_id, rating, review_count, hours, " +
      "  metadata, " +
      "  created_at, updated_at, last_enriched_at" +
      ") VALUES (" +
      "  ?, 'outbound', ?, 'es', 'new', 'new', " +
      "  ?, ?, " +
      "  ?, ?, ?, " +
      "  ?, ?, ?, ?, " +
      "  0, 0, " +
      "  ?, ?, ?, ?, " +
      "  ?, " +
      "  ?, ?, ?)"
    ).bind(
      id,
      c.business_name,
      c.phone || null,
      c.address || null,
      vSlug,
      cityDisplay,
      c.website || null,
      heat,
      score,
      landing_heat,
      landing_score,
      c.place_id || null,
      typeof c.rating === "number" ? c.rating : null,
      typeof c.review_count === "number" ? c.review_count : null,
      hoursJson,
      metadata,
      now, now, now,
    ).run();
    const changes = res && res.meta && typeof res.meta.changes === "number" ? res.meta.changes : 1;
    return changes !== 0;
  } catch (e) {
    console.warn("prospecting bulk: insert failed for " + c.business_name + ": " + (e && e.message || e));
    return false;
  }
}

// ---- Helpers -------------------------------------------------------------

function safeParseArr(s) {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}

function safeParseObj(s) {
  if (!s) return null;
  try { const v = JSON.parse(s); return v && typeof v === "object" ? v : null; } catch { return null; }
}

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
