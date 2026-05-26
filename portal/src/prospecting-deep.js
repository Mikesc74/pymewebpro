// prospecting-deep.js · "second discovery path" for the leads list.
//
// What Places gives us (prospecting.js → runBulkProspectBatch): businesses that
// registered themselves on Google Maps. What it misses: the IG-only / FB-only /
// classified-ad-only / nothing-but-a-WhatsApp-number tradesperson. This module
// fills that gap by doing a web search for each (vertical, city) combo, fetching
// the top result pages, and regex-extracting a Colombian mobile + a business
// name + (if present) an Instagram handle. Lands the rows in `leads` with
// `source='outbound-deep'` so they sit alongside the Places sweep but you can
// filter on the source to see how each channel does.
//
// Decision (2026-05-26 per Mike): build now while the first Places sweep
// drains, so we can compare what each path surfaces.
//
// PROVIDER: Google Programmable Search Engine (CSE). We chose Google over
// Brave/SerpAPI because Mike already runs Google APIs for Places, and Custom
// Search can use the same Google Cloud project (just enable the API on it).
// Free tier: 100 queries/day, then $5 per 1000. The single-call endpoint here
// uses 3 query variants per (vertical, city) by default, so 100 free queries
// covers ~33 combos/day. The provider is abstracted via `searchWeb()` so we can
// swap to Brave or SerpAPI later by changing one function.
//
// REQUIRED WORKER SECRETS / VARS (add via `wrangler secret put` for the secret,
// or under [vars] in wrangler.toml for the cx which is not secret):
//   GOOGLE_SEARCH_API_KEY    · secret · Google Cloud API key with Custom Search
//                              API enabled (can be the same project as the
//                              Places key; enable the API and authorize the key
//                              for it).
//   GOOGLE_CSE_CX            · plain var · the Programmable Search Engine id
//                              from cse.google.com (configure to "Search the
//                              entire web").
//
// USAGE:
//   POST /api/admin/prospecting/deep-discover
//   Body: { vertical: "electricista", city: "medellin", limit?: 15 }
//   Returns: { ok, inserted, skipped_existing, skipped_no_phone, found,
//              queries, sample_lead_ids }
//
// The handler runs synchronously (no queue yet). If the results look good,
// next iteration can add a `prospecting_deep_jobs` queue + cron drain like the
// Places bulk runner.

import { computeFitScore, computeLandingScore, normalizePhone } from "./enrich.js";

// City + vertical labels come from the same map prospecting.js owns. We import
// at runtime to avoid a circular import; pass them in from the handler.
import { INDUSTRY_SEEDS, CITY_DISPLAY } from "./prospecting-shared.js";

// ---------------------------------------------------------------------------
// Search provider (Google CSE)
// ---------------------------------------------------------------------------

const CSE_URL = "https://www.googleapis.com/customsearch/v1";

async function searchWeb(env, query, { num = 10 } = {}) {
  // Reuse the existing Places API key if a dedicated search key isn't set ·
  // requires the same Google Cloud project to have Custom Search API enabled
  // and the key to allow it (or not be API-restricted).
  const apiKey = env.GOOGLE_SEARCH_API_KEY || env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !env.GOOGLE_CSE_CX) {
    throw new Error("Need GOOGLE_CSE_CX (and GOOGLE_SEARCH_API_KEY or GOOGLE_PLACES_API_KEY) on the worker");
  }
  const url = new URL(CSE_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", env.GOOGLE_CSE_CX);
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(Math.min(num, 10)));
  url.searchParams.set("cr", "countryCO");
  url.searchParams.set("gl", "co");
  url.searchParams.set("hl", "es");

  const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CSE ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((it) => ({
    url: it.link || "",
    title: it.title || "",
    snippet: it.snippet || "",
  })).filter((r) => r.url);
}

// Build 3 query variants per (vertical, city) for recall. The CSE is already
// site-restricted in its config (Instagram, Facebook, Civico, Páginas Amarillas,
// OLX, MercadoLibre, Computrabajo, TikTok, LinkedIn, YouTube, X), so we don't
// need site: filters in the query · we just send the bare query and let the
// engine search across the configured platforms.
function buildQueries(verticalLabel, cityDisplay) {
  const v = verticalLabel;
  const c = cityDisplay;
  return [
    `"${v}" "${c}"`,
    `"${v}" "+57" "${c}"`,
    `"${v}" "${c}" WhatsApp`,
  ];
}

// ---------------------------------------------------------------------------
// Page fetch + extract
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 8000;
const FETCH_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchPage(url) {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      method: "GET",
      headers: { "user-agent": FETCH_UA, "accept": "text/html,application/xhtml+xml" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(to);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml") && !ct.includes("text/plain")) {
      return null;
    }
    const text = await res.text();
    // Cap the body we regex-scan, some pages are huge.
    return text.length > 250_000 ? text.slice(0, 250_000) : text;
  } catch (_e) {
    return null;
  }
}

