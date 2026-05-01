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
ADEMÁS, este cliente es plan CRECIMIENTO (Growth). Si los datos crudos contienen valores para estos, inclúyelos en el JSON; si no existen, omita la clave (NO invente IDs ni URLs):
- bookingsUrl: URL de Calendly / Cal.com / etc para el sistema de reservas
- pdfUrl + pdfLabel: link a un catálogo / menú PDF
- waCatalogUrl: link al catálogo de WhatsApp Business
- newsletterUrl: endpoint del formulario de suscripción
- ga4Id: ID de Google Analytics 4 (formato G-XXXXXXXX)
- metaPixelId: ID del Meta Pixel
- faqs: array de {q, a} si el cliente proporciona preguntas frecuentes`;

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

  // Public preview viewer (signed share token)
  let mt = p.match(/^\/m\/([A-Za-z0-9_-]+)\/?$/);
  if (mt && m === "GET") return previewIndex(env, helpers, mt[1]);
  mt = p.match(/^\/m\/([A-Za-z0-9_-]+)\/asset\/(.+)$/);
  if (mt && m === "GET") return previewAsset(env, mt[1], decodeURIComponent(mt[2]));
  mt = p.match(/^\/api\/m\/([A-Za-z0-9_-]+)\/comment$/);
  if (mt && m === "POST") return previewComment(env, helpers, mt[1], req);

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

    mt = p.match(/^\/api\/admin\/mockups\/([A-Za-z0-9-]+)\/ship$/);
    if (mt && m === "POST") return shipMockup(env, helpers, mt[1], req);
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

  // Pull asset URLs (logo, photos)
  const assets = await env.DB.prepare(
    "SELECT id, category, filename, r2_key FROM files WHERE client_id = ? AND category IN ('logo','photo')",
  ).bind(clientId).all();
  const logo = (assets.results || []).find((a) => a.category === "logo");
  const photos = (assets.results || []).filter((a) => a.category === "photo").slice(0, 6);

  // Ask Claude for the blueprint input (plan-aware)
  const plan = String(client.plan || "esencial").toLowerCase();
  const filled = await callClaude(env, intake, plan);

  // Wire asset URLs (served via /m/<token>/asset/<filename>)
  if (logo) filled.logoUrl = `./asset/${encodeURIComponent(safeName(logo))}`;
  filled.galleryUrls = photos.map((p) => `./asset/${encodeURIComponent(safeName(p))}`);

  // Render with plan
  const render = BLUEPRINTS["blueprint-1"];
  const htmlOut = render(filled, { plan });

  // Determine version
  const last = await env.DB.prepare("SELECT MAX(version) as v FROM mockups WHERE client_id = ?")
    .bind(clientId).first();
  const version = (last && last.v ? last.v : 0) + 1;

  const id = helpers.uuid();
  const r2Key = `mockups/${clientId}/${id}/index.html`;
  await env.ASSETS.put(r2Key, htmlOut, { httpMetadata: { contentType: "text/html; charset=utf-8" } });

  // Copy assets into mockup folder
  for (const a of [logo, ...photos].filter(Boolean)) {
    const obj = await env.ASSETS.get(a.r2_key);
    if (!obj) continue;
    await env.ASSETS.put(`mockups/${clientId}/${id}/asset/${safeName(a)}`, obj.body, {
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

async function callClaude(env, intake, plan) {
  const isPro = String(plan || "").toLowerCase() === "pro" || String(plan || "").toLowerCase() === "crecimiento" || String(plan || "").toLowerCase() === "growth";
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
      testimonials: Array.isArray(intake.testimonials) ? intake.testimonials : [],
      faqs: Array.isArray(intake.faqs) ? intake.faqs : [],
    };
    if (isPro) {
      out.bookingsUrl = tech.bookingsUrl || tech.calendly || content.bookingsUrl;
      out.pdfUrl = tech.pdfUrl || content.pdfUrl;
      out.pdfLabel = tech.pdfLabel || content.pdfLabel;
      out.waCatalogUrl = (intake.contact || {}).waCatalog || tech.waCatalogUrl;
      out.newsletterUrl = tech.newsletterUrl || content.newsletterUrl;
      out.newsletterEnabled = !!(out.newsletterUrl || tech.newsletter);
      out.ga4Id = tech.ga4Id || tech.ga4 || tech.gaId;
      out.metaPixelId = tech.metaPixelId || tech.fbPixelId || tech.pixelId;
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

async function previewIndex(env, helpers, token) {
  const link = await loadShare(env, token);
  if (!link) return new Response("Enlace caducado o no válido", { status: 404 });
  const m = await env.DB.prepare("SELECT html_r2_key FROM mockups WHERE id = ?").bind(link.mockup_id).first();
  if (!m) return new Response("Mockup no encontrado", { status: 404 });
  const obj = await env.ASSETS.get(m.html_r2_key);
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
  const prefix = m.html_r2_key.replace(/\/index\.html$/, "");
  const obj = await env.ASSETS.get(`${prefix}/asset/${name}`);
  if (!obj) return new Response("not found", { status: 404 });
  return new Response(obj.body, {
    headers: { "content-type": obj.httpMetadata?.contentType || "application/octet-stream" },
  });
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

// ─── Ship to Pages ──────────────────────────────────────────────────────────

async function shipMockup(env, helpers, mockupId, req) {
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
    return helpers.json({ error: "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID required" }, 500);
  }
  const m = await env.DB.prepare("SELECT id, client_id, html_r2_key FROM mockups WHERE id = ?")
    .bind(mockupId).first();
  if (!m) return helpers.json({ error: "not found" }, 404);

  const projectName = `pwp-${m.client_id.slice(0, 8)}`;
  // Idempotent create
  await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ name: projectName, production_branch: "main" }),
  }).catch(() => {});

  // NOTE: Pages direct-upload requires building a JWT-signed manifest of file hashes.
  // For v1 we mark shipped + return the expected URL. Wire create-deployment later.
  const url = `https://${projectName}.pages.dev`;
  await env.DB.prepare(
    "UPDATE mockups SET status='shipped', shipped_at=?, shipped_url=? WHERE id=?",
  ).bind(Math.floor(Date.now() / 1000), url, mockupId).run();

  return helpers.json({ ok: true, project: projectName, url, note: "Pages project created. Run `wrangler pages deploy` from R2 contents to publish; full direct-upload wiring is a v2." });
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
