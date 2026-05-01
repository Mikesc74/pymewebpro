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
const VALID_SECTIONS = ["business", "contact", "brand", "visual", "content", "tech"];
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
const FRONTEND_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>PymeWebPro Portal</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>*{box-sizing:border-box}body{margin:0;background:#0a0e27;font-family:'Inter',sans-serif;color:#fff}.serif{font-family:'Cormorant Garamond',Georgia,serif}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}</style>
</head><body><div id="root"></div>
<script type="text/babel" data-presets="env,react">
// FULL React SPA elided in this recovery file (~1280 lines). Restore from deployed bundle.
// ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
</script></body></html>`;

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

