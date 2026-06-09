// mockup-generator.js · 2026-05-27 · mockup v2
//
// Orchestrator for the new personalized mockup pipeline (Mike: "the auto-
// generated mockup is generic, the hand-built one pulls real data and looks
// much better"). One synchronous call (~1-3 min) that:
//
//   1. Scrapes the lead's existing presence in parallel
//      a) Google Places Details (photos, hours, address, phone, rating)
//      b) Instagram public HTML (profile pic, bio, recent post images)
//      c) Existing website homepage (title, h1/h2, services, og:image)
//   2. Feeds the gathered facts to Claude Sonnet 4.6 with a tight system
//      prompt + a strict JSON schema for the page copy.
//   3. Picks 3-6 hero/gallery images from the scraped pool (preferring real
//      photos over generated ones), and a logo (favicon > IG profile pic >
//      first GBP photo).
//   4. Persists the full blob to leads.mockup_data and sets mockup_status
//      to 'ready' (rich data) or 'needs_review' (thin scrape).
//
// Public entry: POST /api/admin/cockpit/mockup-build/:lead_id
// (wired in portal/src/index.js)

import { scrapeSite } from "./site-scraper.js";
import { scrapeInstagram } from "./instagram-scraper.js";

const CLAUDE_MODEL = "claude-sonnet-4-6";
const CLAUDE_MAX_TOKENS = 4000;
const PLACES_GET_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "internationalPhoneNumber",
  "websiteUri",
  "rating",
  "userRatingCount",
  "regularOpeningHours.weekdayDescriptions",
  "businessStatus",
  "photos",
  "primaryType",
  "primaryTypeDisplayName",
  "editorialSummary",
  "googleMapsUri",
].join(",");
const MAX_GBP_PHOTOS = 15;
const PHOTO_WIDTH = 1600;
const MIN_REAL_IMAGES_BEFORE_AI = 4; // generate AI fillers until we have at least this many

// ---- main entry ----------------------------------------------------------

export async function buildMockup(env, leadId, { regenerate = false } = {}) {
  const lead = await env.DB.prepare(
    "SELECT id, business_name, name, email, phone, whatsapp, category, city, address, " +
    "       current_site, instagram, place_id, rating, review_count, " +
    "       demo_lang, suggested_pitch, pain_reason, language, " +
    "       mockup_status, mockup_data, mockup_generated_at " +
    "  FROM leads WHERE id = ?"
  ).bind(leadId).first();
  if (!lead) return { ok: false, error: "lead not found" };

  // If a mockup is already being generated, don't double-run.
  if (lead.mockup_status === "generating" && !regenerate) {
    return { ok: false, error: "mockup already generating", status: "generating" };
  }

  await setStatus(env, leadId, "generating");

  // ---- 1. parallel scrape ------------------------------------------------
  const [gbp, ig, site] = await Promise.all([
    lead.place_id ? placesDetails(env, lead.place_id) : Promise.resolve({ ok: false, error: "no place_id" }),
    lead.instagram ? scrapeInstagram(lead.instagram) : Promise.resolve({ ok: false, error: "no handle" }),
    lead.current_site ? scrapeSite(lead.current_site) : Promise.resolve({ ok: false, error: "no site" }),
  ]);

  // ---- 2. facts pack for Claude -----------------------------------------
  const facts = buildFactsPack(lead, gbp, ig, site);
  const targetLang = lead.demo_lang === "en" ? "en" : "es";

  // ---- 3. Claude copywriter ---------------------------------------------
  let copy = null;
  let copyError = null;
  try {
    copy = await callClaudeCopywriter(env, facts, targetLang);
  } catch (e) {
    copyError = String(e && e.message || e);
  }

  // ---- 4. image bank ----------------------------------------------------
  const images = buildImageBank({ gbp, ig, site });
  // If scraped photos are thin, generate per-lead AI photos to fill the
  // carousel. Stored in R2 under mockup-img/<lead_id>/<key>.png and served
  // publicly via /mockup-img/<lead_id>/<key>.
  if (images.gallery.length < MIN_REAL_IMAGES_BEFORE_AI) {
    const needed = MIN_REAL_IMAGES_BEFORE_AI - images.gallery.length;
    const generated = await generatePerLeadImages(env, lead, facts, needed);
    generated.forEach((src) => {
      images.gallery.push({ src, source: "ai_generated" });
      if (images.hero.length < 3) images.hero.push({ src, source: "ai_generated" });
    });
  }

  // ---- 5. quality assessment -------------------------------------------
  const diag = {
    ig_ok: !!ig.ok,
    site_ok: !!site.ok,
    gbp_ok: !!gbp.ok,
    photos_found: images.gallery.length,
    has_logo: !!images.logo,
    has_real_hero: !!images.hero[0],
    copy_ok: !!copy,
    copy_error: copyError,
  };
  const thin = !diag.copy_ok || diag.photos_found < 3;
  const finalStatus = !diag.copy_ok ? "error" : (thin ? "needs_review" : "ready");

  const mockup_data = {
    version: 2,
    target_lang: targetLang,
    facts,
    copy,
    images,
    diagnostics: diag,
    generated_at: Date.now(),
  };

  await env.DB.prepare(
    "UPDATE leads SET mockup_data = ?, mockup_status = ?, mockup_generated_at = ?, updated_at = ? WHERE id = ?"
  ).bind(JSON.stringify(mockup_data), finalStatus, mockup_data.generated_at, mockup_data.generated_at, leadId).run();

  return { ok: true, status: finalStatus, diagnostics: diag };
}

