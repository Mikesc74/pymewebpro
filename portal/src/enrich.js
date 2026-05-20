// Lead enrichment v2 · multi-mode pipeline.
//
// Modes:
//   'places'     · Google Places Text Search · fills phone, current_site,
//                  address, place_id, rating, review_count, hours.
//   'site'       · Fetches current_site, sniffs HTML for CMS · fills cms.
//   'web_search' · Anthropic Claude Haiku 4.5 + web_search tool (the
//                  original v1 flow) · fills email, instagram, facebook_url,
//                  and any contact channels still missing.
//   'full'       · places, then site, then web_search, then computeFitScore
//                  to overwrite heat + score.
//
// Mounted by src/index.js at /api/admin/enrich/*.
// Requires:
//   env.ANTHROPIC_API_KEY    (worker secret · used by 'web_search' + 'full')
//   env.GOOGLE_PLACES_API_KEY (worker secret · used by 'places' + 'full';
//                              missing key is a graceful no-op, not a crash)
//   env.TOKENS               (KV · daily caps for web_search and places)
//   env.DB                   (D1)

const MODEL = "claude-haiku-4-5-20251001";
const DAILY_CAP = 500;            // hard ceiling per UTC day, per source
const MAX_LEADS_PER_REQUEST = 25; // soft limit so a single Worker invocation finishes within CPU time

const VALID_MODES = new Set(["web_search", "places", "site", "full"]);

export async function handleEnrich(request, env, ctx, helpers) {
  const { json, isAdmin } = helpers;
  if (!isAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY not set on worker" }, 500);

  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/admin/enrich/status" && request.method === "GET") {
    return await getStatus(env, json);
  }
  if (path === "/api/admin/enrich/preview" && request.method === "POST") {
    return await previewOne(request, env, json);
  }
  if (path === "/api/admin/enrich/run" && request.method === "POST") {
    return await runBatch(request, env, json, url);
  }
  if (path === "/api/admin/enrich/priority" && request.method === "POST") {
    return await runPriority(request, env, json, url);
  }
  return json({ error: "Not found" }, 404);
}

// ---- Status ---------------------------------------------------------------

async function getStatus(env, json) {
  const today = new Date().toISOString().slice(0, 10);
  const usedWeb = parseInt((await env.TOKENS.get("enrich:count:" + today)) || "0", 10);
  const usedPlaces = parseInt((await env.TOKENS.get("enrich:places:" + today)) || "0", 10);

  // How many leads still need enrichment (priority bucket: not SQL, not
  // disqualified, missing any of contact channels OR place_id OR cms).
  const totals = await env.DB.prepare(
    "SELECT UPPER(heat) AS heat, COUNT(*) AS n FROM leads " +
    "WHERE lead_stage NOT IN ('sales_qualified','disqualified') " +
    "  AND ((phone IS NULL OR phone='') " +
    "    OR (whatsapp IS NULL OR whatsapp='') " +
    "    OR (email IS NULL OR email='') " +
    "    OR (instagram IS NULL OR instagram='') " +
    "    OR place_id IS NULL " +
    "    OR cms IS NULL) " +
    "GROUP BY heat ORDER BY n DESC"
  ).all();

  // Coverage counters.
  const places = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM leads WHERE place_id IS NOT NULL AND place_id <> ''"
  ).first();
  const sites = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM leads WHERE cms IS NOT NULL AND cms <> ''"
  ).first();

  return json({
    ok: true,
    today,
    used_today: usedWeb,
    places_used_today: usedPlaces,
    daily_cap: DAILY_CAP,
    remaining_today: Math.max(0, DAILY_CAP - usedWeb),
    places_remaining_today: Math.max(0, DAILY_CAP - usedPlaces),
    needing_enrichment_by_heat: totals.results || [],
    places_enriched: (places && places.n) || 0,
    sites_detected: (sites && sites.n) || 0,
  });
}

// ---- Preview one (no write) ----------------------------------------------

async function previewOne(request, env, json) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const id = body.id;
  if (!id) return json({ error: "Missing id" }, 400);
  const mode = pickMode(body.mode || "web_search");
  try {
    const r = await enrichLead(env, id, { dryRun: true, mode });
    return json({ ok: true, result: r });
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e) }, 500);
  }
}

// ---- Batch run by explicit ID list ---------------------------------------

