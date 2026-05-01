// mockups.js — mockup generation, share links, comments, and ship-to-Pages.
// Designed to be added to pymewebpro-portal as a new module.
//
// Reuses portal helpers from utils.js: json, isAdmin, randomToken, uuid, sha256, escapeHtml.
// Reuses portal bindings: env.DB (D1), env.ASSETS (R2 = pymewebpro-client-assets).
// New env vars: ANTHROPIC_API_KEY (required for Claude), CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID (required for ship-to-Pages).
//
// Schema (run once against pymewebpro-portal D1):
//   mockups, mockup_shares, mockup_comments — see mockups-schema.sql

import { BLUEPRINTS } from "./blueprint.js";
import { renderPrivacyEs, renderPrivacyEn, renderTermsEs, renderTermsEn, renderRobots, renderSitemap } from "./legal.js";

// ─── Helpers (replace these imports with your portal's utils.js exports) ────
// import { json, isAdmin, randomToken, uuid, sha256, escapeHtml } from "./utils.js";
// (The portal already exports these — keep this comment for reference when integrating.)

const SYSTEM_PROMPT_BASE = `Eres un editor copy senior de PymeWebPro. Recibes datos crudos de un cliente colombiano (PyME) y devuelves un JSON listo para alimentar un blueprint HTML.
Reglas:
- Español colombiano natural, profesional pero cálido. NO suene a IA. Frases cortas.
- Si datos faltan, INVENTA piezas razonables y conservadoras (no exageres).
- Servicios: máximo 6, cada uno 2-4 palabras.
- "tagline": 6-12 palabras, beneficio claro, no cliché.
- Colores: si el cliente da hex/nombres, conviértelos a hex; si no, elige una paleta apropiada al sector (primary + accent + ink + bg).
Campos básicos (Esencial): businessName, tagline, industry, services, phone, email, address, hours, instagram, facebook, primary, accent, ink, bg, ctaPhone, ctaWhatsapp, testimonials (array de {name, quote, role} si los datos del cliente los incluyen, si no [])`;

const SYSTEM_PROMPT_PRO_EXTRA = `
ADEMÁS, este cliente es plan CRECIMIENTO (Growth). Los datos del cliente contienen una sección "growth" con campos opcionales. Para cada campo:
- Si el cliente proporcionó un valor → inclúyalo TAL CUAL (no modifique URLs ni IDs).
- Si está vacío → OMITA la clave del JSON (no invente URLs/IDs).

Campos esperados de la sección growth:
- bookingsUrl: URL de Calendly / Cal.com / sistema de reservas
- pdfUrl + pdfLabel: link a un catálogo / menú PDF y la etiqueta del botón
- waCatalogUrl: link al catálogo de WhatsApp Business
- newsletterUrl: endpoint POST del formulario de suscripción
- ga4Id: ID de Google Analytics 4 (formato G-XXXXXXXX)
- metaPixelId: ID del Meta Pixel (números)

Adicionalmente, los campos "_parsedTestimonials" y "_parsedFaqs" ya están parseados como arrays de objetos en los datos crudos. Cópialos directamente al JSON como "testimonials" y "faqs" (no los re-parsee, no los modifique). Si están vacíos, devuelva [].`;

function systemPromptFor(plan) {
  const isPro = String(plan || "").toLowerCase() === "pro" || String(plan || "").toLowerCase() === "crecimiento" || String(plan || "").toLowerCase() === "growth";
  return SYSTEM_PROMPT_BASE + (isPro ? "\n\n" + SYSTEM_PROMPT_PRO_EXTRA : "") + `\n\nDevuelve SOLO JSON, sin markdown ni texto adicional.`;
}

// ─── Public dispatch (called from index.js) ─────────────────────────────────

export async function handleMockups(req, env, ctx, helpers) {
  // helpers = { json, isAdmin, randomToken, uuid, sha256, escapeHtml }
  const url = new URL(req.url);
  const p = url.pathname;
  const m = req.method;

  // Custom-domain serving — if the request Host matches a custom_domain, route to that client's site
  const reqHost = (req.headers.get("host") || "").toLowerCase().replace(/^www\./, "");
  const knownHosts = ["portal.pymewebpro.com", "pymewebpro.com"];
  if (m === "GET" && reqHost && !knownHosts.includes(reqHost) && !reqHost.endsWith(".workers.dev")) {
    const customSite = await env.DB.prepare(
      "SELECT slug FROM live_sites WHERE custom_domain = ? AND r2_prefix != ''",
    ).bind(reqHost).first();
    if (customSite) {
      return serveLiveSite(env, customSite.slug, p === "" ? "/" : p);
    }
  }

  // Live customer sites at /site/<slug>/...
  let mt = p.match(/^\/site\/([a-z0-9-]+)(\/.*)?$/);
  if (mt && m === "GET") return serveLiveSite(env, mt[1], mt[2] || "/");

  // Public newsletter signup endpoint (used by deployed customer sites)
  mt = p.match(/^\/api\/newsletter\/([A-Za-z0-9-]+)$/);
  if (mt && m === "POST") return newsletterSubscribe(env, helpers, mt[1], req);
  if (mt && m === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });

  // Public preview viewer (signed share token)
  mt = p.match(/^\/m\/([A-Za-z0-9_-]+)\/?$/);
  if (mt && m === "GET") return previewIndex(env, helpers, mt[1], "es");
  mt = p.match(/^\/m\/([A-Za-z0-9_-]+)\/en\/?$/);
  if (mt && m === "GET") return previewIndex(env, helpers, mt[1], "en");
  mt = p.match(/^\/m\/([A-Za-z0-9_-]+)\/asset\/(.+)$/);
  if (mt && m === "GET") return previewAsset(env, mt[1], decodeURIComponent(mt[2]));
  mt = p.match(/^\/m\/([A-Za-z0-9_-]+)\/en\/asset\/(.+)$/);
  if (mt && m === "GET") return previewAsset(env, mt[1], decodeURIComponent(mt[2]));
  mt = p.match(/^\/api\/m\/([A-Za-z0-9_-]+)\/comment$/);
  if (mt && m === "POST") return previewComment(env, helpers, mt[1], req);
  // Generic preview file (legal pages, etc) — must be last among /m/ routes
  mt = p.match(/^\/m\/([A-Za-z0-9_-]+)\/(.+)$/);
  if (mt && m === "GET") return previewFile(env, mt[1], mt[2]);

  // Admin (require isAdmin)
  if (p.startsWith("/api/admin/mockups") || p.startsWith("/api/admin/clients/") && p.includes("/mockups")) {
    if (!helpers.isAdmin(req, env)) return helpers.json({ error: "unauthorized" }, 401);

    mt = p.match(/^\/api\/admin\/clients\/([A-Za-z0-9-]+)\/mockups$/);
    if (mt && m === "POST") return generateForClient(env, helpers, mt[1], req);
    if (mt && m === "GET") return listForClient(env, helpers, mt[1]);

    mt = p.match(/^\/api\/admin\/mockups\/([A-Za-z0-9-]+)$/);
    if (mt && m === "GET") return getMockup(env, helpers, mt[1]);

    mt = p.match(/^\/api\/admin\/mockups\/([A-Za-z0-9-]+)\/share$/);
    if (mt && m === "POST") return createShare(env, helpers, mt[1], req);

    mt = p.match(/^\/api\/admin\/mockups\/([A-Za-z0-9-]+)\/comments$/);
    if (mt && m === "GET") return listComments(env, helpers, mt[1]);

    mt = p.match(/^\/api\/admin\/mockups\/([A-Za-z0-9-]+)\/regenerate$/);
    if (mt && m === "POST") return regenerate(env, helpers, mt[1], req);

    mt = p.match(/^\/api\/admin\/mockups\/([A-Za-z0-9-]+)\/preflight$/);
    if (mt && m === "GET") return preflightMockup(env, helpers, mt[1]);

    mt = p.match(/^\/api\/admin\/mockups\/([A-Za-z0-9-]+)\/ship$/);
    if (mt && m === "POST") return shipMockup(env, helpers, mt[1], req);

    mt = p.match(/^\/api\/admin\/clients\/([A-Za-z0-9-]+)\/site\/disable$/);
    if (mt && m === "POST") return disableSite(env, helpers, mt[1], req);

    mt = p.match(/^\/api\/admin\/clients\/([A-Za-z0-9-]+)\/site\/enable$/);
    if (mt && m === "POST") return enableSite(env, helpers, mt[1]);

    mt = p.match(/^\/api\/admin\/clients\/([A-Za-z0-9-]+)\/domain$/);
    if (mt && m === "POST") return attachDomain(env, helpers, mt[1], req);
    if (mt && m === "DELETE") return detachDomain(env, helpers, mt[1]);
  }

  return null; // fall through to portal's existing dispatcher
}