// Colombian mobile numbers start with 3 and have 10 digits total. The optional
// 57 country prefix may be written +57, 57, "+57 ", "(+57)" etc. We capture
// the 10-digit core and reject anything that doesn't lead with 3.
const PHONE_RE = /(?:\+?\s*57[\s\-().]*)?(3\d{2})[\s\-().]*(\d{3})[\s\-().]*(\d{4})/g;

function extractFirstMobile(text) {
  if (!text) return null;
  PHONE_RE.lastIndex = 0;
  let m;
  while ((m = PHONE_RE.exec(text)) !== null) {
    const ten = m[1] + m[2] + m[3];
    if (ten.length === 10 && ten[0] === "3") {
      return "+57" + ten;
    }
  }
  return null;
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function metaContent(html, prop) {
  // Handles property="og:..." and name="..." in either attr order.
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`,
    "i"
  );
  let m = re.exec(html);
  if (m) return decodeEntities(m[1]).trim();
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`,
    "i"
  );
  m = re2.exec(html);
  return m ? decodeEntities(m[1]).trim() : null;
}

function extractName(html, fallbackTitle) {
  const candidates = [
    metaContent(html, "og:site_name"),
    metaContent(html, "og:title"),
    metaContent(html, "twitter:title"),
  ].filter(Boolean);
  if (!candidates.length) {
    // Try <title>.
    const t = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
    if (t) candidates.push(decodeEntities(t[1]).trim());
  }
  if (!candidates.length) candidates.push(fallbackTitle || "");
  let name = candidates[0] || "";
  // Trim common social-platform suffixes / prefixes.
  name = name
    .replace(/\s*[\|\-·]\s*(Instagram|Facebook|OLX|Civico|TuCarro|Páginas Amarillas)\b.*$/i, "")
    .replace(/\s*\(@[^)]+\)\s*[•·]?\s*Instagram.*$/i, "")
    .replace(/\s*on\s+Instagram.*$/i, "")
    .replace(/\s+•\s+Instagram photos and videos.*$/i, "")
    .trim();
  // Collapse whitespace, drop trailing punctuation.
  name = name.replace(/\s+/g, " ").replace(/[\s\|\-·•]+$/, "").trim();
  return name || null;
}

function instagramHandleFromUrl(url) {
  try {
    const u = new URL(url);
    if (!/(^|\.)instagram\.com$/i.test(u.hostname)) return null;
    const path = u.pathname.replace(/\/+$/, "").replace(/^\/+/, "");
    if (!path) return null;
    const first = path.split("/")[0].toLowerCase();
    // Reject post / reel / explore / etc.
    if (["p", "reel", "reels", "explore", "stories", "tv", "accounts", "directory"].includes(first)) {
      return null;
    }
    if (!/^[a-z0-9._]{1,30}$/.test(first)) return null;
    return "@" + first;
  } catch (_e) {
    return null;
  }
}

