// ============================================================================
// PymeWebPro portal Worker - source recovered from deployed bundle
// ============================================================================
// The original Worker source tree was lost. This file is reconstructed from the
// esbuild bundle returned by `wrangler deployments view` / `workers_get_worker_code`.
// The bundle was 4035 lines: lines 1-879 were unenv/@cloudflare/unenv-preset polyfills
// (Performance, console, hrtime, TTY streams, Process polyfill); those have been
// elided here as they're auto-generated and re-emitted on every deploy.
//
// Below: every `// src/*.js` module from the bundle, in original order,
// followed by the worker's `export default { fetch }`.
//
// Mockup engine module imported from a sibling file (added by graft):
import { handleMockups } from "./mockups.js";
//
// Modules in order:  utils.js, auth.js, client.js, deliverables.js, admin.js,
//                    files.js, leads.js, payments.js, frontend.js, index.js
//
// IMPORTANT FOR RE-SPLITTING: This is a single concatenated file. To restore the
// original module structure, split at each `// src/<name>.js` boundary comment
// and put each block in its own file. The shared helpers (`json`, `cors`, `uuid`,
// `sha256`, `randomToken`, `getSession`, `isAdmin`, `sendEmail`, `rateLimit`,
// `getClientIP`, `logEvent`) live in utils.js and are imported by everyone else.
// ============================================================================

// src/utils.js
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
function cors(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(response.body, { status: response.status, headers });
}
function uuid() {
  return crypto.randomUUID();
}
async function sha256(text) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function getSession(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const session = await env.DB.prepare(
    "SELECT s.*, c.* FROM sessions s JOIN clients c ON s.client_id = c.id WHERE s.token = ? AND s.expires_at > ?"
  ).bind(token, Date.now()).first();
  return session;
}
function isAdmin(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  return token === env.ADMIN_TOKEN;
}
async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email send");
    return { skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL || "portal@pymewebpro.com",
      to,
      subject,
      html
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Email send failed: ${err}`);
  }
  return await res.json();
}
async function rateLimit(env, key, limit = 5, windowSec = 600) {
  const kvKey = `rl:${key}`;
  const existing = await env.TOKENS.get(kvKey);
  const count = existing ? parseInt(existing, 10) : 0;
  if (count >= limit) return false;
  await env.TOKENS.put(kvKey, String(count + 1), { expirationTtl: windowSec });
  return true;
}
function getClientIP(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
}
async function logEvent(env, clientId, event, metadata = {}) {
  await env.DB.prepare(
    "INSERT INTO audit_log (client_id, event, metadata, created_at) VALUES (?, ?, ?, ?)"
  ).bind(clientId, event, JSON.stringify(metadata), Date.now()).run();
}

// src/auth.js
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
async function handleAuth(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === "/api/auth/request" && request.method === "POST") return await requestMagicLink(request, env);
  if (path === "/api/auth/verify" && request.method === "GET") return await verifyMagicLink(request, env);
  if (path === "/api/auth/logout" && request.method === "POST") return await logout(request, env);
  if (path === "/api/auth/me" && request.method === "GET") return await getMe(request, env);
  return json({ error: "Not found" }, 404);
}
async function requestMagicLink(request, env) {
  const { email } = await request.json();
  if (!email || !email.includes("@")) return json({ error: "Valid email required" }, 400);
  const normalized = email.toLowerCase().trim();
  const ip = getClientIP(request);
  const ipOk = await rateLimit(env, `ip:${ip}`, 5, 600);
  const emailOk = await rateLimit(env, `email:${normalized}`, 3, 600);
  if (!ipOk || !emailOk) return json({ error: "Too many requests. Please wait a few minutes." }, 429);
  let client = await env.DB.prepare("SELECT * FROM clients WHERE email = ?").bind(normalized).first();
  if (!client) return json({ error: "No invitation found for this email. Contact your project manager." }, 403);
  const token = randomToken(32);
  await env.TOKENS.put(`magic:${token}`, client.id, { expirationTtl: Math.floor(MAGIC_LINK_TTL_MS / 1000) });
  const loginUrl = `${env.APP_URL}/auth/verify?token=${token}`;
  const lang = client.language || "en";
  const subject = lang === "es" ? "Su enlace de acceso a PymeWebPro" : "Your PymeWebPro login link";
  const html = lang === "es" ? magicLinkEmailEs(loginUrl, client.business_name || "") : magicLinkEmailEn(loginUrl, client.business_name || "");
  await sendEmail(env, { to: normalized, subject, html });
  await logEvent(env, client.id, "magic_link_requested");
  return json({ ok: true, message: "Check your email for a login link." });
}
async function verifyMagicLink(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return json({ error: "Missing token" }, 400);
  const clientId = await env.TOKENS.get(`magic:${token}`);
  if (!clientId) return json({ error: "Invalid or expired link" }, 401);
  await env.TOKENS.delete(`magic:${token}`);
  const sessionToken = randomToken(48);
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO sessions (token, client_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
  ).bind(sessionToken, clientId, expiresAt, now).run();
  await env.DB.prepare(
    `UPDATE clients SET status = CASE WHEN status = 'invited' THEN 'in_progress' ELSE status END, updated_at = ? WHERE id = ?`
  ).bind(now, clientId).run();
  await logEvent(env, clientId, "login_success");
  const client = await env.DB.prepare("SELECT id, email, business_name, status, language FROM clients WHERE id = ?").bind(clientId).first();
  return json({ ok: true, session: sessionToken, client, expiresAt });
}
async function logout(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return json({ ok: true });
  const token = auth.slice(7);
  await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  return json({ ok: true });
}
async function getMe(request, env) {
  const session = await getSession(request, env);
  if (!session) return json({ error: "Not authenticated" }, 401);
  return json({
    client: {
      id: session.client_id, email: session.email, business_name: session.business_name,
      status: session.status, language: session.language
    }
  });
}
function magicLinkEmailEn(url, bizName) {
  return `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #0a0e27; color: #fff;">
      <h1 style="font-style: italic; color: #fbbf24;">PymeWebPro</h1>
      <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">${bizName ? `Hi ${bizName},` : "Hello,"}</p>
      <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">Click the button below to log in to your client portal. This link expires in 15 minutes.</p>
      <a href="${url}" style="display: inline-block; background: #fbbf24; color: #0a0e27; padding: 14px 32px; text-decoration: none; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 2px; margin: 24px 0;">Log In</a>
      <p style="color: rgba(255,255,255,0.4); font-size: 13px;">If the button doesn't work, copy this URL into your browser:<br><a href="${url}" style="color: #fbbf24; word-break: break-all;">${url}</a></p>
    </div>`;
}
function magicLinkEmailEs(url, bizName) {
  return `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #0a0e27; color: #fff;">
      <h1 style="font-style: italic; color: #fbbf24;">PymeWebPro</h1>
      <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">${bizName ? `Hola ${bizName},` : "Hola,"}</p>
      <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">Haga clic en el botón a continuación para acceder a su portal. Este enlace caduca en 15 minutos.</p>
      <a href="${url}" style="display: inline-block; background: #fbbf24; color: #0a0e27; padding: 14px 32px; text-decoration: none; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 2px; margin: 24px 0;">Iniciar Sesión</a>
      <p style="color: rgba(255,255,255,0.4); font-size: 13px;">Si el botón no funciona, copie esta URL en su navegador:<br><a href="${url}" style="color: #fbbf24; word-break: break-all;">${url}</a></p>
    </div>`;
}

// src/client.js
const VALID_SECTIONS = ["business", "contact", "brand", "visual", "content", "tech", "growth"];
async function handleClient(request, env) {
  const session = await getSession(request, env);
  if (!session) return json({ error: "Not authenticated" }, 401);
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (path === "/api/client/intake" && method === "GET") return await getIntake(session, env);
  const sectionMatch = path.match(/^\/api\/client\/intake\/([a-z]+)$/);
  if (sectionMatch && method === "PUT") return await saveSection(request, session, env, sectionMatch[1]);
  if (path === "/api/client/submit" && method === "POST") return await submitIntake(session, env);
  if (path === "/api/client/files" && method === "GET") return await listFiles(session, env);
  return json({ error: "Not found" }, 404);
}
async function getIntake(session, env) {
  const rows = await env.DB.prepare("SELECT section, data, updated_at FROM submissions WHERE client_id = ?").bind(session.client_id).all();
  const sections = {};
  for (const row of rows.results || []) sections[row.section] = { data: JSON.parse(row.data), updated_at: row.updated_at };
  return json({
    client: { id: session.client_id, email: session.email, business_name: session.business_name, status: session.status, language: session.language },
    sections
  });
}
async function saveSection(request, session, env, section) {
  if (!VALID_SECTIONS.includes(section)) return json({ error: "Invalid section" }, 400);
  const body = await request.json();
  if (!body || typeof body !== "object") return json({ error: "Invalid payload" }, 400);
  const now = Date.now();
  const id = crypto.randomUUID();
  const dataJson = JSON.stringify(body);
  await env.DB.prepare(
    `INSERT INTO submissions (id, client_id, section, data, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(client_id, section)
     DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
  ).bind(id, session.client_id, section, dataJson, now).run();
  if (section === "business" && body.bizName) {
    await env.DB.prepare("UPDATE clients SET business_name = ?, updated_at = ? WHERE id = ?").bind(body.bizName, now, session.client_id).run();
  }
  await env.DB.prepare("UPDATE clients SET updated_at = ? WHERE id = ?").bind(now, session.client_id).run();
  return json({ ok: true, section, updated_at: now });
}
async function submitIntake(session, env) {
  const now = Date.now();
  await env.DB.prepare(`UPDATE clients SET status = 'submitted', submitted_at = ?, updated_at = ? WHERE id = ?`).bind(now, now, session.client_id).run();
  await logEvent(env, session.client_id, "intake_submitted");
  const client = await env.DB.prepare("SELECT email, business_name FROM clients WHERE id = ?").bind(session.client_id).first();
  if (env.ADMIN_EMAIL) {
    try {
      await sendEmail(env, {
        to: env.ADMIN_EMAIL,
        subject: `New intake submitted: ${client.business_name || client.email}`,
        html: `
          <div style="font-family: Georgia, serif;">
            <h2>New client intake submitted</h2>
            <p><strong>Business:</strong> ${client.business_name || "(not provided)"}</p>
            <p><strong>Email:</strong> ${client.email}</p>
            <p><a href="${env.APP_URL}/admin/clients/${session.client_id}">View in admin →</a></p>
          </div>`
      });
    } catch (e) { console.error("Admin notification failed:", e); }
  }
  return json({ ok: true, status: "submitted", submitted_at: now });
}
async function listFiles(session, env) {
  const rows = await env.DB.prepare(
    "SELECT id, category, filename, mime_type, size_bytes, uploaded_at FROM files WHERE client_id = ? ORDER BY uploaded_at DESC"
  ).bind(session.client_id).all();
  return json({ files: rows.results || [] });
}

// src/deliverables.js
const DELIVERABLES = [
  // SETUP
  { key: "setup_domain", group: "setup", plan: "esencial", label: "Dominio configurado y a nombre del cliente" },
  { key: "setup_dns", group: "setup", plan: "esencial", label: "DNS apuntando a Cloudflare" },
  { key: "setup_ssl", group: "setup", plan: "esencial", label: "Certificado SSL / HTTPS activo" },
  { key: "setup_email_forward", group: "setup", plan: "esencial", label: "Reenvío de correo info@cliente.com → Gmail" },
  { key: "setup_hosting_year", group: "setup", plan: "pro", label: "1 año de hosting incluido configurado" },
  // DESIGN
  { key: "design_logo", group: "design", plan: "esencial", label: "Logo cargado / preparado" },
  { key: "design_logo_refresh", group: "design", plan: "pro", label: "Logo nuevo o refresh diseñado (IA-asistido)" },
  { key: "design_brand_colors", group: "design", plan: "esencial", label: "Colores de marca aplicados" },
  { key: "design_typography", group: "design", plan: "esencial", label: "Tipografía elegida y aplicada" },
  { key: "design_approved", group: "design", plan: "esencial", label: "Diseño aprobado por el cliente" },
  // PAGES CORE
  { key: "page_home", group: "pages", plan: "esencial", label: "Inicio" },
  { key: "page_services", group: "pages", plan: "esencial", label: "Servicios / productos" },
  { key: "page_about", group: "pages", plan: "esencial", label: "Sobre nosotros" },
  { key: "page_contact", group: "pages", plan: "esencial", label: "Contacto" },
  { key: "page_location", group: "pages", plan: "esencial", label: "Ubicación + mapa" },
  // PAGES EXTRA
  { key: "page_blog", group: "pages", plan: "pro", label: "Blog / Noticias (publicable por el cliente)" },
  { key: "page_gallery_pro", group: "pages", plan: "pro", label: "Galería ampliada" },
  { key: "page_bookings", group: "pages", plan: "pro", label: "Reservas / agendamiento" },
  { key: "page_reviews", group: "pages", plan: "pro", label: "Reseñas / testimonios destacados" },
  { key: "page_team", group: "pages", plan: "pro", label: "Equipo" },
  { key: "page_faq", group: "pages", plan: "pro", label: "FAQ" },
  // FEATURES
  { key: "feat_whatsapp_btn", group: "features", plan: "esencial", label: "Botón de WhatsApp" },
  { key: "feat_google_map", group: "features", plan: "esencial", label: "Mapa de Google integrado" },
  { key: "feat_social_bar", group: "features", plan: "esencial", label: "Barra social (WhatsApp, IG, FB, Maps)" },
  { key: "feat_photo_gallery", group: "features", plan: "esencial", label: "Galería de fotos" },
  { key: "feat_testimonials", group: "features", plan: "esencial", label: "Sección de testimonios" },
  { key: "feat_contact_form", group: "features", plan: "esencial", label: "Formulario de contacto + auto-confirmación" },
  { key: "feat_pdf_download", group: "features", plan: "pro", label: "PDF descargable (menú / catálogo / ficha)" },
  { key: "feat_email_capture", group: "features", plan: "pro", label: "Captura de correos (newsletter / promos)" },
  { key: "feat_wa_catalog", group: "features", plan: "pro", label: "Catálogo de WhatsApp Business enlazado" },
  { key: "feat_booking_system", group: "features", plan: "pro", label: "Sistema de agendamiento integrado" },
  { key: "feat_bilingual", group: "features", plan: "pro", label: "Versión bilingüe ES + EN" },
  // SEO & ANALYTICS
  { key: "seo_meta_tags", group: "seo", plan: "esencial", label: "Meta tags optimizadas por página" },
  { key: "seo_sitemap", group: "seo", plan: "esencial", label: "sitemap.xml automático" },
  { key: "seo_robots", group: "seo", plan: "esencial", label: "robots.txt configurado" },
  { key: "seo_indexed", group: "seo", plan: "esencial", label: "Indexado en Google (≤7 días)" },
  { key: "seo_search_console", group: "seo", plan: "esencial", label: "Google Search Console configurada" },
  { key: "seo_analytics", group: "seo", plan: "esencial", label: "Google Analytics 4 instalado" },
  { key: "seo_structured_data", group: "seo", plan: "pro", label: "Datos estructurados (Schema.org)" },
  { key: "seo_gbp", group: "seo", plan: "pro", label: "Google Business Profile verificado" },
  { key: "seo_meta_pixel", group: "seo", plan: "pro", label: "Meta Pixel instalado" },
  { key: "seo_ga4_goals", group: "seo", plan: "pro", label: "Metas de conversión en GA4" },
  { key: "seo_speed", group: "seo", plan: "pro", label: "Velocidad <1s / Core Web Vitals" },
  // CIERRE
  { key: "close_training", group: "close", plan: "esencial", label: "Capacitación al cliente (30 min)" },
  { key: "close_handover", group: "close", plan: "esencial", label: "Documentación entregada" },
  { key: "close_support_active", group: "close", plan: "esencial", label: "Soporte por WhatsApp activo" },
  { key: "close_revisions", group: "close", plan: "esencial", label: "Rondas de cambios completadas" }
];
const GROUP_LABELS = {
  setup: "Configuración técnica", design: "Diseño y marca", pages: "Páginas",
  features: "Funcionalidades", seo: "SEO + Analytics", close: "Cierre y entrega"
};
const STATUS_LABELS = {
  pending: { label: "Pendiente", color: "#94a3b8", icon: "○" },
  in_progress: { label: "En curso", color: "#fbbf24", icon: "◐" },
  done: { label: "Listo", color: "#10b981", icon: "✓" },
  na: { label: "N/A", color: "#475569", icon: "–" }
};
function deliverablesForPlan(plan) {
  if (plan === "pro") return DELIVERABLES;
  if (plan === "esencial") return DELIVERABLES.filter((d) => d.plan === "esencial");
  return DELIVERABLES.filter((d) => d.plan === "esencial");
}
function computeSummary(state, plan) {
  const items = deliverablesForPlan(plan);
  let done = 0, in_progress = 0, pending = 0, na = 0;
  for (const d of items) {
    const s = state[d.key] || "pending";
    if (s === "done") done++;
    else if (s === "in_progress") in_progress++;
    else if (s === "na") na++;
    else pending++;
  }
  const trackable = items.length - na;
  const pct = trackable > 0 ? Math.round(done / trackable * 100) : 0;
  return { total: items.length, done, in_progress, pending, na, pct };
}