// ─── Generation ─────────────────────────────────────────────────────────────

async function generateForClient(env, helpers, clientId, req) {
  const client = await env.DB.prepare("SELECT id, business_name, plan FROM clients WHERE id = ?")
    .bind(clientId).first();
  if (!client) return helpers.json({ error: "client not found" }, 404);

  // Pull intake from `submissions` table (one row per section, each `data` is JSON)
  const subs = await env.DB.prepare("SELECT section, data FROM submissions WHERE client_id = ?")
    .bind(clientId).all();
  const intake = { _client_business_name: client.business_name };
  for (const row of subs.results || []) {
    try { intake[row.section] = JSON.parse(row.data); } catch { intake[row.section] = row.data; }
  }

  // Pull asset URLs (logo, photos, pdf)
  const assets = await env.DB.prepare(
    "SELECT id, category, filename, r2_key FROM files WHERE client_id = ? AND category IN ('logo','photo','pdf') ORDER BY uploaded_at DESC",
  ).bind(clientId).all();
  const logo = (assets.results || []).find((a) => a.category === "logo");
  const photos = (assets.results || []).filter((a) => a.category === "photo").slice(0, 6);
  const pdf = (assets.results || []).find((a) => a.category === "pdf");

  // Ask Claude for the blueprint input (plan-aware)
  const plan = String(client.plan || "esencial").toLowerCase();
  const isPro = plan === "pro" || plan === "crecimiento" || plan === "growth";
  const filled = await callClaude(env, intake, plan);

  // Wire asset URLs (served via /m/<token>/asset/<filename>)
  if (logo) filled.logoUrl = `./asset/${encodeURIComponent(safeName(logo))}`;
  filled.galleryUrls = photos.map((p) => `./asset/${encodeURIComponent(safeName(p))}`);
  // Per-photo alt text — split the visual.photoAlts textarea by lines
  const altLines = String((intake.visual || {}).photoAlts || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  filled.galleryAlts = photos.map((_p, idx) => altLines[idx] || `${(intake.business||{}).bizName || client.business_name} ${idx + 1}`);

  // Always pass through structured trust signals from intake (Claude shouldn't
  // translate or invent these — they're factual/legal identifiers).
  // (`business` and `contact` are declared further down for legalData; reuse later.)
  filled.nit = (intake.business || {}).nit || filled.nit || "";
  filled.legalRepresentative = (intake.business || {}).legalRepresentative || filled.legalRepresentative || "";
  filled.address = (intake.contact || {}).address || filled.address || "";
  filled.camara = (intake.business || {}).camara || ""; // optional Cámara de Comercio line
  // Override pdfUrl with the uploaded file if present (preferred over any text URL)
  if (isPro && pdf) {
    filled.pdfUrl = `./asset/${encodeURIComponent(safeName(pdf))}`;
    filled.pdfLabel = filled.pdfLabel || (intake.growth || {}).pdfLabel || "PDF";
  }
  // Newsletter — wire to portal endpoint when enabled
  const newsletterEnabled = isPro && ((intake.growth || {}).newsletterEnabled === "1" || (intake.growth || {}).newsletterEnabled === true);
  if (newsletterEnabled) {
    filled.newsletterEnabled = true;
    filled.newsletterEndpoint = `${env.APP_URL || "https://portal.pymewebpro.com"}/api/newsletter/${clientId}`;
  } else {
    filled.newsletterEnabled = false;
    filled.newsletterEndpoint = "";
  }

  // Bilingual generation (Growth only, when checkbox is on)
  const bilingual = isPro && (intake.growth || {}).bilingual === "1";

  // Determine version
  const last = await env.DB.prepare("SELECT MAX(version) as v FROM mockups WHERE client_id = ?")
    .bind(clientId).first();
  const version = (last && last.v ? last.v : 0) + 1;

  const id = helpers.uuid();
  const r2Prefix = `mockups/${clientId}/${id}`;
  const r2Key = `${r2Prefix}/index.html`;

  // Render Spanish (primary)
  const render = BLUEPRINTS["blueprint-1"];
  const filledEs = { ...filled, language: "es" };
  if (bilingual) filledEs.bilingualAltHref = "./en/";
  const htmlEs = render(filledEs, { plan });
  await env.ASSETS.put(r2Key, htmlEs, { httpMetadata: { contentType: "text/html; charset=utf-8" } });

  // Legal data shared by privacy/terms pages
  const business = intake.business || {};
  const contact = intake.contact || {};
  const legalData = {
    businessName: filledEs.businessName || business.bizName || client.business_name,
    nit: business.nit || "",
    legalRepresentative: business.legalRepresentative || "",
    email: contact.email || "",
    phone: contact.phone || "",
    address: contact.address || "",
    primary: filledEs.primary, ink: filledEs.ink, bg: filledEs.bg,
  };

  // Spanish legal pages (always)
  await env.ASSETS.put(`${r2Prefix}/politica-privacidad.html`, renderPrivacyEs(legalData),
    { httpMetadata: { contentType: "text/html; charset=utf-8" } });
  await env.ASSETS.put(`${r2Prefix}/terminos.html`, renderTermsEs(legalData),
    { httpMetadata: { contentType: "text/html; charset=utf-8" } });

  // robots.txt + sitemap.xml — siteUrl placeholder (live URL substituted at ship time)
  // For preview, we use a relative-ish placeholder; live serving rewrites these via deploy step.
  const siteUrl = `${env.APP_URL || "https://portal.pymewebpro.com"}/site/{{slug}}`;
  await env.ASSETS.put(`${r2Prefix}/robots.txt`, renderRobots(siteUrl),
    { httpMetadata: { contentType: "text/plain; charset=utf-8" } });
  await env.ASSETS.put(`${r2Prefix}/sitemap.xml`, renderSitemap(siteUrl, bilingual),
    { httpMetadata: { contentType: "application/xml; charset=utf-8" } });

  // Render English (Growth bilingual only)
  if (bilingual) {
    const enFilled = await translateToEnglish(env, filledEs);
    enFilled.language = "en";
    enFilled.bilingualAltHref = "../";
    // EN HTML lives in en/, asset paths go up one level
    if (logo) enFilled.logoUrl = `../asset/${encodeURIComponent(safeName(logo))}`;
    enFilled.galleryUrls = photos.map((p) => `../asset/${encodeURIComponent(safeName(p))}`);
    if (pdf) enFilled.pdfUrl = `../asset/${encodeURIComponent(safeName(pdf))}`;
    const htmlEn = render(enFilled, { plan });
    await env.ASSETS.put(`${r2Prefix}/en/index.html`, htmlEn, { httpMetadata: { contentType: "text/html; charset=utf-8" } });
    await env.ASSETS.put(`${r2Prefix}/en/privacy.html`, renderPrivacyEn(legalData),
      { httpMetadata: { contentType: "text/html; charset=utf-8" } });
    await env.ASSETS.put(`${r2Prefix}/en/terms.html`, renderTermsEn(legalData),
      { httpMetadata: { contentType: "text/html; charset=utf-8" } });
  }

  // Copy assets into mockup folder (shared by both languages)
  for (const a of [logo, ...photos, pdf].filter(Boolean)) {
    const obj = await env.ASSETS.get(a.r2_key);
    if (!obj) continue;
    await env.ASSETS.put(`${r2Prefix}/asset/${safeName(a)}`, obj.body, {
      httpMetadata: { contentType: obj.httpMetadata?.contentType || "application/octet-stream" },
    });
  }

  await env.DB.prepare(`
    INSERT INTO mockups (id, client_id, version, blueprint_key, html_r2_key, prompt, anthropic_model, status, created_by)
    VALUES (?, ?, ?, 'blueprint-1', ?, ?, ?, 'draft', 'admin')
  `).bind(id, clientId, version, r2Key, JSON.stringify(intake).slice(0, 4000), env.ANTHROPIC_API_KEY ? "claude-sonnet-4-6" : "fallback").run();

  return helpers.json({ id, version, html_r2_key: r2Key });
}

async function regenerate(env, helpers, mockupId, req) {
  const m = await env.DB.prepare("SELECT client_id FROM mockups WHERE id = ?").bind(mockupId).first();
  if (!m) return helpers.json({ error: "not found" }, 404);
  // Same as generate, but the admin can pass a body { instruction } that gets prepended to intake notes.
  const body = await req.json().catch(() => ({}));
  if (body.instruction) {
    // append instruction into a synthetic submissions row (section='_revision_notes')
    await env.DB.prepare(`
      INSERT INTO submissions (client_id, section, data, updated_at)
      VALUES (?, '_revision_notes', ?, ?)
      ON CONFLICT(client_id, section) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at
    `).bind(m.client_id, JSON.stringify({ note: body.instruction }), Date.now()).run();
  }
  return generateForClient(env, helpers, m.client_id, req);
}

function parseTestimonials(text) {
  if (!text || typeof text !== "string") return [];
  return text.split(/\r?\n/).map(line => {
    const parts = line.split("|").map(s => s.trim());
    if (!parts[0]) return null;
    return { name: parts[0], quote: parts[1] || "", role: parts[2] || "" };
  }).filter(t => t && t.quote);
}

function parseFaqs(text) {
  if (!text || typeof text !== "string") return [];
  return text.split(/\r?\n/).map(line => {
    const idx = line.indexOf("|");
    if (idx < 0) return null;
    const q = line.slice(0, idx).trim();
    const a = line.slice(idx + 1).trim();
    if (!q || !a) return null;
    return { q, a };
  }).filter(Boolean);
}

async function callClaude(env, intake, plan) {
  const isPro = String(plan || "").toLowerCase() === "pro" || String(plan || "").toLowerCase() === "crecimiento" || String(plan || "").toLowerCase() === "growth";
  // Always pre-parse Growth structured fields so both Claude and the fallback have them
  const growth = intake.growth || {};
  intake._parsedTestimonials = parseTestimonials(growth.testimonials);
  intake._parsedFaqs = parseFaqs(growth.faqs);

  if (!env.ANTHROPIC_API_KEY) {
    // Dev fallback — produce something reasonable from raw intake
    const biz = intake.business || {};
    const tech = intake.tech || {};
    const visual = intake.visual || {};
    const content = intake.content || {};
    const out = {
      businessName: biz.bizName || intake._client_business_name || "Su Negocio",
      tagline: biz.tagline || biz.whatYouDo || "Su negocio, en línea.",
      industry: biz.audience || "Servicios",
      services: String(biz.whatYouDo || "").split(/[\n,]+/).map(s => s.trim()).filter(Boolean).slice(0, 6),
      phone: (intake.contact || {}).phone,
      email: (intake.contact || {}).email,
      address: (intake.contact || {}).address,
      instagram: (intake.contact || {}).ig,
      facebook: (intake.contact || {}).fb,
      ctaPhone: (intake.contact || {}).phone,
      ctaWhatsapp: (intake.contact || {}).whatsapp,
      primary: "#003893", accent: "#fcd116", ink: "#0a1840", bg: "#fbfaf6",
      testimonials: intake._parsedTestimonials,
      faqs: intake._parsedFaqs,
    };
    if (isPro) {
      out.bookingsUrl = growth.bookingsUrl;
      out.pdfUrl = growth.pdfUrl;
      out.pdfLabel = growth.pdfLabel;
      out.waCatalogUrl = growth.waCatalogUrl;
      out.newsletterUrl = growth.newsletterUrl;
      out.newsletterEnabled = !!growth.newsletterUrl;
      out.ga4Id = growth.ga4Id;
      out.metaPixelId = growth.metaPixelId;
    }
    return out;
  }
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPromptFor(plan),
      messages: [{ role: "user", content: `Plan: ${isPro ? "CRECIMIENTO" : "ESENCIAL"}\n\nDatos crudos del cliente:\n${JSON.stringify(intake, null, 2)}` }],
    }),
  });
  const j = await r.json();
  const text = j?.content?.[0]?.text || "{}";
  const match = text.match(/\{[\s\S]*\}/);
  try { return JSON.parse(match ? match[0] : "{}"); } catch { return {}; }
}