function looksLikeFacebookPage(url) {
  try {
    const u = new URL(url);
    return /(^|\.)facebook\.com$/i.test(u.hostname);
  } catch (_e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Dedup + insert
// ---------------------------------------------------------------------------

const BULK_MAX_DEEP_INSERTS = 60;
const DEEP_INSERTS_PER_CALL = 30;

async function existsByPhone(env, phoneDigits) {
  if (!phoneDigits) return false;
  const like = "%" + phoneDigits.slice(-10) + "%";
  const r = await env.DB.prepare(
    "SELECT id FROM leads WHERE phone LIKE ? OR whatsapp LIKE ? LIMIT 1"
  ).bind(like, like).first();
  return !!r;
}

async function existsByNameCity(env, name, cityDisplay) {
  if (!name) return false;
  const r = await env.DB.prepare(
    "SELECT id FROM leads WHERE LOWER(business_name) = ? AND LOWER(city) = ? LIMIT 1"
  ).bind(name.toLowerCase(), cityDisplay.toLowerCase()).first();
  return !!r;
}

function uuid() {
  // Cloudflare Workers crypto.randomUUID is supported.
  return crypto.randomUUID();
}

async function insertDeepLead(env, lead) {
  const id = uuid();
  const now = Date.now();
  const leadState = {
    business_name: lead.business_name,
    phone: lead.phone || null,
    whatsapp: lead.phone || null,
    instagram: lead.instagram || null,
    current_site: lead.current_site || null,
    rating: null,
    review_count: null,
    address: null,
    place_id: null,
  };
  const { heat, score } = computeFitScore(leadState);
  const { landing_heat, landing_score } = computeLandingScore(leadState);
  const metadata = JSON.stringify({
    discovery: {
      provider: "google-cse",
      vertical: lead.vertical,
      city: lead.city,
      source_url: lead.source_url,
      query: lead.query,
      discovered_at: now,
    },
  });
  await env.DB.prepare(
    "INSERT OR IGNORE INTO leads (" +
    "  id, source, business_name, language, status, lead_stage, " +
    "  phone, whatsapp, instagram, " +
    "  category, city, current_site, " +
    "  heat, score, landing_heat, landing_score, " +
    "  on_today_list, touches_count, " +
    "  metadata, created_at, updated_at, last_enriched_at" +
    ") VALUES (" +
    "  ?, 'outbound-deep', ?, 'es', 'new', 'new', " +
    "  ?, ?, ?, " +
    "  ?, ?, ?, " +
    "  ?, ?, ?, ?, " +
    "  0, 0, " +
    "  ?, ?, ?, ?)"
  ).bind(
    id,
    lead.business_name,
    lead.phone || null,
    lead.phone || null,
    lead.instagram || null,
    lead.vertical,
    lead.city,
    lead.current_site || null,
    heat,
    score,
    landing_heat,
    landing_score,
    metadata,
    now, now, now,
  ).run();
  return id;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function discoverDeep(env, opts) {
  const verticalSlug = String(opts.vertical || "").toLowerCase().trim();
  const citySlug = String(opts.city || "").toLowerCase().trim();
  if (!INDUSTRY_SEEDS[verticalSlug]) {
    return { ok: false, error: "Unknown vertical: " + verticalSlug };
  }
  if (!CITY_DISPLAY[citySlug]) {
    return { ok: false, error: "Unknown city: " + citySlug };
  }
  const limit = Math.max(1, Math.min(Number(opts.limit) || DEEP_INSERTS_PER_CALL, BULK_MAX_DEEP_INSERTS));
  const verticalLabel = INDUSTRY_SEEDS[verticalSlug];
  const cityDisplay = CITY_DISPLAY[citySlug];

  const queries = buildQueries(verticalLabel, cityDisplay);

  // Gather all search results across the variants, dedup URLs.
  const seenUrls = new Set();
  const candidates = [];
  for (const q of queries) {
    let results = [];
    try {
      results = await searchWeb(env, q, { num: 10 });
    } catch (e) {
      // Surface the first hard error so the caller knows the API isn't set up.
      return { ok: false, error: e.message, queries_attempted: q };
    }
    for (const r of results) {
      if (!seenUrls.has(r.url)) {
        seenUrls.add(r.url);
        candidates.push({ ...r, query: q });
      }
    }
  }

  // Fetch + extract from each candidate, capped at `limit` successful inserts.
  let inserted = 0;
  let skipped_existing = 0;
  let skipped_no_phone = 0;
  const sample_lead_ids = [];

  for (const cand of candidates) {
    if (inserted >= limit) break;

    // IG handle is cheaply available straight from the URL (no fetch needed).
    const igHandle = instagramHandleFromUrl(cand.url);

    let phone = null;
    let name = null;
    let current_site = null;

    const html = await fetchPage(cand.url);
    if (html) {
      phone = extractFirstMobile(html);
      name = extractName(html, cand.title);
      // For non-IG/FB hosts, treat the URL as the candidate's site.
      if (!igHandle && !looksLikeFacebookPage(cand.url)) {
        try { current_site = new URL(cand.url).origin; } catch (_e) {}
      }
    } else {
      // Couldn't fetch · still extract a phone from the snippet (sometimes
      // Google returns the number directly in the description) and the name
      // from the title.
      phone = extractFirstMobile(cand.snippet);
      name = (cand.title || "").trim() || null;
    }
    if (!phone) { skipped_no_phone += 1; continue; }
    if (!name) { skipped_no_phone += 1; continue; }

    const phoneDigits = (phone || "").replace(/\D/g, "");
    if (await existsByPhone(env, phoneDigits)) { skipped_existing += 1; continue; }
    if (await existsByNameCity(env, name, cityDisplay)) { skipped_existing += 1; continue; }

    try {
      const id = await insertDeepLead(env, {
        business_name: name,
        phone,
        instagram: igHandle,
        current_site,
        vertical: verticalSlug,
        city: cityDisplay,
        source_url: cand.url,
        query: cand.query,
      });
      inserted += 1;
      if (sample_lead_ids.length < 5) sample_lead_ids.push(id);
    } catch (e) {
      // Insert failure on one row shouldn't kill the whole run.
      skipped_existing += 1;
      console.error("deep-insert failed:", e && e.message);
    }
  }

  return {
    ok: true,
    inserted,
    skipped_existing,
    skipped_no_phone,
    found_candidates: candidates.length,
    queries,
    sample_lead_ids,
    vertical: verticalSlug,
    city: citySlug,
  };
}

// ---------------------------------------------------------------------------
// HTTP handler (wired from handleProspecting in prospecting.js)
// ---------------------------------------------------------------------------

export async function handleDeepDiscover(request, env, json) {
  let body = {};
  try { body = await request.json(); } catch (_e) { body = {}; }
  const r = await discoverDeep(env, body || {});
  return json(r, r.ok ? 200 : 400);
}
