// ============================================================================
// Proposal generator
// ============================================================================
// When a deal moves to the "proposal" stage (and the user confirms), this
// module runs an Anthropic call to produce a self-contained marketing
// mockup HTML for the prospect's business based on their social URLs and
// notes, then renders a printable proposal page that wraps the mockup in
// pricing, timeline, hosting/support, and benefits.
//
// Routes (wired by index.js):
//   POST /api/admin/proposals/:dealId/generate  · auth: admin · runs the build
//   GET  /proposal-mockup/:dealId                · serves the mockup HTML
//   GET  /admin/proposal/:dealId                 · serves the printable page
//
// Storage: D1 columns on deals (proposal_mockup_html, proposal_html,
//          proposal_status, proposal_generated_at). Migration 0005.
//
// Sin em dashes. Spanish + English copy in the proposal page (clients are
// bilingual). Single-product model: "La página de ventas" $390.000 COP, IVA
// incluido. COP only, no CAD/USD. The old plan/tier branching is collapsed:
// any stored plan key (esencial or legacy pro) maps to the one product.
// ============================================================================

const MODEL = "claude-sonnet-4-5";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MOCKUP_MAX_TOKENS = 8192;

export async function handleProposalRoutes(request, env, helpers) {
  const { json, isAdmin, escapeHtml } = helpers;
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /api/admin/proposals/:dealId/generate
  const genMatch = path.match(/^\/api\/admin\/proposals\/([\w-]+)\/generate$/);
  if (genMatch && request.method === "POST") {
    if (!isAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
    return await generateProposal(env, genMatch[1], json);
  }

  // GET /proposal-mockup/:dealId  (public-ish, gated by guess-resistant id)
  const mockMatch = path.match(/^\/proposal-mockup\/([\w-]+)$/);
  if (mockMatch && request.method === "GET") {
    return await serveMockup(env, mockMatch[1]);
  }

  // GET /admin/proposal/:dealId  (admin-only HTML)
  const propMatch = path.match(/^\/admin\/proposal\/([\w-]+)$/);
  if (propMatch && request.method === "GET") {
    if (!isAdmin(request, env) && url.searchParams.get("admin_token") !== env.ADMIN_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }
    return await serveProposal(env, propMatch[1], escapeHtml);
  }

  return null; // not our route
}

// ----------------------------------------------------------------------------
// Generation
// ----------------------------------------------------------------------------

export async function generateProposal(env, dealId, json) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "Missing ANTHROPIC_API_KEY", detail: "wrangler secret put ANTHROPIC_API_KEY" }, 500);
  }

  const deal = await env.DB.prepare("SELECT * FROM deals WHERE id = ?").bind(dealId).first();
  if (!deal) return json({ error: "Deal not found" }, 404);

  // Mark generating immediately so subsequent reads see the in-flight state.
  await env.DB.prepare("UPDATE deals SET proposal_status = ?, updated_at = ? WHERE id = ?")
    .bind("generating", Date.now(), dealId).run();

  let lead = null;
  if (deal.lead_id) {
    lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(deal.lead_id).first();
  }
  let client = null;
  if (deal.client_id) {
    client = await env.DB.prepare("SELECT * FROM clients WHERE id = ?").bind(deal.client_id).first();
  }

  const brief = buildBrief(deal, lead, client);

  // Generate mockup HTML via Anthropic.
  let mockupHtml;
  try {
    mockupHtml = await generateMockupHtml(env, brief);
  } catch (err) {
    await env.DB.prepare("UPDATE deals SET proposal_status = ?, updated_at = ? WHERE id = ?")
      .bind("error", Date.now(), dealId).run();
    return json({ error: "Anthropic generation failed", detail: String(err.message || err) }, 502);
  }

  // Build the printable proposal page (deterministic template, not AI).
  const proposalHtml = buildProposalHtml(deal, lead, client, brief);

  const now = Date.now();
  await env.DB.prepare(
    "UPDATE deals SET proposal_mockup_html = ?, proposal_html = ?, proposal_status = ?, proposal_generated_at = ?, updated_at = ? WHERE id = ?"
  ).bind(mockupHtml, proposalHtml, "ready", now, now, dealId).run();

  const updated = await env.DB.prepare("SELECT * FROM deals WHERE id = ?").bind(dealId).first();
  return json({ ok: true, deal: updated });
}