async function setStatus(env, leadId, status) {
  try {
    await env.DB.prepare("UPDATE leads SET mockup_status = ?, updated_at = ? WHERE id = ?")
      .bind(status, Date.now(), leadId).run();
  } catch {}
}

// ---- Places Details + photo resolution -----------------------------------

async function placesDetails(env, placeId) {
  if (!env.GOOGLE_PLACES_API_KEY) return { ok: false, error: "no places key" };
  try {
    const r = await fetch("https://places.googleapis.com/v1/places/" + encodeURIComponent(placeId), {
      headers: {
        "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": PLACES_GET_FIELDS,
      },
    });
    if (!r.ok) return { ok: false, error: "HTTP " + r.status };
    const data = await r.json();
    // Resolve photo `name` references to actual media URLs. The Places API
    // (New) photos endpoint redirects to a CDN URL · we capture that redirect
    // with manual redirect mode so we can store the final URL.
    const photoNames = Array.isArray(data.photos) ? data.photos.slice(0, MAX_GBP_PHOTOS) : [];
    const urls = await Promise.all(photoNames.map((p) => resolvePlacePhoto(env, p.name).catch(() => null)));
    const photo_urls = urls.filter(Boolean);
    return {
      ok: true,
      display_name: data.displayName && data.displayName.text || null,
      address: data.formattedAddress || null,
      phone: data.internationalPhoneNumber || null,
      website: data.websiteUri || null,
      rating: data.rating || null,
      review_count: data.userRatingCount || null,
      hours: data.regularOpeningHours && data.regularOpeningHours.weekdayDescriptions || [],
      business_status: data.businessStatus || null,
      primary_type: data.primaryType || null,
      primary_type_label: data.primaryTypeDisplayName && data.primaryTypeDisplayName.text || null,
      editorial_summary: data.editorialSummary && data.editorialSummary.text || null,
      maps_url: data.googleMapsUri || null,
      photo_urls,
    };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}

async function resolvePlacePhoto(env, photoName) {
  if (!photoName) return null;
  const url = "https://places.googleapis.com/v1/" + photoName + "/media?maxWidthPx=" + PHOTO_WIDTH + "&skipHttpRedirect=true&key=" + encodeURIComponent(env.GOOGLE_PLACES_API_KEY);
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  return j && j.photoUri ? j.photoUri : null;
}

// ---- facts pack ----------------------------------------------------------

function buildFactsPack(lead, gbp, ig, site) {
  // Merge contact info, preferring GBP > site > lead row when sources disagree.
  const phone = (gbp.ok && gbp.phone) || (site.ok && site.phones && site.phones[0]) || lead.whatsapp || lead.phone || null;
  const address = (gbp.ok && gbp.address) || lead.address || null;
  const hours = (gbp.ok && gbp.hours && gbp.hours.length) ? gbp.hours : (site.ok ? site.hours_hits : []);
  const business_name = lead.business_name || (gbp.ok && gbp.display_name) || (site.ok && site.title) || "";

  // Services candidates · combine site lists + headings, dedupe.
  const services_seed = [];
  if (site.ok) {
    (site.headings.h2 || []).forEach((s) => services_seed.push(s));
    (site.headings.h3 || []).forEach((s) => services_seed.push(s));
    (site.lists || []).slice(0, 30).forEach((s) => services_seed.push(s));
  }

  // Voice samples · the AI uses these to mirror the business's tone.
  const voice_samples = [];
  if (site.ok && site.description) voice_samples.push(site.description);
  if (ig.ok && ig.bio) voice_samples.push(ig.bio);
  if (gbp.ok && gbp.editorial_summary) voice_samples.push(gbp.editorial_summary);
  if (lead.suggested_pitch) voice_samples.push(lead.suggested_pitch);

  return {
    business_name,
    category: lead.category || (gbp.ok && gbp.primary_type_label) || null,
    city: lead.city || null,
    address,
    phone,
    whatsapp: lead.whatsapp || null,
    email: lead.email || (site.ok && site.emails && site.emails[0]) || null,
    rating: lead.rating || (gbp.ok && gbp.rating) || null,
    review_count: lead.review_count || (gbp.ok && gbp.review_count) || null,
    hours,
    instagram_handle: ig.ok ? ig.handle : (lead.instagram || null),
    instagram_bio: ig.ok ? ig.bio : null,
    site_url: lead.current_site || (gbp.ok && gbp.website) || null,
    site_title: site.ok ? site.title : null,
    site_description: site.ok ? site.description : null,
    services_seed: dedupeShort(services_seed, 30),
    voice_samples: voice_samples.filter(Boolean).slice(0, 4),
    pain_reasons: (lead.pain_reason || "").split(",").map((s) => s.trim()).filter(Boolean),
  };
}

function dedupeShort(arr, max) {
  const seen = new Set(), out = [];
  for (const s of arr || []) {
    const k = String(s).toLowerCase().trim().slice(0, 80);
    if (!k || seen.has(k)) continue;
    seen.add(k); out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

// ---- image bank ----------------------------------------------------------

function buildImageBank({ gbp, ig, site }) {
  // Priority order: GBP (best quality) > IG (real prospect photos) > site.
  const gallery = [];
  if (gbp.ok && Array.isArray(gbp.photo_urls)) gbp.photo_urls.forEach((u) => gallery.push({ src: u, source: "gbp" }));
  if (ig.ok && Array.isArray(ig.posts)) ig.posts.forEach((p) => gallery.push({ src: p.thumb, source: "ig" }));
  if (site.ok && site.og_image) gallery.push({ src: site.og_image, source: "site_og" });
  if (site.ok && Array.isArray(site.images)) site.images.forEach((u) => gallery.push({ src: u, source: "site_img" }));

  // Dedupe by URL stem. Filter chrome (sprite, icon, favicon · NOT 'logo'
  // anymore, that filter rejected too many real photos for businesses whose
  // CMS named photo folders /logo-photos/ etc.).
  const seen = new Set();
  const clean = gallery.filter((g) => {
    if (!g.src) return false;
    const stem = g.src.split("?")[0].toLowerCase();
    if (seen.has(stem)) return false; seen.add(stem);
    if (/\b(sprite|icon|favicon)\b/.test(stem)) return false;
    return true;
  }).slice(0, 16);

  const logo = pickLogo({ site, ig, gbp });
  const hero = clean.slice(0, 3);
  return { logo, hero, gallery: clean };
}

function pickLogo({ site, ig, gbp }) {
  if (ig.ok && ig.profile_pic) return ig.profile_pic;
  if (site.ok && site.favicon && !/favicon\.ico$/i.test(site.favicon)) return site.favicon;
  if (gbp.ok && gbp.photo_urls && gbp.photo_urls[0]) return gbp.photo_urls[0];
  if (site.ok && site.favicon) return site.favicon;
  return null;
}

// ---- per-lead AI image generation ----------------------------------------
//
// When the scrape returns fewer than MIN_REAL_IMAGES_BEFORE_AI photos, we
// fill the gap with Gemini-generated images keyed on this specific business
// (category, city, services). Stored in R2 under
// `mockup-img/<lead_id>/<slot>.png` and served publicly via
// `/mockup-img/<lead_id>/<slot>` (route added in portal/src/index.js).
//
// House rule: prompts ask for photorealistic, no text, no watermark, no
// logos. Latin-American context is requested explicitly so the model doesn't
// default to North-American small-town aesthetics.

const PER_LEAD_PROMPT_BASES = {
  drogueria:    "interior of a clean modern neighborhood pharmacy in Colombia, friendly pharmacist behind the counter, shelves stocked with products, warm lighting, photorealistic",
  veterinaria:  "interior of a clean modern veterinary clinic in Colombia, a vet examining a small dog while the owner watches, warm professional lighting, photorealistic",
  dental:       "interior of a bright modern dental clinic in Colombia, a smiling patient in the chair while a dentist works, teal and white interior, natural light, photorealistic",
  estetica:     "interior of a clean modern beauty / aesthetic clinic in Colombia, a professional applying a facial treatment to a relaxed client, soft natural light, photorealistic",
  restaurante:  "interior of a warm welcoming Colombian restaurant, friendly server delivering food to a happy table, golden hour lighting, photorealistic",
  ferreteria:   "interior of a well-organized hardware store in a Colombian neighborhood, shelves of tools and supplies, a smiling clerk helping a customer, photorealistic",
  peluqueria:   "interior of a clean modern barbershop in Colombia, a barber finishing a customer's haircut, warm light, photorealistic",
  gimnasio:     "interior of a modern small Colombian gym, a member working out while a trainer spots, natural light, photorealistic",
  electricista: "a friendly electrician in a uniform working safely on residential wiring in a Colombian home, photorealistic",
  plomero:      "a friendly plumber fixing a sink in a Colombian home, professional and tidy, photorealistic",
  generic:      "photorealistic interior of a welcoming small Colombian business, friendly staff helping a happy customer, warm natural lighting",
};

function pickPromptKey(facts) {
  const cat = String(facts.category || "").toLowerCase();
  if (/drogueria|farmacia|pharmacy/.test(cat)) return "drogueria";
  if (/veterinaria|vet/.test(cat)) return "veterinaria";
  if (/odonto|dental|dentist/.test(cat)) return "dental";
  if (/estetic|spa|belleza|skin/.test(cat)) return "estetica";
  if (/restaur|comida|cafe|café|food/.test(cat)) return "restaurante";
  if (/ferret|hardware|materiales|construc/.test(cat)) return "ferreteria";
  if (/peluquer|barber/.test(cat)) return "peluqueria";
  if (/gym|gimnasio|fit/.test(cat)) return "gimnasio";
  if (/electric/.test(cat)) return "electricista";
  if (/plomer|fontan/.test(cat)) return "plomero";
  return "generic";
}

const PER_LEAD_VARIATIONS = [
  "wide establishing shot",
  "medium shot of staff serving a customer",
  "close-up of products or service being performed",
  "exterior storefront from across the street at golden hour",
];

const IMG_MODELS = [
  "gemini-2.5-flash-image-preview",
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.0-flash-exp-image-generation",
];

async function generatePerLeadImages(env, lead, facts, n) {
  if (!env.GEMINI_API_KEY || !env.ASSETS) return [];
  const promptKey = pickPromptKey(facts);
  const base = PER_LEAD_PROMPT_BASES[promptKey] || PER_LEAD_PROMPT_BASES.generic;
  const city = facts.city ? " in " + facts.city + ", Colombia" : " in Colombia";
  const biz = facts.business_name ? " for a small business called '" + facts.business_name + "'" : "";
  const out = [];
  for (let i = 0; i < Math.min(n, 4); i++) {
    const variation = PER_LEAD_VARIATIONS[i % PER_LEAD_VARIATIONS.length];
    const prompt = base + ", " + variation + biz + city + ". No text, no watermarks, no logos, no brand names. Photorealistic, natural composition.";
    const slot = "hero-" + (i + 1);
    const r = await runImageGen(env, prompt);
    if (!r.ok) continue;
    try {
      const r2Key = "mockup-img/" + lead.id + "/" + slot + ".png";
      await env.ASSETS.put(r2Key, r.bytes, { httpMetadata: { contentType: r.mime || "image/png" } });
      out.push("https://mockups.pymewebpro.com/mockup-img/" + lead.id + "/" + slot);
    } catch (e) { /* skip this slot */ }
  }
  return out;
}

async function runImageGen(env, prompt) {
  const errors = [];
  for (const model of IMG_MODELS) {
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + env.GEMINI_API_KEY, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }),
      });
      if (!r.ok) { errors.push(model + ": " + r.status); continue; }
      const data = await r.json();
      const parts = ((((data.candidates || [])[0] || {}).content) || {}).parts || [];
      let b64 = null, mime = "image/png";
      for (const p of parts) { if (p.inlineData && p.inlineData.data) { b64 = p.inlineData.data; mime = p.inlineData.mimeType || mime; break; } }
      if (!b64) { errors.push(model + ": no image"); continue; }
      let bytes;
      try { bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); }
      catch { errors.push(model + ": decode fail"); continue; }
      return { ok: true, bytes, mime, model };
    } catch (e) { errors.push(model + ": " + String(e && e.message || e)); }
  }
  return { ok: false, error: errors.join(" | ") };
}