async function runBatch(request, env, json, url) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const ids = Array.isArray(body.ids) ? body.ids.slice(0, MAX_LEADS_PER_REQUEST) : [];
  if (!ids.length) return json({ error: "Send { ids: [...] }" }, 400);
  const mode = pickMode(url.searchParams.get("mode") || body.mode || "full");
  return await processIds(env, ids, json, mode);
}

// ---- Auto-pick top priority leads ----------------------------------------

async function runPriority(request, env, json, url) {
  let body = {};
  try { body = await request.json(); } catch {}
  const limit = Math.min(parseInt(body.limit, 10) || MAX_LEADS_PER_REQUEST, MAX_LEADS_PER_REQUEST);
  const mode = pickMode(url.searchParams.get("mode") || body.mode || "full");

  // Candidate pool: any lead that's missing a contact channel OR is missing
  // the Places canonical id OR has never had its CMS detected. Keep the
  // existing HOT > DEAD > WARM > COOL > COLD ordering inside the pool.
  const rows = await env.DB.prepare(
    "SELECT id FROM leads " +
    "WHERE lead_stage NOT IN ('sales_qualified','disqualified') " +
    "  AND ((phone IS NULL OR phone='') " +
    "    OR (whatsapp IS NULL OR whatsapp='') " +
    "    OR (email IS NULL OR email='') " +
    "    OR (instagram IS NULL OR instagram='') " +
    "    OR place_id IS NULL " +
    "    OR cms IS NULL) " +
    "ORDER BY " +
    "  CASE UPPER(heat) WHEN 'HOT' THEN 1 WHEN 'DEAD' THEN 2 WHEN 'WARM' THEN 3 WHEN 'COOL' THEN 4 WHEN 'COLD' THEN 5 ELSE 6 END, " +
    "  on_today_list DESC, score DESC " +
    "LIMIT ?"
  ).bind(limit).all();

  const ids = (rows.results || []).map((r) => r.id);
  if (!ids.length) return json({ ok: true, message: "Nothing left to enrich · everyone has a contact channel, place_id, and cms.", count: 0 });
  return await processIds(env, ids, json, mode);
}

function pickMode(raw) {
  const m = String(raw || "").toLowerCase().trim();
  return VALID_MODES.has(m) ? m : "full";
}

// ---- Common processing loop ----------------------------------------------

async function processIds(env, ids, json, mode) {
  const today = new Date().toISOString().slice(0, 10);

  // Daily caps are independent per source (web_search vs places) because each
  // upstream has its own cost. 'full' mode consumes from both pools.
  const useWeb = mode === "web_search" || mode === "full";
  const usePlaces = mode === "places" || mode === "full";

  let usedWeb = useWeb ? parseInt((await env.TOKENS.get("enrich:count:" + today)) || "0", 10) : 0;
  let usedPlaces = usePlaces ? parseInt((await env.TOKENS.get("enrich:places:" + today)) || "0", 10) : 0;

  if (useWeb && usedWeb >= DAILY_CAP) {
    return json({ error: "Daily cap reached (web_search)", used: usedWeb, cap: DAILY_CAP }, 429);
  }
  if (usePlaces && usedPlaces >= DAILY_CAP) {
    return json({ error: "Daily cap reached (places)", used: usedPlaces, cap: DAILY_CAP }, 429);
  }

  const results = [];
  let webCalls = 0;
  let placesCalls = 0;
  for (const id of ids) {
    if (useWeb && usedWeb + webCalls >= DAILY_CAP) break;
    if (usePlaces && usedPlaces + placesCalls >= DAILY_CAP) break;
    try {
      const r = await enrichLead(env, id, { mode });
      if (r._counted_web) webCalls += 1;
      if (r._counted_places) placesCalls += 1;
      delete r._counted_web;
      delete r._counted_places;
      results.push({ id, ok: true, ...r });
    } catch (e) {
      results.push({ id, ok: false, error: String(e && e.message || e) });
    }
  }

  // Bump the daily counters. Two-day TTL so end-of-day overlaps don't leak.
  if (useWeb && webCalls > 0) {
    await env.TOKENS.put("enrich:count:" + today, String(usedWeb + webCalls), { expirationTtl: 172800 });
  }
  if (usePlaces && placesCalls > 0) {
    await env.TOKENS.put("enrich:places:" + today, String(usedPlaces + placesCalls), { expirationTtl: 172800 });
  }

  const summary = {
    mode,
    total: results.length,
    filled: results.filter((r) => r.ok && r.filled && r.filled.length).length,
    skipped: results.filter((r) => r.ok && r.skipped).length,
    failed: results.filter((r) => !r.ok).length,
  };
  return json({
    ok: true,
    mode,
    used_today: usedWeb + webCalls,
    places_used_today: usedPlaces + placesCalls,
    daily_cap: DAILY_CAP,
    summary,
    results,
  });
}

