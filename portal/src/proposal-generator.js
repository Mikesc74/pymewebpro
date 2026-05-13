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
// bilingual; tier choice toggles pricing currency).
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

async function generateProposal(env, dealId, json) {
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
// module can rely on. Centralizes the "Essential vs Pro" decision and the
// currency choice (COP for Spanish leads, CAD for everyone else).
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
  return {
    market, tier, language,
    businessName, contactName, contactEmail, phone, whatsapp,
    category, city, address, currentSite,
    suggestedPitch, notes, message,
    socials,
    pricing: pickPricing(market, tier),
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

function pickTier(deal, lead) {
  const p = (deal && deal.plan) || (lead && lead.plan) || "esencial";
  return p === "pro" ? "pro" : "esencial";
}

function pickPricing(market, tier) {
  if (market === "co" && tier === "pro")      return { label: "Pro",      currency: "COP", price: "$690.000 COP", deposit: "$207.000 COP", balance: "$483.000 COP", hosting: "incluye 2 años de hosting + soporte", maintenance: "$35 CAD / mes (opcional)", hourly: "$75 CAD / hora" };
  if (market === "co" && tier === "esencial") return { label: "Esencial", currency: "COP", price: "$390.000 COP", deposit: "$117.000 COP", balance: "$273.000 COP", hosting: "incluye 1 año de hosting + soporte", maintenance: "$35 CAD / mes (opcional)", hourly: "$75 CAD / hora" };
  if (market === "na" && tier === "pro")      return { label: "Pro",      currency: "CAD", price: "$800 CAD",     deposit: "$240 CAD",     balance: "$560 CAD",     hosting: "includes 2 years hosting + support", maintenance: "$35 CAD / month (optional)", hourly: "$75 CAD / hour" };
  return                                            { label: "Essential",currency: "CAD", price: "$500 CAD",     deposit: "$150 CAD",     balance: "$350 CAD",     hosting: "includes 1 year hosting + support", maintenance: "$35 CAD / month (optional)", hourly: "$75 CAD / hour" };
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
      <div class="tier">${escapeForMockup(T.planLabel)} · ${escapeForMockup(p.label)}</div>
      <div class="total">${escapeForMockup(p.price)}</div>
      <div class="sub">${escapeForMockup(p.hosting)}</div>
    </div>
    <div class="grid-2">
      <div class="cell"><b>${escapeForMockup(T.depositLabel)}</b>${escapeForMockup(p.deposit)} · ${escapeForMockup(T.depositSub)}</div>
      <div class="cell"><b>${escapeForMockup(T.balanceLabel)}</b>${escapeForMockup(p.balance)} · ${escapeForMockup(T.balanceSub)}</div>
      <div class="cell"><b>${escapeForMockup(T.deliveryLabel)}</b>${escapeForMockup(T.deliveryValue.replace("{date}", fmtDelivery))}</div>
      <div class="cell"><b>${escapeForMockup(T.revisionsLabel)}</b>${escapeForMockup(tierKey === "pro" ? T.revisionsPro : T.revisionsEssential)}</div>
    </div>
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
    <p class="terms"><b>${escapeForMockup(T.maintenanceLabel)}:</b> ${escapeForMockup(p.maintenance)} · <b>${escapeForMockup(T.hourlyLabel)}:</b> ${escapeForMockup(p.hourly)}</p>
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
  planLabel: "Plan",
  depositLabel: "Depósito inicial (30%)",
  depositSub: "para arrancar diseño y desarrollo",
  balanceLabel: "Saldo al lanzar (70%)",
  balanceSub: "antes de conectar DNS a tu dominio",
  deliveryLabel: "Entrega estimada",
  deliveryValue: "{date} (7 días hábiles típicos)",
  revisionsLabel: "Revisiones incluidas",
  revisionsEssential: "1 semana de revisiones gratis post-lanzamiento",
  revisionsPro: "2 semanas de revisiones gratis post-lanzamiento",
  includesHeading: "Qué recibes",
  hostingHeading: "Hosting y soporte",
  hosting1: "Tu plan incluye hosting durante el período del contrato. Después de eso, mantener el sitio en línea cuesta $15 CAD / mes o $180 CAD / año.",
  host1: "Cloudflare Pages, 330+ ubicaciones edge, sub-1s LCP en cualquier país",
  host2: "Certificado SSL gestionado, renovación automática, sin tarifas extra",
  host3: "Backups automáticos, redundancia geográfica",
  host4: "Soporte por WhatsApp y email durante el período de cobertura",
  maintenanceLabel: "Mantenimiento mensual",
  hourlyLabel: "Edits ad-hoc",
  guaranteeHeading: "Garantía",
  guaranteeBody: "30 días de garantía de devolución post-lanzamiento. Si no estás satisfecho dentro de los primeros 14 días, bajamos el sitio y devolvemos el 100% de lo pagado. Después de 30 días el fee deja de ser reembolsable, pero seguimos respondiendo por el período de hosting incluido.",
  termsHeading: "Términos",
  terms1: "Contratante: Norte Sur Consulting S.A.S. (NIT 901.956.771-1), también conocido como PymeWebPro.",
  terms2: "Métodos de pago en Colombia: Wompi (transferencia bancaria, PSE, tarjetas) en COP. Métodos de pago en NA: Wise Business (tarjetas, Apple/Google Pay, wires) en CAD o USD.",
  terms3: "Esta propuesta es válida durante 30 días desde la fecha indicada arriba. Cualquier cambio de alcance posterior se cotiza por hora.",
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
  planLabel: "Plan",
  depositLabel: "Deposit to start (30%)",
  depositSub: "kicks off design + development",
  balanceLabel: "Balance at launch (70%)",
  balanceSub: "before we connect DNS to your domain",
  deliveryLabel: "Estimated delivery",
  deliveryValue: "{date} (5 to 7 business days typical)",
  revisionsLabel: "Revisions included",
  revisionsEssential: "1 week of free revisions post-launch",
  revisionsPro: "2 weeks of free revisions post-launch",
  includesHeading: "What you receive",
  hostingHeading: "Hosting + support",
  hosting1: "Your plan includes hosting for the contract period. After that, keeping the site online costs $15 CAD / month or $180 CAD / year.",
  host1: "Cloudflare Pages, 330+ edge locations, sub-1s LCP worldwide",
  host2: "Managed SSL cert, automatic renewal, no extra fees",
  host3: "Automatic backups, geo redundancy",
  host4: "WhatsApp + email support throughout the coverage period",
  maintenanceLabel: "Monthly maintenance",
  hourlyLabel: "Ad-hoc edits",
  guaranteeHeading: "Guarantee",
  guaranteeBody: "30 day post-launch money-back guarantee. If you're not happy within the first 14 days we take the site offline and refund 100% of what was paid. After 30 days the fee is non-refundable, but we still honor the included hosting period.",
  termsHeading: "Terms",
  terms1: "Contracting entity: Norte Sur Consulting S.A.S. (NIT 901.956.771-1), doing business as PymeWebPro.",
  terms2: "Payment methods (NA): Wise Business (cards, Apple/Google Pay, wires) in CAD or USD. Payment methods (Colombia): Wompi (PSE, bank transfer, cards) in COP.",
  terms3: "This proposal is valid for 30 days from the date above. Any out-of-scope changes after sign-off are billed hourly.",
  printButton: "Save as PDF",
  openMockupButton: "Open mockup only",
  footerCredit: "Proposal generated by",
};

const FEATURES_ES = {
  esencial: [
    "Sitio multi-página custom (no plantilla)",
    "Botón flotante de WhatsApp",
    "Formulario de contacto que llega a tu email",
    "Dominio + SSL gestionado",
    "1 año de hosting + soporte incluidos",
    "1 semana de revisiones gratis post-lanzamiento",
    "Lighthouse 100 en performance, SEO, accesibilidad",
    "Schema.org JSON-LD para que Google entienda el sitio",
    "Footer NIT + dirección registrada (cumplimiento Colombia)",
  ],
  pro: [
    "Todo lo de Esencial, más:",
    "Blog con CMS liviano para publicar artículos",
    "Sección de descargas (PDFs, brochures, menús)",
    "Google Analytics 4 + Meta Pixel configurados",
    "Soporte bilingüe EN/ES (o EN/FR)",
    "2 años de hosting + soporte incluidos",
    "2 semanas de revisiones gratis post-lanzamiento",
  ],
};
const FEATURES_EN = {
  esencial: [
    "Multi-page custom site (no template)",
    "Floating WhatsApp button",
    "Contact form that hits your email",
    "Custom domain + managed SSL",
    "1 year hosting + support included",
    "1 week of free revisions post-launch",
    "Lighthouse 100 across performance, SEO, accessibility",
    "Schema.org JSON-LD so Google understands the site",
    "Footer compliance block when required by market",
  ],
  pro: [
    "Everything in Essential, plus:",
    "Blog with a lightweight CMS for publishing posts",
    "Downloads section (PDFs, brochures, menus)",
    "Google Analytics 4 + Meta Pixel pre-wired",
    "Bilingual support EN/ES (or EN/FR)",
    "2 years hosting + support included",
    "2 weeks of free revisions post-launch",
  ],
};

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