// Pulls the cross-table data into a single brief object the rest of this
// module can rely on. Single-product model: one page in COP regardless of
// market or any legacy stored plan key. The tier field is kept (always the
// single product) so downstream callers and templates don't break.
function buildBrief(deal, lead, client) {
  const market = pickMarket(lead, client, deal);
  const tier = pickTier(deal, lead);
  const businessName = (lead && lead.business_name) || (client && client.business_name) || deal.title || "Cliente";
  const contactName = (lead && lead.name) || "";
  const contactEmail = (lead && lead.email) || (client && client.email) || "";
  const phone = (lead && lead.phone) || "";
  const whatsapp = (lead && lead.whatsapp) || phone || "";
  const language = (lead && lead.language) || (client && client.language) || (market === "co" ? "es" : "en");
  const category = (lead && lead.category) || "";
  const city = (lead && lead.city) || "";
  const address = (lead && lead.address) || "";
  const currentSite = (lead && lead.current_site) || "";
  const suggestedPitch = (lead && lead.suggested_pitch) || "";
  const notes = (lead && lead.notes) || "";
  const message = (lead && lead.message) || "";
  const socials = {
    instagram:    (lead && lead.instagram)    || "",
    facebook_url: (lead && lead.facebook_url) || "",
    x_url:        (lead && lead.x_url)        || "",
    tiktok_url:   (lead && lead.tiktok_url)   || "",
  };
  let addons = [];
  try { addons = deal && deal.addons ? JSON.parse(deal.addons) : []; } catch (e) { addons = []; }
  if (!Array.isArray(addons)) addons = [];
  const reqNotes = (deal && deal.notes) || "";
  return {
    market, tier, language,
    businessName, contactName, contactEmail, phone, whatsapp,
    category, city, address, currentSite,
    suggestedPitch, notes, message,
    socials,
    addons, reqNotes,
    pricing: computePricing(addons, language === "es"),
  };
}

function pickMarket(lead, client, deal) {
  // Heuristic: Colombian if language=es OR city/address mentions Colombia.
  const lang = (lead && lead.language) || (client && client.language) || "";
  if (lang === "es") return "co";
  const t = ((lead && (lead.city || lead.address)) || "").toLowerCase();
  if (/medellin|medellín|bogot|cali|barranq|cartag|colomb/.test(t)) return "co";
  return "na";
}

// Single-product model: there is one product. We still read any stored plan
// key (esencial or legacy pro) so old data does not error, but everything maps
// to the one feature bundle key "esencial".
function pickTier(deal, lead) {
  // Read the stored key only to stay compatible with old rows; the product is
  // the same either way.
  void ((deal && deal.plan) || (lead && lead.plan));
  return "esencial";
}

// One product, COP only, in both languages. Market only selects the copy
// language elsewhere; price is identical. Additional revision round replaces
// the old hourly-CAD model.
function pickPricing(market, tier) {
  void market; void tier;
  return { label: "La página de ventas", currency: "COP", price: "$390.000 COP", deposit: "$117.000 COP", balance: "$273.000 COP", hosting: "incluye 1 mes de hosting + soporte", maintenance: "ronda de revisión adicional $90.000 COP", hourly: "ronda de revisión adicional $90.000 COP" };
}

// Add-on menu (COP). Keys match what the Mi día "Propuesta" form sends.
const BASE_PRICE = 390000;
const ADDON_CATALOG = {
  catalog:     { es: "Catálogo simple",          en: "Simple catalog",           price: 75000 },
  pdf:         { es: "Catálogo o menú descargable (PDF)", en: "Downloadable catalog or menu (PDF)", price: 75000 },
  bilingual:   { es: "Versión bilingüe",         en: "Bilingual version",        price: 75000 },
};
// Format an integer as Colombian pesos: 390000 -> "$390.000 COP".
function fmtCOP(n) {
  n = Math.round(Number(n) || 0);
  const s = String(n);
  let out = "", c = 0;
  for (let i = s.length - 1; i >= 0; i--) { out = s[i] + out; if (++c % 3 === 0 && i > 0) out = "." + out; }
  return "$" + out + " COP";
}
// Base page + selected add-ons -> priced line items, total, 30/70 split.
function computePricing(addons, isEs) {
  const lines = [{ label: isEs ? "La página de ventas" : "The sales page", price: BASE_PRICE }];
  let total = BASE_PRICE;
  (addons || []).forEach((k) => {
    const a = ADDON_CATALOG[k];
    if (a) { lines.push({ label: isEs ? a.es : a.en, price: a.price }); total += a.price; }
  });
  const deposit = Math.round(total * 0.30);
  return { lines, total, deposit, balance: total - deposit };
}