// ─── Listing / fetching ─────────────────────────────────────────────────────

async function listForClient(env, helpers, clientId) {
  const rows = await env.DB.prepare(
    "SELECT id, version, status, html_r2_key, shipped_at, shipped_url, created_at FROM mockups WHERE client_id = ? ORDER BY version DESC",
  ).bind(clientId).all();
  return helpers.json({ mockups: rows.results || [] });
}

async function getMockup(env, helpers, mockupId) {
  const m = await env.DB.prepare("SELECT * FROM mockups WHERE id = ?").bind(mockupId).first();
  if (!m) return helpers.json({ error: "not found" }, 404);
  const shares = await env.DB.prepare(
    "SELECT token, expires_at, view_count, last_viewed_at, revoked, created_at FROM mockup_shares WHERE mockup_id = ? ORDER BY created_at DESC",
  ).bind(mockupId).all();
  const comments = await env.DB.prepare(
    "SELECT id, section, body, author, status, created_at FROM mockup_comments WHERE mockup_id = ? ORDER BY created_at DESC",
  ).bind(mockupId).all();
  return helpers.json({ mockup: m, shares: shares.results || [], comments: comments.results || [] });
}

// ─── Share links ────────────────────────────────────────────────────────────

async function createShare(env, helpers, mockupId, req) {
  const body = await req.json().catch(() => ({}));
  const ttlDays = Number(body.ttl_days || 7);
  const token = helpers.randomToken(20);
  const expiresAt = Math.floor(Date.now() / 1000) + ttlDays * 86400;
  await env.DB.prepare(
    "INSERT INTO mockup_shares (token, mockup_id, expires_at) VALUES (?, ?, ?)",
  ).bind(token, mockupId, expiresAt).run();
  const url = `${env.APP_URL || "https://portal.pymewebpro.com"}/m/${token}/`;
  return helpers.json({ token, url, expires_at: expiresAt });
}