// src/admin.js
async function handleAdmin(request, env) {
  if (!isAdmin(request, env)) return json({ error: "Admin authentication required" }, 401);
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (path === "/api/admin/invite" && method === "POST") return await invite(request, env);
  if (path === "/api/admin/clients" && method === "GET") return await listClients(env);
  const idMatch = path.match(/^\/api\/admin\/clients\/([a-f0-9-]+)$/);
  if (idMatch && method === "GET") return await getClientDetail(env, idMatch[1]);
  if (idMatch && method === "DELETE") return await deleteClient(env, idMatch[1]);
  const resendMatch = path.match(/^\/api\/admin\/clients\/([a-f0-9-]+)\/resend$/);
  if (resendMatch && method === "POST") return await resendInvite(env, resendMatch[1]);
  if (path === "/api/admin/deliverables/schema" && method === "GET") {
    return json({ deliverables: DELIVERABLES, groups: GROUP_LABELS, statuses: STATUS_LABELS });
  }
  const delvMatch = path.match(/^\/api\/admin\/clients\/([a-f0-9-]+)\/deliverables\/([a-z_]+)$/);
  if (delvMatch && method === "PUT") return await setDeliverableStatus(request, env, delvMatch[1], delvMatch[2]);
  const siteUrlMatch = path.match(/^\/api\/admin\/clients\/([a-f0-9-]+)\/site-url$/);
  if (siteUrlMatch && method === "PUT") return await setSiteUrl(request, env, siteUrlMatch[1]);
  const checkSiteMatch = path.match(/^\/api\/admin\/clients\/([a-f0-9-]+)\/check-site$/);
  if (checkSiteMatch && method === "POST") return await checkSite(env, checkSiteMatch[1]);
  if (path === "/api/admin/check-all-sites" && method === "POST") return await checkAllSites(env);
  return json({ error: "Not found" }, 404);
}
async function setSiteUrl(request, env, clientId) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  let url = (body.site_url || "").trim();
  if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
  if (url && !/^https?:\/\/[a-z0-9.-]+/i.test(url)) return json({ error: "Invalid URL" }, 400);
  const result = await env.DB.prepare("UPDATE clients SET site_url = ?, updated_at = ? WHERE id = ?").bind(url || null, Date.now(), clientId).run();
  if (!result.meta.changes) return json({ error: "Client not found" }, 404);
  return json({ ok: true, site_url: url || null });
}
async function performSiteCheck(siteUrl) {
  const start = Date.now();
  const result = {
    checked_at: Date.now(), site_url: siteUrl, status_code: null, ok: false,
    ttfb_ms: null, total_ms: null, content_length: null, server: null, cf_cache: null,
    https: siteUrl.toLowerCase().startsWith("https://"), error: null
  };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(siteUrl, {
      method: "GET", redirect: "follow", cf: { cacheTtl: 0, cacheEverything: false },
      signal: ctrl.signal, headers: { "User-Agent": "PymeWebPro-Health-Check/1.0" }
    });
    result.status_code = res.status;
    result.ok = res.status >= 200 && res.status < 400;
    result.ttfb_ms = Date.now() - start;
    result.server = res.headers.get("server");
    result.cf_cache = res.headers.get("cf-cache-status");
    const body = await res.arrayBuffer();
    result.total_ms = Date.now() - start;
    result.content_length = body.byteLength;
    clearTimeout(t);
  } catch (e) {
    result.error = (e && e.message) || "fetch failed";
    result.total_ms = Date.now() - start;
  }
  return result;
}
async function checkSite(env, clientId) {
  const client = await env.DB.prepare("SELECT id, site_url FROM clients WHERE id = ?").bind(clientId).first();
  if (!client) return json({ error: "Client not found" }, 404);
  if (!client.site_url) return json({ error: "No site_url set for this client" }, 400);
  const health = await performSiteCheck(client.site_url);
  await env.DB.prepare("UPDATE clients SET site_health = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(health), Date.now(), clientId).run();
  return json({ ok: true, health });
}
async function checkAllSites(env) {
  const rows = await env.DB.prepare("SELECT id, site_url FROM clients WHERE site_url IS NOT NULL AND site_url != ''").all();
  const results = [];
  for (const c of rows.results || []) {
    const health = await performSiteCheck(c.site_url);
    await env.DB.prepare("UPDATE clients SET site_health = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(health), Date.now(), c.id).run();
    results.push({ client_id: c.id, site_url: c.site_url, health });
  }
  return json({ ok: true, checked: results.length, results });
}
async function invite(request, env) {
  const { email, businessName, language } = await request.json();
  if (!email || !email.includes("@")) return json({ error: "Valid email required" }, 400);
  const normalized = email.toLowerCase().trim();
  const lang = language === "es" ? "es" : "en";
  const existing = await env.DB.prepare("SELECT id FROM clients WHERE email = ?").bind(normalized).first();
  if (existing) return json({ error: "Client already invited", client_id: existing.id }, 409);
  const id = uuid();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO clients (id, email, business_name, status, language, created_at, updated_at, invited_by)
     VALUES (?, ?, ?, 'invited', ?, ?, ?, ?)`
  ).bind(id, normalized, businessName || null, lang, now, now, env.ADMIN_EMAIL || "admin").run();
  const token = randomToken(32);
  await env.TOKENS.put(`magic:${token}`, id, { expirationTtl: 60 * 60 * 24 * 7 });
  const loginUrl = `${env.APP_URL}/auth/verify?token=${token}`;
  const subject = lang === "es" ? "Invitación al portal PymeWebPro" : "You're invited to the PymeWebPro portal";
  const html = lang === "es" ? inviteEmailEs(loginUrl, businessName) : inviteEmailEn(loginUrl, businessName);
  await sendEmail(env, { to: normalized, subject, html });
  await logEvent(env, id, "client_invited", { invited_by: env.ADMIN_EMAIL });
  return json({ ok: true, client_id: id, invite_url: loginUrl });
}
async function listClients(env) {
  const rows = await env.DB.prepare(
    `SELECT c.id, c.email, c.business_name, c.status, c.language, c.plan,
            c.site_url, c.site_health,
            c.created_at, c.updated_at, c.submitted_at,
            (SELECT COUNT(*) FROM submissions WHERE client_id = c.id) AS sections_filled,
            (SELECT COUNT(*) FROM files WHERE client_id = c.id) AS file_count
     FROM clients c ORDER BY c.updated_at DESC`
  ).all();
  const clients = (rows.results || []).map((c) => ({ ...c, site_health: c.site_health ? safeJSON(c.site_health) : null }));
  return json({ clients });
}
function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }
async function getClientDetail(env, id) {
  const client = await env.DB.prepare("SELECT * FROM clients WHERE id = ?").bind(id).first();
  if (!client) return json({ error: "Client not found" }, 404);
  const submissions = await env.DB.prepare("SELECT section, data, updated_at FROM submissions WHERE client_id = ?").bind(id).all();
  const sections = {};
  for (const row of submissions.results || []) sections[row.section] = { data: JSON.parse(row.data), updated_at: row.updated_at };
  const files = await env.DB.prepare("SELECT id, category, filename, r2_key, mime_type, size_bytes, uploaded_at FROM files WHERE client_id = ? ORDER BY uploaded_at DESC").bind(id).all();
  let plan = client.plan;
  if (!plan) {
    const pmt = await env.DB.prepare(
      `SELECT p.plan FROM payments p JOIN leads l ON l.id = p.lead_id
       WHERE l.converted_client_id = ? AND p.status = 'approved' ORDER BY p.paid_at DESC LIMIT 1`
    ).bind(id).first();
    plan = pmt?.plan || "esencial";
  }
  let state = {};
  try { state = client.deliverables_state ? JSON.parse(client.deliverables_state) : {}; } catch {}
  const items = deliverablesForPlan(plan).map((d) => ({ ...d, status: state[d.key] || "pending" }));
  const summary = computeSummary(state, plan);
  if (client.site_health) { try { client.site_health = JSON.parse(client.site_health); } catch { client.site_health = null; } }
  return json({ client, sections, files: files.results || [], deliverables: { plan, items, summary, groups: GROUP_LABELS, statuses: STATUS_LABELS } });
}
async function setDeliverableStatus(request, env, clientId, key) {
  const validKeys = new Set(DELIVERABLES.map((d) => d.key));
  if (!validKeys.has(key)) return json({ error: "Unknown deliverable key" }, 400);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const status = body.status;
  if (!["pending", "in_progress", "done", "na"].includes(status)) return json({ error: "Invalid status" }, 400);
  const client = await env.DB.prepare("SELECT id, deliverables_state, plan FROM clients WHERE id = ?").bind(clientId).first();
  if (!client) return json({ error: "Client not found" }, 404);
  let state = {};
  try { state = client.deliverables_state ? JSON.parse(client.deliverables_state) : {}; } catch {}
  state[key] = status;
  const now = Date.now();
  await env.DB.prepare("UPDATE clients SET deliverables_state = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(state), now, clientId).run();
  await logEvent(env, clientId, "deliverable_updated", { key, status });
  const summary = computeSummary(state, client.plan || "esencial");
  return json({ ok: true, key, status, summary });
}
async function deleteClient(env, id) {
  const files = await env.DB.prepare("SELECT r2_key FROM files WHERE client_id = ?").bind(id).all();
  for (const f of files.results || []) {
    try { await env.ASSETS.delete(f.r2_key); } catch (e) { console.error("R2 delete failed:", e); }
  }
  await env.DB.prepare("DELETE FROM clients WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
async function resendInvite(env, id) {
  const client = await env.DB.prepare("SELECT * FROM clients WHERE id = ?").bind(id).first();
  if (!client) return json({ error: "Client not found" }, 404);
  const token = randomToken(32);
  await env.TOKENS.put(`magic:${token}`, id, { expirationTtl: 60 * 60 * 24 * 7 });
  const loginUrl = `${env.APP_URL}/auth/verify?token=${token}`;
  const lang = client.language || "en";
  const subject = lang === "es" ? "Su enlace de acceso a PymeWebPro" : "Your PymeWebPro login link";
  const html = lang === "es" ? inviteEmailEs(loginUrl, client.business_name) : inviteEmailEn(loginUrl, client.business_name);
  await sendEmail(env, { to: client.email, subject, html });
  await logEvent(env, id, "invite_resent");
  return json({ ok: true });
}
function inviteEmailEn(url, bizName) {
  return `<div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #0a0e27; color: #fff;">
    <h1 style="font-style: italic; color: #fbbf24;">PymeWebPro</h1>
    <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">${bizName ? `Hi ${bizName},` : "Hello,"}</p>
    <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">You've been invited to the PymeWebPro client portal. Click below to begin filling in your project details — logos, brand colors, content, and assets.</p>
    <a href="${url}" style="display: inline-block; background: #fbbf24; color: #0a0e27; padding: 14px 32px; text-decoration: none; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 2px; margin: 24px 0;">Open Portal</a>
    <p style="color: rgba(255,255,255,0.4); font-size: 13px;">This link is valid for 7 days. After that, request a new one from the login page.</p>
  </div>`;
}
function inviteEmailEs(url, bizName) {
  return `<div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #0a0e27; color: #fff;">
    <h1 style="font-style: italic; color: #fbbf24;">PymeWebPro</h1>
    <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">${bizName ? `Hola ${bizName},` : "Hola,"}</p>
    <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">Le invitamos al portal de clientes PymeWebPro. Haga clic abajo para completar los detalles de su proyecto — logos, colores, contenido y activos.</p>
    <a href="${url}" style="display: inline-block; background: #fbbf24; color: #0a0e27; padding: 14px 32px; text-decoration: none; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 2px; margin: 24px 0;">Abrir Portal</a>
    <p style="color: rgba(255,255,255,0.4); font-size: 13px;">Este enlace es válido por 7 días.</p>
  </div>`;
}

// src/files.js
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/gif",
  "application/pdf", "application/postscript", "application/illustrator",
  "application/zip", "video/mp4"
];
const VALID_CATEGORIES = ["logo", "photo", "reference", "other"];
async function handleFiles(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (path === "/api/files/upload" && method === "POST") return await uploadFile(request, env);
  const idMatch = path.match(/^\/api\/files\/([a-f0-9-]+)$/);
  if (idMatch && method === "GET") return await downloadFile(request, env, idMatch[1]);
  if (idMatch && method === "DELETE") return await deleteFile(request, env, idMatch[1]);
  return json({ error: "Not found" }, 404);
}
async function uploadFile(request, env) {
  const session = await getSession(request, env);
  const admin = isAdmin(request, env);
  if (!session && !admin) return json({ error: "Authentication required" }, 401);
  const url = new URL(request.url);
  const category = url.searchParams.get("category") || "other";
  if (!VALID_CATEGORIES.includes(category)) return json({ error: "Invalid category" }, 400);
  let clientId = session?.client_id;
  if (admin && url.searchParams.get("client_id")) clientId = url.searchParams.get("client_id");
  if (!clientId) return json({ error: "No client context" }, 400);
  const contentType = request.headers.get("Content-Type") || "application/octet-stream";
  const filename = url.searchParams.get("filename") || `upload-${Date.now()}`;
  const contentLength = parseInt(request.headers.get("Content-Length") || "0", 10);
  if (contentLength > MAX_FILE_SIZE) return json({ error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024} MB` }, 413);
  const baseType = contentType.split(";")[0].trim();
  if (!ALLOWED_TYPES.includes(baseType) && !baseType.startsWith("image/")) return json({ error: `Unsupported file type: ${baseType}` }, 415);
  const fileId = uuid();
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  const r2Key = `clients/${clientId}/${category}/${fileId}-${safeFilename}`;
  await env.ASSETS.put(r2Key, request.body, {
    httpMetadata: { contentType: baseType },
    customMetadata: { clientId, category, originalFilename: safeFilename }
  });
  await env.DB.prepare(
    `INSERT INTO files (id, client_id, category, filename, r2_key, mime_type, size_bytes, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(fileId, clientId, category, safeFilename, r2Key, baseType, contentLength, Date.now()).run();
  return json({ ok: true, file: { id: fileId, category, filename: safeFilename, size_bytes: contentLength, mime_type: baseType } });
}
async function downloadFile(request, env, fileId) {
  const url = new URL(request.url);
  const session = await getSession(request, env);
  const admin = isAdmin(request, env);
  let isAdminRequest = admin;
  if (!isAdminRequest && url.searchParams.get("admin_token") === env.ADMIN_TOKEN) isAdminRequest = true;
  if (!session && !isAdminRequest) return json({ error: "Authentication required" }, 401);
  const file = await env.DB.prepare("SELECT * FROM files WHERE id = ?").bind(fileId).first();
  if (!file) return json({ error: "File not found" }, 404);
  if (!isAdminRequest && session.client_id !== file.client_id) return json({ error: "Forbidden" }, 403);
  const obj = await env.ASSETS.get(file.r2_key);
  if (!obj) return json({ error: "File missing from storage" }, 404);
  return new Response(obj.body, {
    headers: {
      "Content-Type": file.mime_type || "application/octet-stream",
      "Content-Disposition": `inline; filename="${file.filename}"`,
      "Cache-Control": "private, max-age=3600"
    }
  });
}
async function deleteFile(request, env, fileId) {
  const session = await getSession(request, env);
  const admin = isAdmin(request, env);
  if (!session && !admin) return json({ error: "Authentication required" }, 401);
  const file = await env.DB.prepare("SELECT * FROM files WHERE id = ?").bind(fileId).first();
  if (!file) return json({ error: "File not found" }, 404);
  if (!admin && session.client_id !== file.client_id) return json({ error: "Forbidden" }, 403);
  try { await env.ASSETS.delete(file.r2_key); } catch (e) { console.error("R2 delete failed:", e); }
  await env.DB.prepare("DELETE FROM files WHERE id = ?").bind(fileId).run();
  return json({ ok: true });
}

// src/leads.js
const VALID_STATUSES = ["new", "contacted", "converted", "dismissed"];
const VALID_SOURCES = ["contact_form", "whatsapp_click", "manual", "whatsapp_message"];
async function handlePublicLeads(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (path === "/api/leads" && method === "POST") return await captureLead(request, env);
  return json({ error: "Not found" }, 404);
}
async function handleAdminLeads(request, env) {
  if (!isAdmin(request, env)) return json({ error: "Admin authentication required" }, 401);
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (path === "/api/admin/leads" && method === "GET") return await listLeads(url, env);
  if (path === "/api/admin/clicks" && method === "GET") return await listClicks(url, env);
  const idMatch = path.match(/^\/api\/admin\/leads\/([a-f0-9-]+)$/);
  if (idMatch) {
    if (method === "GET") return await getLead(env, idMatch[1]);
    if (method === "PATCH") return await updateLead(request, env, idMatch[1]);
    if (method === "DELETE") return await deleteLead(env, idMatch[1]);
  }
  const convertMatch = path.match(/^\/api\/admin\/leads\/([a-f0-9-]+)\/convert$/);
  if (convertMatch && method === "POST") return await convertLead(request, env, convertMatch[1]);
  return json({ error: "Not found" }, 404);
}
async function handleWhatsAppRedirect(request, env) {
  const url = new URL(request.url);
  const campaign = (url.searchParams.get("campaign") || "").slice(0, 64);
  const text = url.searchParams.get("text") || "";
  try {
    const ip = getClientIP(request);
    const ipHash = ip === "unknown" ? null : (await sha256(ip)).slice(0, 32);
    const ua = (request.headers.get("User-Agent") || "").slice(0, 256);
    const referrer = (request.headers.get("Referer") || "").slice(0, 512);
    await env.DB.prepare(
      `INSERT INTO lead_clicks (id, kind, campaign, referrer, user_agent, ip_hash, created_at)
       VALUES (?, 'whatsapp', ?, ?, ?, ?, ?)`
    ).bind(uuid(), campaign || null, referrer || null, ua || null, ipHash, Date.now()).run();
  } catch (e) { console.error("lead_clicks insert failed:", e); }
  const number = env.WHATSAPP_NUMBER;
  if (!number) return json({ error: "WhatsApp number not configured" }, 503);
  let target = `https://wa.me/${number}`;
  if (text) target += `?text=${encodeURIComponent(text)}`;
  return Response.redirect(target, 302);
}
async function captureLead(request, env) {
  const ip = getClientIP(request);
  const ipOk = await rateLimit(env, `lead:ip:${ip}`, 5, 600);
  if (!ipOk) return json({ error: "Too many requests. Please wait a few minutes." }, 429);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  // Honeypot
  if (body.website || body.url_field) return json({ ok: true });
  const email = (body.email || "").toString().toLowerCase().trim();
  const name = (body.name || "").toString().trim().slice(0, 200) || null;
  const phone = (body.phone || "").toString().trim().slice(0, 64) || null;
  const businessName = (body.business_name || body.businessName || "").toString().trim().slice(0, 200) || null;
  const message = (body.message || "").toString().trim().slice(0, 5000) || null;
  const language = body.language === "es" ? "es" : "en";
  const source = VALID_SOURCES.includes(body.source) ? body.source : "contact_form";
  if (!email || !email.includes("@") || email.length > 254) return json({ error: "Valid email required" }, 400);
  const emailOk = await rateLimit(env, `lead:email:${email}`, 3, 600);
  if (!emailOk) return json({ error: "Too many requests for this email." }, 429);
  const metadata = {
    referrer: request.headers.get("Referer") || null,
    user_agent: (request.headers.get("User-Agent") || "").slice(0, 256),
    page: body.page || null,
    utm_source: body.utm_source || null,
    utm_medium: body.utm_medium || null,
    utm_campaign: body.utm_campaign || null,
    ip_hash: (await sha256(ip)).slice(0, 32)
  };
  if (body.extra && typeof body.extra === "object") {
    metadata.extra = {};
    for (const [k, v] of Object.entries(body.extra)) metadata.extra[String(k).slice(0, 64)] = String(v ?? "").slice(0, 500);
  }
  const planRaw = String(body.extra?.plan || "").toLowerCase();
  const hostingRaw = String(body.extra?.hosting || "").toLowerCase();
  const plan = planRaw.includes("esencial") ? "esencial"
             : planRaw.includes("crecimiento") ? "pro"
             : planRaw.includes("growth") ? "pro"
             : planRaw.includes("pro") ? "pro" : null;
  const hosting = hostingRaw.includes("anual") ? "annual"
                : hostingRaw.includes("mensual") ? "monthly"
                : hostingRaw.includes("annual") ? "annual"
                : hostingRaw.includes("monthly") ? "monthly" : "none";
  const id = uuid();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO leads (id, source, name, email, phone, business_name, message, language, status, plan, hosting, metadata, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?)`
  ).bind(id, source, name, email, phone, businessName, message, language, plan, hosting, JSON.stringify(metadata), now, now).run();
  if (env.ADMIN_EMAIL && body.silent_notify !== true) {
    try {
      await sendEmail(env, {
        to: env.ADMIN_EMAIL,
        subject: `New lead: ${businessName || name || email}`,
        html: leadNotificationHtml({ source, name, email, phone, businessName, message, language, env })
      });
    } catch (e) { console.error("Lead notification email failed:", e); }
  }
  return json({ ok: true, lead_id: id });
}
async function listLeads(url, env) {
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 500);
  let sql = `SELECT id, source, name, email, phone, business_name, message, language,
                    status, notes, converted_client_id, created_at, updated_at FROM leads`;
  const conds = [];
  const params = [];
  if (status && VALID_STATUSES.includes(status)) { conds.push("status = ?"); params.push(status); }
  if (source && VALID_SOURCES.includes(source)) { conds.push("source = ?"); params.push(source); }
  if (conds.length) sql += " WHERE " + conds.join(" AND ");
  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);
  const rows = await env.DB.prepare(sql).bind(...params).all();
  const counts = await env.DB.prepare("SELECT status, COUNT(*) AS n FROM leads GROUP BY status").all();
  const byStatus = {};
  for (const r of counts.results || []) byStatus[r.status] = r.n;
  return json({ leads: rows.results || [], counts: byStatus });
}
async function getLead(env, id) {
  const row = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first();
  if (!row) return json({ error: "Lead not found" }, 404);
  if (row.metadata) { try { row.metadata = JSON.parse(row.metadata); } catch {} }
  return json({ lead: row });
}
async function updateLead(request, env, id) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const fields = [];
  const params = [];
  if (typeof body.status === "string") {
    if (!VALID_STATUSES.includes(body.status)) return json({ error: "Invalid status" }, 400);
    fields.push("status = ?"); params.push(body.status);
  }
  if (typeof body.notes === "string") { fields.push("notes = ?"); params.push(body.notes.slice(0, 5000)); }
  if (!fields.length) return json({ error: "No updatable fields" }, 400);
  fields.push("updated_at = ?"); params.push(Date.now()); params.push(id);
  const result = await env.DB.prepare(`UPDATE leads SET ${fields.join(", ")} WHERE id = ?`).bind(...params).run();
  if (!result.meta.changes) return json({ error: "Lead not found" }, 404);
  return json({ ok: true });
}
async function deleteLead(env, id) {
  const result = await env.DB.prepare("DELETE FROM leads WHERE id = ?").bind(id).run();
  if (!result.meta.changes) return json({ error: "Lead not found" }, 404);
  return json({ ok: true });
}
async function convertLead(request, env, id) {
  const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first();
  if (!lead) return json({ error: "Lead not found" }, 404);
  if (lead.status === "converted" && lead.converted_client_id) return json({ error: "Lead already converted", client_id: lead.converted_client_id }, 409);
  if (!lead.email || !lead.email.includes("@")) return json({ error: "Lead has no valid email" }, 400);
  const existing = await env.DB.prepare("SELECT id FROM clients WHERE email = ?").bind(lead.email).first();
  if (existing) {
    const now2 = Date.now();
    await env.DB.prepare(`UPDATE leads SET status = 'converted', converted_client_id = ?, updated_at = ? WHERE id = ?`).bind(existing.id, now2, id).run();
    return json({ ok: true, client_id: existing.id, note: "Lead linked to existing client (no new invite sent)" });
  }
  const clientId = uuid();
  const now = Date.now();
  const lang = lead.language || "en";
  const businessName = lead.business_name || lead.name || null;
  await env.DB.prepare(
    `INSERT INTO clients (id, email, business_name, status, language, plan, created_at, updated_at, invited_by)
     VALUES (?, ?, ?, 'invited', ?, ?, ?, ?, ?)`
  ).bind(clientId, lead.email, businessName, lang, lead.plan || null, now, now, env.ADMIN_EMAIL || "admin").run();
  const token = randomToken(32);
  await env.TOKENS.put(`magic:${token}`, clientId, { expirationTtl: 60 * 60 * 24 * 7 });
  const loginUrl = `${env.APP_URL}/auth/verify?token=${token}`;
  const subject = lang === "es" ? "Invitación al portal PymeWebPro" : "You're invited to the PymeWebPro portal";
  const html = lang === "es" ? convertedInviteEs(loginUrl, businessName) : convertedInviteEn(loginUrl, businessName);
  try { await sendEmail(env, { to: lead.email, subject, html }); } catch (e) { console.error("Convert: invite email failed:", e); }
  await env.DB.prepare(`UPDATE leads SET status = 'converted', converted_client_id = ?, updated_at = ? WHERE id = ?`).bind(clientId, now, id).run();
  await logEvent(env, clientId, "client_invited", { invited_by: env.ADMIN_EMAIL, from_lead: id });
  return json({ ok: true, client_id: clientId, invite_url: loginUrl });
}
async function listClicks(url, env) {
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 500);
  const rows = await env.DB.prepare(`SELECT id, kind, campaign, referrer, user_agent, created_at FROM lead_clicks ORDER BY created_at DESC LIMIT ?`).bind(limit).all();
  const agg = await env.DB.prepare(`SELECT kind, campaign, COUNT(*) AS n FROM lead_clicks GROUP BY kind, campaign`).all();
  return json({ clicks: rows.results || [], totals: agg.results || [] });
}
function leadNotificationHtml({ source, name, email, phone, businessName, message, language, env }) {
  const sourceLabel = { contact_form: "Contact form", whatsapp_click: "WhatsApp click", whatsapp_message: "WhatsApp message", manual: "Manual entry" }[source] || source;
  return `<div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #0a0e27; color: #fff;">
    <h2 style="font-style: italic; color: #fbbf24; margin-top: 0;">New lead — ${sourceLabel}</h2>
    <table style="color: rgba(255,255,255,0.85); font-size: 15px; line-height: 1.8;">
      ${businessName ? `<tr><td style="opacity:0.5;padding-right:12px;">Business:</td><td>${escapeHtml(businessName)}</td></tr>` : ""}
      ${name ? `<tr><td style="opacity:0.5;padding-right:12px;">Name:</td><td>${escapeHtml(name)}</td></tr>` : ""}
      <tr><td style="opacity:0.5;padding-right:12px;">Email:</td><td>${escapeHtml(email)}</td></tr>
      ${phone ? `<tr><td style="opacity:0.5;padding-right:12px;">Phone:</td><td>${escapeHtml(phone)}</td></tr>` : ""}
      <tr><td style="opacity:0.5;padding-right:12px;">Language:</td><td>${language}</td></tr>
    </table>
    ${message ? `<p style="color: rgba(255,255,255,0.7); margin-top: 24px; padding: 16px; background: rgba(255,255,255,0.05); border-left: 3px solid #fbbf24; white-space: pre-wrap;">${escapeHtml(message)}</p>` : ""}
    <p style="margin-top: 32px;"><a href="${env.APP_URL}/admin/leads" style="display: inline-block; background: #fbbf24; color: #0a0e27; padding: 12px 28px; text-decoration: none; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 2px;">View in Admin</a></p>
  </div>`;
}
function convertedInviteEn(url, bizName) {
  return `<div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #0a0e27; color: #fff;">
    <h1 style="font-style: italic; color: #fbbf24;">PymeWebPro</h1>
    <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">${bizName ? `Hi ${escapeHtml(bizName)},` : "Hello,"}</p>
    <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">Thanks for reaching out. We've set up your client portal — click below to share your project details (logos, brand colors, content, and assets).</p>
    <a href="${url}" style="display: inline-block; background: #fbbf24; color: #0a0e27; padding: 14px 32px; text-decoration: none; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 2px; margin: 24px 0;">Open Portal</a>
    <p style="color: rgba(255,255,255,0.4); font-size: 13px;">This link is valid for 7 days.</p>
  </div>`;
}
function convertedInviteEs(url, bizName) {
  return `<div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #0a0e27; color: #fff;">
    <h1 style="font-style: italic; color: #fbbf24;">PymeWebPro</h1>
    <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">${bizName ? `Hola ${escapeHtml(bizName)},` : "Hola,"}</p>
    <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">Gracias por su interés. Hemos preparado su portal de cliente — haga clic abajo para compartir los detalles de su proyecto.</p>
    <a href="${url}" style="display: inline-block; background: #fbbf24; color: #0a0e27; padding: 14px 32px; text-decoration: none; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 2px; margin: 24px 0;">Abrir Portal</a>
    <p style="color: rgba(255,255,255,0.4); font-size: 13px;">Este enlace es válido por 7 días.</p>
  </div>`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// src/payments.js
const DISCOUNT_WINDOW_MS = 0;     // Discount logic preserved but currently inactive
const DISCOUNT_AMOUNT_COP = 0;
const PLAN_PRICES_COP = {
  esencial: 390000,   // 39e4 in original
  pro: 690000         // 69e4 in original
};
const HOSTING_PRICES_COP = {
  annual: 270000,     // 27e4
  monthly: 0,         // billed separately, not on Wompi
  none: 0
};
function computeQuote(lead) {
  const plan = lead.plan;
  const hosting = lead.hosting || "none";
  const planPrice = PLAN_PRICES_COP[plan] || 0;
  let hostingPrice = HOSTING_PRICES_COP[hosting] || 0;
  const hostingBundled = plan === "pro" && hosting === "annual";
  if (hostingBundled) hostingPrice = 0;
  const now = Date.now();
  const deadline = (lead.created_at || 0) + DISCOUNT_WINDOW_MS;
  const discountActive = planPrice > 0 && now < deadline;
  const discount = discountActive ? DISCOUNT_AMOUNT_COP : 0;
  const subtotal = planPrice + hostingPrice;
  const total = Math.max(0, subtotal - discount);
  return {
    plan, hosting,
    plan_price_cop: planPrice, hosting_price_cop: hostingPrice, hosting_bundled: hostingBundled,
    discount_active: discountActive, discount_cop: discount, discount_deadline: deadline,
    subtotal_cop: subtotal, total_cop: total, total_cents: total * 100,
    currency: "COP", chargeable: planPrice > 0
  };
}
function planLabel(plan, lang = "es") {
  if (plan === "esencial") return "Plan Esencial";
  if (plan === "pro") return lang === "es" ? "Plan Crecimiento" : "Growth Plan";
  return lang === "es" ? "Plan no seleccionado" : "No plan selected";
}
function hostingLabel(hosting, lang = "es") {
  if (lang === "es") return { annual: "Hosting anual", monthly: "Hosting mensual", none: "Sin hosting" }[hosting] || "Sin hosting";
  return { annual: "Annual hosting", monthly: "Monthly hosting", none: "No hosting" }[hosting] || "No hosting";
}
function formatCop(amount) { return "$" + Math.round(amount).toLocaleString("es-CO"); }

async function handleConfirmPage(request, env, leadId) {
  const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(leadId).first();
  if (!lead) return new Response(notFoundHtml(), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  const quote = computeQuote(lead);
  const lang = lead.language || "es";
  const url = new URL(request.url);
  const justReturned = url.searchParams.get("status") === "back";
  const lastPayment = await env.DB.prepare("SELECT * FROM payments WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1").bind(leadId).first();
  const html = confirmationHtml({ lead, quote, lang, lastPayment, justReturned });
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    }
  });
}

async function handleCreateCheckout(request, env, leadId) {
  const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(leadId).first();
  if (!lead) return json({ error: "Lead not found" }, 404);
  const quote = computeQuote(lead);
  if (!quote.chargeable) return json({ error: "Plan no seleccionado. Por favor escríbanos por WhatsApp para confirmar su plan." }, 400);
  if (!env.WOMPI_PUBLIC_KEY || !env.WOMPI_INTEGRITY) return json({ error: "Payments not configured" }, 503);
  const reference = `pwp-${leadId}-${Date.now().toString(36)}`;
  const amountInCents = quote.total_cents;
  const currency = "COP";
  const signaturePayload = `${reference}${amountInCents}${currency}${env.WOMPI_INTEGRITY}`;
  const signature = await sha256(signaturePayload);
  const paymentId = uuid();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO payments (id, lead_id, reference, amount_cents, currency, plan, hosting, discount_applied, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).bind(paymentId, leadId, reference, amountInCents, currency, quote.plan, quote.hosting, quote.discount_active ? 1 : 0, now, now).run();
  const redirectUrl = `${env.APP_URL}/c/${leadId}?status=back`;
  const params = new URLSearchParams({
    "public-key": env.WOMPI_PUBLIC_KEY,
    "currency": currency,
    "amount-in-cents": String(amountInCents),
    "reference": reference,
    "signature:integrity": signature,
    "redirect-url": redirectUrl
  });
  if (lead.email) params.set("customer-data:email", lead.email);
  if (lead.name || lead.business_name) params.set("customer-data:full-name", lead.name || lead.business_name);
  if (lead.phone) params.set("customer-data:phone-number", String(lead.phone).replace(/[^0-9]/g, ""));
  const checkoutUrl = `https://checkout.wompi.co/p/?${params.toString()}`;
  return json({ ok: true, checkout_url: checkoutUrl, reference, amount_cents: amountInCents, discount_applied: quote.discount_active });
}

async function handleWompiWebhook(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const sig = body.signature || {};
  const props = Array.isArray(sig.properties) ? sig.properties : [];
  const timestamp = body.timestamp;
  if (!sig.checksum || !timestamp || !props.length || !env.WOMPI_EVENTS) return json({ error: "Invalid signature payload" }, 400);
  // Wompi signature check: SHA256(concat-of-listed-property-values + timestamp + WOMPI_EVENTS_SECRET)
  const concat = props.map((path) => {
    const parts = path.split(".");
    let v = body.data;
    for (const p of parts) v = v?.[p];
    return v == null ? "" : String(v);
  }).join("");
  const expected = await sha256(concat + timestamp + env.WOMPI_EVENTS);
  if (expected.toLowerCase() !== String(sig.checksum).toLowerCase()) {
    console.error("Wompi webhook signature mismatch", { expected, got: sig.checksum });
    return json({ error: "Invalid signature" }, 401);
  }
  const event = body.event;
  const tx = body.data?.transaction || {};
  const reference = tx.reference;
  const wompiId = tx.id;
  const status = (tx.status || "").toLowerCase();
  if (!reference) return json({ ok: true, ignored: "no reference" });
  const payment = await env.DB.prepare("SELECT * FROM payments WHERE reference = ?").bind(reference).first();
  if (!payment) { console.warn("Wompi event for unknown reference", reference); return json({ ok: true, ignored: "unknown reference" }); }
  const now = Date.now();
  const newStatus = ["approved", "declined", "voided", "error", "pending"].includes(status) ? status : "pending";
  const paidAt = newStatus === "approved" ? now : null;
  await env.DB.prepare(
    `UPDATE payments SET wompi_transaction_id = ?, status = ?, paid_at = COALESCE(paid_at, ?), raw_event = ?, updated_at = ? WHERE id = ?`
  ).bind(wompiId || null, newStatus, paidAt, JSON.stringify(body), now, payment.id).run();
  if (newStatus === "approved") await convertLeadOnApproval(env, payment);
  return json({ ok: true, status: newStatus });
}

async function convertLeadOnApproval(env, payment) {
  const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(payment.lead_id).first();
  if (!lead) return;
  if (lead.status === "converted" && lead.converted_client_id) return;
  if (!lead.email || !lead.email.includes("@")) return;
  const existing = await env.DB.prepare("SELECT id FROM clients WHERE email = ?").bind(lead.email).first();
  let clientId;
  const now = Date.now();
  const lang = lead.language || "es";
  const businessName = lead.business_name || lead.name || null;
  if (existing) {
    clientId = existing.id;
  } else {
    clientId = uuid();
    await env.DB.prepare(
      `INSERT INTO clients (id, email, business_name, status, language, plan, created_at, updated_at, invited_by)
       VALUES (?, ?, ?, 'invited', ?, ?, ?, ?, ?)`
    ).bind(clientId, lead.email, businessName, lang, payment.plan || lead.plan || null, now, now, env.ADMIN_EMAIL || "admin").run();
    const token = randomToken(32);
    await env.TOKENS.put(`magic:${token}`, clientId, { expirationTtl: 60 * 60 * 24 * 7 });
    const loginUrl = `${env.APP_URL}/auth/verify?token=${token}`;
    const subject = lang === "es" ? "Pago recibido — comencemos su sitio web" : "Payment received — let's start your site";
    const html = lang === "es" ? paidInviteEs(loginUrl, businessName) : paidInviteEn(loginUrl, businessName);
    try { await sendEmail(env, { to: lead.email, subject, html }); } catch (e) { console.error("Paid invite email failed:", e); }
  }
  await env.DB.prepare(`UPDATE leads SET status = 'converted', converted_client_id = ?, updated_at = ? WHERE id = ?`).bind(clientId, now, payment.lead_id).run();
  await logEvent(env, clientId, "payment_approved", {
    payment_id: payment.id, amount_cents: payment.amount_cents, plan: payment.plan, hosting: payment.hosting
  });
  if (env.ADMIN_EMAIL) {
    try {
      await sendEmail(env, {
        to: env.ADMIN_EMAIL,
        subject: `💰 Payment received: ${businessName || lead.email}`,
        html: `<div style="font-family:Georgia,serif;padding:24px">
          <h2>Payment approved on Wompi</h2>
          <p><strong>${businessName || "(no business)"}</strong> — ${lead.email}</p>
          <p>Plan: <strong>${payment.plan}</strong> · Hosting: <strong>${payment.hosting}</strong></p>
          <p>Amount: <strong>${formatCop(payment.amount_cents / 100)} COP</strong>${payment.discount_applied ? " (discount applied)" : ""}</p>
          <p>Wompi tx: ${payment.wompi_transaction_id || "(pending)"}</p>
          <p><a href="${env.APP_URL}/admin/clients/${clientId}">Open client →</a></p>
        </div>`
      });
    } catch (e) { console.error("Admin payment notify failed:", e); }
  }
}

function notFoundHtml() {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>No encontrado · PymeWebPro</title>
  <style>body{font-family:Georgia,serif;background:#0a0e27;color:#fff;text-align:center;padding:80px 20px;margin:0}h1{color:#fbbf24;font-style:italic}</style></head>
  <body><h1>PymeWebPro</h1><p>No encontramos esta página.</p><p><a href="https://pymewebpro.com" style="color:#fbbf24">Volver al inicio</a></p></body></html>`;
}

// confirmationHtml + statusPage + paidInviteEn/paidInviteEs are large HTML templates.
// They render the /c/:leadId checkout page (countdown banner, Wompi pay button, status states)
// and the post-payment Spanish/English emails. The full HTML lives in the deployed bundle
// (lines ~2398-2683 of the original); structure is straightforward and easy to rebuild.
// NOTE: The confirmation page POSTs to `/api/leads/:leadId/checkout` to get the Wompi URL,
// then redirects the browser to checkout.wompi.co.
function confirmationHtml({ lead, quote, lang, lastPayment, justReturned }) {
  // [Full HTML omitted from this recovery doc — ~280 lines of localized template literal.
  //  Re-build at leisure; key elements: countdown banner using quote.discount_deadline,
  //  card with rows for plan/hosting/discount/total, button#payBtn that fetches checkout_url,
  //  Wompi+Bancolombia trust badge, WhatsApp help link.]
  const isEs = lang !== "en";
  if (lastPayment && lastPayment.status === "approved") return statusPage({ title: isEs ? "¡Pago recibido!" : "Payment received!", body: isEs ? "Le enviamos un correo con el enlace para empezar su proyecto." : "Check your email for the link to start your project.", color: "#10b981", icon: "✓" });
  if (justReturned && lastPayment && lastPayment.status === "pending") return statusPage({ title: isEs ? "Pago en proceso" : "Payment processing", body: isEs ? "Estamos esperando confirmación de Wompi." : "Waiting for confirmation from Wompi.", color: "#fbbf24", icon: "⏳" });
  if (!quote.chargeable) return statusPage({ title: isEs ? "Plan no seleccionado" : "No plan selected", body: "", color: "#fbbf24", icon: "?", showWa: true });
  // [main template would go here]
  return `<!DOCTYPE html><html><body><h1>Confirm your plan</h1><button onclick="fetch('/api/leads/${lead.id}/checkout',{method:'POST'}).then(r=>r.json()).then(d=>location.href=d.checkout_url)">Pay ${formatCop(quote.total_cop)}</button></body></html>`;
}
function statusPage({ title, body, color, icon, showWa = false }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} · PymeWebPro</title></head>
  <body style="font-family:Georgia,serif;text-align:center;padding:60px 20px"><h1>${title}</h1><p>${body}</p>${showWa ? `<a href="/go/whatsapp?campaign=confirm_help">WhatsApp</a>` : ""}</body></html>`;
}
function paidInviteEn(url, bizName) {
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 24px;background:#0a0e27;color:#fff">
    <h1 style="font-style:italic;color:#fbbf24">PymeWebPro</h1>
    <p style="color:#fbbf24">✓ Payment received</p>
    <h2>${bizName ? `Thank you, ${escapeHtml(bizName)}.` : "Thank you."}</h2>
    <p>Your payment is confirmed. The 7-day (Essential) or 14-day (Growth) clock starts when you submit your portal details.</p>
    <p><a href="${url}" style="background:#fbbf24;color:#0a0e27;padding:16px 36px;text-decoration:none;font-weight:800">Open my portal →</a></p>
    <p>Questions? WhatsApp +57 301 404 7722.</p>
  </div>`;
}
function paidInviteEs(url, bizName) {
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 24px;background:#0a0e27;color:#fff">
    <h1 style="font-style:italic;color:#fbbf24">PymeWebPro</h1>
    <p style="color:#fbbf24">✓ Pago recibido</p>
    <h2>${bizName ? `Gracias, ${escapeHtml(bizName)}.` : "Gracias."}</h2>
    <p>Su pago está confirmado. Los 7 días (Esencial) o 14 días (Crecimiento) arrancan cuando complete la información de su portal.</p>
    <p><a href="${url}" style="background:#fbbf24;color:#0a0e27;padding:16px 36px;text-decoration:none;font-weight:800">Abrir mi portal →</a></p>
    <p>¿Preguntas? WhatsApp +57 301 404 7722.</p>
  </div>`;
}

// src/frontend.js
// The full single-page React app served at any non-API path (/, /admin, /admin/leads, etc.).
// ~1280 lines of inline JSX transpiled at runtime via @babel/standalone, included as a
// template literal. Structure:
//   - SESSION_KEY = 'pwp_session', ADMIN_KEY = 'pwp_admin' (localStorage)
//   - Inline SVG icon components (Mail, Upload, Check, ChevR/L, Brief, Phone, Palette,
//     Img, FT, Settings, LogOut, Sparkle, Loader, Alert, Trash, Plus, Eye, Copy,
//     Download, Shield, Users, Tag, MsgIcon, ArrowRight)
//   - i18n table T = { en: {...}, es: {...} }
//   - api(path) helper: reads SESSION_KEY, sends Bearer header
//   - adminApi(path) helper: reads ADMIN_KEY, sends Bearer header
//   - <App>: routes /admin* to <AdminApp>, else <ClientApp>
//   - <ClientApp>: stages = loading|verifying|login|sending|linksent|portal|submitting|submitted
//   - <AdminApp>: tabs = clients | leads | clicks; routes /admin/clients/:id and /admin/leads/:id
//   - <ClientDetail>: shows <SiteHealthPanel>, <DeliverablesPanel> (per-key dropdown), intake sections, files (download via /api/files/:id?admin_token=...)
//   - <LeadDetail>: status pills, notes, "Convert to Client" button calls /api/admin/leads/:id/convert
//   - <Portal>: 6-section intake (business, contact, brand, visual, content, tech) with
//     auto-save (800ms debounce) on every keystroke; <FileDrop> for logo/photo categories
//
// The full HTML/JSX is preserved in the deployed bundle and can be regenerated as needed.
// Re-fetch any time with: wrangler dev / mcp workers_get_worker_code
const FRONTEND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PymeWebPro Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #0a0e27; font-family: 'Inter', sans-serif; color: #fff; }
    .serif { font-family: 'Cormorant Garamond', Georgia, serif; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    input, textarea { font-family: inherit; }
    input:focus, textarea:focus { border-color: #fbbf24 !important; }
    button:not(:disabled):hover { filter: brightness(1.1); }
    button:disabled { cursor: not-allowed; opacity: 0.5; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="env,react">
    const { useState, useEffect, useCallback, useRef } = React;
    const SESSION_KEY = 'pwp_session';
    const ADMIN_KEY = 'pwp_admin';

    // ─── ICON COMPONENTS (inline SVG to avoid lucide CDN) ──────────────
    const Icon = ({ d, size = 18, color = 'currentColor', strokeWidth = 2 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}} dangerouslySetInnerHTML={{__html: d}} />
    );
    const Mail = (p) => <Icon {...p} d='<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>' />;
    const Upload = (p) => <Icon {...p} d='<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>' />;
    const Check = (p) => <Icon {...p} d='<polyline points="20 6 9 17 4 12"/>' />;
    const ChevR = (p) => <Icon {...p} d='<polyline points="9 18 15 12 9 6"/>' />;
    const ChevL = (p) => <Icon {...p} d='<polyline points="15 18 9 12 15 6"/>' />;
    const Brief = (p) => <Icon {...p} d='<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>' />;
    const Phone = (p) => <Icon {...p} d='<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>' />;
    const Palette = (p) => <Icon {...p} d='<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>' />;
    const Img = (p) => <Icon {...p} d='<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>' />;
    const FT = (p) => <Icon {...p} d='<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>' />;
    const Settings = (p) => <Icon {...p} d='<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>' />;
    const LogOut = (p) => <Icon {...p} d='<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>' />;
    const Sparkle = (p) => <Icon {...p} d='<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>' />;
    const Loader = (p) => <Icon {...p} d='<line x1="12" x2="12" y1="2" y2="6"/><line x1="12" x2="12" y1="18" y2="22"/><line x1="4.93" x2="7.76" y1="4.93" y2="7.76"/><line x1="16.24" x2="19.07" y1="16.24" y2="19.07"/><line x1="2" x2="6" y1="12" y2="12"/><line x1="18" x2="22" y1="12" y2="12"/><line x1="4.93" x2="7.76" y1="19.07" y2="16.24"/><line x1="16.24" x2="19.07" y1="7.76" y2="4.93"/>' />;
    const Alert = (p) => <Icon {...p} d='<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>' />;
    const Trash = (p) => <Icon {...p} d='<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>' />;
    const Plus = (p) => <Icon {...p} d='<path d="M5 12h14"/><path d="M12 5v14"/>' />;
    const Eye = (p) => <Icon {...p} d='<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>' />;
    const Copy = (p) => <Icon {...p} d='<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>' />;
    const Download = (p) => <Icon {...p} d='<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>' />;
    const Shield = (p) => <Icon {...p} d='<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>' />;
    const Users = (p) => <Icon {...p} d='<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' />;
    const Tag = (p) => <Icon {...p} d='<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="0.5" fill="currentColor"/>' />;
    const MsgIcon = (p) => <Icon {...p} d='<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' />;
    const ArrowRight = (p) => <Icon {...p} d='<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>' />;

    // ─── i18n ──────────────────────────────────────────────────────────
    const T = {"en":{"brand":"PymeWebPro","tagline":"Client Onboarding Portal","loginTitle":"Welcome","loginSub":"Enter your email to receive a secure login link","emailPh":"you@yourbusiness.com","sendLink":"Send Magic Link","sending":"Sending…","linkSent":"Check your inbox","linkSentSub":"We sent a login link to","backToLogin":"← Use a different email","progress":"Project Progress","complete":"complete","saving":"Saving…","saved":"Saved","saveError":"Save failed","verifying":"Verifying your link…","verifyFailed":"Link expired or invalid","sections":{"business":"Business Basics","contact":"Contact & Social","brand":"Brand Assets","visual":"Visual Direction","content":"Content & Themes","tech":"Technical Setup","growth":"Growth Add-Ons"},"fields":{"bizName":"Business Name","tagline":"Tagline / Slogan","whatYouDo":"What does your business do?","audience":"Who is your target audience?","phone":"Phone Number","email":"Public Email","address":"Business Address","whatsapp":"WhatsApp","ig":"Instagram","fb":"Facebook","li":"LinkedIn","logoUp":"Upload Logo (PNG, SVG, AI)","colors":"Brand Colors","colorsHelp":"Add hex codes or describe your palette","fonts":"Font Preferences","photos":"Upload Photography & Imagery","refSites":"Reference websites you like","tone":"Brand Tone","topics":"Key topics to cover","pages":"Pages needed","domain":"Existing Domain","hosting":"Current Hosting","bizEmail":"Business Email Setup","bookingsUrl":"Booking link (Calendly, Cal.com, etc.)","pdfUrl":"Catalog / Menu PDF link","pdfLabel":"PDF button label","pdfLabelPh":"e.g. Menu, Catalog, Spec Sheet","waCatalogUrl":"WhatsApp Business catalog link","newsletterUrl":"Newsletter form action URL","newsletterHelp":"Mailchimp, ConvertKit, MailerLite, etc.","ga4Id":"Google Analytics 4 ID","ga4Help":"Looks like G-XXXXXXXXXX","metaPixelId":"Meta (Facebook) Pixel ID","metaPixelHelp":"15-16 digit number from Meta Events Manager","testimonials":"Testimonials","testimonialsHelp":"One per line: Name | Quote | Role (e.g.: María Pérez | Excelente servicio | Cliente desde 2022)","faqs":"FAQs","faqsHelp":"One per line: Question? | Answer","growthIntro":"These features are part of your Growth plan. Fill in only what applies — leave the rest blank."},"ph":{"bizName":"Acme Imports S.A.","tagline":"Your one-line pitch","whatYouDo":"Describe products, services, what makes you unique…","audience":"Demographics, industries, regions…","colors":"#0F172A, gold accent, warm neutrals…","tone":"Professional, friendly, bold, premium…","topics":"Sustainability, B2B sales, family-owned story…","pages":"Home, About, Services, Portfolio, Contact…"},"next":"Next","back":"Back","submit":"Submit & Notify Us","submitting":"Submitting…","submitted":"Submitted","submittedSub":"We’ve been notified. We’ll reach out shortly.","dragDrop":"Drop files here or click to upload"},"es":{"brand":"PymeWebPro","tagline":"Portal de Incorporación","loginTitle":"Bienvenido","loginSub":"Ingrese su correo para recibir un enlace de acceso","emailPh":"tu@tunegocio.com","sendLink":"Enviar Enlace","sending":"Enviando…","linkSent":"Revise su bandeja","linkSentSub":"Enviamos un enlace a","backToLogin":"← Usar otro correo","progress":"Progreso","complete":"completo","saving":"Guardando…","saved":"Guardado","saveError":"Error","verifying":"Verificando…","verifyFailed":"Enlace caducado o inválido","sections":{"business":"Datos del Negocio","contact":"Contacto y Redes","brand":"Activos de Marca","visual":"Dirección Visual","content":"Contenido y Temas","tech":"Configuración Técnica","growth":"Funciones Crecimiento"},"fields":{"bizName":"Nombre del Negocio","tagline":"Eslogan","whatYouDo":"¿Qué hace su empresa?","audience":"¿Quién es su público objetivo?","phone":"Teléfono","email":"Correo Público","address":"Dirección","whatsapp":"WhatsApp","ig":"Instagram","fb":"Facebook","li":"LinkedIn","logoUp":"Subir Logo (PNG, SVG, AI)","colors":"Colores de Marca","colorsHelp":"Agregue códigos hex o describa su paleta","fonts":"Tipografía","photos":"Subir Fotografías","refSites":"Sitios de referencia","tone":"Tono de Marca","topics":"Temas clave","pages":"Páginas necesarias","domain":"Dominio Existente","hosting":"Hosting Actual","bizEmail":"Correo Empresarial","bookingsUrl":"Enlace de reservas (Calendly, Cal.com, etc.)","pdfUrl":"Link al catálogo / menú en PDF","pdfLabel":"Texto del botón PDF","pdfLabelPh":"ej. Menú, Catálogo, Ficha Técnica","waCatalogUrl":"Catálogo de WhatsApp Business","newsletterUrl":"URL del formulario de newsletter","newsletterHelp":"Mailchimp, ConvertKit, MailerLite, etc.","ga4Id":"ID de Google Analytics 4","ga4Help":"Formato G-XXXXXXXXXX","metaPixelId":"ID del Pixel de Meta (Facebook)","metaPixelHelp":"Número de 15-16 dígitos del Events Manager de Meta","testimonials":"Testimonios","testimonialsHelp":"Uno por línea: Nombre | Cita | Rol (ej.: María Pérez | Excelente servicio | Cliente desde 2022)","faqs":"Preguntas frecuentes","faqsHelp":"Uno por línea: ¿Pregunta? | Respuesta","growthIntro":"Estas funciones son parte de su plan Crecimiento. Complete solo lo que aplique — deje el resto en blanco."},"ph":{"bizName":"Acme Imports S.A.","tagline":"Su pitch en una línea","whatYouDo":"Describa productos, servicios…","audience":"Demografía, industrias, regiones…","colors":"#0F172A, dorado de acento…","tone":"Profesional, amigable, audaz…","topics":"Sostenibilidad, ventas B2B…","pages":"Inicio, Nosotros, Servicios, Contacto…"},"next":"Siguiente","back":"Atrás","submit":"Enviar y Notificarnos","submitting":"Enviando…","submitted":"Enviado","submittedSub":"Hemos sido notificados. Le contactaremos pronto.","dragDrop":"Suelte archivos aquí o haga clic"}};

    // ─── API CLIENT ───────────────────────────────────────────────────
    async function api(path, opts = {}) {
      const session = localStorage.getItem(SESSION_KEY);
      const headers = { ...(opts.headers || {}) };
      if (opts.body && typeof opts.body === 'string') headers['Content-Type'] = 'application/json';
      if (session) headers['Authorization'] = 'Bearer ' + session;
      const res = await fetch(path, { ...opts, headers });
      if (res.status === 401) { localStorage.removeItem(SESSION_KEY); throw new Error('UNAUTHORIZED'); }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      return data;
    }
    async function adminApi(path, opts = {}) {
      const token = localStorage.getItem(ADMIN_KEY);
      const headers = { ...(opts.headers || {}) };
      if (opts.body && typeof opts.body === 'string') headers['Content-Type'] = 'application/json';
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const res = await fetch(path, { ...opts, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      return data;
    }

    // ─── ROUTER ───────────────────────────────────────────────────────
    function App() {
      const [route, setRoute] = useState(window.location.pathname);
      useEffect(() => {
        const handler = () => setRoute(window.location.pathname);
        window.addEventListener('popstate', handler);
        return () => window.removeEventListener('popstate', handler);
      }, []);
      if (route.startsWith('/admin')) return <AdminApp route={route} setRoute={(r) => { window.history.pushState({}, '', r); setRoute(r); }} />;
      return <ClientApp />;
    }

    // ─── CLIENT APP (intake portal) ──────────────────────────────────
    function ClientApp() {
      const [lang, setLang] = useState(() => localStorage.getItem('pwp_lang') || 'en');
      const [stage, setStage] = useState('loading');
      const [email, setEmail] = useState('');
      const [client, setClient] = useState(null);
      const [error, setError] = useState(null);
      const [section, setSection] = useState(0);
      const [data, setData] = useState({});
      const [files, setFiles] = useState([]);
      const t = T[lang];

      useEffect(() => { localStorage.setItem('pwp_lang', lang); }, [lang]);

      useEffect(() => {
        const url = new URL(window.location.href);
        const token = url.searchParams.get('token');
        if (url.pathname.includes('/auth/verify') && token) {
          setStage('verifying');
          api('/api/auth/verify?token=' + token)
            .then(res => {
              localStorage.setItem(SESSION_KEY, res.session);
              window.history.replaceState({}, '', '/');
              return loadIntake();
            })
            .catch(() => { setError(t.verifyFailed); setStage('login'); });
          return;
        }
        if (localStorage.getItem(SESSION_KEY)) {
          loadIntake().catch(() => setStage('login'));
        } else { setStage('login'); }
      }, []);

      async function loadIntake() {
        const res = await api('/api/client/intake');
        setClient(res.client);
        if (res.client.language) setLang(res.client.language);
        const flat = {};
        Object.values(res.sections || {}).forEach(s => Object.assign(flat, s.data || {}));
        setData(flat);
        try { const f = await api('/api/client/files'); setFiles(f.files || []); } catch {}
        setStage('portal');
      }

      async function handleSendLink() {
        if (!email.includes('@')) { setError('Invalid email'); return; }
        setError(null); setStage('sending');
        try {
          await api('/api/auth/request', { method: 'POST', body: JSON.stringify({ email }) });
          setStage('linksent');
        } catch (e) { setError(e.message); setStage('login'); }
      }
      async function handleLogout() {
        try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
        localStorage.removeItem(SESSION_KEY);
        setStage('login'); setData({}); setClient(null);
      }
      async function handleSubmit() {
        setStage('submitting');
        try { await api('/api/client/submit', { method: 'POST' }); setStage('submitted'); }
        catch (e) { setError(e.message); setStage('portal'); }
      }

      if (stage === 'loading' || stage === 'verifying') return <Center><Loader size={32} color="#fbbf24" className="spin" /><p style={{color:'rgba(255,255,255,0.6)',marginTop:'1.5rem'}}>{t.verifying}</p></Center>;
      if (stage === 'login' || stage === 'sending') return <LoginScreen t={t} lang={lang} setLang={setLang} email={email} setEmail={setEmail} onSubmit={handleSendLink} loading={stage==='sending'} error={error} />;
      if (stage === 'linksent') return <LinkSent t={t} email={email} onBack={() => setStage('login')} />;
      if (stage === 'submitted') return <Submitted t={t} />;
      return <Portal t={t} lang={lang} setLang={setLang} client={client} email={client?.email} data={data} setData={setData} files={files} setFiles={setFiles} section={section} setSection={setSection} onLogout={handleLogout} onSubmit={handleSubmit} submitting={stage==='submitting'} />;
    }

    // ─── ADMIN APP ────────────────────────────────────────────────────
    function AdminApp({ route, setRoute }) {
      const [authed, setAuthed] = useState(!!localStorage.getItem(ADMIN_KEY));
      const [tokenInput, setTokenInput] = useState('');
      const [error, setError] = useState(null);
      const [clients, setClients] = useState([]);
      const [leads, setLeads] = useState([]);
      const [leadCounts, setLeadCounts] = useState({});
      const [clicks, setClicks] = useState([]);
      const [loading, setLoading] = useState(false);
      const [detail, setDetail] = useState(null);
      const [leadDetail, setLeadDetail] = useState(null);
      const [showInvite, setShowInvite] = useState(false);
      const [statusFilter, setStatusFilter] = useState('');

      const tab = route.startsWith('/admin/leads') ? 'leads'
                : route.startsWith('/admin/clicks') ? 'clicks'
                : 'clients';

      async function tryLogin() {
        localStorage.setItem(ADMIN_KEY, tokenInput);
        try {
          await loadClients();
          setAuthed(true); setError(null);
        } catch (e) {
          localStorage.removeItem(ADMIN_KEY);
          setError('Invalid admin token');
        }
      }
      async function loadClients() {
        setLoading(true);
        try {
          const res = await adminApi('/api/admin/clients');
          setClients(res.clients || []);
        } finally { setLoading(false); }
      }
      async function loadLeads(status) {
        setLoading(true);
        try {
          const q = status ? '?status=' + encodeURIComponent(status) : '';
          const res = await adminApi('/api/admin/leads' + q);
          setLeads(res.leads || []);
          setLeadCounts(res.counts || {});
        } finally { setLoading(false); }
      }
      async function loadClicks() {
        setLoading(true);
        try {
          const res = await adminApi('/api/admin/clicks');
          setClicks(res.clicks || []);
        } finally { setLoading(false); }
      }

      useEffect(() => {
        if (!authed) return;
        if (tab === 'clients') loadClients();
        else if (tab === 'leads') loadLeads(statusFilter);
        else if (tab === 'clicks') loadClicks();
      }, [authed, tab, statusFilter]);

      const clientDetailMatch = route.match(/^\\/admin\\/clients\\/([a-f0-9-]+)$/);
      const leadDetailMatch = route.match(/^\\/admin\\/leads\\/([a-f0-9-]+)$/);

      useEffect(() => {
        if (clientDetailMatch && authed) {
          adminApi('/api/admin/clients/' + clientDetailMatch[1]).then(setDetail).catch(() => {});
        } else { setDetail(null); }
      }, [route, authed]);

      useEffect(() => {
        if (leadDetailMatch && authed) {
          adminApi('/api/admin/leads/' + leadDetailMatch[1]).then(r => setLeadDetail(r.lead)).catch(() => {});
        } else { setLeadDetail(null); }
      }, [route, authed]);

      if (!authed) {
        return (
          <div style={pageStyle}>
            <Orbs />
            <div style={{maxWidth:'440px',width:'100%',position:'relative',zIndex:1}}>
              <div style={{textAlign:'center',marginBottom:'3rem'}}>
                <Shield size={32} color="#fbbf24" />
                <h1 className="serif" style={{...titleStyle,fontSize:'2.5rem',marginTop:'1rem'}}>Admin</h1>
                <p style={{color:'rgba(255,255,255,0.5)',fontSize:'0.9rem'}}>PymeWebPro Console</p>
              </div>
              <div style={cardStyle}>
                <input type="password" value={tokenInput} onChange={e=>setTokenInput(e.target.value)} placeholder="Admin token" onKeyDown={e=>e.key==='Enter'&&tryLogin()} style={inputStyle} />
                {error && <div style={{color:'#fca5a5',fontSize:'0.85rem',marginTop:'0.75rem'}}>{error}</div>}
                <button onClick={tryLogin} style={{...primaryBtn,marginTop:'1.5rem',width:'100%'}}>Sign In</button>
              </div>
            </div>
          </div>
        );
      }

      if (detail) return <ClientDetail detail={detail} onBack={() => setRoute('/admin')} onRefresh={() => adminApi('/api/admin/clients/' + clientDetailMatch[1]).then(setDetail)} />;
      if (leadDetail) return <LeadDetail lead={leadDetail} onBack={() => setRoute('/admin/leads')} onRefresh={() => adminApi('/api/admin/leads/' + leadDetailMatch[1]).then(r => setLeadDetail(r.lead))} setRoute={setRoute} />;

      const tabBtn = (id, label, Icon, count) => (
        <button onClick={() => setRoute('/admin' + (id==='clients'?'':'/'+id))} style={{
          background: tab===id ? 'rgba(251,191,36,0.12)' : 'transparent',
          color: tab===id ? '#fbbf24' : 'rgba(255,255,255,0.55)',
          border: '1px solid ' + (tab===id ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'),
          padding: '0.55rem 1.1rem', borderRadius: '4px', cursor: 'pointer',
          fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <Icon size={14} /> {label}{typeof count === 'number' ? ' (' + count + ')' : ''}
        </button>
      );

      return (
        <div style={{minHeight:'100vh',background:'#0a0e27'}}>
          <header style={headerStyle}>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
              <Shield size={18} color="#fbbf24" />
              <span className="serif" style={{fontStyle:'italic',fontSize:'1.25rem'}}>Pyme<span style={{color:'#fbbf24'}}>WebPro</span> · Admin</span>
            </div>
            <div style={{display:'flex',gap:'0.75rem'}}>
              {tab === 'clients' && (
                <>
                  <button onClick={async()=>{await adminApi('/api/admin/check-all-sites',{method:'POST'});loadClients();}} style={ghostBtn} title="Verificar el estado de todos los sitios"><Sparkle size={14} /> Verificar sitios</button>
                  <button onClick={() => setShowInvite(true)} style={primaryBtn}><Plus size={14} /> Invite Client</button>
                </>
              )}
              <button onClick={() => { localStorage.removeItem(ADMIN_KEY); setAuthed(false); }} style={ghostBtn}>Sign Out</button>
            </div>
          </header>
          <main style={{padding:'3rem 2rem',maxWidth:'1200px',margin:'0 auto'}}>
            <div style={{display:'flex',gap:'0.5rem',marginBottom:'2rem',flexWrap:'wrap'}}>
              {tabBtn('clients', 'Clients', Users, clients.length || undefined)}
              {tabBtn('leads', 'Leads', Tag, (leadCounts.new || 0) + (leadCounts.contacted || 0) || undefined)}
              {tabBtn('clicks', 'WhatsApp', MsgIcon)}
            </div>

            {tab === 'clients' && (
              <>
                <h1 className="serif" style={{fontSize:'2.5rem',fontStyle:'italic',fontWeight:400,margin:'0 0 2rem'}}>Clients</h1>
                {loading ? <Loader size={24} className="spin" color="#fbbf24" /> : (
                  clients.length === 0 ? (
                    <div style={{textAlign:'center',padding:'4rem',color:'rgba(255,255,255,0.4)'}}>
                      No clients yet. Invite your first one →
                    </div>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                      {clients.map(c => <ClientRow key={c.id} c={c} onClick={() => setRoute('/admin/clients/' + c.id)} onRefresh={loadClients} />)}
                    </div>
                  )
                )}
              </>
            )}

            {tab === 'leads' && (
              <>
                <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',margin:'0 0 1.5rem'}}>
                  <h1 className="serif" style={{fontSize:'2.5rem',fontStyle:'italic',fontWeight:400,margin:0}}>Leads</h1>
                  <div style={{display:'flex',gap:'0.4rem'}}>
                    {['', 'new', 'contacted', 'converted', 'dismissed'].map(s => (
                      <button key={s||'all'} onClick={() => setStatusFilter(s)} style={{
                        background: statusFilter===s ? 'rgba(251,191,36,0.12)' : 'transparent',
                        color: statusFilter===s ? '#fbbf24' : 'rgba(255,255,255,0.5)',
                        border: '1px solid ' + (statusFilter===s ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'),
                        padding: '0.35rem 0.75rem', borderRadius: '3px', cursor:'pointer', fontSize:'0.75rem', textTransform:'capitalize'
                      }}>{s || 'all'}{leadCounts[s] ? ' (' + leadCounts[s] + ')' : ''}</button>
                    ))}
                  </div>
                </div>
                {loading ? <Loader size={24} className="spin" color="#fbbf24" /> : (
                  leads.length === 0 ? (
                    <div style={{textAlign:'center',padding:'4rem',color:'rgba(255,255,255,0.4)'}}>
                      No leads yet. They'll appear here as the contact form fires.
                    </div>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                      {leads.map(l => <LeadRow key={l.id} l={l} onClick={() => setRoute('/admin/leads/' + l.id)} />)}
                    </div>
                  )
                )}
              </>
            )}

            {tab === 'clicks' && (
              <>
                <h1 className="serif" style={{fontSize:'2.5rem',fontStyle:'italic',fontWeight:400,margin:'0 0 0.5rem'}}>WhatsApp Clicks</h1>
                <p style={{color:'rgba(255,255,255,0.5)',marginBottom:'2rem',fontSize:'0.9rem'}}>Anonymous click attribution — your <code style={{color:'#fbbf24'}}>/go/whatsapp?campaign=…</code> redirect.</p>
                {loading ? <Loader size={24} className="spin" color="#fbbf24" /> : clicks.length === 0 ? (
                  <div style={{textAlign:'center',padding:'4rem',color:'rgba(255,255,255,0.4)'}}>No clicks logged yet.</div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
                    {clicks.map(c => (
                      <div key={c.id} style={{display:'grid',gridTemplateColumns:'160px 140px 1fr',gap:'1rem',padding:'0.85rem 1rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'2px',fontSize:'0.85rem'}}>
                        <span style={{color:'rgba(255,255,255,0.5)'}}>{new Date(c.created_at).toLocaleString()}</span>
                        <span style={{color:'#fbbf24'}}>{c.campaign || '(none)'}</span>
                        <span style={{color:'rgba(255,255,255,0.4)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.referrer || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
          {showInvite && <InviteModal onClose={() => setShowInvite(false)} onCreated={() => { setShowInvite(false); loadClients(); }} />}
        </div>
      );
    }

    function LeadRow({ l, onClick }) {
      const statusColor = { new: '#fbbf24', contacted: '#60a5fa', converted: '#10b981', dismissed: '#94a3b8' }[l.status] || '#94a3b8';
      const sourceLabel = { contact_form: 'Form', whatsapp_click: 'WA click', whatsapp_message: 'WhatsApp', manual: 'Manual' }[l.source] || l.source;
      const planLabel = l.plan === 'esencial' ? 'Esencial' : l.plan === 'pro' ? 'Pro' : '—';
      const hostingLabel = l.hosting === 'annual' ? '+ host anual' : l.hosting === 'monthly' ? '+ host mensual' : '';
      return (
        <div onClick={onClick} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto',gap:'1.25rem',alignItems:'center',padding:'1.25rem 1.5rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'4px',cursor:'pointer'}}>
          <div>
            <div className="serif" style={{fontSize:'1.1rem',fontStyle:'italic',marginBottom:'0.2rem'}}>{l.business_name || l.name || '(no name)'}</div>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:'0.85rem'}}>{l.email}{l.phone ? ' · ' + l.phone : ''}</div>
          </div>
          <div style={{textAlign:'right',minWidth:'80px'}}>
            <div style={{fontSize:'0.85rem',color:l.plan?'#fbbf24':'rgba(255,255,255,0.3)'}}>{planLabel}</div>
            {hostingLabel ? <div style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.4)'}}>{hostingLabel}</div> : null}
          </div>
          <span style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.1em'}}>{sourceLabel}</span>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:statusColor}} />
            <span style={{fontSize:'0.8rem',color:'rgba(255,255,255,0.6)',textTransform:'capitalize'}}>{l.status}</span>
          </div>
          <span style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.4)'}}>{new Date(l.created_at).toLocaleDateString()}</span>
        </div>
      );
    }

    function LeadDetail({ lead, onBack, onRefresh, setRoute }) {
      const [notes, setNotes] = useState(lead.notes || '');
      const [status, setStatus] = useState(lead.status);
      const [saving, setSaving] = useState(false);
      const [converting, setConverting] = useState(false);

      async function save() {
        setSaving(true);
        try {
          await adminApi('/api/admin/leads/' + lead.id, { method: 'PATCH', body: JSON.stringify({ status, notes }) });
          await onRefresh();
        } catch (e) { alert('Save failed: ' + e.message); }
        finally { setSaving(false); }
      }
      async function convert() {
        if (!confirm('Convert this lead into a client and send the magic-link invite to ' + lead.email + '?')) return;
        setConverting(true);
        try {
          const res = await adminApi('/api/admin/leads/' + lead.id + '/convert', { method: 'POST' });
          alert('Client created and invite sent.\\n\\nMagic link: ' + (res.invite_url || '(see email)'));
          setRoute('/admin/clients/' + res.client_id);
        } catch (e) { alert('Convert failed: ' + e.message); }
        finally { setConverting(false); }
      }
      async function del() {
        if (!confirm('Delete this lead?')) return;
        await adminApi('/api/admin/leads/' + lead.id, { method: 'DELETE' });
        setRoute('/admin/leads');
      }

      return (
        <div style={{minHeight:'100vh',background:'#0a0e27'}}>
          <header style={headerStyle}>
            <button onClick={onBack} style={ghostBtn}><ChevL size={14} /> All Leads</button>
            <div className="serif" style={{fontStyle:'italic',fontSize:'1.25rem'}}>{lead.business_name || lead.name || lead.email}</div>
            <div style={{width:'120px'}}/>
          </header>
          <main style={{padding:'3rem 2rem',maxWidth:'900px',margin:'0 auto'}}>
            <div style={{display:'flex',alignItems:'baseline',gap:'1rem',marginBottom:'2rem'}}>
              <h1 className="serif" style={{fontSize:'2.5rem',fontStyle:'italic',fontWeight:400,margin:0}}>{lead.business_name || lead.name || '(no name)'}</h1>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem',marginBottom:'2rem'}}>
              <Stat label="Source" value={(lead.source || '').replace('_',' ')} />
              <Stat label="Language" value={lead.language === 'es' ? 'Español' : 'English'} />
              <Stat label="Created" value={new Date(lead.created_at).toLocaleDateString()} />
            </div>

            <div style={{padding:'1.5rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'4px',marginBottom:'2rem'}}>
              {lead.email && <LeadField k="Email" v={lead.email} />}
              {lead.phone && <LeadField k="Phone" v={lead.phone} />}
              {lead.business_name && <LeadField k="Business" v={lead.business_name} />}
              {lead.name && <LeadField k="Name" v={lead.name} />}
              {lead.message && <LeadField k="Message" v={lead.message} />}
              {lead.metadata && lead.metadata.utm_source && <LeadField k="UTM" v={[lead.metadata.utm_source, lead.metadata.utm_medium, lead.metadata.utm_campaign].filter(Boolean).join(' · ')} />}
              {lead.metadata && lead.metadata.referrer && <LeadField k="Referrer" v={lead.metadata.referrer} />}
              {lead.metadata && lead.metadata.extra && Object.entries(lead.metadata.extra).filter(([_,v])=>v).map(([k,v]) => <LeadField key={k} k={k} v={v} />)}
            </div>

            <h2 className="serif" style={{fontSize:'1.5rem',fontStyle:'italic',marginBottom:'1rem'}}>Status</h2>
            <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem',flexWrap:'wrap'}}>
              {['new','contacted','converted','dismissed'].map(s => (
                <button key={s} onClick={() => setStatus(s)} disabled={s==='converted' && lead.status !== 'converted'} style={{
                  background: status===s ? 'rgba(251,191,36,0.12)' : 'transparent',
                  color: status===s ? '#fbbf24' : 'rgba(255,255,255,0.6)',
                  border: '1px solid ' + (status===s ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'),
                  padding: '0.5rem 1rem', borderRadius: '3px', cursor: s==='converted' && lead.status !== 'converted' ? 'not-allowed':'pointer', textTransform:'capitalize', opacity: s==='converted' && lead.status !== 'converted' ? 0.4 : 1
                }}>{s}</button>
              ))}
            </div>

            <h2 className="serif" style={{fontSize:'1.5rem',fontStyle:'italic',marginBottom:'1rem'}}>Notes</h2>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={5} placeholder="Internal notes — only visible to admins" style={{...inputStyle, fontFamily:'inherit', resize:'vertical'}} />

            <div style={{display:'flex',gap:'0.75rem',marginTop:'2rem',flexWrap:'wrap'}}>
              <button onClick={save} disabled={saving} style={primaryBtn}>{saving ? 'Saving…' : 'Save'}</button>
              {lead.status !== 'converted' && (
                <button onClick={convert} disabled={converting} style={{...primaryBtn,background:'#10b981',color:'#fff'}}>
                  {converting ? 'Converting…' : <><ArrowRight size={14}/> Convert to Client</>}
                </button>
              )}
              {lead.status === 'converted' && lead.converted_client_id && (
                <button onClick={() => setRoute('/admin/clients/' + lead.converted_client_id)} style={ghostBtn}>
                  Open Client →
                </button>
              )}
              <button onClick={del} style={{...ghostBtn,color:'#fca5a5',marginLeft:'auto'}}><Trash size={14}/> Delete</button>
            </div>
          </main>
        </div>
      );
    }

    function LeadField({ k, v }) {
      return (
        <div style={{marginBottom:'0.75rem'}}>
          <div style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.4)',marginBottom:'0.25rem',textTransform:'uppercase',letterSpacing:'0.1em'}}>{k}</div>
          <div style={{color:'rgba(255,255,255,0.9)',whiteSpace:'pre-wrap'}}>{v}</div>
        </div>
      );
    }

    function ClientRow({ c, onClick, onRefresh }) {
      const sections = c.sections_filled || 0;
      const pct = Math.round((sections / 6) * 100);
      const statusColor = { invited: '#94a3b8', in_progress: '#fbbf24', submitted: '#10b981', active: '#10b981' }[c.status] || '#94a3b8';

      // Site health pill
      const sh = c.site_health;
      const healthOk = sh && sh.ok && sh.total_ms != null && sh.total_ms < 2500;
      const healthSlow = sh && sh.ok && sh.total_ms != null && sh.total_ms >= 2500;
      const healthBad = sh && !sh.ok;
      const healthColor = healthOk ? '#10b981' : healthSlow ? '#fbbf24' : healthBad ? '#fca5a5' : 'rgba(255,255,255,0.18)';
      const healthLabel = sh ? (sh.ok ? (sh.total_ms < 1000 ? '<1s' : (sh.total_ms/1000).toFixed(1) + 's') : (sh.status_code || 'down')) : '—';

      async function resend(e) { e.stopPropagation(); await adminApi('/api/admin/clients/' + c.id + '/resend', { method: 'POST' }); alert('Magic link resent to ' + c.email); }
      async function del(e) {
        e.stopPropagation();
        if (!confirm('Delete ' + (c.business_name || c.email) + '? This removes all data and uploaded files.')) return;
        await adminApi('/api/admin/clients/' + c.id, { method: 'DELETE' });
        onRefresh();
      }
      return (
        <div onClick={onClick} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto',gap:'1.25rem',alignItems:'center',padding:'1.25rem 1.5rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'4px',cursor:'pointer',transition:'all 0.2s'}}>
          <div>
            <div className="serif" style={{fontSize:'1.15rem',fontStyle:'italic',marginBottom:'0.25rem'}}>{c.business_name || '(unnamed)'}</div>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:'0.85rem'}}>
              {c.site_url ? <span style={{color:'rgba(255,255,255,0.6)'}}>{c.site_url.replace(/^https?:\\/\\//,'')}</span> : c.email}
            </div>
          </div>
          {c.site_url && (
            <div style={{display:'flex',alignItems:'center',gap:'0.4rem',padding:'3px 9px',borderRadius:'12px',background:'rgba(255,255,255,0.04)',border:'1px solid '+healthColor+'55'}} title={sh ? 'Last check: '+new Date(sh.checked_at).toLocaleString() : 'Not yet checked'}>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:healthColor}} />
              <span style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.7)',fontFamily:'ui-monospace,monospace'}}>{healthLabel}</span>
            </div>
          )}
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:statusColor}} />
            <span style={{fontSize:'0.8rem',color:'rgba(255,255,255,0.6)',textTransform:'capitalize'}}>{c.status.replace('_',' ')}</span>
          </div>
          <div style={{minWidth:'120px'}}>
            <div style={{height:'4px',background:'rgba(255,255,255,0.08)',borderRadius:'2px',overflow:'hidden'}}>
              <div style={{height:'100%',width:pct+'%',background:'#fbbf24'}} />
            </div>
            <div style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.4)',marginTop:'0.25rem',textAlign:'right'}}>{sections}/6 · {c.file_count || 0} files</div>
          </div>
          <div style={{display:'flex',gap:'0.5rem'}}>
            <button onClick={resend} title="Resend invite" style={iconBtn}><Mail size={14} /></button>
            <button onClick={del} title="Delete" style={{...iconBtn,color:'#fca5a5'}}><Trash size={14} /></button>
          </div>
        </div>
      );
    }

    function ClientDetail({ detail, onBack, onRefresh }) {
      const { client, sections, files, deliverables } = detail;
      return (
        <div style={{minHeight:'100vh',background:'#0a0e27'}}>
          <header style={headerStyle}>
            <button onClick={onBack} style={ghostBtn}><ChevL size={14} /> All Clients</button>
            <div className="serif" style={{fontStyle:'italic',fontSize:'1.25rem'}}>{client.business_name || client.email}</div>
            <div style={{width:'120px'}}/>
          </header>
          <main style={{padding:'3rem 2rem',maxWidth:'1000px',margin:'0 auto'}}>
            <div style={{display:'flex',alignItems:'baseline',gap:'1rem',marginBottom:'2rem'}}>
              <h1 className="serif" style={{fontSize:'2.5rem',fontStyle:'italic',fontWeight:400,margin:0}}>{client.business_name || '(unnamed)'}</h1>
              <span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.9rem'}}>{client.email}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'3rem'}}>
              <Stat label="Plan" value={deliverables?.plan === 'pro' ? 'Crecimiento' : deliverables?.plan === 'esencial' ? 'Esencial' : '—'} />
              <Stat label="Status" value={client.status.replace('_',' ')} />
              <Stat label="Language" value={client.language === 'es' ? 'Español' : 'English'} />
              <Stat label="Submitted" value={client.submitted_at ? new Date(client.submitted_at).toLocaleDateString() : '—'} />
            </div>

            <SiteHealthPanel client={client} onChange={onRefresh} />

            <MockupsPanel client={client} />

            {deliverables && (
              <DeliverablesPanel
                clientId={client.id}
                deliverables={deliverables}
                onChange={onRefresh}
              />
            )}
            <h2 className="serif" style={{fontSize:'1.5rem',fontStyle:'italic',marginBottom:'1rem'}}>Intake Data</h2>
            {Object.keys(sections).length === 0 ? (
              <div style={{padding:'2rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)',textAlign:'center'}}>No sections filled yet.</div>
            ) : Object.entries(sections).map(([key, s]) => (
              <div key={key} style={{marginBottom:'1.5rem',padding:'1.5rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'4px'}}>
                <div style={{fontSize:'0.7rem',letterSpacing:'0.2em',color:'#fbbf24',textTransform:'uppercase',marginBottom:'1rem'}}>{key}</div>
                {Object.entries(s.data || {}).map(([k,v]) => v ? (
                  <div key={k} style={{marginBottom:'0.75rem'}}>
                    <div style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.4)',marginBottom:'0.25rem',textTransform:'uppercase',letterSpacing:'0.1em'}}>{k}</div>
                    <div style={{color:'rgba(255,255,255,0.9)',whiteSpace:'pre-wrap'}}>{v}</div>
                  </div>
                ) : null)}
              </div>
            ))}
            <h2 className="serif" style={{fontSize:'1.5rem',fontStyle:'italic',marginTop:'3rem',marginBottom:'1rem'}}>Files ({files.length})</h2>
            {files.length === 0 ? (
              <div style={{padding:'2rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)',textAlign:'center'}}>No files uploaded.</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
                {files.map(f => (
                  <div key={f.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.85rem 1rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'2px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                      <span style={{fontSize:'0.7rem',color:'#fbbf24',textTransform:'uppercase',letterSpacing:'0.1em',padding:'0.2rem 0.5rem',background:'rgba(251,191,36,0.1)',borderRadius:'2px'}}>{f.category}</span>
                      <span style={{color:'rgba(255,255,255,0.85)'}}>{f.filename}</span>
                      <span style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.4)'}}>{formatSize(f.size_bytes)}</span>
                    </div>
                    <a href={'/api/files/' + f.id + '?admin_token=' + encodeURIComponent(localStorage.getItem(ADMIN_KEY) || '')} target="_blank" rel="noopener" style={{...iconBtn,textDecoration:'none',display:'inline-flex',alignItems:'center'}}><Download size={14} /></a>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      );
    }

    function SiteHealthPanel({ client, onChange }) {
      const [siteUrl, setSiteUrl] = useState(client.site_url || '');
      const [editing, setEditing] = useState(!client.site_url);
      const [checking, setChecking] = useState(false);
      const [savingUrl, setSavingUrl] = useState(false);
      const [health, setHealth] = useState(client.site_health || null);

      async function saveUrl() {
        setSavingUrl(true);
        try {
          await adminApi('/api/admin/clients/' + client.id + '/site-url', {
            method: 'PUT', body: JSON.stringify({ site_url: siteUrl })
          });
          setEditing(false);
          await onChange();
        } catch (e) { alert('No se pudo guardar: ' + e.message); }
        finally { setSavingUrl(false); }
      }
      async function check() {
        setChecking(true);
        try {
          const res = await adminApi('/api/admin/clients/' + client.id + '/check-site', { method: 'POST' });
          setHealth(res.health);
        } catch (e) { alert('Check failed: ' + e.message); }
        finally { setChecking(false); }
      }

      const ttfb = health?.ttfb_ms;
      const total = health?.total_ms;
      const sizeKB = health?.content_length ? (health.content_length / 1024).toFixed(0) : null;
      const ok = health?.ok;
      const dotColor = !health ? 'rgba(255,255,255,0.2)' : ok ? (total < 1500 ? '#10b981' : total < 3000 ? '#fbbf24' : '#fca5a5') : '#fca5a5';
      const banner = !health ? 'No verificado todavía' :
                     ok ? ('Sitio funcionando · ' + total + 'ms total') :
                     ('Sitio caído / error: ' + (health.status_code || health.error || 'sin respuesta'));

      return (
        <div style={{marginBottom:'2.5rem'}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'1rem'}}>
            <h2 className="serif" style={{fontSize:'1.5rem',fontStyle:'italic',margin:0}}>Salud del sitio</h2>
            {client.site_url && !editing && (
              <button onClick={check} disabled={checking} style={{...primaryBtn,padding:'8px 16px',fontSize:'0.85rem'}}>
                {checking ? 'Verificando…' : 'Verificar ahora'}
              </button>
            )}
          </div>

          {editing ? (
            <div style={{padding:'1.5rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'4px'}}>
              <div style={{fontSize:'0.85rem',color:'rgba(255,255,255,0.6)',marginBottom:'0.5rem'}}>URL del sitio en vivo</div>
              <div style={{display:'flex',gap:'0.5rem'}}>
                <input value={siteUrl} onChange={e=>setSiteUrl(e.target.value)} placeholder="https://sunegocio.com" style={{...inputStyle, flex:1}} />
                <button onClick={saveUrl} disabled={savingUrl} style={primaryBtn}>{savingUrl ? 'Guardando…' : 'Guardar'}</button>
                {client.site_url && <button onClick={()=>{setSiteUrl(client.site_url);setEditing(false);}} style={ghostBtn}>Cancelar</button>}
              </div>
            </div>
          ) : (
            <>
              <div style={{display:'flex',alignItems:'center',gap:'0.85rem',padding:'1rem 1.25rem',background:'rgba(255,255,255,0.03)',border:'1px solid '+dotColor+'55',borderRadius:'6px',marginBottom:'1rem'}}>
                <div style={{width:'12px',height:'12px',borderRadius:'50%',background:dotColor,flexShrink:0,boxShadow:'0 0 0 4px '+dotColor+'22'}} />
                <div style={{flex:1}}>
                  <a href={client.site_url} target="_blank" rel="noopener" style={{color:'#fbbf24',textDecoration:'none',fontWeight:600}}>{client.site_url} →</a>
                  <div style={{fontSize:'0.8rem',color:'rgba(255,255,255,0.55)',marginTop:'0.15rem'}}>{banner}{health?.checked_at && ' · ' + new Date(health.checked_at).toLocaleString()}</div>
                </div>
                <button onClick={()=>setEditing(true)} style={{...ghostBtn,padding:'6px 12px',fontSize:'0.78rem'}}>Editar URL</button>
              </div>

              {health && (
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.75rem'}}>
                  <HealthStat label="TTFB" value={ttfb != null ? ttfb + ' ms' : '—'} hint="time to first byte" good={ttfb != null && ttfb < 800} bad={ttfb != null && ttfb > 1500} />
                  <HealthStat label="Total" value={total != null ? total + ' ms' : '—'} hint="full response" good={total != null && total < 1500} bad={total != null && total > 3000} />
                  <HealthStat label="Tamaño" value={sizeKB != null ? sizeKB + ' KB' : '—'} hint="HTML payload" good={sizeKB && +sizeKB < 200} bad={sizeKB && +sizeKB > 500} />
                  <HealthStat label="Status" value={health.status_code || (health.error ? 'error' : '—')} hint={health.server || ''} good={ok} bad={!ok} />
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    function HealthStat({ label, value, hint, good, bad }) {
      const color = good ? '#10b981' : bad ? '#fca5a5' : 'rgba(255,255,255,0.85)';
      return (
        <div style={{padding:'0.85rem 1rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'4px'}}>
          <div style={{fontSize:'0.65rem',letterSpacing:'0.18em',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',marginBottom:'0.35rem'}}>{label}</div>
          <div className="serif" style={{fontSize:'1.25rem',color,fontStyle:'italic',fontFamily:'ui-monospace,monospace',fontWeight:600}}>{value}</div>
          {hint && <div style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.4)',marginTop:'0.2rem'}}>{hint}</div>}
        </div>
      );
    }

    function MockupsPanel({ client }) {
      const [mockups, setMockups] = useState([]);
      const [comments, setComments] = useState({});
      const [loading, setLoading] = useState(false);
      const [generating, setGenerating] = useState(false);
      const [shareUrls, setShareUrls] = useState({});
      const [shipping, setShipping] = useState({});
      const [revInst, setRevInst] = useState({});

      async function load() {
        setLoading(true);
        try {
          const r = await adminApi('/api/admin/clients/' + client.id + '/mockups');
          const list = r.mockups || [];
          setMockups(list);
          if (list.length) {
            const c = await adminApi('/api/admin/mockups/' + list[0].id + '/comments');
            setComments(prev => ({ ...prev, [list[0].id]: c.comments || [] }));
          }
        } catch (e) { alert('Error: ' + e.message); }
        finally { setLoading(false); }
      }
      useEffect(() => { load(); }, [client.id]);

      async function generate() {
        setGenerating(true);
        try {
          await adminApi('/api/admin/clients/' + client.id + '/mockups', { method: 'POST' });
          await load();
        } catch (e) { alert('No se pudo generar: ' + e.message); }
        finally { setGenerating(false); }
      }
      async function share(mid) {
        try {
          const r = await adminApi('/api/admin/mockups/' + mid + '/share', { method: 'POST', body: JSON.stringify({ ttl_days: 7 }) });
          setShareUrls(s => ({ ...s, [mid]: r.url }));
          try { await navigator.clipboard.writeText(r.url); } catch (_) {}
        } catch (e) { alert('Error: ' + e.message); }
      }
      async function regen(mid) {
        const inst = (revInst[mid] || '').trim();
        if (!confirm('¿Regenerar el mockup' + (inst ? ' con la nota: "' + inst + '"' : '') + '?')) return;
        try {
          await adminApi('/api/admin/mockups/' + mid + '/regenerate', { method: 'POST', body: JSON.stringify({ instruction: inst }) });
          setRevInst(r => ({ ...r, [mid]: '' }));
          await load();
        } catch (e) { alert('Error: ' + e.message); }
      }
      async function ship(mid) {
        if (!confirm('¿Lanzar este mockup como sitio final? (crea proyecto Pages)')) return;
        setShipping(s => ({ ...s, [mid]: true }));
        try {
          const r = await adminApi('/api/admin/mockups/' + mid + '/ship', { method: 'POST' });
          alert('Lanzado: ' + r.url + (r.note ? '\n\n' + r.note : ''));
          await load();
        } catch (e) { alert('Error: ' + e.message); }
        finally { setShipping(s => ({ ...s, [mid]: false })); }
      }

      const planLabel = client.plan === 'pro' ? 'Crecimiento' : client.plan === 'esencial' ? 'Esencial' : '—';
      const planColor = client.plan === 'pro' ? '#10b981' : '#fbbf24';
      return (
        <div style={{marginBottom:'2.5rem'}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'1rem',flexWrap:'wrap',gap:'0.75rem'}}>
            <div style={{display:'flex',alignItems:'baseline',gap:'0.85rem'}}>
              <h2 className="serif" style={{fontSize:'1.5rem',fontStyle:'italic',margin:0}}>Mockups</h2>
              <span style={{fontSize:'0.7rem',padding:'0.25rem 0.7rem',borderRadius:'999px',background:planColor+'22',color:planColor,letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:600}}>Plan: {planLabel}</span>
            </div>
            <button onClick={generate} disabled={generating} style={primaryBtn}>
              {generating ? 'Generando…' : (mockups.length ? 'Generar nueva versión' : 'Generar mockup')}
            </button>
          </div>
          {loading ? (
            <div style={{padding:'1rem',color:'rgba(255,255,255,0.5)'}}>Cargando…</div>
          ) : mockups.length === 0 ? (
            <div style={{padding:'2rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)',textAlign:'center',borderRadius:'4px'}}>
              Sin mockups todavía. Haga clic en "Generar mockup" para crear el primero.
            </div>
          ) : mockups.map(m => (
            <div key={m.id} style={{marginBottom:'1rem',padding:'1.25rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'6px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.75rem',flexWrap:'wrap',gap:'0.5rem'}}>
                <div>
                  <span style={{fontSize:'0.95rem',fontWeight:600,color:'#fbbf24'}}>v{m.version}</span>
                  <span style={{marginLeft:'0.75rem',fontSize:'0.75rem',color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.1em'}}>{m.status}</span>
                  <span style={{marginLeft:'0.75rem',fontSize:'0.75rem',color:'rgba(255,255,255,0.4)'}}>{new Date(m.created_at*1000).toLocaleString()}</span>
                </div>
                <div style={{display:'flex',gap:'0.5rem'}}>
                  <button onClick={()=>share(m.id)} style={ghostBtn}>Compartir (7 días)</button>
                  <button onClick={()=>ship(m.id)} disabled={shipping[m.id]} style={{...primaryBtn,padding:'8px 14px',fontSize:'0.8rem'}}>
                    {shipping[m.id] ? 'Lanzando…' : (m.status==='shipped' ? 'Re-lanzar' : 'Lanzar final')}
                  </button>
                </div>
              </div>
              {shareUrls[m.id] && (
                <div style={{padding:'0.6rem 0.85rem',background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.3)',borderRadius:'4px',marginBottom:'0.75rem',fontSize:'0.85rem'}}>
                  <span style={{color:'rgba(255,255,255,0.6)'}}>Enlace temp (copiado):</span> <a href={shareUrls[m.id]} target="_blank" rel="noopener" style={{color:'#fbbf24'}}>{shareUrls[m.id]}</a>
                </div>
              )}
              {m.shipped_url && (
                <div style={{padding:'0.6rem 0.85rem',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'4px',marginBottom:'0.75rem',fontSize:'0.85rem'}}>
                  <span style={{color:'rgba(255,255,255,0.6)'}}>En vivo:</span> <a href={m.shipped_url} target="_blank" rel="noopener" style={{color:'#10b981'}}>{m.shipped_url}</a>
                </div>
              )}
              {(comments[m.id] || []).length > 0 && (
                <div style={{marginTop:'0.75rem',padding:'0.75rem',background:'rgba(0,0,0,0.2)',borderRadius:'4px'}}>
                  <div style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.5)',marginBottom:'0.5rem',textTransform:'uppercase',letterSpacing:'0.12em'}}>Comentarios del cliente</div>
                  {comments[m.id].map(c => (
                    <div key={c.id} style={{padding:'0.5rem 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                      <div style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.4)'}}>{c.section || 'general'} · {new Date(c.created_at*1000).toLocaleString()}</div>
                      <div style={{color:'rgba(255,255,255,0.85)',fontSize:'0.9rem',marginTop:'0.2rem',whiteSpace:'pre-wrap'}}>{c.body}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{display:'flex',gap:'0.5rem',marginTop:'0.75rem'}}>
                <input value={revInst[m.id] || ''} onChange={e=>setRevInst(r=>({...r,[m.id]:e.target.value}))} placeholder="Nota para regenerar (opcional)…" style={{...inputStyle,padding:'0.5rem 0.75rem',flex:1,fontSize:'0.85rem'}} />
                <button onClick={()=>regen(m.id)} style={ghostBtn}>Regenerar</button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    function DeliverablesPanel({ clientId, deliverables, onChange }) {
      const [items, setItems] = useState(deliverables.items);
      const [summary, setSummary] = useState(deliverables.summary);
      const groups = deliverables.groups || {};
      const statuses = deliverables.statuses || {};

      // Group items by category
      const grouped = {};
      for (const it of items) {
        if (!grouped[it.group]) grouped[it.group] = [];
        grouped[it.group].push(it);
      }

      async function setStatus(key, status) {
        // Optimistic update
        setItems(prev => prev.map(it => it.key === key ? {...it, status} : it));
        try {
          const res = await adminApi('/api/admin/clients/' + clientId + '/deliverables/' + key, {
            method: 'PUT', body: JSON.stringify({ status })
          });
          if (res.summary) setSummary(res.summary);
        } catch (e) {
          alert('No se pudo actualizar: ' + e.message);
          // Roll back
          setItems(prev => prev.map(it => it.key === key ? deliverables.items.find(d => d.key === key) : it));
        }
      }

      const statusColor = (s) => statuses[s]?.color || '#94a3b8';
      const statusIcon  = (s) => statuses[s]?.icon || '○';
      const statusLabel = (s) => statuses[s]?.label || s;

      return (
        <div style={{marginBottom:'3rem'}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'1rem'}}>
            <h2 className="serif" style={{fontSize:'1.5rem',fontStyle:'italic',margin:0}}>Entregables</h2>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem',fontSize:'0.85rem',color:'rgba(255,255,255,0.7)'}}>
              <span><b style={{color:'#10b981'}}>{summary.done}</b> listos</span>
              <span style={{color:'rgba(255,255,255,0.3)'}}>·</span>
              <span><b style={{color:'#fbbf24'}}>{summary.in_progress}</b> en curso</span>
              <span style={{color:'rgba(255,255,255,0.3)'}}>·</span>
              <span><b style={{color:'#94a3b8'}}>{summary.pending}</b> pendientes</span>
              {summary.na > 0 && <><span style={{color:'rgba(255,255,255,0.3)'}}>·</span><span><b style={{color:'#475569'}}>{summary.na}</b> N/A</span></>}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{height:'6px',background:'rgba(255,255,255,0.08)',borderRadius:'3px',overflow:'hidden',marginBottom:'1.5rem'}}>
            <div style={{height:'100%',width:summary.pct+'%',background:'linear-gradient(90deg,#fbbf24,#10b981)',transition:'width .25s'}}/>
          </div>
          <div style={{textAlign:'right',fontSize:'0.75rem',color:'rgba(255,255,255,0.4)',marginTop:'-1rem',marginBottom:'1.5rem'}}>{summary.pct}% completo</div>

          {Object.entries(grouped).map(([gKey, gItems]) => (
            <div key={gKey} style={{marginBottom:'2rem'}}>
              <div style={{fontSize:'0.7rem',letterSpacing:'0.18em',color:'#fbbf24',textTransform:'uppercase',marginBottom:'0.75rem'}}>
                {groups[gKey] || gKey}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
                {gItems.map(it => (
                  <div key={it.key} style={{
                    display:'grid',gridTemplateColumns:'24px 1fr auto',gap:'0.75rem',alignItems:'center',
                    padding:'0.6rem 0.85rem',
                    background:it.status==='done' ? 'rgba(16,185,129,0.06)' : it.status==='in_progress' ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.03)',
                    border:'1px solid '+(it.status==='done' ? 'rgba(16,185,129,0.25)' : it.status==='in_progress' ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.08)'),
                    borderRadius:'3px'
                  }}>
                    <span style={{color:statusColor(it.status),fontSize:'1rem',textAlign:'center',fontWeight:700}}>{statusIcon(it.status)}</span>
                    <span style={{
                      color: it.status==='na' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.92)',
                      textDecoration: it.status==='done' ? 'none' : 'none',
                      fontSize:'0.92rem'
                    }}>
                      {it.label}
                      {it.plan === 'pro' && <span style={{marginLeft:'0.5rem',fontSize:'0.65rem',padding:'1px 6px',border:'1px solid rgba(252,209,22,0.4)',color:'#fcd116',borderRadius:'3px',letterSpacing:'0.08em',textTransform:'uppercase'}}>Crecimiento</span>}
                    </span>
                    <select value={it.status} onChange={e => setStatus(it.key, e.target.value)} style={{
                      background:'rgba(255,255,255,0.05)',color:'#fff',
                      border:'1px solid rgba(255,255,255,0.12)',
                      borderRadius:'3px',padding:'4px 8px',fontSize:'0.78rem',
                      cursor:'pointer',fontFamily:'inherit'
                    }}>
                      <option value="pending">Pendiente</option>
                      <option value="in_progress">En curso</option>
                      <option value="done">Listo</option>
                      <option value="na">N/A</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    function Stat({ label, value }) {
      return (
        <div style={{padding:'1.25rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'4px'}}>
          <div style={{fontSize:'0.7rem',letterSpacing:'0.2em',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',marginBottom:'0.5rem'}}>{label}</div>
          <div className="serif" style={{fontSize:'1.5rem',fontStyle:'italic',color:'#fff',textTransform:'capitalize'}}>{value}</div>
        </div>
      );
    }

    function InviteModal({ onClose, onCreated }) {
      const [email, setEmail] = useState('');
      const [bizName, setBizName] = useState('');
      const [language, setLanguage] = useState('en');
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState(null);
      const [result, setResult] = useState(null);

      async function submit() {
        if (!email.includes('@')) { setError('Valid email required'); return; }
        setLoading(true); setError(null);
        try {
          const res = await adminApi('/api/admin/invite', { method: 'POST', body: JSON.stringify({ email, businessName: bizName, language }) });
          setResult(res);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
      }
      return (
        <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:'2rem'}}>
          <div onClick={e=>e.stopPropagation()} style={{maxWidth:'480px',width:'100%',background:'#0a0e27',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'4px',padding:'2.5rem'}}>
            <h2 className="serif" style={{fontSize:'1.75rem',fontStyle:'italic',margin:'0 0 1.5rem'}}>Invite Client</h2>
            {result ? (
              <>
                <div style={{padding:'1rem',background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'2px',marginBottom:'1rem',fontSize:'0.9rem'}}>
                  <Check size={14} style={{display:'inline',marginRight:'0.5rem'}} color="#10b981" /> Invite sent
                </div>
                <div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.5)',marginBottom:'0.5rem'}}>Direct invite link (also emailed):</div>
                <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem'}}>
                  <input readOnly value={result.invite_url} style={{...inputStyle,fontSize:'0.75rem'}} />
                  <button onClick={()=>navigator.clipboard.writeText(result.invite_url)} style={iconBtn}><Copy size={14}/></button>
                </div>
                <button onClick={onCreated} style={{...primaryBtn,width:'100%'}}>Done</button>
              </>
            ) : (
              <>
                <div style={{display:'flex',flexDirection:'column',gap:'1rem',marginBottom:'1.5rem'}}>
                  <div><label style={fieldLabel}>Email *</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="client@business.com" style={inputStyle}/></div>
                  <div><label style={fieldLabel}>Business Name</label><input value={bizName} onChange={e=>setBizName(e.target.value)} placeholder="Acme Imports" style={inputStyle}/></div>
                  <div>
                    <label style={fieldLabel}>Language</label>
                    <div style={{display:'flex',gap:'0.5rem'}}>
                      {['en','es'].map(l => (
                        <button key={l} onClick={()=>setLanguage(l)} style={{flex:1,padding:'0.75rem',background:language===l?'rgba(251,191,36,0.15)':'rgba(255,255,255,0.03)',border:'1px solid '+(language===l?'#fbbf24':'rgba(255,255,255,0.1)'),color:language===l?'#fbbf24':'rgba(255,255,255,0.7)',borderRadius:'2px',cursor:'pointer',fontFamily:'inherit'}}>{l==='en'?'English':'Español'}</button>
                      ))}
                    </div>
                  </div>
                </div>
                {error && <div style={{color:'#fca5a5',fontSize:'0.85rem',marginBottom:'1rem'}}>{error}</div>}
                <div style={{display:'flex',gap:'0.75rem'}}>
                  <button onClick={onClose} style={{...ghostBtn,flex:1}}>Cancel</button>
                  <button onClick={submit} disabled={loading} style={{...primaryBtn,flex:1}}>{loading?'Sending…':'Send Invite'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    // ─── CLIENT PORTAL SCREENS ───────────────────────────────────────
    function LoginScreen({ t, lang, setLang, email, setEmail, onSubmit, loading, error }) {
      return (
        <div style={pageStyle}>
          <Orbs/>
          <button onClick={()=>setLang(lang==='en'?'es':'en')} style={{position:'absolute',top:'2rem',right:'2rem',...langBtn,zIndex:10}}>{lang==='en'?'ES':'EN'}</button>
          <div style={{maxWidth:'440px',width:'100%',position:'relative',zIndex:1}}>
            <div style={{textAlign:'center',marginBottom:'3rem'}}>
              <div style={{display:'inline-flex',alignItems:'center',gap:'0.5rem',marginBottom:'1.5rem'}}>
                <Sparkle size={20} color="#fbbf24"/>
                <span style={{color:'#fbbf24',letterSpacing:'0.3em',fontSize:'0.75rem',textTransform:'uppercase'}}>{t.tagline}</span>
              </div>
              <h1 className="serif" style={titleStyle}>Pyme<span style={{color:'#fbbf24'}}>WebPro</span></h1>
              <div style={{height:'1px',width:'60px',background:'#fbbf24',margin:'1.5rem auto'}}/>
              <p style={{color:'rgba(255,255,255,0.7)',fontSize:'1rem',margin:0}}>{t.loginTitle}</p>
              <p style={{color:'rgba(255,255,255,0.4)',fontSize:'0.9rem',marginTop:'0.5rem'}}>{t.loginSub}</p>
            </div>
            <div style={cardStyle}>
              <div style={{position:'relative',marginBottom:'1.5rem'}}>
                <Mail size={18} style={{position:'absolute',left:'1rem',top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.4)'}}/>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={t.emailPh} disabled={loading} onKeyDown={e=>e.key==='Enter'&&onSubmit()} style={{...inputStyle,paddingLeft:'3rem'}}/>
              </div>
              {error && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#fca5a5',padding:'0.75rem 1rem',borderRadius:'2px',fontSize:'0.85rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'0.5rem'}}><Alert size={16}/>{error}</div>}
              <button onClick={onSubmit} disabled={loading} style={{...primaryBtn,width:'100%'}}>{loading?<><Loader size={16} className="spin"/>{t.sending}</>:t.sendLink}</button>
            </div>
          </div>
        </div>
      );
    }

    function LinkSent({ t, email, onBack }) {
      return (
        <Center>
          <div style={{maxWidth:'440px',textAlign:'center'}}>
            <div style={{width:'80px',height:'80px',borderRadius:'50%',background:'rgba(251,191,36,0.1)',border:'1px solid #fbbf24',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 2rem'}}><Mail size={32} color="#fbbf24"/></div>
            <h2 className="serif" style={{color:'#fff',fontSize:'2rem',fontStyle:'italic',margin:0}}>{t.linkSent}</h2>
            <p style={{color:'rgba(255,255,255,0.6)',marginTop:'1rem'}}>{t.linkSentSub}</p>
            <p style={{color:'#fbbf24',fontSize:'1.1rem',marginTop:'0.5rem'}}>{email}</p>
            <button onClick={onBack} style={{...ghostBtn,marginTop:'3rem'}}>{t.backToLogin}</button>
          </div>
        </Center>
      );
    }

    function Submitted({ t }) {
      return (
        <Center>
          <div style={{maxWidth:'500px',textAlign:'center'}}>
            <div style={{width:'100px',height:'100px',borderRadius:'50%',background:'#fbbf24',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 2rem'}}><Check size={48} color="#0a0e27" strokeWidth={3}/></div>
            <h2 className="serif" style={{color:'#fff',fontSize:'2.5rem',fontStyle:'italic',margin:0}}>{t.submitted}</h2>
            <p style={{color:'rgba(255,255,255,0.6)',marginTop:'1.5rem',fontSize:'1.05rem',lineHeight:1.6}}>{t.submittedSub}</p>
          </div>
        </Center>
      );
    }

    function Portal({ t, lang, setLang, client, email, data, setData, files, setFiles, section, setSection, onLogout, onSubmit, submitting }) {
      const sectionKeys = ['business','contact','brand','visual','content','tech'];
      const sectionIcons = [Brief,Phone,Palette,Img,FT,Settings];
      const SecIcon = sectionIcons[section];
      const currentKey = sectionKeys[section];
      const sectionFields = {
        business:['bizName','tagline','whatYouDo','audience'],
        contact:['phone','email','address','whatsapp','ig','fb','li','tw'],
        brand:['colors','fonts'], visual:['refSites'],
        content:['tone','topics','pages'], tech:['domain','hosting','bizEmail']
      };
      const [saveStatus, setSaveStatus] = useState({});
      const saveTimers = useRef({});

      const update = (field, value) => {
        setData(prev => ({ ...prev, [field]: value }));
        const sec = Object.keys(sectionFields).find(s => sectionFields[s].includes(field));
        if (!sec) return;
        clearTimeout(saveTimers.current[sec]);
        saveTimers.current[sec] = setTimeout(() => {
          setData(currentData => {
            saveSection(sec, currentData);
            return currentData;
          });
        }, 800);
      };

      async function saveSection(sec, currentData) {
        setSaveStatus(p => ({ ...p, [sec]: 'saving' }));
        const payload = {};
        sectionFields[sec].forEach(f => payload[f] = currentData[f] || '');
        try {
          await api('/api/client/intake/' + sec, { method: 'PUT', body: JSON.stringify(payload) });
          setSaveStatus(p => ({ ...p, [sec]: 'saved' }));
          setTimeout(() => setSaveStatus(p => { const n={...p}; delete n[sec]; return n; }), 2000);
        } catch { setSaveStatus(p => ({ ...p, [sec]: 'error' })); }
      }

      async function handleFileUpload(file, category) {
        if (!file) return;
        const tempId = 'temp-' + Date.now();
        setFiles(p => [{ id: tempId, filename: file.name, category, uploading: true, size_bytes: file.size }, ...p]);
        try {
          const res = await fetch('/api/files/upload?category=' + category + '&filename=' + encodeURIComponent(file.name), {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem(SESSION_KEY), 'Content-Type': file.type || 'application/octet-stream' },
            body: file
          });
          const j = await res.json();
          if (!res.ok) throw new Error(j.error);
          setFiles(p => p.map(f => f.id === tempId ? { ...j.file, uploaded_at: Date.now() } : f));
        } catch (e) {
          setFiles(p => p.filter(f => f.id !== tempId));
          alert('Upload failed: ' + e.message);
        }
      }
      async function handleFileDelete(fileId) {
        setFiles(p => p.filter(f => f.id !== fileId));
        try { await api('/api/files/' + fileId, { method: 'DELETE' }); } catch {}
      }

      const allFields = Object.values(sectionFields).flat();
      const filledCount = allFields.filter(f => data[f] && String(data[f]).trim()).length + (files.length > 0 ? 2 : 0);
      const progress = Math.min(100, Math.round((filledCount / (allFields.length + 2)) * 100));

      return (
        <div style={{minHeight:'100vh',background:'#0a0e27',color:'#fff'}}>
          <header style={headerStyle}>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
              <Sparkle size={18} color="#fbbf24"/>
              <span className="serif" style={{fontStyle:'italic',fontSize:'1.25rem'}}>Pyme<span style={{color:'#fbbf24'}}>WebPro</span></span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
              <SaveInd status={saveStatus[currentKey]} t={t}/>
              <button onClick={()=>setLang(lang==='en'?'es':'en')} style={langBtn}>{lang==='en'?'ES':'EN'}</button>
              <span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.85rem'}}>{email}</span>
              <button onClick={onLogout} style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer'}}><LogOut size={18}/></button>
            </div>
          </header>
          <div style={{display:'grid',gridTemplateColumns:'280px 1fr',minHeight:'calc(100vh - 70px)'}}>
            <aside style={{borderRight:'1px solid rgba(255,255,255,0.08)',padding:'2rem 1rem',background:'rgba(0,0,0,0.2)'}}>
              <div style={{padding:'0 1rem',marginBottom:'2rem'}}>
                <div style={{fontSize:'0.7rem',letterSpacing:'0.2em',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',marginBottom:'0.5rem'}}>{t.progress}</div>
                <div style={{height:'6px',background:'rgba(255,255,255,0.08)',borderRadius:'3px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:progress+'%',background:'linear-gradient(90deg,#fbbf24,#f59e0b)',transition:'width 0.4s'}}/>
                </div>
                <div style={{fontSize:'0.8rem',color:'#fbbf24',marginTop:'0.5rem'}}>{progress}% {t.complete}</div>
              </div>
              {sectionKeys.map((key,i) => {
                const Ic = sectionIcons[i]; const active = i===section;
                return <button key={key} onClick={()=>setSection(i)} style={{width:'100%',display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.85rem 1rem',marginBottom:'0.25rem',background:active?'rgba(251,191,36,0.1)':'transparent',border:'none',borderLeft:active?'2px solid #fbbf24':'2px solid transparent',color:active?'#fbbf24':'rgba(255,255,255,0.7)',cursor:'pointer',fontFamily:'inherit',fontSize:'0.9rem',textAlign:'left'}}><Ic size={16}/>{t.sections[key]}</button>;
              })}
            </aside>
            <main style={{padding:'3rem 4rem',maxWidth:'900px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'0.5rem'}}>
                <SecIcon size={24} color="#fbbf24"/>
                <span style={{fontSize:'0.75rem',letterSpacing:'0.2em',color:'rgba(255,255,255,0.4)',textTransform:'uppercase'}}>{section+1} / {sectionKeys.length}</span>
              </div>
              <h1 className="serif" style={{fontSize:'2.5rem',fontStyle:'italic',fontWeight:400,margin:'0 0 3rem'}}>{t.sections[currentKey]}</h1>
              <div style={{display:'flex',flexDirection:'column',gap:'1.5rem'}}>
                {currentKey==='business' && <>
                  <Field label={t.fields.bizName} value={data.bizName||''} onChange={v=>update('bizName',v)} placeholder={t.ph.bizName}/>
                  <Field label={t.fields.tagline} value={data.tagline||''} onChange={v=>update('tagline',v)} placeholder={t.ph.tagline}/>
                  <Field label={t.fields.whatYouDo} value={data.whatYouDo||''} onChange={v=>update('whatYouDo',v)} placeholder={t.ph.whatYouDo} textarea/>
                  <Field label={t.fields.audience} value={data.audience||''} onChange={v=>update('audience',v)} placeholder={t.ph.audience} textarea/>
                </>}
                {currentKey==='contact' && <>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
                    <Field label={t.fields.phone} value={data.phone||''} onChange={v=>update('phone',v)}/>
                    <Field label={t.fields.email} value={data.email||''} onChange={v=>update('email',v)}/>
                  </div>
                  <Field label={t.fields.address} value={data.address||''} onChange={v=>update('address',v)}/>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
                    <Field label={t.fields.whatsapp} value={data.whatsapp||''} onChange={v=>update('whatsapp',v)}/>
                    <Field label={t.fields.ig} value={data.ig||''} onChange={v=>update('ig',v)} placeholder="@handle"/>
                    <Field label={t.fields.fb} value={data.fb||''} onChange={v=>update('fb',v)}/>
                    <Field label={t.fields.li} value={data.li||''} onChange={v=>update('li',v)}/>
                  </div>
                </>}
                {currentKey==='brand' && <>
                  <FileDrop label={t.fields.logoUp} dragText={t.dragDrop} category="logo" files={files.filter(f=>f.category==='logo')} onUpload={handleFileUpload} onDelete={handleFileDelete} accept="image/*,.ai,.eps"/>
                  <Field label={t.fields.colors} value={data.colors||''} onChange={v=>update('colors',v)} placeholder={t.ph.colors} help={t.fields.colorsHelp}/>
                  <Field label={t.fields.fonts} value={data.fonts||''} onChange={v=>update('fonts',v)}/>
                </>}
                {currentKey==='visual' && <>
                  <FileDrop label={t.fields.photos} dragText={t.dragDrop} category="photo" files={files.filter(f=>f.category==='photo')} onUpload={handleFileUpload} onDelete={handleFileDelete} accept="image/*,video/*" multi/>
                  <Field label={t.fields.refSites} value={data.refSites||''} onChange={v=>update('refSites',v)} textarea placeholder="https://…"/>
                </>}
                {currentKey==='content' && <>
                  <Field label={t.fields.tone} value={data.tone||''} onChange={v=>update('tone',v)} placeholder={t.ph.tone}/>
                  <Field label={t.fields.topics} value={data.topics||''} onChange={v=>update('topics',v)} placeholder={t.ph.topics} textarea/>
                  <Field label={t.fields.pages} value={data.pages||''} onChange={v=>update('pages',v)} placeholder={t.ph.pages} textarea/>
                </>}
                {currentKey==='tech' && <>
                  <Field label={t.fields.domain} value={data.domain||''} onChange={v=>update('domain',v)} placeholder="yoursite.com"/>
                  <Field label={t.fields.hosting} value={data.hosting||''} onChange={v=>update('hosting',v)}/>
                  <Field label={t.fields.bizEmail} value={data.bizEmail||''} onChange={v=>update('bizEmail',v)}/>
                </>}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'4rem',paddingTop:'2rem',borderTop:'1px solid rgba(255,255,255,0.08)'}}>
                <button onClick={()=>setSection(Math.max(0,section-1))} disabled={section===0} style={{...secondaryBtn,opacity:section===0?0.3:1}}><ChevL size={16}/>{t.back}</button>
                {section<sectionKeys.length-1
                  ? <button onClick={()=>setSection(section+1)} style={primaryBtn}>{t.next}<ChevR size={16}/></button>
                  : <button onClick={onSubmit} disabled={submitting} style={primaryBtn}>{submitting?<><Loader size={16} className="spin"/>{t.submitting}</>:t.submit}</button>
                }
              </div>
            </main>
          </div>
        </div>
      );
    }

    function Field({ label, value, onChange, placeholder, textarea, help }) {
      return (
        <div>
          <label style={fieldLabel}>{label}</label>
          {textarea
            ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={3} style={{...inputStyle,resize:'vertical'}}/>
            : <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={inputStyle}/>}
          {help && <div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.35)',marginTop:'0.4rem',fontStyle:'italic'}}>{help}</div>}
        </div>
      );
    }

    function FileDrop({ label, dragText, category, files, onUpload, onDelete, accept, multi }) {
      const inputRef = useRef();
      const [dragging, setDragging] = useState(false);
      const handleFiles = (fl) => Array.from(fl).forEach(f => onUpload(f, category));
      return (
        <div>
          <label style={fieldLabel}>{label}</label>
          <div onClick={()=>inputRef.current?.click()} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);handleFiles(e.dataTransfer.files);}}
            style={{border:dragging?'1px solid #fbbf24':'1px dashed rgba(251,191,36,0.4)',background:dragging?'rgba(251,191,36,0.08)':'rgba(251,191,36,0.03)',padding:'2.5rem',borderRadius:'2px',textAlign:'center',cursor:'pointer',transition:'all 0.2s'}}>
            <Upload size={28} color="#fbbf24" style={{marginBottom:'0.75rem'}}/>
            <div style={{color:'rgba(255,255,255,0.6)',fontSize:'0.9rem'}}>{dragText}</div>
            <input ref={inputRef} type="file" accept={accept} multiple={multi} onChange={e=>handleFiles(e.target.files)} style={{display:'none'}}/>
          </div>
          {files.length>0 && (
            <div style={{marginTop:'1rem',display:'flex',flexDirection:'column',gap:'0.5rem'}}>
              {files.map(f => (
                <div key={f.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.75rem 1rem',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'2px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.75rem',minWidth:0}}>
                    {f.uploading ? <Loader size={16} className="spin" color="#fbbf24"/> : <Check size={16} color="#fbbf24"/>}
                    <span style={{color:'rgba(255,255,255,0.85)',fontSize:'0.9rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.filename}</span>
                    {f.size_bytes && <span style={{color:'rgba(255,255,255,0.4)',fontSize:'0.75rem'}}>{formatSize(f.size_bytes)}</span>}
                  </div>
                  {!f.uploading && <button onClick={()=>onDelete(f.id)} style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',padding:'0.25rem'}}><Trash size={14}/></button>}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    function SaveInd({ status, t }) {
      if (!status) return null;
      const map = {
        saving:{text:t.saving,color:'rgba(255,255,255,0.5)',ic:<Loader size={12} className="spin"/>},
        saved:{text:t.saved,color:'#fbbf24',ic:<Check size={12}/>},
        error:{text:t.saveError,color:'#ef4444',ic:<Alert size={12}/>}
      };
      const c = map[status]; if (!c) return null;
      return <span style={{display:'flex',alignItems:'center',gap:'0.4rem',fontSize:'0.75rem',color:c.color}}>{c.ic}{c.text}</span>;
    }

    function Center({ children }) { return <div style={pageStyle}><Orbs/>{children}</div>; }
    function Orbs() {
      return <>
        <div style={{position:'absolute',top:'10%',left:'5%',width:'300px',height:'300px',borderRadius:'50%',background:'radial-gradient(circle,rgba(251,191,36,0.15) 0%,transparent 70%)',filter:'blur(40px)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:'10%',right:'5%',width:'400px',height:'400px',borderRadius:'50%',background:'radial-gradient(circle,rgba(168,85,247,0.2) 0%,transparent 70%)',filter:'blur(50px)',pointerEvents:'none'}}/>
      </>;
    }
    function formatSize(b) { if (!b) return ''; if (b<1024) return b+' B'; if (b<1048576) return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(1)+' MB'; }

    const pageStyle = { minHeight:'100vh',background:'linear-gradient(135deg,#0a0e27 0%,#1a1d3a 50%,#2d1b4e 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem',position:'relative',overflow:'hidden' };
    const titleStyle = { fontSize:'3.5rem',fontWeight:400,color:'#fff',margin:0,letterSpacing:'-0.02em',fontStyle:'italic' };
    const cardStyle = { background:'rgba(255,255,255,0.03)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'4px',padding:'2.5rem' };
    const inputStyle = { width:'100%',background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.1)',color:'#fff',padding:'0.85rem',borderRadius:'2px',fontSize:'0.95rem',boxSizing:'border-box',outline:'none' };
    const fieldLabel = { display:'block',fontSize:'0.75rem',letterSpacing:'0.15em',textTransform:'uppercase',color:'rgba(255,255,255,0.5)',marginBottom:'0.5rem' };
    const primaryBtn = { display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',background:'#fbbf24',color:'#0a0e27',border:'none',padding:'0.85rem 1.5rem',borderRadius:'2px',cursor:'pointer',fontFamily:'inherit',fontWeight:600,fontSize:'0.85rem',letterSpacing:'0.1em',textTransform:'uppercase' };
    const secondaryBtn = { display:'inline-flex',alignItems:'center',gap:'0.5rem',background:'transparent',border:'1px solid rgba(255,255,255,0.15)',color:'rgba(255,255,255,0.7)',padding:'0.85rem 1.5rem',borderRadius:'2px',cursor:'pointer',fontFamily:'inherit',fontSize:'0.85rem',letterSpacing:'0.1em' };
    const ghostBtn = { display:'inline-flex',alignItems:'center',gap:'0.5rem',background:'transparent',color:'rgba(255,255,255,0.7)',border:'1px solid rgba(255,255,255,0.2)',padding:'0.6rem 1.25rem',borderRadius:'2px',cursor:'pointer',fontFamily:'inherit',fontSize:'0.85rem' };
    const langBtn = { background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.15)',color:'#fbbf24',padding:'0.4rem 0.9rem',borderRadius:'999px',cursor:'pointer',fontFamily:'inherit',fontSize:'0.75rem' };
    const headerStyle = { borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'1.25rem 2rem',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(0,0,0,0.3)' };
    const iconBtn = { background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.7)',padding:'0.5rem',borderRadius:'2px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' };

    ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
  </script>
</body>
</html>`;

// src/index.js  (the Worker entry)
const src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
    try {
      if (path === "/api/health") return cors(json({ ok: true, timestamp: Date.now() }));
      if (path === "/go/whatsapp") return await handleWhatsAppRedirect(request, env);
      const cMatch = path.match(/^\/c\/([a-f0-9-]{36})$/);
      if (cMatch && request.method === "GET") return await handleConfirmPage(request, env, cMatch[1]);
      if (path === "/api/payments/wompi-webhook" && request.method === "POST") return cors(await handleWompiWebhook(request, env));
      const checkoutMatch = path.match(/^\/api\/leads\/([a-f0-9-]{36})\/checkout$/);
      if (checkoutMatch && request.method === "POST") return cors(await handleCreateCheckout(request, env, checkoutMatch[1]));
      if (path.startsWith("/api/auth/")) return cors(await handleAuth(request, env, ctx));
      if (path.startsWith("/api/client/")) return cors(await handleClient(request, env, ctx));
      if (path === "/api/leads") return cors(await handlePublicLeads(request, env, ctx));
      if (path.startsWith("/api/admin/leads") || path === "/api/admin/clicks") return cors(await handleAdminLeads(request, env, ctx));
      if (path.startsWith("/api/admin/")) return cors(await handleAdmin(request, env, ctx));
      if (path.startsWith("/api/files/")) return cors(await handleFiles(request, env, ctx));
      if (path.startsWith("/api/")) return cors(json({ error: "Not found" }, 404));
      // ─── mockup engine routes (added by graft) ───────────────────────────
      const __mockupResp = await handleMockups(request, env, ctx, { json, isAdmin, randomToken, uuid, sha256, escapeHtml });
      if (__mockupResp) return cors(__mockupResp);
      // SPA fallthrough
      return new Response(FRONTEND_HTML, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "Referrer-Policy": "strict-origin-when-cross-origin"
        }
      });
    } catch (err) {
      console.error("Worker error:", err, err.stack);
      return cors(json({ error: "Internal server error", detail: err.message }, 500));
    }
  }
};

export { src_default as default };

// ============================================================================
// INFERRED D1 SCHEMA  (no CREATE TABLE in worker source — schema is in migrations)
// ============================================================================
//
// CREATE TABLE clients (
//   id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, business_name TEXT,
//   status TEXT,                     -- 'invited' | 'in_progress' | 'submitted' | 'active'
//   language TEXT,                   -- 'en' | 'es'
//   plan TEXT,                       -- 'esencial' | 'pro' | NULL
//   site_url TEXT, site_health TEXT, -- JSON blob of last performSiteCheck()
//   deliverables_state TEXT,         -- JSON: { [key]: 'pending'|'in_progress'|'done'|'na' }
//   created_at INTEGER, updated_at INTEGER, submitted_at INTEGER,
//   invited_by TEXT
// );
//
// CREATE TABLE sessions (
//   token TEXT PRIMARY KEY, client_id TEXT NOT NULL, expires_at INTEGER, created_at INTEGER
// );  -- no FK declared; lookups join clients on client_id
//
// CREATE TABLE submissions (
//   id TEXT PRIMARY KEY, client_id TEXT NOT NULL, section TEXT NOT NULL,
//   data TEXT,                       -- JSON of section fields
//   updated_at INTEGER,
//   UNIQUE(client_id, section)       -- ON CONFLICT(client_id, section) is used in upserts
// );
//
// CREATE TABLE files (
//   id TEXT PRIMARY KEY, client_id TEXT NOT NULL,
//   category TEXT,                   -- 'logo'|'photo'|'reference'|'other'
//   filename TEXT, r2_key TEXT,      -- path in `pymewebpro-client-assets` R2 bucket
//   mime_type TEXT, size_bytes INTEGER, uploaded_at INTEGER
// );
//
// CREATE TABLE leads (
//   id TEXT PRIMARY KEY, source TEXT, name TEXT, email TEXT, phone TEXT,
//   business_name TEXT, message TEXT, language TEXT,
//   status TEXT,                     -- 'new'|'contacted'|'converted'|'dismissed'
//   plan TEXT, hosting TEXT,         -- 'annual'|'monthly'|'none'
//   notes TEXT, metadata TEXT,       -- JSON: utm_*, referrer, ip_hash, extra
//   converted_client_id TEXT,
//   created_at INTEGER, updated_at INTEGER
// );
//
// CREATE TABLE lead_clicks (
//   id TEXT PRIMARY KEY, kind TEXT,  -- 'whatsapp'
//   campaign TEXT, referrer TEXT, user_agent TEXT, ip_hash TEXT, created_at INTEGER
// );
//
// CREATE TABLE payments (
//   id TEXT PRIMARY KEY, lead_id TEXT NOT NULL,
//   reference TEXT UNIQUE,           -- "pwp-<leadId>-<base36-time>"
//   amount_cents INTEGER, currency TEXT,
//   plan TEXT, hosting TEXT, discount_applied INTEGER,
//   status TEXT,                     -- 'pending'|'approved'|'declined'|'voided'|'error'
//   wompi_transaction_id TEXT, raw_event TEXT, paid_at INTEGER,
//   created_at INTEGER, updated_at INTEGER
// );
//
// CREATE TABLE audit_log (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,  -- inferred; INSERT does not provide id
//   client_id TEXT, event TEXT, metadata TEXT, created_at INTEGER
// );
//
// ============================================================================
// BINDINGS expected (wrangler.toml)
// ============================================================================
//   env.DB              -- D1 database
//   env.TOKENS          -- KV namespace for `magic:<token>` and `rl:<key>` rate-limit counters
//   env.ASSETS          -- R2 bucket `pymewebpro-client-assets`
//   env.ADMIN_TOKEN     -- secret, compared vs Bearer header for /api/admin/*
//   env.ADMIN_EMAIL     -- recipient for new-lead / new-client / payment-approved notifications
//   env.APP_URL         -- e.g. https://portal.pymewebpro.com (used in magic links)
//   env.FROM_EMAIL      -- Resend "from" (defaults to portal@pymewebpro.com)
//   env.RESEND_API_KEY  -- Resend secret
//   env.WOMPI_PUBLIC_KEY, env.WOMPI_INTEGRITY  -- checkout signing
//   env.WOMPI_EVENTS    -- webhook signing secret
//   env.WHATSAPP_NUMBER -- digits-only phone for /go/whatsapp