// ---- The actual enrichment call ------------------------------------------

async function enrichLead(env, leadId, opts) {
  const dryRun = !!(opts && opts.dryRun);
  const mode = (opts && opts.mode) || "full";
  const lead = await env.DB.prepare(
    "SELECT id, business_name, city, category, current_site, email, phone, whatsapp, " +
    "       instagram, facebook_url, x_url, tiktok_url, address, place_id, rating, " +
    "       review_count, hours, cms, followers, heat, score " +
    "  FROM leads WHERE id = ?"
  ).bind(leadId).first();
  if (!lead) throw new Error("Lead not found");
  if (!lead.business_name) throw new Error("Lead has no business_name");

  // Mutable working copy · subsequent steps see fields filled by earlier ones.
  const state = { ...lead };
  const patch = {};
  const counters = { web: false, places: false };
  let foundDebug = {};

  // ---- Step: Places --------------------------------------------------------
  if (mode === "places" || mode === "full") {
    const place = await enrichWithPlaces(env, state);
    if (place) {
      counters.places = true;
      foundDebug.places = place;
      // String fields: only fill if missing.
      const phoneFromPlaces = normalizePhone(place.internationalPhoneNumber);
      if (candidate(state.phone, phoneFromPlaces)) {
        patch.phone = phoneFromPlaces;
        state.phone = phoneFromPlaces;
      }
      const siteFromPlaces = place.websiteUri && String(place.websiteUri).trim();
      if (candidate(state.current_site, siteFromPlaces)) {
        patch.current_site = siteFromPlaces;
        state.current_site = siteFromPlaces;
      }
      const addrFromPlaces = place.formattedAddress && String(place.formattedAddress).trim();
      if (candidate(state.address, addrFromPlaces)) {
        patch.address = addrFromPlaces;
        state.address = addrFromPlaces;
      }
      const pid = place.id && String(place.id).trim();
      if (candidate(state.place_id, pid)) {
        patch.place_id = pid;
        state.place_id = pid;
      }
      // Numeric facts: overwrite when present (these change over time).
      if (typeof place.rating === "number") {
        patch.rating = place.rating;
        state.rating = place.rating;
      }
      if (typeof place.userRatingCount === "number") {
        patch.review_count = place.userRatingCount;
        state.review_count = place.userRatingCount;
      }
      const wd = place.regularOpeningHours && Array.isArray(place.regularOpeningHours.weekdayDescriptions)
        ? place.regularOpeningHours.weekdayDescriptions
        : null;
      if (wd && wd.length) {
        const hoursJson = JSON.stringify(wd);
        patch.hours = hoursJson;
        state.hours = hoursJson;
      }
    }
  }

  // ---- Step: Site detection ------------------------------------------------
  if (mode === "site" || mode === "full") {
    if (state.current_site) {
      const det = await detectCurrentSite(state.current_site);
      foundDebug.site = det;
      const cmsValue = det && det.cms ? det.cms : null;
      if (cmsValue) {
        // CMS is a fact about the live site · always refresh.
        patch.cms = cmsValue;
        state.cms = cmsValue;
      }
    } else if (mode === "site") {
      foundDebug.site = { skipped: "no current_site" };
    }
  }

  // ---- Step: Anthropic web_search (v1 flow) --------------------------------
  if (mode === "web_search" || mode === "full") {
    const where = [state.city, "Colombia"].filter(Boolean).join(", ");
    const catLabel = state.category ? " (" + state.category + ")" : "";
    const prompt =
      "Find verifiable contact information for the small business named \"" + state.business_name + "\" located in " + where + catLabel + ". " +
      "Search the web. Look at their own website, Instagram bio, Google Maps listing, and Facebook page. " +
      "I want: phone number, WhatsApp, email, Instagram handle, Facebook URL, and official website URL. " +
      "\n\nIMPORTANT: " +
      "Only return values you can verify from at least one source. Do NOT guess. " +
      "Phone and WhatsApp must be Colombian numbers (+57 followed by 10 digits). " +
      "Skip free-email providers (gmail / hotmail / outlook / yahoo). If their email IS gmail and that's all there is, still include it. " +
      "If multiple candidates exist (e.g. two same-named businesses in different cities), prefer the one in the city I gave. " +
      "If you can't find anything verifiable, return an empty object." +
      "\n\nRespond ONLY with a single JSON object like " +
      '{"phone":"+57XXXXXXXXXX","whatsapp":"+57XXXXXXXXXX","email":"info@example.com","instagram":"@handle","facebook_url":"https://facebook.com/...","current_site":"https://example.com"}' +
      ". Omit fields you can't fill. No prose around the JSON.";

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error("Anthropic " + resp.status + ": " + errText.slice(0, 300));
    }
    counters.web = true;
    const data = await resp.json();

    // The model may emit multiple text blocks (including web_search results); we
    // collect every text block and pull out the JSON object.
    const textBlocks = (data.content || []).filter((b) => b.type === "text");
    const text = textBlocks.map((b) => b.text).join("\n");
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let found = {};
    if (jsonMatch) {
      try { found = JSON.parse(jsonMatch[0]); } catch {}
    }
    foundDebug.web_search = found;

    if (candidate(state.phone, found.phone)) {
      const v = normalizePhone(found.phone);
      if (v) { patch.phone = v; state.phone = v; }
    }
    if (candidate(state.whatsapp, found.whatsapp)) {
      const v = normalizePhone(found.whatsapp);
      if (v) { patch.whatsapp = v; state.whatsapp = v; }
    } else if (candidate(state.whatsapp, found.phone)) {
      const v = normalizePhone(found.phone);
      if (v) { patch.whatsapp = v; state.whatsapp = v; }
    }
    if (candidate(state.email, found.email) && String(found.email).includes("@")) {
      const v = String(found.email).toLowerCase().trim();
      patch.email = v; state.email = v;
    }
    if (candidate(state.instagram, found.instagram)) {
      const v = cleanHandle(found.instagram);
      if (v) { patch.instagram = v; state.instagram = v; }
    }
    if (candidate(state.facebook_url, found.facebook_url)) {
      patch.facebook_url = found.facebook_url;
      state.facebook_url = found.facebook_url;
    }
    if (candidate(state.current_site, found.current_site)) {
      patch.current_site = found.current_site;
      state.current_site = found.current_site;
    }
  }

  // ---- Step: Score (full mode only) ---------------------------------------
  if (mode === "full") {
    const { heat, score } = computeFitScore(state);
    // Score + heat are derived facts · overwrite.
    patch.heat = heat;
    patch.score = score;
    state.heat = heat;
    state.score = score;

    // Second lens · landing-page fit. Independent of the no-site fit score:
    // a digitally-mature business is a PRIME landing-page customer. Overwrite.
    const { landing_heat, landing_score } = computeLandingScore(state);
    patch.landing_heat = landing_heat;
    patch.landing_score = landing_score;
    state.landing_heat = landing_heat;
    state.landing_score = landing_score;
  }

  // Drop any fields that normalized to null/empty (but keep numeric 0 / false).
  Object.keys(patch).forEach((k) => {
    const v = patch[k];
    if (v === null || v === undefined) { delete patch[k]; return; }
    if (typeof v === "string" && !v.trim()) { delete patch[k]; }
  });

  const filledKeys = Object.keys(patch);

  // Dry-run short-circuit · still report which keys we'd have written.
  if (dryRun) {
    return {
      mode,
      found: foundDebug,
      would_fill: patch,
      dryRun: true,
      _counted_web: counters.web,
      _counted_places: counters.places,
    };
  }

  // ALWAYS bump last_enriched_at, even if nothing else was filled. This is the
  // "tried-and-failed" counter the v1 was missing · keeps the priority picker
  // from re-trying the same lead on the next batch.
  patch.last_enriched_at = Date.now();
  patch.updated_at = Date.now();

  // Apply patch.
  const cols = Object.keys(patch);
  const sets = cols.map((c) => c + " = ?").join(", ");
  const binds = [...cols.map((c) => patch[c]), leadId];
  await env.DB.prepare("UPDATE leads SET " + sets + " WHERE id = ?").bind(...binds).run();

  // Log an activity row so the enrichment is auditable.
  if (filledKeys.length > 0) {
    const actId = crypto.randomUUID();
    const now = Date.now();
    const subjectPrefix = mode === "full" ? "Auto-enriched (full): "
      : mode === "places" ? "Auto-enriched (places): "
      : mode === "site" ? "Auto-enriched (site): "
      : "Auto-enriched (web): ";
    await env.DB.prepare(
      "INSERT INTO activities (id, kind, subject, body, lead_id, owner, occurred_at, created_at, updated_at) " +
      "VALUES (?, 'enrichment', ?, ?, ?, 'system', ?, ?, ?)"
    ).bind(
      actId,
      subjectPrefix + filledKeys.join(", "),
      JSON.stringify(patch),
      leadId,
      now, now, now
    ).run();
  }

  return {
    mode,
    found: foundDebug,
    filled: filledKeys,
    skipped: filledKeys.length === 0,
    _counted_web: counters.web,
    _counted_places: counters.places,
  };
}