async function loadShare(env, token) {
  const link = await env.DB.prepare(
    "SELECT token, mockup_id, expires_at, revoked FROM mockup_shares WHERE token = ?",
  ).bind(token).first();
  if (!link || link.revoked) return null;
  if (link.expires_at < Math.floor(Date.now() / 1000)) return null;
  return link;
}

async function previewIndex(env, helpers, token, language) {
  const link = await loadShare(env, token);
  if (!link) return new Response("Enlace caducado o no válido", { status: 404 });
  const m = await env.DB.prepare("SELECT html_r2_key FROM mockups WHERE id = ?").bind(link.mockup_id).first();
  if (!m) return new Response("Mockup no encontrado", { status: 404 });
  let key = m.html_r2_key;
  if (language === "en") {
    // EN at <prefix>/en/index.html — derive prefix from the stored ES key
    const prefix = key.replace(/\/index\.html$/, "");
    key = `${prefix}/en/index.html`;
  }
  const obj = await env.ASSETS.get(key);
  if (!obj) return new Response("Mockup no encontrado", { status: 404 });
  let body = await obj.text();
  body = injectCommentWidget(body, token);
  // Bump view count async
  env.DB.prepare("UPDATE mockup_shares SET view_count = view_count + 1, last_viewed_at = ? WHERE token = ?")
    .bind(Math.floor(Date.now() / 1000), token).run().catch(() => {});
  return new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });
}

async function previewAsset(env, token, name) {
  const link = await loadShare(env, token);
  if (!link) return new Response("not found", { status: 404 });
  const m = await env.DB.prepare("SELECT html_r2_key FROM mockups WHERE id = ?").bind(link.mockup_id).first();
  if (!m) return new Response("not found", { status: 404 });
  // Assets live at <prefix>/asset/<name>, shared by ES and EN
  const prefix = m.html_r2_key.replace(/\/index\.html$/, "");
  const obj = await env.ASSETS.get(`${prefix}/asset/${name}`);
  if (!obj) return new Response("not found", { status: 404 });
  return new Response(obj.body, {
    headers: { "content-type": obj.httpMetadata?.contentType || "application/octet-stream" },
  });
}

// Generic preview file (legal pages, robots.txt, sitemap.xml, etc.)
async function previewFile(env, token, subpath) {
  const link = await loadShare(env, token);
  if (!link) return new Response("not found", { status: 404 });
  const m = await env.DB.prepare("SELECT html_r2_key FROM mockups WHERE id = ?").bind(link.mockup_id).first();
  if (!m) return new Response("not found", { status: 404 });
  const prefix = m.html_r2_key.replace(/\/index\.html$/, "");
  const obj = await env.ASSETS.get(`${prefix}/${subpath}`);
  if (!obj) return new Response("not found", { status: 404 });
  const ct = obj.httpMetadata?.contentType || guessType("/" + subpath);
  return new Response(obj.body, { headers: { "content-type": ct } });
}

// ─── Bilingual translation via Claude ───────────────────────────────────────
async function translateToEnglish(env, esFilled) {
  const out = { ...esFilled };
  if (!env.ANTHROPIC_API_KEY) {
    // No-API fallback: shallow English-ish defaults; better than nothing
    return out;
  }
  const TRANSLATABLE = ["tagline", "industry"];
  const arrayOfObjs = ["testimonials", "faqs"];
  const sysPrompt = `You translate Colombian Spanish marketing copy into natural US English for a small-business website. Keep brand names, URLs, IDs, hex colors, addresses, and phone numbers EXACTLY as-is. Translate only the human-readable strings provided. Return SOLO JSON con la misma forma del input, sin markdown ni texto adicional.`;
  const payload = {
    tagline: esFilled.tagline,
    industry: esFilled.industry,
    services: Array.isArray(esFilled.services) ? esFilled.services : [],
    testimonials: Array.isArray(esFilled.testimonials) ? esFilled.testimonials.map(t => ({ name: t.name, quote: t.quote, role: t.role || "" })) : [],
    faqs: Array.isArray(esFilled.faqs) ? esFilled.faqs.map(f => ({ q: f.q, a: f.a })) : [],
    pdfLabel: esFilled.pdfLabel || "",
  };
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", max_tokens: 1500,
        system: sysPrompt,
        messages: [{ role: "user", content: `Translate to natural US English (return JSON only):\n${JSON.stringify(payload)}` }],
      }),
    });
    const j = await r.json();
    const text = j?.content?.[0]?.text || "{}";
    const match = text.match(/\{[\s\S]*\}/);
    const t = JSON.parse(match ? match[0] : "{}");
    if (t.tagline) out.tagline = t.tagline;
    if (t.industry) out.industry = t.industry;
    if (Array.isArray(t.services) && t.services.length) out.services = t.services;
    if (Array.isArray(t.testimonials)) out.testimonials = t.testimonials;
    if (Array.isArray(t.faqs)) out.faqs = t.faqs;
    if (t.pdfLabel) out.pdfLabel = t.pdfLabel;
  } catch (_) { /* fall through with ES values */ }
  return out;
}

async function previewComment(env, helpers, token, req) {
  const link = await loadShare(env, token);
  if (!link) return helpers.json({ error: "invalid" }, 401);
  const body = await req.json().catch(() => ({}));
  if (!body.comment) return helpers.json({ error: "comment required" }, 400);
  const id = helpers.uuid();
  await env.DB.prepare(
    "INSERT INTO mockup_comments (id, mockup_id, share_token, section, body, author) VALUES (?, ?, ?, ?, ?, 'client')",
  ).bind(id, link.mockup_id, token, body.section || null, body.comment).run();
  return helpers.json({ ok: true, id });
}

async function listComments(env, helpers, mockupId) {
  const rows = await env.DB.prepare(
    "SELECT id, section, body, author, status, created_at FROM mockup_comments WHERE mockup_id = ? ORDER BY created_at DESC",
  ).bind(mockupId).all();
  return helpers.json({ comments: rows.results || [] });
}

// ─── Pre-flight validator ───────────────────────────────────────────────────