// ---- manual upload path -------------------------------------------------
//
// When IG scraping fails (Meta's login wall, rate limits) Mike can drop
// screenshots / downloaded photos directly onto the card. Each file is
// stored in R2 under `mockup-img/<lead_id>/upload-<n>.<ext>` and pushed
// into mockup_data.images.gallery so the carousel picks it up immediately.
// No need to regenerate the whole mockup (which would cost Claude + Gemini).

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;    // 8MB · IG screenshots are small, this is plenty
const MAX_UPLOADS_PER_LEAD = 20;             // hard cap so a stuck-on-paste loop can't fill R2
const ALLOWED_CT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function uploadMockupImage(env, leadId, request) {
  if (!env.ASSETS) return { ok: false, error: "ASSETS bucket not configured" };
  const ct = String(request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  const ext = ALLOWED_CT[ct];
  if (!ext) return { ok: false, error: "unsupported content-type: " + ct };

  // Read body with the cap.
  const buf = await request.arrayBuffer();
  if (buf.byteLength === 0) return { ok: false, error: "empty body" };
  if (buf.byteLength > MAX_UPLOAD_BYTES) return { ok: false, error: "too large (" + buf.byteLength + " > " + MAX_UPLOAD_BYTES + ")" };

  // Load current mockup_data so we can append the new URL and enforce caps.
  const lead = await env.DB.prepare("SELECT id, mockup_data FROM leads WHERE id = ?").bind(leadId).first();
  if (!lead) return { ok: false, error: "lead not found" };
  let mockup = {};
  try { mockup = lead.mockup_data ? JSON.parse(lead.mockup_data) : {}; } catch {}
  if (!mockup.images) mockup.images = { logo: null, hero: [], gallery: [] };
  if (!Array.isArray(mockup.images.gallery)) mockup.images.gallery = [];
  const existingUploads = mockup.images.gallery.filter((g) => g && g.source === "upload").length;
  if (existingUploads >= MAX_UPLOADS_PER_LEAD) return { ok: false, error: "upload cap reached (" + MAX_UPLOADS_PER_LEAD + ")" };

  // Pick the next slot number that isn't taken.
  let slotN = existingUploads + 1;
  while (slotN < 100) {
    const candidate = "upload-" + slotN;
    const taken = (mockup.images.gallery || []).some((g) => g && typeof g.src === "string" && g.src.indexOf("/" + candidate + "?") !== -1) ||
                  (mockup.images.gallery || []).some((g) => g && typeof g.src === "string" && g.src.endsWith("/" + candidate));
    if (!taken) break;
    slotN++;
  }
  const slot = "upload-" + slotN;
  const r2Key = "mockup-img/" + leadId + "/" + slot + "." + ext;

  try {
    await env.ASSETS.put(r2Key, buf, { httpMetadata: { contentType: ct } });
  } catch (e) {
    return { ok: false, error: "R2 put failed: " + String(e && e.message || e) };
  }

  // Public URL · cache-busted with a timestamp so the carousel sees the new
  // image right after upload (R2 + browser cache can otherwise lag).
  const stamp = Date.now();
  const src = "https://mockups.pymewebpro.com/mockup-img/" + leadId + "/" + slot + "?v=" + stamp;

  mockup.images.gallery.unshift({ src, source: "upload", uploaded_at: stamp });
  // Hero gets the upload too if there's space (uploads are usually the best
  // photos · they were hand-picked by Mike/Santi).
  if (!Array.isArray(mockup.images.hero)) mockup.images.hero = [];
  mockup.images.hero.unshift({ src, source: "upload", uploaded_at: stamp });
  mockup.images.hero = mockup.images.hero.slice(0, 3);
  mockup.generated_at = stamp;

  // If the mockup has no status yet, set 'ready' (an upload alone is enough
  // to get a card out of the 'needs_review' state).
  let nextStatus = null;
  if (!mockup.copy || !mockup.copy.hero) {
    // No AI copy yet · keep current status untouched, just save images.
    nextStatus = null;
  } else {
    nextStatus = "ready";
  }

  const updateSql = nextStatus
    ? "UPDATE leads SET mockup_data = ?, mockup_status = ?, mockup_generated_at = ?, updated_at = ? WHERE id = ?"
    : "UPDATE leads SET mockup_data = ?, mockup_generated_at = ?, updated_at = ? WHERE id = ?";
  const binds = nextStatus
    ? [JSON.stringify(mockup), nextStatus, stamp, stamp, leadId]
    : [JSON.stringify(mockup), stamp, stamp, leadId];
  await env.DB.prepare(updateSql).bind(...binds).run();

  return { ok: true, slot, src, uploads: mockup.images.gallery.filter((g) => g.source === "upload").length };
}

export async function deleteMockupImage(env, leadId, slot) {
  if (!env.ASSETS) return { ok: false, error: "ASSETS bucket not configured" };
  const safeSlot = String(slot || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  if (!safeSlot) return { ok: false, error: "bad slot" };
  // R2 stores with an extension · try the common ones.
  for (const ext of ["png", "jpg", "webp", "gif"]) {
    try { await env.ASSETS.delete("mockup-img/" + leadId + "/" + safeSlot + "." + ext); } catch {}
  }
  // Strip from mockup_data.images.gallery + hero.
  const lead = await env.DB.prepare("SELECT id, mockup_data FROM leads WHERE id = ?").bind(leadId).first();
  if (!lead) return { ok: false, error: "lead not found" };
  let mockup = {};
  try { mockup = lead.mockup_data ? JSON.parse(lead.mockup_data) : {}; } catch {}
  if (mockup.images) {
    const matcher = (g) => g && typeof g.src === "string" && g.src.indexOf("/" + safeSlot + "?") === -1 && !g.src.endsWith("/" + safeSlot);
    if (Array.isArray(mockup.images.gallery)) mockup.images.gallery = mockup.images.gallery.filter(matcher);
    if (Array.isArray(mockup.images.hero))    mockup.images.hero    = mockup.images.hero.filter(matcher);
  }
  await env.DB.prepare("UPDATE leads SET mockup_data = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(mockup), Date.now(), leadId).run();
  return { ok: true };
}

// Public serving · called from index.js when the worker sees /mockup-img/...
// Tries each allowed extension since AI-generated images are .png but manual
// uploads can be jpg / webp / gif. First match wins.
export async function servePerLeadImage(env, leadId, slot) {
  if (!env.ASSETS) return new Response("not configured", { status: 500 });
  const safeSlot = String(slot || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  if (!safeSlot) return new Response("bad slot", { status: 400 });
  for (const ext of ["png", "jpg", "webp", "gif"]) {
    try {
      const obj = await env.ASSETS.get("mockup-img/" + leadId + "/" + safeSlot + "." + ext);
      if (!obj) continue;
      return new Response(obj.body, {
        headers: {
          "Content-Type": (obj.httpMetadata && obj.httpMetadata.contentType) || ("image/" + (ext === "jpg" ? "jpeg" : ext)),
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch (e) { /* try next extension */ }
  }
  return new Response("not found", { status: 404 });
}

// ---- Claude copywriter ---------------------------------------------------

const SYSTEM_PROMPT_ES = [
  "Eres el redactor de PymeWebPro, un estudio colombiano que arma páginas de ventas para pymes en Colombia (COP, mercado local).",
  "Tu trabajo: dado los datos REALES de un prospecto (Google Business Profile, Instagram, sitio actual), redactas el contenido de una página personalizada que lee como SU página, no como un template.",
  "",
  "Reglas de voz, no negociables:",
  "- Honesto, específico, ligeramente entendido. NUNCA marketing hueco ('líder', 'experiencia premium', 'world-class', 'navegar', 'aprovecha').",
  "- CERO em-dashes (U+2014). Usa comas, puntos, dos puntos o ' · '.",
  "- Si no tienes un dato, NO lo inventes. Mejor omites la sección que rellenas con genéricos.",
  "- Habla en la voz de NEGOCIO al cliente, no en la voz de PymeWebPro vendiéndole servicios.",
  "- Concreto sobre lo que el negocio HACE, NO sobre cómo se ven las páginas web.",
  "- Si el negocio tiene un tono particular en su IG/sitio, espeja ese tono.",
  "",
  "Salida: SIEMPRE un objeto JSON estricto que cumpla EXACTAMENTE este esquema (sin texto antes ni después):",
  "{",
  '  "hero": {',
  '    "eyebrow":  "texto corto que ubica el negocio, ej. \\"Droguería · Simón Bolívar, Medellín\\". Máx 60 caracteres.",',
  '    "headline": "h1 de 6-10 palabras, en la voz del negocio. NO uses la palabra \\"página\\".",',
  '    "subhead":  "1-2 oraciones que digan qué hace y por qué llamarlos. Máx 240 caracteres.",',
  '    "chips":    ["tres frases muy cortas, máx 30 caracteres cada una, beneficios concretos. ej. \\"Domicilios gratis\\""],',
  '    "cta_primary": "1-3 palabras, ej. \\"Pide o consulta\\""',
  "  },",
  '  "services": [',
  '    { "name": "Nombre del servicio, 2-4 palabras", "body": "1-2 oraciones específicas sobre ESE servicio, no genéricas" }',
  "  ],",
  '  "featured_service": null OR {',
  '    "kicker":  "etiqueta corta, ej. \\"El servicio que más nos piden\\"",',
  '    "title":   "título de la sección",',
  '    "body":    "1-2 párrafos que profundicen en el servicio destacado",',
  '    "checklist": ["3-5 ítems concretos, ej. \\"Tu fórmula o receta médica vigente\\""]',
  "  },",
  '  "delivery": null OR { "title": "...", "body": "...", "steps": [{"n":"01","title":"...","body":"..."}] },',
  '  "contact": {',
  '    "address_lines": ["línea 1", "línea 2 ciudad"],',
  '    "hours_lines":   ["Lun a Sáb · 9 a 7", "Domingo cerrado"],',
  '    "whatsapp":      "+57 ...",',
  '    "instagram":     "@handle"',
  "  },",
  '  "footer_blurb": "1 oración corta que cierre la página."',
  "}",
  "",
  "Services: 3 a 5 ítems. Si los datos solo soportan 2 servicios reales, devuelve 2 (no inventes).",
  "featured_service y delivery: opcional, devuelve null si no hay datos para fundamentar uno bueno.",
  "Idioma: ESPAÑOL, voz colombiana neutra (sin modismos paisas marcados a menos que el sample de voz lo justifique).",
].join("\n");

const SYSTEM_PROMPT_EN = [
  "You are the copywriter for PymeWebPro, a Colombian web studio building sales pages for Colombian SMBs.",
  "Your job: given REAL data on a prospect (Google Business Profile, Instagram, current site), write the content for a personalized page that reads like THEIR page, not a template.",
  "",
  "Voice rules, non-negotiable:",
  "- Honest, specific, slightly understated. NEVER marketing-speak ('leading', 'premier', 'world-class', 'leverage', 'unlock', 'navigate as metaphor').",
  "- ZERO em-dashes (U+2014). Use commas, periods, colons, or ' · '.",
  "- If you don't have a fact, DON'T invent it. Omit the section rather than fill it with generics.",
  "- Speak in the BUSINESS's voice to its customer, NOT in PymeWebPro's voice selling services.",
  "- Concrete about what the business DOES, not about how web pages look.",
  "",
  "Output: ALWAYS a strict JSON object matching this exact schema (no prose before or after). Same fields as the Spanish version, written in English.",
].join("\n");

async function callClaudeCopywriter(env, facts, targetLang) {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");
  const system = targetLang === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_ES;
  const userMsg = buildFactsForPrompt(facts, targetLang);

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error("Anthropic " + r.status + ": " + err.slice(0, 400));
  }
  const data = await r.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  // Extract JSON from the response.
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("model did not return JSON");
  let parsed;
  try { parsed = JSON.parse(m[0]); }
  catch (e) { throw new Error("invalid JSON from model: " + String(e.message || e)); }
  return scrubEmDashes(parsed);
}

function buildFactsForPrompt(facts, targetLang) {
  const lines = [];
  lines.push(targetLang === "en" ? "Data on the prospect:" : "Datos del prospecto:");
  lines.push("");
  lines.push("- " + (targetLang === "en" ? "Business name" : "Nombre del negocio") + ": " + (facts.business_name || "(unknown)"));
  if (facts.category) lines.push("- " + (targetLang === "en" ? "Category" : "Categoría") + ": " + facts.category);
  if (facts.city)     lines.push("- " + (targetLang === "en" ? "City" : "Ciudad") + ": " + facts.city);
  if (facts.address)  lines.push("- " + (targetLang === "en" ? "Address" : "Dirección") + ": " + facts.address);
  if (facts.phone)    lines.push("- " + (targetLang === "en" ? "Phone" : "Teléfono") + ": " + facts.phone);
  if (facts.whatsapp) lines.push("- WhatsApp: " + facts.whatsapp);
  if (facts.instagram_handle) lines.push("- Instagram: @" + facts.instagram_handle);
  if (facts.instagram_bio)    lines.push("- " + (targetLang === "en" ? "IG bio" : "Bio de IG") + ": " + facts.instagram_bio);
  if (facts.site_url)         lines.push("- " + (targetLang === "en" ? "Site" : "Sitio") + ": " + facts.site_url);
  if (facts.site_title)       lines.push("- " + (targetLang === "en" ? "Site title" : "Título del sitio") + ": " + facts.site_title);
  if (facts.site_description) lines.push("- " + (targetLang === "en" ? "Site description" : "Descripción del sitio") + ": " + facts.site_description);
  if (facts.rating)   lines.push("- Google rating: " + facts.rating + (facts.review_count ? " (" + facts.review_count + ")" : ""));
  if (Array.isArray(facts.hours) && facts.hours.length) {
    lines.push("- " + (targetLang === "en" ? "Hours" : "Horario") + ":");
    facts.hours.forEach((h) => lines.push("    " + h));
  }
  if (Array.isArray(facts.services_seed) && facts.services_seed.length) {
    lines.push("- " + (targetLang === "en" ? "Candidate service / heading strings scraped from the site (USE THESE, dedupe, choose the 3-5 that read as real services, ignore navigation chrome and footer noise)" : "Strings candidatos de servicios / títulos del sitio (USA ESTOS, dedupe, elige los 3-5 que se leen como servicios reales, ignora ruido de navegación y footer)") + ":");
    facts.services_seed.slice(0, 20).forEach((s) => lines.push("    • " + s));
  }
  if (Array.isArray(facts.voice_samples) && facts.voice_samples.length) {
    lines.push("- " + (targetLang === "en" ? "Voice samples from the business (mirror this tone)" : "Muestras de voz del negocio (espeja este tono)") + ":");
    facts.voice_samples.forEach((s) => lines.push("    \"" + s + "\""));
  }
  if (Array.isArray(facts.pain_reasons) && facts.pain_reasons.length) {
    lines.push("- " + (targetLang === "en" ? "Pains we want the page to soothe (subtle, don't beat the customer over the head)" : "Dolores que la página debe resolver (sutil, no machacar)") + ": " + facts.pain_reasons.join(", "));
  }
  lines.push("");
  lines.push(targetLang === "en"
    ? "Write the JSON for this prospect's page. Specific to THIS business. No invented facts. No em-dashes."
    : "Escribe el JSON para la página de ESTE prospecto. Específico para ESTE negocio. Sin inventar. Sin em-dashes.");
  return lines.join("\n");
}

// Codepoints referenced via \u escapes so this source file stays em-dash-free
// under a literal grep (house rule). U+2014 = em dash, U+2013 = en dash.
const __EM_DASH_RE = new RegExp(String.fromCharCode(0x2014), "g");
const __EN_DASH_RE = new RegExp(String.fromCharCode(0x2013), "g");
function scrubEmDashes(obj) {
  if (obj == null) return obj;
  if (typeof obj === "string") return obj.replace(__EM_DASH_RE, ", ").replace(__EN_DASH_RE, "-");
  if (Array.isArray(obj)) return obj.map(scrubEmDashes);
  if (typeof obj === "object") {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = scrubEmDashes(obj[k]);
    return out;
  }
  return obj;
}