// Total COP for a deal (base + stored add-ons). Used by the deposit/balance
// link generator so the 30/70 split matches what the proposal actually quoted.
export function dealTotalCop(deal) {
  const base = (deal && deal.plan === "pro") ? 690000 : BASE_PRICE;
  let addons = [];
  try { addons = deal && deal.addons ? JSON.parse(deal.addons) : []; } catch (e) { addons = []; }
  let total = base;
  (Array.isArray(addons) ? addons : []).forEach((k) => { const a = ADDON_CATALOG[k]; if (a) total += a.price; });
  return total;
}

// ----------------------------------------------------------------------------
// Anthropic call: mockup HTML
// ----------------------------------------------------------------------------

async function generateMockupHtml(env, brief) {
  const system = mockupSystemPrompt(brief);
  const userMsg = mockupUserPrompt(brief);

  const body = {
    model: MODEL,
    max_tokens: MOCKUP_MAX_TOKENS,
    system,
    messages: [{ role: "user", content: userMsg }],
  };

  const r = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(r.status + " " + text);
  }
  const data = await r.json();
  // Extract concatenated text blocks.
  let raw = "";
  for (const block of (data.content || [])) {
    if (block.type === "text") raw += block.text;
  }
  // Strip optional ```html fences the model sometimes adds.
  let html = raw.trim();
  html = html.replace(/^```html\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "");
  // Final sanity: must start with <!DOCTYPE or <html
  if (!/^<!DOCTYPE|^<html/i.test(html)) {
    // Wrap as fragment so it still renders even if model drifted.
    html = "<!DOCTYPE html><html lang=\"" + brief.language + "\"><head><meta charset=\"utf-8\"><title>" +
      escapeForMockup(brief.businessName) + "</title></head><body>" + html + "</body></html>";
  }
  return html;
}

function mockupSystemPrompt(brief) {
  const langDirective = brief.language === "es"
    ? "Genera todo el copy en español neutro. Headlines en sentence case."
    : "Write all copy in English. Sentence case for headlines.";
  return [
    "Eres un diseñador web senior de PymeWebPro. Tu único entregable es un sitio HTML auto-contenido en un solo archivo, listo para que un prospecto vea su propio sitio antes de pagar.",
    "",
    "Reglas absolutas (no se pueden romper):",
    "1. Output: SOLO HTML completo. Empieza con <!DOCTYPE html> y termina con </html>. Sin explicaciones, sin texto antes o después, sin bloques de código markdown.",
    "2. CSS y JS inline en <style> y <script>. Nada de CDN excepto Google Fonts (preconnect + stylesheet) y CDN de Pexels para imágenes stock.",
    "3. NUNCA uses Tailwind CDN ni ningún CSS framework por CDN.",
    "4. NUNCA uses el carácter em dash (raya larga). Usa comas, puntos, dos puntos, paréntesis, o " + '"·"' + ".",
    "5. Footer obligatorio: \"Sitio web por PymeWebPro\" (ES) o \"Built by PymeWebPro\" (EN) con link a https://pymewebpro.com.",
    "6. Si es Colombia, incluye una línea de NIT del cliente como placeholder (\"NIT: [pendiente]\").",
    "7. Usa imágenes reales relevantes al sector vía Pexels CDN (https://images.pexels.com/photos/...). No uses gradientes CSS para reemplazar fotos.",
    "8. Schema.org JSON-LD inline: al menos Organization, WebSite, FAQPage.",
    "9. Tipografía: Inter Tight + Inter de Google Fonts es OK, o algo apropiado al sector.",
    "10. Sub-1s LCP es objetivo. CSS crítico inline, fonts preconectadas, imágenes con width/height.",
    "11. Incluye un botón flotante de WhatsApp si tienes número, y un formulario de contacto que POSTea a https://formspree.io/f/REPLACE_FORM_ID (placeholder).",
    "12. Color y voz inferidos del sector del negocio y de sus redes sociales (URLs proporcionadas).",
    "",
    langDirective,
    "",
    "Estructura mínima esperada: hero con propuesta de valor, sección de servicios/productos, sección sobre el negocio, fotos reales del sector, testimonio placeholder marcado como ejemplo, CTA con WhatsApp y formulario, footer con direcciones/socials y créditos PymeWebPro.",
  ].join("\n");
}

function mockupUserPrompt(brief) {
  const lines = [
    "Construye un sitio marketing de una página para este prospecto. Datos del brief:",
    "",
    "Negocio: " + brief.businessName,
    brief.category ? "Sector: " + brief.category : "",
    brief.city ? "Ciudad: " + brief.city : "",
    brief.address ? "Dirección: " + brief.address : "",
    brief.contactName ? "Contacto: " + brief.contactName : "",
    brief.contactEmail ? "Email: " + brief.contactEmail : "",
    brief.phone ? "Teléfono: " + brief.phone : "",
    brief.whatsapp ? "WhatsApp: " + brief.whatsapp : "",
    "Idioma del sitio: " + (brief.language === "es" ? "español" : "inglés"),
    "Mercado: " + (brief.market === "co" ? "Colombia" : "Norteamérica"),
    "",
    "Perfiles sociales (úsalos como referencia de estilo, paleta, tono, productos visibles):",
    brief.socials.instagram    ? "  Instagram: " + brief.socials.instagram    : "",
    brief.socials.facebook_url ? "  Facebook:  " + brief.socials.facebook_url : "",
    brief.socials.x_url        ? "  X/Twitter: " + brief.socials.x_url        : "",
    brief.socials.tiktok_url   ? "  TikTok:    " + brief.socials.tiktok_url   : "",
    "",
    brief.currentSite      ? "Sitio actual (si existe): " + brief.currentSite : "",
    brief.suggestedPitch   ? "Pitch sugerido para el prospecto: " + brief.suggestedPitch : "",
    brief.notes            ? "Notas internas: " + brief.notes : "",
    brief.message          ? "Mensaje original del prospecto: " + brief.message : "",
    "",
    "Importante: el prospecto va a ver este sitio. Hazlo creíble y específico al negocio. Si te falta información, usa placeholders obvios entre [corchetes] en vez de inventar nombres de productos.",
    "",
    "Recordatorio: solo HTML completo. Sin texto antes o después. Sin markdown.",
  ].filter(Boolean);
  return lines.join("\n");
}

// ----------------------------------------------------------------------------
// Serve mockup
// ----------------------------------------------------------------------------

async function serveMockup(env, dealId) {
  const deal = await env.DB.prepare("SELECT id, proposal_mockup_html, proposal_status FROM deals WHERE id = ?")
    .bind(dealId).first();
  if (!deal) return new Response("Not found", { status: 404 });
  if (!deal.proposal_mockup_html) {
    const status = deal.proposal_status || "pending";
    return new Response(
      "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Mockup pendiente</title></head>" +
      "<body style='font:14px system-ui;padding:2rem;color:#1A2032'>" +
      "<h1>Mockup pendiente</h1>" +
      "<p>El mockup para este deal todavía no se ha generado (status: " + status + ").</p>" +
      "<p><a href='/admin/crm?embed=1'>Volver al CRM</a></p>" +
      "</body></html>",
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
  return new Response(deal.proposal_mockup_html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
    },
  });
}

// ----------------------------------------------------------------------------
// Serve printable proposal page
// ----------------------------------------------------------------------------

async function serveProposal(env, dealId, escapeHtml) {
  const deal = await env.DB.prepare("SELECT * FROM deals WHERE id = ?").bind(dealId).first();
  if (!deal) return new Response("Not found", { status: 404 });
  if (!deal.proposal_html) {
    return new Response(
      "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Proposal pending</title></head>" +
      "<body style='font:14px system-ui;padding:2rem;color:#1A2032'>" +
      "<h1>Proposal pending</h1>" +
      "<p>This deal has no generated proposal yet (status: " + (deal.proposal_status || "pending") + ").</p>" +
      "<p>Open the deal card in the CRM and click <b>Generate proposal</b>.</p>" +
      "</body></html>",
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
  return new Response(deal.proposal_html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
    },
  });
}

// ----------------------------------------------------------------------------
// Proposal page template
// ----------------------------------------------------------------------------

function buildProposalHtml(deal, lead, client, brief) {
  const isEs = brief.language === "es";
  const T = isEs ? PROPOSAL_TEXT_ES : PROPOSAL_TEXT_EN;
  const p = brief.pricing;
  const tierKey = brief.tier;
  const features = isEs ? FEATURES_ES[tierKey] : FEATURES_EN[tierKey];
  const dealTitle = deal.title || brief.businessName;
  const today = new Date();
  const fmtToday = today.toISOString().slice(0, 10);
  // Estimated delivery: 5 business days from today.
  const deliveryDate = new Date(today.getTime() + 7 * 24 * 3600 * 1000);
  const fmtDelivery = deliveryDate.toISOString().slice(0, 10);

  const mockupUrl = "/proposal-mockup/" + encodeURIComponent(deal.id);

  return `<!DOCTYPE html>
<html lang="${isEs ? "es" : "en"}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeForMockup(T.documentTitle + " · " + brief.businessName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --ink: #1A2032;
    --ink-soft: #5A6478;
    --line: #E7E6E1;
    --line-soft: #F1F0EB;
    --bg: #FAFAF7;
    --bg-soft: #F6F5F0;
    --accent: #FF5C2E;
    --accent-soft: #FFEDE5;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg-soft); }
  body {
    font: 15px/1.55 "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    color: var(--ink);
  }
  .sheet {
    max-width: 840px;
    margin: 1.5rem auto;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 14px rgba(10,14,39,0.08);
    overflow: hidden;
  }
  header.brand {
    padding: 1.4rem 2rem;
    border-bottom: 4px solid var(--accent);
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem;
  }
  header.brand .mark {
    font: 700 22px/1 "Inter Tight", system-ui, sans-serif;
    color: var(--ink); letter-spacing: -0.01em;
  }
  header.brand .mark span { color: var(--accent); }
  header.brand .meta {
    text-align: right; font-size: 12px; color: var(--ink-soft);
  }
  header.brand .meta b { color: var(--ink); }
  .section { padding: 1.6rem 2rem; border-bottom: 1px solid var(--line-soft); }
  .section:last-child { border-bottom: none; }
  .section h2 {
    margin: 0 0 0.8rem; font: 700 20px/1.25 "Inter Tight", system-ui, sans-serif;
    color: var(--ink);
  }
  .section h3 {
    margin: 1rem 0 0.5rem; font: 600 14px/1.3 "Inter Tight", system-ui, sans-serif;
    text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--ink-soft);
  }
  .intro p { margin: 0.4rem 0; }
  .price-block {
    background: var(--bg-soft);
    border: 1px solid var(--line);
    border-left: 4px solid var(--accent);
    padding: 1.1rem 1.3rem;
    border-radius: 8px;
  }
  .price-block .tier {
    font: 700 14px/1 "Inter Tight", system-ui, sans-serif;
    color: var(--accent);
    text-transform: uppercase; letter-spacing: 0.08em;
  }
  .price-block .total {
    font: 700 32px/1.2 "Inter Tight", system-ui, sans-serif;
    margin: 0.3rem 0;
    color: var(--ink);
  }
  .price-block .sub { color: var(--ink-soft); font-size: 13.5px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.6rem; }
  .grid-2 .cell {
    padding: 0.75rem 0.9rem;
    background: #FFFFFF;
    border: 1px solid var(--line);
    border-radius: 6px;
  }
  .grid-2 .cell b { display: block; font-size: 12px; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  ul.feat {
    list-style: none; padding: 0; margin: 0.4rem 0 0;
  }
  ul.feat li {
    padding: 0.4rem 0 0.4rem 1.4rem;
    position: relative;
    border-bottom: 1px solid var(--line-soft);
  }
  ul.feat li:last-child { border-bottom: none; }
  ul.feat li::before {
    content: "";
    position: absolute;
    left: 0; top: 0.85rem;
    width: 8px; height: 8px; border-radius: 99px;
    background: var(--accent);
  }
  .mockup-wrap {
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
    margin-top: 0.6rem;
    background: #FFFFFF;
  }
  .mockup-wrap iframe {
    width: 100%; height: 720px; border: 0; display: block;
  }
  .mockup-wrap .link-line {
    padding: 0.6rem 0.9rem;
    font-size: 12.5px;
    color: var(--ink-soft);
    background: var(--bg-soft);
    border-top: 1px solid var(--line);
    display: flex; justify-content: space-between; align-items: center;
  }
  .mockup-wrap .link-line a {
    color: var(--accent); font-weight: 600; text-decoration: none;
  }
  .terms { font-size: 13.5px; color: var(--ink-soft); }
  .terms b { color: var(--ink); }
  footer.foot {
    padding: 1.2rem 2rem; font-size: 12px; color: var(--ink-soft);
    background: var(--bg-soft); text-align: center;
    border-top: 1px solid var(--line);
  }
  footer.foot a { color: var(--ink); text-decoration: none; font-weight: 600; }
  .print-bar {
    position: fixed; right: 1rem; bottom: 1rem; z-index: 50;
    display: flex; gap: 0.5rem;
  }
  .print-bar button {
    padding: 0.6rem 0.9rem; border-radius: 8px; cursor: pointer;
    font: 600 13px "Inter Tight", system-ui, sans-serif;
    background: var(--accent); color: #fff; border: none;
    box-shadow: 0 4px 12px rgba(255,92,46,0.4);
  }
  .print-bar button.alt { background: var(--ink); }
  @media print {
    body { background: #fff; }
    .sheet { box-shadow: none; margin: 0; max-width: none; border-radius: 0; }
    .print-bar, .mockup-wrap iframe { display: none; }
    .mockup-wrap .link-line { padding: 1rem; }
    .section { page-break-inside: avoid; }
    header.brand { page-break-after: avoid; }
  }
</style>
</head>
<body>

<div class="sheet">

  <header class="brand">
    <div class="mark">&lt;<span>pymewebpro</span>/&gt;</div>
    <div class="meta">
      <b>${escapeForMockup(T.documentTitle)}</b><br>
      ${escapeForMockup(brief.businessName)}<br>
      ${escapeForMockup(T.dateLabel)}: ${fmtToday}
    </div>
  </header>

  <div class="section intro">
    <h2>${escapeForMockup(T.helloHeading + ", " + (brief.contactName || brief.businessName))}</h2>
    <p>${escapeForMockup(T.intro1.replace("{business}", brief.businessName))}</p>
    <p>${escapeForMockup(T.intro2)}</p>
  </div>

  <div class="section">
    <h2>${escapeForMockup(T.mockupHeading)}</h2>
    <p>${escapeForMockup(T.mockupBlurb)}</p>
    <div class="mockup-wrap">
      <iframe src="${escapeForMockup(mockupUrl)}" loading="lazy" title="${escapeForMockup(brief.businessName + " mockup")}"></iframe>
      <div class="link-line">
        <span>${escapeForMockup(T.mockupLinkLabel)}</span>
        <a href="${escapeForMockup(mockupUrl)}" target="_blank" rel="noopener">${escapeForMockup(T.openInTab)} &nearr;</a>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>${escapeForMockup(T.priceHeading)}</h2>
    <div class="price-block">
      <ul class="feat" style="margin:0 0 .6rem">
        ${p.lines.map((l) => "<li>" + escapeForMockup(l.label) + " <b style='float:right'>" + escapeForMockup(fmtCOP(l.price)) + "</b></li>").join("\n        ")}
      </ul>
      <div class="total">${escapeForMockup(fmtCOP(p.total))}</div>
      <div class="sub">${escapeForMockup(T.totalSub)}</div>
    </div>
    <div class="grid-2">
      <div class="cell"><b>${escapeForMockup(T.depositLabel)}</b>${escapeForMockup(fmtCOP(p.deposit))} · ${escapeForMockup(T.depositSub)}</div>
      <div class="cell"><b>${escapeForMockup(T.balanceLabel)}</b>${escapeForMockup(fmtCOP(p.balance))} · ${escapeForMockup(T.balanceSub)}</div>
      <div class="cell"><b>${escapeForMockup(T.deliveryLabel)}</b>${escapeForMockup(T.deliveryValue.replace("{date}", fmtDelivery))}</div>
      <div class="cell"><b>${escapeForMockup(T.revisionsLabel)}</b>${escapeForMockup(T.revisionsValue)}</div>
    </div>
    ${brief.reqNotes ? '<p class="terms"><b>' + escapeForMockup(T.reqLabel) + ':</b> ' + escapeForMockup(brief.reqNotes) + '</p>' : ''}
  </div>

  <div class="section">
    <h2>${escapeForMockup(T.includesHeading)}</h2>
    <ul class="feat">
      ${features.map((f) => "<li>" + escapeForMockup(f) + "</li>").join("\n      ")}
    </ul>
  </div>

  <div class="section">
    <h2>${escapeForMockup(T.hostingHeading)}</h2>
    <p>${escapeForMockup(T.hosting1)}</p>
    <ul class="feat">
      <li>${escapeForMockup(T.host1)}</li>
      <li>${escapeForMockup(T.host2)}</li>
      <li>${escapeForMockup(T.host3)}</li>
      <li>${escapeForMockup(T.host4)}</li>
    </ul>
    <p class="terms"><b>${escapeForMockup(T.maintenanceLabel)}:</b> ${escapeForMockup(T.maintenanceValue)} · <b>${escapeForMockup(T.hourlyLabel)}:</b> ${escapeForMockup(T.hourlyValue)}</p>
  </div>

  <div class="section">
    <h2>${escapeForMockup(T.guaranteeHeading)}</h2>
    <p>${escapeForMockup(T.guaranteeBody)}</p>
  </div>

  <div class="section terms">
    <h2>${escapeForMockup(T.termsHeading)}</h2>
    <p>${escapeForMockup(T.terms1)}</p>
    <p>${escapeForMockup(T.terms2)}</p>
    <p>${escapeForMockup(T.terms3)}</p>
  </div>

  <footer class="foot">
    <b>Norte Sur Consulting S.A.S.</b> · NIT 901.956.771-1 · Medellín, Colombia &amp; London, Ontario, Canada<br>
    ${escapeForMockup(T.footerCredit)} <a href="https://pymewebpro.com">pymewebpro.com</a> · hello@pymewebpro.com
  </footer>

</div>

<div class="print-bar">
  <button onclick="window.print()">${escapeForMockup(T.printButton)}</button>
  <button class="alt" onclick="window.open('${mockupUrl}','_blank')">${escapeForMockup(T.openMockupButton)}</button>
</div>

</body>
</html>`;
}

// ----------------------------------------------------------------------------
// Text bundles
// ----------------------------------------------------------------------------

const PROPOSAL_TEXT_ES = {
  documentTitle: "Propuesta web",
  dateLabel: "Fecha",
  helloHeading: "Hola",
  intro1: "Construimos una vista previa de cómo se vería el sitio web de {business} con PymeWebPro. Está abajo, navegable, hecho a partir de la información pública de tus redes y de lo que sabemos de tu negocio.",
  intro2: "Esta propuesta resume lo que recibes, cuánto cuesta, cuándo lo entregamos, y qué pasa después del lanzamiento. Si algo no encaja, lo ajustamos en una llamada de 15 minutos.",
  mockupHeading: "Vista previa de tu sitio",
  mockupBlurb: "Esto es un boceto en vivo, no un PDF. Cuando aprobemos el rumbo lo refinamos con tus fotos reales, tu copy final, y los productos exactos que quieras destacar.",
  mockupLinkLabel: "Si la previsualización no carga, abre el enlace directo:",
  openInTab: "Abrir en una nueva pestaña",
  priceHeading: "Inversión",
  planLabel: "Producto",
  totalSub: "Total, IVA incluido. Incluye 1 mes de hosting y soporte.",
  reqLabel: "Lo que pediste",
  depositLabel: "Depósito inicial (30%)",
  depositSub: "para arrancar diseño y desarrollo",
  balanceLabel: "Saldo al lanzar (70%)",
  balanceSub: "antes de conectar DNS a tu dominio",
  deliveryLabel: "Entrega estimada",
  deliveryValue: "{date} (en vivo en ~48 horas típicas)",
  revisionsLabel: "Revisiones incluidas",
  revisionsValue: "2 rondas de revisión incluidas",
  includesHeading: "Qué recibes",
  hostingHeading: "Hosting y soporte",
  hosting1: "El precio incluye tu Ficha de Google y 1 mes de hosting + soporte. Después, eliges un plan mensual opcional, sin contrato: hosting solo $30.000 COP/mes, Plan de presencia $59.000 COP/mes (hosting + Ficha de Google activa + hasta 2 cambios + reporte mensual), o Plan de ventas $150.000 COP/mes (todo lo anterior + tu asistente de ventas 24/7: un chatbot en tu página que responde preguntas y pasa al cliente a tu WhatsApp con un clic).",
  host1: "Cloudflare Pages, 330+ ubicaciones edge, sub-1s LCP en cualquier país",
  host2: "Certificado SSL gestionado, renovación automática, sin tarifas extra",
  host3: "Backups automáticos, redundancia geográfica",
  host4: "Soporte por WhatsApp y email durante el período de cobertura",
  maintenanceLabel: "Hosting después del mes incluido",
  maintenanceValue: "$30.000 COP / mes o $300.000 COP / año",
  hourlyLabel: "Cambios fuera de alcance",
  hourlyValue: "ronda de revisión adicional $90.000 COP",
  guaranteeHeading: "Garantía",
  guaranteeBody: "30 días de garantía de devolución post-lanzamiento. Si no estás satisfecho dentro de los primeros 30 días, bajamos el sitio y devolvemos el 100% de lo pagado. Después de 30 días el fee deja de ser reembolsable, pero seguimos respondiendo por el período de hosting incluido.",
  termsHeading: "Términos",
  terms1: "Contratante: Norte Sur Consulting S.A.S. (NIT 901.956.771-1), también conocido como PymeWebPro.",
  terms2: "Métodos de pago: Wompi (transferencia bancaria, PSE, tarjetas) en COP. Precios en COP, IVA incluido.",
  terms3: "Esta propuesta es válida durante 30 días desde la fecha indicada arriba. Cualquier cambio de alcance posterior se cotiza con el menú de add-ons o una ronda de revisión adicional.",
  printButton: "Guardar como PDF",
  openMockupButton: "Ver mockup solo",
  footerCredit: "Propuesta generada por",
};

const PROPOSAL_TEXT_EN = {
  documentTitle: "Web proposal",
  dateLabel: "Date",
  helloHeading: "Hi",
  intro1: "We built a preview of what {business}'s website could look like with PymeWebPro. It's right below, fully interactive, based on your public social info and what we know about the business.",
  intro2: "This proposal covers what you receive, what it costs, when we deliver, and what happens after launch. If anything doesn't fit, we tweak it on a 15 minute call.",
  mockupHeading: "Your site preview",
  mockupBlurb: "This is a live draft, not a flat PDF. Once we agree on the direction we refine it with your real photos, final copy, and the exact products you want to feature.",
  mockupLinkLabel: "If the preview doesn't load, open the direct link:",
  openInTab: "Open in a new tab",
  priceHeading: "Investment",
  planLabel: "Product",
  totalSub: "Total, IVA included. Includes 1 month of hosting and support.",
  reqLabel: "What you asked for",
  depositLabel: "Deposit to start (30%)",
  depositSub: "kicks off design + development",
  balanceLabel: "Balance at launch (70%)",
  balanceSub: "before we connect DNS to your domain",
  deliveryLabel: "Estimated delivery",
  deliveryValue: "{date} (live in ~48 hours typical)",
  revisionsLabel: "Revisions included",
  revisionsValue: "2 revision rounds included",
  includesHeading: "What you receive",
  hostingHeading: "Hosting + support",
  hosting1: "The price includes your Google Business Profile and 1 month of hosting + support. After that, you pick an optional monthly plan, no contract: hosting only $30.000 COP/mo, Plan de presencia $59.000 COP/mo (hosting + active Google Business Profile + up to 2 changes + monthly report), or Plan de ventas $150.000 COP/mo (everything above + your 24/7 sales assistant: a chatbot on your page that answers questions and sends the customer to your WhatsApp with one tap).",
  host1: "Cloudflare Pages, 330+ edge locations, sub-1s LCP worldwide",
  host2: "Managed SSL cert, automatic renewal, no extra fees",
  host3: "Automatic backups, geo redundancy",
  host4: "WhatsApp + email support throughout the coverage period",
  maintenanceLabel: "Hosting after the included month",
  maintenanceValue: "$30.000 COP / month or $300.000 COP / year",
  hourlyLabel: "Out-of-scope changes",
  hourlyValue: "additional revision round $90.000 COP",
  guaranteeHeading: "Guarantee",
  guaranteeBody: "30 day post-launch money-back guarantee. If you're not happy within the first 30 days we take the site offline and refund 100% of what was paid. After 30 days the fee is non-refundable, but we still honor the included hosting period.",
  termsHeading: "Terms",
  terms1: "Contracting entity: Norte Sur Consulting S.A.S. (NIT 901.956.771-1), doing business as PymeWebPro.",
  terms2: "Payment methods: Wompi (PSE, bank transfer, cards) in COP. Prices in COP, IVA included.",
  terms3: "This proposal is valid for 30 days from the date above. Any out-of-scope changes after sign-off are quoted via the add-on menu or an additional revision round.",
  printButton: "Save as PDF",
  openMockupButton: "Open mockup only",
  footerCredit: "Proposal generated by",
};

// Single product: "La página de ventas". Both keys point at the same list so
// any legacy stored plan key still resolves to the one product.
const FEATURES_ES_LIST = [
  "Página de conversión custom de 6 pasos con 1 CTA principal",
  "Botón de WhatsApp o formulario de contacto",
  "Click-to-call y mapa de Google embebido",
  "Integración de citas/reservas (Cal.com o Calendly)",
  "Sección de testimonios",
  "Estructura SEO y analítica respetuosa de la privacidad",
  "Ficha de Google (perfil de negocio) configurada para que te encuentren en el mapa",
  "Dominio + SSL configurados (el costo del dominio es del cliente)",
  "1 mes de hosting + soporte incluido",
  "2 rondas de revisión, en vivo en ~48 horas",
  "Adicionales à la carte ($75.000 c/u): catálogo en la página, catálogo o menú descargable en PDF, versión bilingüe",
];
const FEATURES_ES = { esencial: FEATURES_ES_LIST, pro: FEATURES_ES_LIST };
const FEATURES_EN_LIST = [
  "Custom 6-step conversion page with 1 primary CTA",
  "WhatsApp button or contact form",
  "Click-to-call and embedded Google Maps",
  "Booking/appointment integration (Cal.com or Calendly)",
  "Testimonials section",
  "SEO structure and privacy-first analytics",
  "Google Business Profile set up so customers find you on the map",
  "Domain + SSL setup (domain cost is the client's)",
  "1 month hosting + support included",
  "2 revision rounds, live in ~48 hours",
  "À la carte add-ons ($75.000 each): on-page catalog, downloadable catalog or menu (PDF), bilingual version",
];
const FEATURES_EN = { esencial: FEATURES_EN_LIST, pro: FEATURES_EN_LIST };

// HTML escape for values we inject into the proposal template. We avoid the
// project-wide escapeHtml import to keep this module self-contained.
function escapeForMockup(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