// WCAG contrast ratio between two hex colors. Returns a number ≥ 1.
function contrastRatio(hex1, hex2) {
  function lum(hex) {
    const h = String(hex || "").replace(/^#/, "").padEnd(6, "0").slice(0, 6);
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const conv = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * conv(r) + 0.7152 * conv(g) + 0.0722 * conv(b);
  }
  const l1 = lum(hex1), l2 = lum(hex2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

async function preflightMockup(env, helpers, mockupId) {
  const m = await env.DB.prepare("SELECT id, client_id, html_r2_key FROM mockups WHERE id = ?")
    .bind(mockupId).first();
  if (!m) return helpers.json({ error: "not found" }, 404);

  const client = await env.DB.prepare("SELECT id, plan, business_name, deliverables_state FROM clients WHERE id = ?")
    .bind(m.client_id).first();
  if (!client) return helpers.json({ error: "client not found" }, 404);
  const plan = String(client.plan || "esencial").toLowerCase();
  const isPro = plan === "pro" || plan === "crecimiento" || plan === "growth";

  const errors = [];
  const warnings = [];

  // ── Asset checks ─────────────────────────────────────────────────────────
  const assets = await env.DB.prepare(
    "SELECT category FROM files WHERE client_id = ?",
  ).bind(client.id).all();
  const cats = (assets.results || []).map(a => a.category);
  if (!cats.includes("logo")) errors.push({ code: "no_logo", msg: "Falta el logo del cliente." });
  if (!cats.includes("photo")) warnings.push({ code: "no_photos", msg: "Sin fotos del negocio (la galería se omitirá)." });

  // ── Intake checks ────────────────────────────────────────────────────────
  const subs = await env.DB.prepare("SELECT section, data FROM submissions WHERE client_id = ?")
    .bind(client.id).all();
  const intake = {};
  for (const row of subs.results || []) {
    try { intake[row.section] = JSON.parse(row.data); } catch { intake[row.section] = row.data; }
  }
  const biz = intake.business || {};
  const contact = intake.contact || {};
  const growth = intake.growth || {};

  if (!biz.bizName) errors.push({ code: "no_biz_name", msg: "Falta el nombre del negocio." });
  if (!biz.tagline && !biz.whatYouDo) warnings.push({ code: "no_tagline", msg: "Sin tagline ni descripción — la página se verá vacía." });
  if (!contact.phone && !contact.email && !contact.whatsapp) errors.push({ code: "no_contact", msg: "Sin teléfono, email ni WhatsApp — el sitio no tendrá manera de contactar." });

  // NIT / Cámara — required for full Ley 1581 compliance on the customer site
  if (!biz.nit) warnings.push({ code: "no_nit", msg: "Sin NIT/cédula — la política de privacidad mostrará '[NIT no proporcionado]' y el footer no incluirá identificación legal." });

  const services = String(biz.whatYouDo || "").split(/[\n,]+/).filter(s => s.trim());
  if (services.length < 3) warnings.push({ code: "few_services", msg: `Solo ${services.length} servicios listados — recomendado mínimo 3.` });

  // Color contrast (WCAG AA ≥ 4.5:1 for normal text)
  // Pull whatever colors the latest mockup decided on
  try {
    const lastMockup = await env.DB.prepare("SELECT prompt FROM mockups WHERE id = ?").bind(mockupId).first();
    const promptObj = lastMockup?.prompt ? JSON.parse(lastMockup.prompt) : null;
    if (promptObj && promptObj.primary && promptObj.bg) {
      const cr = contrastRatio(promptObj.primary, promptObj.bg);
      if (cr < 3) errors.push({ code: "low_contrast", msg: `Contraste primary↔bg = ${cr.toFixed(2)}:1 — texto ilegible (WCAG AA exige ≥ 4.5:1).` });
      else if (cr < 4.5) warnings.push({ code: "borderline_contrast", msg: `Contraste primary↔bg = ${cr.toFixed(2)}:1 — pasa WCAG AA Large pero no normal text. Considere oscurecer primary o aclarar bg.` });
    }
    if (promptObj && promptObj.ink && promptObj.bg) {
      const cr = contrastRatio(promptObj.ink, promptObj.bg);
      if (cr < 4.5) errors.push({ code: "low_contrast_text", msg: `Contraste ink↔bg = ${cr.toFixed(2)}:1 — texto principal ilegible (WCAG AA ≥ 4.5:1).` });
    }
  } catch (_) { /* prompt JSON malformed — skip contrast check */ }

  // Trust signals — at least one social proof must exist or sales suffer
  const testimonialsText = (intake.growth || {}).testimonials || "";
  const hasTestimonials = testimonialsText.split(/\r?\n/).filter(l => l.includes("|")).length > 0;
  if (!hasTestimonials && !cats.includes("photo")) {
    warnings.push({ code: "no_social_proof", msg: "Sin testimonios ni fotos — el sitio carecerá de prueba social." });
  }

  // ── HTML checks (fetch the rendered ES mockup and inspect) ───────────────
  const obj = await env.ASSETS.get(m.html_r2_key);
  if (!obj) {
    errors.push({ code: "html_missing", msg: "El HTML del mockup no está en R2 — regenere." });
  } else {
    const html = await obj.text();
    if (!/<h1\b/i.test(html)) errors.push({ code: "no_h1", msg: "No hay <h1> — mal para SEO." });
    if (!/<meta\s+name=["']description["']/i.test(html)) errors.push({ code: "no_meta_desc", msg: "Falta meta description." });
    if (!/property=["']og:image["']/i.test(html)) warnings.push({ code: "no_og_image", msg: "Sin og:image — se verá feo en WhatsApp/Facebook." });
    // Imgs without alt
    const imgMatches = [...html.matchAll(/<img\b[^>]*>/gi)];
    const imgsNoAlt = imgMatches.filter(m => !/alt=/.test(m[0]) || /alt=["']\s*["']/.test(m[0]));
    if (imgsNoAlt.length) warnings.push({ code: "imgs_no_alt", msg: `${imgsNoAlt.length} imagen(es) sin texto alt — accesibilidad y SEO.` });
    // No mixed content
    if (/src=["']http:\/\//i.test(html) || /href=["']http:\/\/(?!schema\.org)/i.test(html)) {
      warnings.push({ code: "mixed_content", msg: "Hay URLs http:// (no https) en el HTML." });
    }
    if (!/politica-privacidad/i.test(html)) warnings.push({ code: "no_privacy_link", msg: "No se ve un link a política de privacidad." });
  }

  // ── Pro-only checks ──────────────────────────────────────────────────────
  if (isPro) {
    const hasBookings = !!growth.bookingsUrl;
    const hasPdf = cats.includes("pdf");
    const hasNewsletter = growth.newsletterEnabled === "1";
    const hasWaCatalog = !!growth.waCatalogUrl;
    const proFeatures = [hasBookings, hasPdf, hasNewsletter, hasWaCatalog].filter(Boolean).length;
    if (proFeatures === 0) {
      errors.push({ code: "no_pro_feature", msg: "Plan Crecimiento requiere al menos una de: reservas, PDF, newsletter, o catálogo WhatsApp." });
    }
    if (!growth.ga4Id) warnings.push({ code: "no_ga4", msg: "Sin GA4 ID — no medirá tráfico." });
    if (!growth.metaPixelId) warnings.push({ code: "no_pixel", msg: "Sin Meta Pixel — no medirá conversiones de Facebook/Instagram ads." });

    if (growth.bilingual === "1") {
      const enKey = m.html_r2_key.replace(/\/index\.html$/, "/en/index.html");
      const enObj = await env.ASSETS.head(enKey).catch(() => null);
      if (!enObj) errors.push({ code: "no_en_version", msg: "Versión bilingüe activada pero no hay /en/index.html — regenere." });
    }
  }

  // ── Deliverables checklist (require status 'done' or 'na' for plan items) ─
  // The portal already filters DELIVERABLES by plan via deliverablesForPlan(plan).
  // We mirror the same plan filter here using deliverables_state from the client row.
  let state = {};
  try { state = client.deliverables_state ? JSON.parse(client.deliverables_state) : {}; } catch (_) {}
  // We don't have direct access to DELIVERABLES from this module, so we scan whatever keys exist in state
  // and count those that are pending/in_progress (not done/na).
  const incomplete = [];
  for (const [key, status] of Object.entries(state)) {
    if (status !== "done" && status !== "na") incomplete.push(key);
  }
  if (incomplete.length > 0) {
    warnings.push({ code: "deliverables_pending", msg: `${incomplete.length} item(s) de la checklist sin terminar (Pendiente o En curso).` });
  }

  return helpers.json({
    plan,
    errors,
    warnings,
    canShip: errors.length === 0,
  });
}

// ─── Ship to live (R2-served at /site/<slug>/) ─────────────────────────────

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "site";
}

async function uniqueSlug(env, base, clientId) {
  const existing = await env.DB.prepare("SELECT slug FROM live_sites WHERE client_id = ?")
    .bind(clientId).first();
  if (existing) return existing.slug;
  let slug = base;
  for (let i = 0; i < 100; i++) {
    const conflict = await env.DB.prepare("SELECT 1 as one FROM live_sites WHERE slug = ?")
      .bind(slug).first();
    if (!conflict) return slug;
    slug = `${base}-${i + 2}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function copyR2Prefix(env, srcPrefix, dstPrefix) {
  let cursor;
  do {
    const res = await env.ASSETS.list({ prefix: srcPrefix, cursor });
    for (const obj of res.objects) {
      const dstKey = dstPrefix + obj.key.slice(srcPrefix.length);
      const src = await env.ASSETS.get(obj.key);
      if (!src) continue;
      await env.ASSETS.put(dstKey, src.body, {
        httpMetadata: { contentType: src.httpMetadata?.contentType || "application/octet-stream" },
      });
    }
    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);
}

async function deleteR2Prefix(env, prefix) {
  let cursor;
  do {
    const res = await env.ASSETS.list({ prefix, cursor });
    if (res.objects.length) {
      await env.ASSETS.delete(res.objects.map(o => o.key));
    }
    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);
}

async function shipMockup(env, helpers, mockupId, req) {
  // Block if pre-flight has errors
  const pf = await preflightMockup(env, helpers, mockupId);
  if (pf.status === 200) {
    const j = await pf.clone().json();
    if (!j.canShip) {
      return helpers.json({ error: "preflight_failed", errors: j.errors }, 422);
    }
  }
  const m = await env.DB.prepare("SELECT id, client_id, html_r2_key FROM mockups WHERE id = ?")
    .bind(mockupId).first();
  if (!m) return helpers.json({ error: "not found" }, 404);

  const client = await env.DB.prepare("SELECT id, business_name, email FROM clients WHERE id = ?")
    .bind(m.client_id).first();
  if (!client) return helpers.json({ error: "client not found" }, 404);

  const baseSlug = slugify(client.business_name) || `c-${m.client_id.slice(0, 8)}`;
  const slug = await uniqueSlug(env, baseSlug, m.client_id);

  const srcPrefix = m.html_r2_key.replace(/\/index\.html$/, "") + "/";
  const dstPrefix = `live/${m.client_id}/`;

  await deleteR2Prefix(env, dstPrefix);
  await copyR2Prefix(env, srcPrefix, dstPrefix);

  const enHead = await env.ASSETS.head(`${dstPrefix}en/index.html`).catch(() => null);
  const isBilingual = !!enHead;

  await env.DB.prepare(`
    INSERT INTO live_sites (slug, client_id, mockup_id, r2_prefix, is_bilingual, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(client_id) DO UPDATE SET
      mockup_id = excluded.mockup_id,
      r2_prefix = excluded.r2_prefix,
      is_bilingual = excluded.is_bilingual,
      updated_at = excluded.updated_at
  `).bind(slug, m.client_id, mockupId, dstPrefix, isBilingual ? 1 : 0, Math.floor(Date.now() / 1000)).run();

  const liveUrl = `${env.APP_URL || "https://portal.pymewebpro.com"}/site/${slug}/`;

  await env.DB.prepare(
    "UPDATE mockups SET status='shipped', shipped_at=?, shipped_url=? WHERE id=?",
  ).bind(Math.floor(Date.now() / 1000), liveUrl, mockupId).run();

  // Notify client
  if (client.email && env.RESEND_API_KEY) {
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env.FROM_EMAIL || "PymeWebPro <noreply@pymewebpro.com>",
        to: [client.email],
        subject: "¡Su sitio está en vivo!",
        html: `<div style="font-family:system-ui;max-width:540px;margin:0 auto;padding:24px">
          <h1 style="font-family:Georgia,serif">¡Su sitio está en línea!</h1>
          <p><a href="${liveUrl}">${liveUrl}</a></p>
          ${isBilingual ? `<p>Versión en inglés: <a href="${liveUrl}en/">${liveUrl}en/</a></p>` : ""}
          <p>En las próximas horas le enviaremos las instrucciones de soporte y, si lo desea, las opciones para conectar su dominio propio.</p>
        </div>`,
      }),
    }).catch(() => {});
  }

  return helpers.json({ ok: true, slug, url: liveUrl, bilingual: isBilingual });
}

// Known scanner / exploit paths — never look these up in R2; cheap 404.
const SCANNER_PATTERNS = [
  /^\/wp-admin\b/i, /^\/wp-login\.php$/i, /^\/wp-content\b/i, /^\/wp-includes\b/i, /^\/xmlrpc\.php$/i,
  /^\/\.env(\.|$)/i, /^\/\.git\b/i, /^\/\.svn\b/i, /^\/\.htaccess$/i, /^\/\.aws\b/i, /^\/\.ssh\b/i,
  /^\/admin(\.|\/|$)/i, /^\/administrator\b/i, /^\/phpmyadmin\b/i, /^\/cgi-bin\b/i,
  /^\/backup\b/i, /^\/dump\b/i, /^\/db\.sql$/i, /\.sql\.gz$/i, /\.bak$/i, /\.zip$/i, /\.tar(\.gz)?$/i,
  /^\/config\.(json|yml|yaml)$/i, /^\/composer\.(json|lock)$/i, /^\/package(-lock)?\.json$/i,
  /^\/server-status$/i, /^\/server-info$/i, /^\/.well-known\/security\.txt$/i, // last one we may add later
];

function notFoundPage(slug, env) {
  const home = `${env.APP_URL || "https://portal.pymewebpro.com"}/site/${slug}/`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Página no encontrada</title>
<style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#fbfaf6;color:#0a1840;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center}
.box{max-width:480px}h1{font-family:Georgia,serif;font-size:2.4rem;margin:0 0 8px}p{color:#5e6883;line-height:1.6}a{display:inline-block;margin-top:18px;background:#003893;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600}</style>
</head><body><div class="box"><h1>404 · Página no encontrada</h1><p>Esta página no existe en este sitio.</p><a href="${home}">Volver al inicio</a></div></body></html>`;
}

// ─── Custom-domain attach ────────────────────────────────────────────────
// Mike registers the domain in Cloudflare (manually or otherwise), then pastes
// it into the admin panel. We:
//   1. Save the mapping in live_sites.custom_domain
//   2. If CLOUDFLARE_API_TOKEN is configured, attempt to add a Worker route on
//      that zone so requests to <domain>/* hit this worker. Best-effort —
//      if it fails (e.g. zone not in this account, missing scopes), we still
//      save the mapping; Mike can add the route manually in the dashboard.
async function attachDomain(env, helpers, clientId, req) {
  const body = await req.json().catch(() => ({}));
  const raw = String(body.domain || "").trim().toLowerCase();
  // Strip protocol / paths / trailing slash
  const domain = raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  if (!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return helpers.json({ error: "invalid_domain", msg: "Dominio inválido. Use formato: minegocio.com" }, 400);
  }

  // Make sure no other client has this domain
  const conflict = await env.DB.prepare(
    "SELECT client_id FROM live_sites WHERE custom_domain = ? AND client_id != ?",
  ).bind(domain, clientId).first();
  if (conflict) return helpers.json({ error: "domain_taken", msg: "Ese dominio ya está asignado a otro cliente." }, 409);

  // Save in live_sites (creates row if none — handles case of attaching domain before first ship)
  const existing = await env.DB.prepare("SELECT slug FROM live_sites WHERE client_id = ?").bind(clientId).first();
  if (existing) {
    await env.DB.prepare("UPDATE live_sites SET custom_domain = ?, updated_at = ? WHERE client_id = ?")
      .bind(domain, Math.floor(Date.now() / 1000), clientId).run();
  } else {
    // No live site yet — store pending domain in client metadata so we can wire it on first ship.
    // We'll create a placeholder live_sites row (slug = client uuid prefix) so the lookup works
    // for the eventual ship.
    const slug = `pending-${clientId.slice(0, 8)}`;
    await env.DB.prepare(`
      INSERT INTO live_sites (slug, client_id, mockup_id, r2_prefix, custom_domain, is_bilingual, updated_at)
      VALUES (?, ?, '', '', ?, 0, ?)
      ON CONFLICT(client_id) DO UPDATE SET custom_domain = excluded.custom_domain, updated_at = excluded.updated_at
    `).bind(slug, clientId, domain, Math.floor(Date.now() / 1000)).run();
  }

  // Full automation: lookup zone, create if missing, add Worker route, return nameservers
  let status = "manual_required";
  let msg = "Dominio guardado. Configure manualmente en Cloudflare (token API no configurado).";
  let nameservers = null;
  if (env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID) {
    try {
      // 1) Look up the zone
      const zonesRes = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(domain)}`, {
        headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
      });
      const zonesJson = await zonesRes.json();
      let zone = zonesJson?.result?.[0];

      // 2) If zone doesn't exist, create it (Cloudflare auto-issues SSL)
      if (!zone) {
        const createRes = await fetch("https://api.cloudflare.com/client/v4/zones", {
          method: "POST",
          headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "content-type": "application/json" },
          body: JSON.stringify({ name: domain, account: { id: env.CLOUDFLARE_ACCOUNT_ID }, type: "full" }),
        });
        const createJson = await createRes.json();
        if (!createJson.success) {
          return helpers.json({
            ok: true,
            domain,
            status: "zone_create_failed",
            msg: "No pudimos agregar el dominio en Cloudflare: " + (createJson?.errors?.[0]?.message || "error desconocido") + ". Agréguelo manualmente.",
          });
        }
        zone = createJson.result;
      }
      nameservers = zone.name_servers || zone.original_name_servers || null;

      // 3) Add the Worker route (idempotent — code 10020 = "already exists" treated as success)
      const routeRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/workers/routes`, {
        method: "POST",
        headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({ pattern: `${domain}/*`, script: "pymewebpro-portal" }),
      });
      const routeJson = await routeRes.json();
      const errCode = routeJson?.errors?.[0]?.code;
      if (routeJson.success || errCode === 10020) {
        // 4) Add a placeholder DNS record so the zone validates
        // (root A record pointing at a Cloudflare anycast IP — proxied=true so Worker route catches the traffic)
        await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records`, {
          method: "POST",
          headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "content-type": "application/json" },
          body: JSON.stringify({ type: "A", name: "@", content: "192.0.2.1", proxied: true, ttl: 1 }),
        }).catch(() => {});
        await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records`, {
          method: "POST",
          headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "content-type": "application/json" },
          body: JSON.stringify({ type: "CNAME", name: "www", content: domain, proxied: true, ttl: 1 }),
        }).catch(() => {});

        status = "ready";
        msg = nameservers
          ? `✓ Zone y Worker route configurados. El cliente debe cambiar los nameservers de su dominio a estos: ${nameservers.join(", ")}. Una vez propagado (~minutos a 24h), el sitio queda en https://${domain}.`
          : `✓ Zone y Worker route configurados. Si los nameservers ya apuntan a Cloudflare, el sitio queda en https://${domain}.`;
      } else {
        status = "route_failed";
        msg = "Zone OK, pero no pudimos crear la ruta: " + (routeJson?.errors?.[0]?.message || "error desconocido") + ". Agréguela manualmente.";
      }
    } catch (e) {
      status = "api_error";
      msg = "Error llamando a Cloudflare API: " + e.message;
    }
  }

  return helpers.json({ ok: true, domain, status, msg, nameservers });
}

async function detachDomain(env, helpers, clientId) {
  await env.DB.prepare("UPDATE live_sites SET custom_domain = NULL, updated_at = ? WHERE client_id = ?")
    .bind(Math.floor(Date.now() / 1000), clientId).run();
  // Note: we deliberately don't auto-remove the Cloudflare route — Mike can do that manually
  // if he wants to fully release the domain. Detach just stops us routing requests on it.
  return helpers.json({ ok: true, msg: "Domain unbound. Remove the Worker route in Cloudflare manually if you want to fully release it." });
}

// ─── Disable / enable a live site (refund-disable flow) ───────────────────
async function disableSite(env, helpers, clientId, req) {
  const body = await req.json().catch(() => ({}));
  const reason = String(body.reason || "refund").slice(0, 100);
  const now = Math.floor(Date.now() / 1000);
  const r = await env.DB.prepare(
    "UPDATE live_sites SET disabled_at = ?, disable_reason = ? WHERE client_id = ?",
  ).bind(now, reason, clientId).run();
  return helpers.json({ ok: true, changes: r.meta?.changes ?? 0 });
}

async function enableSite(env, helpers, clientId) {
  await env.DB.prepare(
    "UPDATE live_sites SET disabled_at = NULL, disable_reason = NULL WHERE client_id = ?",
  ).bind(clientId).run();
  return helpers.json({ ok: true });
}

function disabledPage(reason) {
  const msg = reason === "refund"
    ? "Este sitio ha sido removido por solicitud del cliente o un reembolso."
    : "Este sitio no está disponible.";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Sitio no disponible</title>
<style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#fbfaf6;color:#0a1840;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center}
.box{max-width:480px}h1{font-family:Georgia,serif;font-size:2rem;margin:0 0 8px}p{color:#5e6883;line-height:1.6}</style>
</head><body><div class="box"><h1>Sitio no disponible</h1><p>${msg}</p></div></body></html>`;
}

// ─── Live serving ──────────────────────────────────────────────────────────
async function serveLiveSite(env, slug, path) {
  let p = path || "/";

  // Cheap 404 for scanner traffic — no DB, no R2 reads
  for (const re of SCANNER_PATTERNS) {
    if (re.test(p)) {
      return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", ...siteHeaders() } });
    }
  }

  const site = await env.DB.prepare("SELECT client_id, r2_prefix, is_bilingual, disabled_at, disable_reason FROM live_sites WHERE slug = ?")
    .bind(slug).first();
  if (!site) {
    return new Response(notFoundPage(slug, env), {
      status: 404, headers: { "content-type": "text/html; charset=utf-8", ...siteHeaders() },
    });
  }
  // Refund / take-down — site disabled
  if (site.disabled_at) {
    return new Response(disabledPage(site.disable_reason || "unavailable"), {
      status: 410, // Gone
      headers: { "content-type": "text/html; charset=utf-8", ...siteHeaders() },
    });
  }

  if (p === "/") p = "/index.html";
  if (p === "/en" || p === "/en/") p = "/en/index.html";

  const baseUrl = `${env.APP_URL || "https://portal.pymewebpro.com"}/site/${slug}`;

  // Dynamic robots.txt + sitemap.xml
  if (p === "/robots.txt") {
    return new Response(renderRobots(baseUrl), {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600", ...siteHeaders() },
    });
  }
  if (p === "/sitemap.xml") {
    return new Response(renderSitemap(baseUrl, !!site.is_bilingual), {
      headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600", ...siteHeaders() },
    });
  }

  const key = `${site.r2_prefix}${p.replace(/^\//, "")}`;
  const obj = await env.ASSETS.get(key);
  if (!obj) {
    // Real 404 — styled page, with proper status (no soft-404)
    return new Response(notFoundPage(slug, env), {
      status: 404, headers: { "content-type": "text/html; charset=utf-8", ...siteHeaders() },
    });
  }
  const ct = obj.httpMetadata?.contentType || guessType(p);
  const headers = {
    "content-type": ct,
    "cache-control": ct.startsWith("text/html") ? "public, max-age=300" : "public, max-age=86400",
    ...siteHeaders(),
  };
  // Canonical Link header (HTML pages only) — search engines respect this
  if (ct.startsWith("text/html")) {
    const canonical = `${baseUrl}${p === "/index.html" ? "/" : p}`;
    headers["link"] = `<${canonical}>; rel="canonical"`;
    if (site.is_bilingual) {
      const altPath = p.startsWith("/en/") ? p.replace(/^\/en\//, "/").replace("/index.html","/")
                                           : "/en" + (p === "/index.html" ? "/" : p);
      const altUrl = `${baseUrl}${altPath}`;
      const altLang = p.startsWith("/en/") ? "es" : "en";
      headers["link"] += `, <${altUrl}>; rel="alternate"; hreflang="${altLang}"`;
    }
  }
  return new Response(obj.body, { headers });
}

function siteHeaders() {
  // CSP allows: self for everything, plus the third-party scripts/embeds we actually use.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https://www.facebook.com https://www.google-analytics.com",
    "connect-src 'self' https://portal.pymewebpro.com https://www.google-analytics.com https://*.facebook.com",
    "frame-src https://calendly.com https://*.calendly.com https://cal.com https://*.cal.com",
    "form-action 'self' https://portal.pymewebpro.com",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
  ].join("; ");
  return {
    "content-security-policy": csp,
    "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
    "x-content-type-options": "nosniff",
    "x-frame-options": "SAMEORIGIN",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
  };
}

function guessType(path) {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".pdf")) return "application/pdf";
  if (path.endsWith(".xml")) return "application/xml";
  if (path.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

// ─── UI: comment widget injected into preview ──────────────────────────────

function injectCommentWidget(htmlSrc, token) {
  const widget = `
<style>
#__cw_btn{position:fixed;bottom:20px;right:20px;background:#003893;color:#fff;padding:14px 18px;border-radius:999px;font-family:system-ui;font-weight:600;cursor:pointer;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,.2);border:0}
#__cw_panel{position:fixed;bottom:80px;right:20px;width:340px;background:#fff;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.25);padding:18px;font-family:system-ui;display:none;z-index:99999;color:#0a1840}
#__cw_panel h3{margin:0 0 8px;font-size:1rem}
#__cw_panel select,#__cw_panel textarea{width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font:inherit;margin-top:6px;color:#0a1840}
#__cw_panel textarea{min-height:90px}
#__cw_panel button{margin-top:10px;background:#003893;color:#fff;border:0;padding:9px 14px;border-radius:6px;font-weight:600;cursor:pointer}
#__cw_msg{margin-top:8px;font-size:.85rem}
.__cw_outline{outline:2px dashed #003893;outline-offset:4px}
</style>
<button id="__cw_btn" onclick="__cwToggle()">💬 Comentar</button>
<div id="__cw_panel">
  <h3>Deje un comentario</h3>
  <label style="font-size:.85rem">Sección</label>
  <select id="__cw_section"></select>
  <textarea id="__cw_text" placeholder="¿Qué le gustaría cambiar?"></textarea>
  <button onclick="__cwSend()">Enviar</button>
  <div id="__cw_msg"></div>
</div>
<script>
const __cwToken = ${JSON.stringify(token)};
function __cwToggle(){
  const p=document.getElementById('__cw_panel');
  p.style.display = p.style.display==='block'?'none':'block';
  if(p.style.display==='block'){
    const sel=document.getElementById('__cw_section');
    sel.innerHTML='<option value="">— general —</option>';
    document.querySelectorAll('[data-section]').forEach(el=>{
      const o=document.createElement('option');o.value=el.dataset.section;o.textContent=el.dataset.section;
      sel.appendChild(o);
    });
    sel.onchange=()=>{
      document.querySelectorAll('.__cw_outline').forEach(e=>e.classList.remove('__cw_outline'));
      const t=document.querySelector('[data-section="'+sel.value+'"]');
      if(t){t.classList.add('__cw_outline');t.scrollIntoView({behavior:'smooth',block:'center'});}
    };
  }
}
async function __cwSend(){
  const section=document.getElementById('__cw_section').value;
  const comment=document.getElementById('__cw_text').value.trim();
  if(!comment)return;
  const r=await fetch('/api/m/'+__cwToken+'/comment',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({section,comment})});
  const j=await r.json();
  document.getElementById('__cw_msg').textContent = j.ok?'¡Gracias! Recibido.':'Error al enviar';
  if(j.ok){document.getElementById('__cw_text').value='';}
}
</script>`;
  if (htmlSrc.includes("</body>")) return htmlSrc.replace("</body>", widget + "</body>");
  return htmlSrc + widget;
}

function safeName(asset) {
  const fn = asset.filename || asset.r2_key.split("/").pop();
  return String(fn).replace(/[^\w.\-]/g, "_");
}

// ─── Newsletter signup (called from deployed customer sites) ───────────────

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

async function newsletterSubscribe(env, helpers, clientId, req) {
  const cors = corsHeaders();
  const client = await env.DB.prepare("SELECT id, email, business_name FROM clients WHERE id = ?")
    .bind(clientId).first();
  if (!client) return new Response(JSON.stringify({ error: "client not found" }), { status: 404, headers: { "content-type": "application/json", ...cors } });

  let body = {};
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    body = await req.json().catch(() => ({}));
  } else if (ct.includes("form")) {
    const fd = await req.formData();
    body = Object.fromEntries(fd.entries());
  }

  // Honeypot — bots usually fill this hidden field. Silent 200, no DB write.
  if (body.company_url) {
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", ...cors } });
  }
  // Habeas Data consent required (Ley 1581 — required to process visitor emails for marketing)
  if (body.habeas_data_accepted !== true && body.habeas_data_accepted !== "true" && body.habeas_data_accepted !== "on") {
    return new Response(JSON.stringify({ error: "habeas_data_required" }), { status: 400, headers: { "content-type": "application/json", ...cors } });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim().slice(0, 80);
  if (!email || !email.includes("@") || email.length > 200) {
    return new Response(JSON.stringify({ error: "invalid email" }), { status: 400, headers: { "content-type": "application/json", ...cors } });
  }

  const ip = req.headers.get("cf-connecting-ip") || "";
  const ipHash = ip ? (await helpers.sha256(ip)).slice(0, 32) : null;
  const id = helpers.uuid();
  const consentVersion = String(body.clause_version || "v1.0-2026-04-30");
  const now = Math.floor(Date.now() / 1000);

  try {
    await env.DB.prepare(`
      INSERT INTO newsletter_subscribers (id, client_id, email, name, source, ip_hash, consent_at, consent_clause_version)
      VALUES (?, ?, ?, ?, 'site_form', ?, ?, ?)
    `).bind(id, clientId, email, name || null, ipHash, now, consentVersion).run();
  } catch (e) {
    // Most likely UNIQUE(client_id, email) collision — silently OK
    return new Response(JSON.stringify({ ok: true, already: true }), { headers: { "content-type": "application/json", ...cors } });
  }

  // Notify the business owner
  if (env.RESEND_API_KEY && client.email) {
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env.FROM_EMAIL || "PymeWebPro <noreply@pymewebpro.com>",
        to: [client.email],
        subject: `Nueva suscripción a su newsletter`,
        html: `<p>Hola,</p><p>Acaba de suscribirse alguien al newsletter de su sitio:</p>
               <p><strong>${name ? helpers.escapeHtml(name) + " · " : ""}${helpers.escapeHtml(email)}</strong></p>
               <p>Esta persona aceptó recibir sus comunicaciones.</p>
               <p style="color:#666;font-size:.85rem">— PymeWebPro</p>`,
      }),
    }).catch(() => {});
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", ...cors } });
}