// ---- Google Places Text Search -------------------------------------------

export async function enrichWithPlaces(env, lead) {
  if (!env.GOOGLE_PLACES_API_KEY) {
    console.warn("enrich: GOOGLE_PLACES_API_KEY not set, skipping places lookup");
    return null;
  }
  const query = (lead.business_name + " " + (lead.city || "") + " Colombia").trim();
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
        textQuery: query,
        languageCode: "es",
        regionCode: "CO",
        maxResultCount: 1,
      }),
    });
    if (!resp.ok) {
      console.warn("enrich: Places returned " + resp.status);
      return null;
    }
    const data = await resp.json();
    const places = data && Array.isArray(data.places) ? data.places : [];
    return places[0] || null;
  } catch (e) {
    console.warn("enrich: Places fetch failed · " + (e && e.message || e));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---- Current-site CMS detection ------------------------------------------

async function detectCurrentSite(url) {
  if (!url) return { reachable: false, cms: "site_unreachable", generator: null, status: null };
  let target = String(url).trim();
  if (!/^https?:\/\//i.test(target)) target = "https://" + target;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const resp = await fetch(target, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 PymeWebProEnricher" },
    });
    const status = resp.status;
    if (!resp.ok) {
      return { reachable: false, cms: "site_unreachable", generator: null, status };
    }
    // Read up to 30KB of HTML for sniffing. Body might be huge; we don't need it all.
    const reader = resp.body && resp.body.getReader ? resp.body.getReader() : null;
    let html = "";
    if (reader) {
      const decoder = new TextDecoder("utf-8", { fatal: false });
      let total = 0;
      const LIMIT = 30 * 1024;
      while (total < LIMIT) {
        const { value, done } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        total += value.length;
      }
      try { reader.cancel(); } catch {}
    } else {
      html = (await resp.text()).slice(0, 30 * 1024);
    }
    const lower = html.toLowerCase();
    let cms = null;
    let generator = null;
    if (lower.includes("wp-content") || lower.includes("wp-includes")) cms = "wordpress";
    else if (lower.includes("cdn.shopify.com") || lower.includes("shopify")) cms = "shopify";
    else if (lower.includes("webflow")) cms = "webflow";
    else if (lower.includes("wix.com") || lower.includes("_wix_browser")) cms = "wix";
    else if (lower.includes("squarespace") || lower.includes("sqsp")) cms = "squarespace";
    else if (lower.includes("duda")) cms = "duda";
    else if (lower.includes("godaddy")) cms = "godaddy_websites";
    if (!cms) {
      const m = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i);
      if (m) {
        generator = m[1];
        cms = generator.toLowerCase().split(/\s+/)[0] || generator;
      }
    } else {
      const m = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i);
      if (m) generator = m[1];
    }
    return { reachable: true, cms, generator, status };
  } catch (e) {
    return { reachable: false, cms: "site_unreachable", generator: null, status: null };
  } finally {
    clearTimeout(timer);
  }
}

// ---- Fit scoring ---------------------------------------------------------

// Pure function · easy to unit-test. Returns { heat, score } where score is
// 0..100 and heat is the bucket (HOT/WARM/COOL/COLD/DEAD).
export function computeFitScore(lead) {
  let score = 0;
  const has = (v) => v != null && String(v).trim() !== "";
  const cmsLower = lead.cms ? String(lead.cms).toLowerCase() : null;
  const reachableCms = cmsLower && cmsLower !== "site_unreachable";
  const upgradeTargets = new Set(["wordpress", "wix", "squarespace", "godaddy_websites"]);

  // +25 if any reachable contact channel (phone OR whatsapp).
  if (has(lead.whatsapp) || has(lead.phone)) score += 25;

  // +20 if current_site reachable AND on a CMS we love to replace.
  if (has(lead.current_site) && reachableCms && upgradeTargets.has(cmsLower)) score += 20;

  // +15 if no site (unreachable or unknown) AND we know who the business is.
  if ((!reachableCms || cmsLower === "site_unreachable") && has(lead.business_name)) score += 15;

  // +15 if it's a real, functioning business per Google ratings.
  if (typeof lead.rating === "number" && lead.rating >= 4.0
    && typeof lead.review_count === "number" && lead.review_count >= 10) score += 15;

  // +10 if at least one social channel.
  if (has(lead.instagram) || has(lead.facebook_url)) score += 10;

  // +10 if we know a real address.
  if (has(lead.address)) score += 10;

  // +5 if they have an audience.
  if (typeof lead.followers === "number" && lead.followers >= 500) score += 5;

  if (score > 100) score = 100;

  let heat;
  if (score >= 70) heat = "HOT";
  else if (score >= 50) heat = "WARM";
  else if (score >= 30) heat = "COOL";
  else if (score >= 10) heat = "COLD";
  else heat = "DEAD";

  return { heat, score };
}

// ---- Landing-page-fit scoring --------------------------------------------

// Second, independent scoring lens. Where computeFitScore rewards businesses
// with NO site (a new-build play), computeLandingScore rewards digital
// maturity: a business with a real site, social presence, lots of reviews and
// a real address is a PRIME landing-page customer (singular CTA pages, often
// several for different product lines). Pure function · no DB, no fetch.
// Returns { landing_heat, landing_score } where score is 0..100.
export function computeLandingScore(lead) {
  let landing_score = 0;
  const has = (v) => v != null && String(v).trim() !== "";
  const cmsLower = lead.cms ? String(lead.cms).toLowerCase() : null;
  const reachableSite = has(lead.current_site) && cmsLower && cmsLower !== "site_unreachable";

  // +25 if they have a reachable current site · they already invest in digital,
  // so a conversion-focused landing page is an upsell they understand.
  if (reachableSite) landing_score += 25;

  // +15 if they run social marketing (Instagram OR Facebook) · understands funnels.
  if (has(lead.instagram) || has(lead.facebook_url)) landing_score += 15;

  // +15 high transaction volume · wants more conversions.
  if (typeof lead.review_count === "number" && lead.review_count >= 50) landing_score += 15;

  // +10 well-rated, real operation.
  if (typeof lead.rating === "number" && lead.rating >= 4.0) landing_score += 10;

  // +15 closeable · a reachable contact channel.
  if (has(lead.whatsapp) || has(lead.phone)) landing_score += 15;

  // +10 real, locatable business.
  if (has(lead.address)) landing_score += 10;

  // +10 an audience to convert.
  if (typeof lead.followers === "number" && lead.followers >= 1000) landing_score += 10;

  if (landing_score > 100) landing_score = 100;

  let landing_heat;
  if (landing_score >= 70) landing_heat = "HOT";
  else if (landing_score >= 50) landing_heat = "WARM";
  else if (landing_score >= 30) landing_heat = "COOL";
  else if (landing_score >= 10) landing_heat = "COLD";
  else landing_heat = "DEAD";

  return { landing_heat, landing_score };
}

// ---- Helpers -------------------------------------------------------------

function candidate(cur, val) {
  return (!cur || !String(cur).trim()) && val != null && String(val).trim() !== "";
}

// Normalize Colombian phone to +57XXXXXXXXXX. Same logic as the CRM coerce().
export function normalizePhone(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith("3")) return "+57" + digits;
  if (digits.length === 12 && digits.startsWith("57")) return "+" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  if (s.startsWith("+")) return "+" + digits;
  return "+" + digits;
}

function cleanHandle(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  // Strip URL prefixes if they came back as a link.
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  s = s.replace(/\/$/, "");
  if (!s.startsWith("@")) s = "@" + s;
  return s;
}
