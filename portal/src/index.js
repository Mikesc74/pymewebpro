import FRONTEND_HTML from "./frontend.html";

// ============================================================================
// PymeWebPro portal Worker - source recovered from deployed bundle
// ============================================================================
// The original Worker source tree was lost. This file is reconstructed from the
// esbuild bundle returned by `wrangler deployments view` / `workers_get_worker_code`.
// The bundle was 4035 lines: lines 1-879 were unenv/@cloudflare/unenv-preset polyfills
// (Performance, console, hrtime, TTY streams, Process polyfill); those have been
// elided here as they're auto-generated and re-emitted on every deploy.'
//
// Below: every `// src/*.js` module from the bundle, in original order,
// followed by the worker's `export default { fetch }`.'
//
// Mockup engine module imported from a sibling file (added by graft):
import { handleMockups } from "./mockups.js";
// CRM module · spreadsheet-style admin grid for leads, clients, deals, activities.
// API:  /api/admin/crm/grid + /api/admin/crm/<table>[/<id>]
// Page: /admin/crm  (standalone HTML, not part of the React SPA)
import { handleAdminCRM, crmPageHTML } from "./crm.js";
import { handleSiteAuditAPI, siteAuditReportHTML } from "./site-audit.js";
// santi.pymewebpro.com · bilingual sales site for Santi to use with prospects.
import { santiPageHTML } from "./santi.js";
// Lead enrichment · Claude Haiku + web search to fill missing phone/email/socials.
import { handleEnrich } from "./enrich.js";
// Outbound prospecting loader · Google Places search -> dedupe -> bulk insert.
import { handleProspecting } from "./prospecting.js";
// Outreach drafter (Claude Haiku) + log-send + cadence queue.
//   POST /api/admin/outreach/draft     · Claude-generated WA or email draft
//   POST /api/admin/outreach/log-send  · records an outbound touch
//   GET  /api/admin/outreach/cadence   · D+1 / D+3 / D+7 / D+14_stale buckets
import { handleOutreach } from "./outreach.js";
// Wompi 30/70 deposit + balance link generator, plus webhook processors.
//   POST /api/admin/deals/:dealId/deposit-link   · 30% deposit Wompi URL
//   POST /api/admin/deals/:dealId/balance-link   · 70% balance Wompi URL
import { handleDepositLinks, processDepositPayment, processBalancePayment } from "./deposit-links.js";
// Chief of Staff · agente en español, widget flotante en cada página admin.
//   /api/admin/chief-of-staff/chat  -> backend Anthropic loop con tools CRM
//   CHIEF_OF_STAFF_WIDGET_HTML       -> snippet HTML inyectado antes de </body>
import { handleChiefOfStaff } from "./chief-of-staff.js";
import { CHIEF_OF_STAFF_WIDGET_HTML } from "./chief-of-staff-widget.js";
import { COS_LOADER_JS } from "./cos-loader.js";
// Proposal generator: builds a mockup HTML + printable proposal page when a
// deal moves to the "proposal" stage and the user confirms in the CRM modal.
//   POST /api/admin/proposals/:dealId/generate
//   GET  /proposal-mockup/:dealId
//   GET  /admin/proposal/:dealId
import { handleProposalRoutes } from "./proposal-generator.js";
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
  return withSecurityHeaders(new Response(response.body, { status: response.status, headers }));
}
// Apply baseline security headers to every Worker response.
// Mirrors the apex Cloudflare Pages config (_headers) so mockups.pymewebpro.com,
// portal.pymewebpro.com, and *.sites.pymewebpro.com emit the same protection
// regardless of which subdomain a fresh visitor lands on first.
function withSecurityHeaders(response, opts = {}) {
  const headers = new Headers(response.headers);
  const isHtml = (headers.get("Content-Type") || "").toLowerCase().startsWith("text/html");

  if (!headers.has("Strict-Transport-Security")) {
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  if (!headers.has("X-Content-Type-Options")) headers.set("X-Content-Type-Options", "nosniff");
  if (!headers.has("Referrer-Policy")) headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (!headers.has("Permissions-Policy")) {
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()");
  }
  if (!headers.has("Cross-Origin-Opener-Policy")) headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (!headers.has("Cross-Origin-Resource-Policy")) headers.set("Cross-Origin-Resource-Policy", "same-origin");

  // Strip ACAO from HTML responses · CORS is for API calls, not pages.
  if (isHtml && headers.get("Access-Control-Allow-Origin") === "*") {
    headers.delete("Access-Control-Allow-Origin");
    headers.delete("Access-Control-Allow-Methods");
    headers.delete("Access-Control-Allow-Headers");
  }
  // CSP for HTML responses. Inline script allowed because FRONTEND_HTML ships
  // a Babel-standalone React app inline; hashing it is impractical (every edit
  // changes the hash). frame-ancestors 'none' matches X-Frame-Options: DENY
  // set elsewhere; loosen to 'self' if admin SPA needs to iframe project portals.
  if (isHtml && !headers.has("Content-Security-Policy")) {
    headers.set("Content-Security-Policy", [
      "default-src 'self'",
      // Cloudflare Web Analytics auto-injects a beacon from static.cloudflareinsights.com;
      // allow it explicitly so the CSP doesn't flag it on every page load.
      "script-src 'self' 'unsafe-inline' https://unpkg.com https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      // The beacon POSTs back to cloudflareinsights.com; let it through connect-src too.
      "connect-src 'self' https://cloudflareinsights.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'"
    ].join("; "));
  }
  // X-Frame-Options is path-specific (admin SPA may iframe project portals); leave unset by default.
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
    console.warn("RESEND_API_KEY not set; skipping email send");
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
      <p style="color: rgba(255,255,255,0.4); font-size: 13px;">If the button doesn't work, copy this URL into your browser:<br><a href="${url}" style="color: #fbbf24; word-break: break-all;">${url}</a></p>'
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
  const altMatch = path.match(/^\/api\/client\/files\/([a-zA-Z0-9-]+)\/alt$/);
  if (altMatch && method === "PUT") return await updateFileAlt(request, session, env, altMatch[1]);
  if (path === "/api/client/project" && method === "GET") return await getClientProject(session, env);
  if (path === "/api/client/project/comment" && method === "POST") return await postClientComment(request, session, env);
  if (path === "/api/client/project/approve" && method === "POST") return await approveCurrentMockup(session, env);
  if (path === "/api/client/project/upgrade" && method === "POST") return await checkoutUpgrade(session, env);
  if (path === "/api/client/project/hosting" && method === "POST") return await checkoutHosting(request, session, env);
  return json({ error: "Not found" }, 404);
}

// ─── Customer project portal endpoints ─────────────────────────────────────
async function getClientProject(session, env) {
  const client = await env.DB.prepare("SELECT id, email, business_name, plan, status, language FROM clients WHERE id = ?")
    .bind(session.client_id).first();
  if (!client) return json({ error: "client not found" }, 404);

  // Latest mockup
  const mockup = await env.DB.prepare(
    "SELECT id, version, status, shipped_url, shipped_at, approved_at, created_at FROM mockups WHERE client_id = ? AND shipped_at IS NOT NULL ORDER BY version DESC LIMIT 1",
  ).bind(client.id).first();

  // Count of pushed-to-client mockups → revision rounds used.
  // Round 1 = initial push; round N>1 = revision pushes.
  const shippedCountRow = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM mockups WHERE client_id = ? AND shipped_at IS NOT NULL",
  ).bind(client.id).first();
  const shippedCount = shippedCountRow ? Number(shippedCountRow.n || 0) : 0;
  const isPro = client.plan === "pro" || client.plan === "crecimiento" || client.plan === "growth";
  const revisionsTotal = isPro ? 5 : 2;
  const revisionsUsed = Math.max(0, shippedCount - 1);  // first push is the initial, not a "revision"
  const revisionsRemaining = Math.max(0, revisionsTotal - revisionsUsed);

  // Comments thread (both directions: client + admin) · keyed to latest pushed mockup
  const commentsRes = mockup ? await env.DB.prepare(
    "SELECT id, body, author, created_at FROM mockup_comments WHERE mockup_id = ? ORDER BY created_at ASC",
  ).bind(mockup.id).all() : { results: [] };

  // Auto-mint a long-lived share link for in-portal preview if needed (60 days)
  let previewUrl = null;
  if (mockup) {
    let shareRow = await env.DB.prepare(
      "SELECT token, expires_at FROM mockup_shares WHERE mockup_id = ? AND revoked = 0 AND expires_at > ? ORDER BY expires_at DESC LIMIT 1",
    ).bind(mockup.id, Math.floor(Date.now()/1000)).first();
    if (!shareRow) {
      const token = randomToken(20);
      const expires = Math.floor(Date.now()/1000) + 60 * 86400;
      await env.DB.prepare(
        "INSERT INTO mockup_shares (token, mockup_id, expires_at) VALUES (?, ?, ?)",
      ).bind(token, mockup.id, expires).run();
      shareRow = { token, expires_at: expires };
    }
    previewUrl = `${env.APP_URL || "https://portal.pymewebpro.com"}/m/${shareRow.token}/`;
  }

  // Live site URL (if shipped) · custom domain wins; otherwise the included
  // <slug>.sites.pymewebpro.com tenant subdomain (clean, brandable, free).
  const live = await env.DB.prepare(
    "SELECT slug, custom_domain FROM live_sites WHERE client_id = ? AND r2_prefix != ''",
  ).bind(client.id).first();
  const liveUrl = live
    ? (live.custom_domain ? `https://${live.custom_domain}` : `https://${live.slug}.sites.pymewebpro.com/`)
    : null;

  // Derive state · mockup iframe only appears AFTER admin "Push to client" (shipped_at IS NOT NULL)
  let state = "intake_in_progress";
  if (client.status === "submitted") {
    if (!mockup) state = "waiting_for_mockup";       // 48h countdown shown
    else if (live && live.r2_prefix) state = "live";
    else if (mockup.approved_at) state = "approved_building";
    else state = "reviewing_mockup";
  } else if (client.status === "active" || (live && live.r2_prefix)) {
    state = "live";
  }

  return json({
    client,
    project: {
      state,
      submitted_at: client.submitted_at || null,           // ms epoch · front-end derives 48h countdown
      mockup: mockup ? { id: mockup.id, version: mockup.version, status: mockup.status, approved_at: mockup.approved_at, shipped_at: mockup.shipped_at, preview_url: previewUrl } : null,
      live_url: liveUrl,
      comments: commentsRes.results || [],
      revisions: { used: revisionsUsed, total: revisionsTotal, remaining: revisionsRemaining },
    },
    options: {
      can_upgrade: !isPro,
      upgrade_amount_cop: 300000,  // $390k → $690k
      hosting_monthly_cop: 30000,
      hosting_annual_cop: 270000,
    },
  });
}

async function postClientComment(request, session, env) {
  const body = await request.json().catch(() => ({}));
  const text = String(body.body || "").trim().slice(0, 4000);
  if (!text) return json({ error: "empty" }, 400);
  const mockup = await env.DB.prepare(
    "SELECT id FROM mockups WHERE client_id = ? ORDER BY version DESC LIMIT 1",
  ).bind(session.client_id).first();
  if (!mockup) return json({ error: "no mockup yet" }, 404);
  const id = uuid();
  await env.DB.prepare(
    "INSERT INTO mockup_comments (id, mockup_id, section, body, author) VALUES (?, ?, NULL, ?, 'client')",
  ).bind(id, mockup.id, text).run();
  // Notify admin
  if (env.ADMIN_EMAIL && env.RESEND_API_KEY) {
    sendEmail(env, {
      to: env.ADMIN_EMAIL,
      subject: `💬 Client comment: ${session.business_name || session.email}`,
      html: `<p>New comment in the client portal:</p><blockquote>${escapeHtml(text)}</blockquote><p><a href="${env.APP_URL}/admin/clients/${session.client_id}">Open client →</a></p>`,
    }).catch(() => {});
  }
  return json({ ok: true, id });
}

async function approveCurrentMockup(session, env) {
  const mockup = await env.DB.prepare(
    "SELECT id, version FROM mockups WHERE client_id = ? ORDER BY version DESC LIMIT 1",
  ).bind(session.client_id).first();
  if (!mockup) return json({ error: "no mockup yet" }, 404);
  await env.DB.prepare(
    "UPDATE mockups SET status = 'approved', approved_at = ? WHERE id = ?",
  ).bind(Math.floor(Date.now()/1000), mockup.id).run();

  // Auto-mark "Design approved by client" deliverable
  await env.DB.prepare(`
    UPDATE clients SET
      deliverables_state = json_patch(coalesce(deliverables_state, '{}'), ?)
    WHERE id = ?
  `).bind(JSON.stringify({ design_approved: { status: "done", note: "Approved by client v" + mockup.version } }), session.client_id).run().catch(() => {});

  if (env.ADMIN_EMAIL && env.RESEND_API_KEY) {
    sendEmail(env, {
      to: env.ADMIN_EMAIL,
      subject: `✓ Client approved mockup v${mockup.version}`,
      html: `<p>${escapeHtml(session.business_name || session.email)} approved the mockup. Ready to launch.</p><p><a href="${env.APP_URL}/admin/clients/${session.client_id}">Open client →</a></p>`,
    }).catch(() => {});
  }
  return json({ ok: true });
}

async function checkoutUpgrade(session, env) {
  if (!env.WOMPI_PUBLIC_KEY || !env.WOMPI_INTEGRITY) return json({ error: "Payments not configured" }, 503);
  const reference = `pwp-upg-${session.client_id}-${Date.now().toString(36)}`;
  const amountInCents = 300000 * 100;  // $300k delta
  const sig = await sha256(`${reference}${amountInCents}COP${env.WOMPI_INTEGRITY}`);
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO payments (id, lead_id, reference, amount_cents, currency, plan, hosting, status, created_at, updated_at)
     VALUES (?, '', ?, ?, 'COP', 'upgrade', 'none', 'pending', ?, ?)`
  ).bind(uuid(), reference, amountInCents, now, now).run();
  const params = new URLSearchParams({
    "public-key": env.WOMPI_PUBLIC_KEY,
    "currency": "COP",
    "amount-in-cents": String(amountInCents),
    "reference": reference,
    "signature:integrity": sig,
    "redirect-url": `${env.APP_URL}/?upgrade=back`,
  });
  return json({ ok: true, checkout_url: `https://checkout.wompi.co/p/?${params.toString()}`, reference });
}

async function checkoutHosting(request, session, env) {
  if (!env.WOMPI_PUBLIC_KEY || !env.WOMPI_INTEGRITY) return json({ error: "Payments not configured" }, 503);
  const body = await request.json().catch(() => ({}));
  const period = body.period === "monthly" ? "monthly" : "annual";
  const amount_cop = period === "annual" ? 270000 : 30000;
  const reference = `pwp-host-${period}-${session.client_id}-${Date.now().toString(36)}`;
  const amountInCents = amount_cop * 100;
  const sig = await sha256(`${reference}${amountInCents}COP${env.WOMPI_INTEGRITY}`);
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO payments (id, lead_id, reference, amount_cents, currency, plan, hosting, status, created_at, updated_at)
     VALUES (?, '', ?, ?, 'COP', 'hosting', ?, 'pending', ?, ?)`
  ).bind(uuid(), reference, amountInCents, period, now, now).run();
  const params = new URLSearchParams({
    "public-key": env.WOMPI_PUBLIC_KEY,
    "currency": "COP",
    "amount-in-cents": String(amountInCents),
    "reference": reference,
    "signature:integrity": sig,
    "redirect-url": `${env.APP_URL}/?hosting=back`,
  });
  return json({ ok: true, checkout_url: `https://checkout.wompi.co/p/?${params.toString()}`, reference });
}

async function updateFileAlt(request, session, env, fileId) {
  const body = await request.json().catch(() => ({}));
  const alt = String(body.alt_text || "").slice(0, 500);
  // Make sure the file belongs to this client (no cross-client edits)
  const row = await env.DB.prepare("SELECT id FROM files WHERE id = ? AND client_id = ?")
    .bind(fileId, session.client_id).first();
  if (!row) return json({ error: "File not found" }, 404);
  await env.DB.prepare("UPDATE files SET alt_text = ? WHERE id = ?").bind(alt, fileId).run();
  return json({ ok: true });
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
    "SELECT id, category, filename, mime_type, size_bytes, uploaded_at, alt_text FROM files WHERE client_id = ? ORDER BY uploaded_at DESC"
  ).bind(session.client_id).all();
  return json({ files: rows.results || [] });
}

// src/deliverables.js
const DELIVERABLES = [
  // SETUP
  { key: "setup_domain", group: "setup", plan: "esencial", label: "Domain configured and registered to client" },
  { key: "setup_dns", group: "setup", plan: "esencial", label: "DNS pointing to Cloudflare" },
  { key: "setup_ssl", group: "setup", plan: "esencial", label: "SSL / HTTPS certificate active" },
  { key: "setup_email_forward", group: "setup", plan: "esencial", label: "Email forwarding info@client.com → Gmail" },
  { key: "setup_hosting_year", group: "setup", plan: "pro", label: "1 year of hosting included, configured" },
  // DESIGN
  { key: "design_logo", group: "design", plan: "esencial", label: "Logo uploaded / prepared" },
  { key: "design_logo_refresh", group: "design", plan: "pro", label: "New logo or refresh designed (AI-assisted)" },
  { key: "design_brand_colors", group: "design", plan: "esencial", label: "Brand colors applied" },
  { key: "design_typography", group: "design", plan: "esencial", label: "Typography chosen and applied" },
  { key: "design_approved", group: "design", plan: "esencial", label: "Design approved by client" },
  // PAGES CORE
  { key: "page_home", group: "pages", plan: "esencial", label: "Home" },
  { key: "page_services", group: "pages", plan: "esencial", label: "Services / products" },
  { key: "page_about", group: "pages", plan: "esencial", label: "About us" },
  { key: "page_contact", group: "pages", plan: "esencial", label: "Contact" },
  { key: "page_location", group: "pages", plan: "esencial", label: "Location + map" },
  // PAGES EXTRA
  { key: "page_blog", group: "pages", plan: "pro", label: "Blog / News (client-publishable)" },
  { key: "page_gallery_pro", group: "pages", plan: "pro", label: "Extended gallery" },
  { key: "page_bookings", group: "pages", plan: "pro", label: "Bookings / scheduling" },
  { key: "page_reviews", group: "pages", plan: "pro", label: "Reviews / featured testimonials" },
  { key: "page_team", group: "pages", plan: "pro", label: "Team" },
  { key: "page_faq", group: "pages", plan: "pro", label: "FAQ" },
  // FEATURES
  { key: "feat_whatsapp_btn", group: "features", plan: "esencial", label: "WhatsApp button" },
  { key: "feat_google_map", group: "features", plan: "esencial", label: "Google Maps embedded" },
  { key: "feat_social_bar", group: "features", plan: "esencial", label: "Social bar (WhatsApp, IG, FB, Maps)" },
  { key: "feat_photo_gallery", group: "features", plan: "esencial", label: "Photo gallery" },
  { key: "feat_testimonials", group: "features", plan: "esencial", label: "Testimonials section" },
  { key: "feat_contact_form", group: "features", plan: "esencial", label: "Contact form + auto-confirmation" },
  { key: "feat_pdf_download", group: "features", plan: "pro", label: "Downloadable PDF (menu / catalog / spec sheet)" },
  { key: "feat_email_capture", group: "features", plan: "pro", label: "Email capture (newsletter / promos)" },
  { key: "feat_wa_catalog", group: "features", plan: "pro", label: "WhatsApp Business catalog linked" },
  { key: "feat_booking_system", group: "features", plan: "pro", label: "Integrated booking system" },
  { key: "feat_bilingual", group: "features", plan: "pro", label: "Bilingual ES + EN version" },
  // SEO & ANALYTICS
  { key: "seo_meta_tags", group: "seo", plan: "esencial", label: "Meta tags optimized per page" },
  { key: "seo_sitemap", group: "seo", plan: "esencial", label: "Automatic sitemap.xml" },
  { key: "seo_robots", group: "seo", plan: "esencial", label: "robots.txt configured" },
  { key: "seo_indexed", group: "seo", plan: "esencial", label: "Indexed on Google (≤7 days)" },
  { key: "seo_search_console", group: "seo", plan: "esencial", label: "Google Search Console set up" },
  { key: "seo_analytics", group: "seo", plan: "esencial", label: "Google Analytics 4 installed" },
  { key: "seo_structured_data", group: "seo", plan: "pro", label: "Structured data (Schema.org)" },
  { key: "seo_gbp", group: "seo", plan: "pro", label: "Google Business Profile verified" },
  { key: "seo_meta_pixel", group: "seo", plan: "pro", label: "Meta Pixel installed" },
  { key: "seo_ga4_goals", group: "seo", plan: "pro", label: "GA4 conversion goals" },
  { key: "seo_speed", group: "seo", plan: "pro", label: "Speed <1s / Core Web Vitals" },
  // CLOSEOUT
  { key: "close_training", group: "close", plan: "esencial", label: "Client training (30 min)" },
  { key: "close_handover", group: "close", plan: "esencial", label: "Documentation delivered" },
  { key: "close_support_active", group: "close", plan: "esencial", label: "WhatsApp support active" },
  { key: "close_revisions", group: "close", plan: "esencial", label: "Revision rounds completed" }
];
const GROUP_LABELS = {
  setup: "Technical setup", design: "Design & branding", pages: "Sections",
  features: "Features", seo: "SEO + Analytics", close: "Closeout & handover"
};
const STATUS_LABELS = {
  pending: { label: "Pending", color: "#94a3b8", icon: "○" },
  in_progress: { label: "In progress", color: "#fbbf24", icon: "◐" },
  done: { label: "Done", color: "#10b981", icon: "✓" },
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
  const previewSessionMatch = path.match(/^\/api\/admin\/clients\/([a-f0-9-]+)\/preview-session$/);
  if (previewSessionMatch && method === "POST") return await mintPreviewSession(env, previewSessionMatch[1]);
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
  // Internal sections (prefixed with _, e.g. _revision_notes) are workflow metadata
  // and contain nested objects · don't expose them to the SPA, which renders flat.
  for (const row of submissions.results || []) {
    if (row.section && row.section.startsWith("_")) continue;
    sections[row.section] = { data: JSON.parse(row.data), updated_at: row.updated_at };
  }
  const files = await env.DB.prepare("SELECT id, category, filename, r2_key, mime_type, size_bytes, uploaded_at, alt_text FROM files WHERE client_id = ? ORDER BY uploaded_at DESC").bind(id).all();
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
  // Attach the custom domain (and live-site slug, if any) so the admin DomainPanel can show state.
  const liveSite = await env.DB.prepare(
    "SELECT slug, custom_domain, r2_prefix, disabled_at FROM live_sites WHERE client_id = ?"
  ).bind(id).first();
  if (liveSite) {
    client.custom_domain = liveSite.custom_domain || null;
    client.live_slug = liveSite.slug || null;
    client.live_published = !!(liveSite.r2_prefix && liveSite.r2_prefix.length > 0);
    client.live_disabled = !!liveSite.disabled_at;
  }
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
// Mints a 24h session token in D1 for the given client and returns a URL the
// admin can open to view the portal AS that client (no email round-trip).
async function mintPreviewSession(env, id) {
  const client = await env.DB.prepare("SELECT id FROM clients WHERE id = ?").bind(id).first();
  if (!client) return json({ error: "Client not found" }, 404);
  const token = randomToken(24);
  const now = Date.now();
  const expires = now + 24 * 3600 * 1000;  // 24h
  await env.DB.prepare(
    "INSERT INTO sessions (token, client_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
  ).bind(token, id, expires, now).run();
  await logEvent(env, id, "admin_preview_session_minted");
  const url = `${env.APP_URL || "https://portal.pymewebpro.com"}/?session=${token}`;
  return json({ ok: true, url, expires_at: expires });
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
    <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">You've been invited to the PymeWebPro client portal. Click below to begin filling in your project details · logos, brand colors, content, and assets.</p>
    <a href="${url}" style="display: inline-block; background: #fbbf24; color: #0a0e27; padding: 14px 32px; text-decoration: none; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 2px; margin: 24px 0;">Open Portal</a>
    <p style="color: rgba(255,255,255,0.4); font-size: 13px;">This link is valid for 7 days. After that, request a new one from the login page.</p>
  </div>`;
}
function inviteEmailEs(url, bizName) {
  return `<div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #0a0e27; color: #fff;">
    <h1 style="font-style: italic; color: #fbbf24;">PymeWebPro</h1>
    <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">${bizName ? `Hola ${bizName},` : "Hola,"}</p>
    <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">Le invitamos al portal de clientes PymeWebPro. Haga clic abajo para completar los detalles de su proyecto · logos, colores, contenido y activos.</p>
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
const VALID_CATEGORIES = ["logo", "photo", "reference", "pdf", "other"];
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
const VALID_SOURCES = ["contact_form", "whatsapp_click", "manual", "whatsapp_message", "outbound"];
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
// Spam heuristic for the public lead form. Returns a short reason string if
// the submission looks like a bot / scam · null if it looks legit.
function looksLikeSpam(fields) {
  const haystack = [fields.name, fields.email, fields.businessName, fields.message, fields.phone]
    .filter(Boolean).join(" ").toLowerCase();
  if (!haystack) return null;
  // Suspicious domains seen in real spam (graph.org, telegra.ph, t.me etc).
  const badDomains = ["graph.org", "telegra.ph", "t.me/", "tinyurl", "bit.ly", "is.gd", "rebrand.ly", ".ru/", ".xyz/"];
  for (const d of badDomains) if (haystack.includes(d)) return "bad_domain:" + d;
  // Crypto / scam keywords.
  const badWords = [
    "withdrawal process", "withdrawal-process", "withdraw your", "btc reward",
    "usdt", "metamask", "seed phrase", "private key", "airdrop",
    "earn $", "claim your", "you have received", "wire transfer",
    "investment opportunity", "guaranteed return",
  ];
  for (const w of badWords) if (haystack.includes(w)) return "bad_word:" + w;
  // Emoji-heavy submissions (real users rarely lead with rocket+chart emojis).
  const emojiCount = (haystack.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
  if (emojiCount >= 3) return "emoji_spam";
  // URLs in name / business name are always spam.
  if (/^https?:\/\//.test(fields.name || "")) return "url_in_name";
  if (/^https?:\/\//.test(fields.businessName || "")) return "url_in_business";
  // Disposable / obviously fake email domains.
  const email = (fields.email || "").toLowerCase();
  if (/@(ship79|mail-tester|guerrillamail|sharklasers|throwaway|temp-mail|10minute)/.test(email)) return "disposable_email";
  return null;
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
  // Spam filter. Rejects crypto-scam / withdrawal / phishing bot submissions
  // that hit the public contact form. Logged in metadata so we know it tripped.
  const spamCheck = looksLikeSpam({ name, email, businessName, message, phone });
  if (spamCheck) {
    console.log("Lead spam blocked:", spamCheck, { email });
    // Return 200 so spam bots can't probe which filters tripped them.
    return json({ ok: true });
  }
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
    <h2 style="font-style: italic; color: #fbbf24; margin-top: 0;">New lead: ${sourceLabel}</h2>
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
    <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">Thanks for reaching out. We've set up your client portal. Click below to share your project details (logos, brand colors, content, and assets).</p>'
    <a href="${url}" style="display: inline-block; background: #fbbf24; color: #0a0e27; padding: 14px 32px; text-decoration: none; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 2px; margin: 24px 0;">Open Portal</a>
    <p style="color: rgba(255,255,255,0.4); font-size: 13px;">This link is valid for 7 days.</p>
  </div>`;
}
function convertedInviteEs(url, bizName) {
  return `<div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #0a0e27; color: #fff;">
    <h1 style="font-style: italic; color: #fbbf24;">PymeWebPro</h1>
    <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">${bizName ? `Hola ${escapeHtml(bizName)},` : "Hola,"}</p>
    <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">Gracias por su interés. Hemos preparado su portal de cliente. Haga clic abajo para compartir los detalles de su proyecto.</p>
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
  // Esencial = $390k flat (includes 1 month free, monthly billing starts later).
  // Pro + annual = bundled (1 year hosting included).
  // Hosting is never charged at /start/ checkout for Esencial · buyer can
  // upgrade to annual via /hosting after the first month.
  const hostingBundled = (plan === "esencial") || (plan === "pro" && hosting === "annual");
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

  // Require encargado-del-tratamiento authorization (Ley 1581 cover for us as data processor)
  let body = {};
  try { body = await request.json(); } catch (_) {}
  if (!body || body.authorization_accepted !== true) {
    return json({ error: "Antes de pagar debe aceptar la autorización legal." }, 400);
  }
  const clauseVersion = String(body.clause_version || ENCARGADO_CLAUSE_VERSION);
  const clauseTextHash = await sha256(
    (lead.language === "en") ? ENCARGADO_CLAUSE_EN : ENCARGADO_CLAUSE_ES
  );
  const ip = request.headers.get("cf-connecting-ip") || "";
  const ipHash = ip ? (await sha256(ip)).slice(0, 32) : null;
  const userAgent = (request.headers.get("user-agent") || "").slice(0, 250);
  await env.DB.prepare(
    "INSERT INTO data_processor_authorizations (id, lead_id, email, clause_version, clause_text_hash, ip_hash, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).bind(uuid(), leadId, lead.email || "", clauseVersion, clauseTextHash, ipHash, userAgent).run();
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
  if (newStatus === "approved") {
    // Branch on reference prefix first (deposit / balance), then fall back to
    // the legacy plan-based routing for upgrades, hosting, and full-price.
    const ref = String(payment.reference || "");
    if (ref.startsWith("pwp-dep-")) {
      await processDepositPayment(env, payment);
    } else if (ref.startsWith("pwp-bal-")) {
      await processBalancePayment(env, payment);
    } else if (payment.plan === "upgrade") {
      await processUpgradePayment(env, payment);
    } else if (payment.plan === "hosting") {
      await processHostingPayment(env, payment);
    } else {
      await convertLeadOnApproval(env, payment);
    }
  }
  return json({ ok: true, status: newStatus });
}

// Upgrade payment (Esencial → Crecimiento). Reference format: pwp-upg-<clientId>-<rand>
async function processUpgradePayment(env, payment) {
  // Extract client_id from the reference
  const m = String(payment.reference || "").match(/^pwp-upg-([a-f0-9-]+)-/);
  if (!m) { console.warn("upgrade payment reference malformed", payment.reference); return; }
  const clientId = m[1];
  const client = await env.DB.prepare("SELECT id, email, business_name, plan FROM clients WHERE id = ?").bind(clientId).first();
  if (!client) return;
  if (client.plan === "pro") return; // already upgraded · idempotent

  await env.DB.prepare("UPDATE clients SET plan = 'pro', updated_at = ? WHERE id = ?")
    .bind(Date.now(), clientId).run();
  await logEvent(env, clientId, "plan_upgraded", { payment_id: payment.id, amount_cents: payment.amount_cents });

  // Email customer
  if (client.email && env.RESEND_API_KEY) {
    sendEmail(env, {
      to: client.email,
      subject: "Plan actualizado a Crecimiento ✓",
      html: `<div style="font-family:system-ui;max-width:540px;margin:0 auto;padding:24px;color:#0a1840">
        <h1 style="font-family:Georgia,serif">¡Su plan se actualizó a Crecimiento!</h1>
        <p>Ahora su sitio incluye las secciones extra (blog, galería ampliada, descargas en PDF, equipo y FAQ), versión bilingüe español + inglés (la traducción la hacemos nosotros), 1 año de hosting incluido y 5 rondas de cambios en total.</p>
        <p>En las próximas horas regeneraremos su mockup con las nuevas funciones y le compartiremos el nuevo enlace de revisión.</p>
        <p>Equipo PymeWebPro</p>
      </div>`,
    }).catch(() => {});
  }
  // Email admin to regen
  if (env.ADMIN_EMAIL) {
    sendEmail(env, {
      to: env.ADMIN_EMAIL,
      subject: `🆙 Upgrade paid: regenerate mockup for ${client.business_name || client.email}`,
      html: `<p><strong>${escapeHtml(client.business_name || client.email)}</strong> paid the upgrade to Growth.</p>
        <p>Plan in DB: <code>pro</code>. <a href="${env.APP_URL}/admin/clients/${clientId}">Open client</a> and click "Generate new version".</p>`,
    }).catch(() => {});
  }
}

// Hosting payment. Reference: pwp-host-<period>-<clientId>-<rand>
// period in {monthly, annual}
async function processHostingPayment(env, payment) {
  const m = String(payment.reference || "").match(/^pwp-host-(monthly|annual)-([a-f0-9-]+)-/);
  if (!m) { console.warn("hosting payment reference malformed", payment.reference); return; }
  const period = m[1];
  const clientId = m[2];
  const client = await env.DB.prepare("SELECT id, email, business_name, hosting_expires_at FROM clients WHERE id = ?").bind(clientId).first();
  if (!client) return;

  // Extend from MAX(now, current expiry) to avoid skipping time when paying early
  const now = Math.floor(Date.now() / 1000);
  const start = Math.max(now, client.hosting_expires_at || 0);
  const days = period === "annual" ? 365 : 30;
  const newExpiry = start + days * 86400;

  await env.DB.prepare("UPDATE clients SET hosting_expires_at = ?, hosting_period = ?, updated_at = ? WHERE id = ?")
    .bind(newExpiry, period, Date.now(), clientId).run();
  await logEvent(env, clientId, "hosting_paid", { payment_id: payment.id, period, expires_at: newExpiry, amount_cents: payment.amount_cents });

  // Mirror into the legacy hosting_payments table (different schema · has wompi_reference UNIQUE).
  // This is best-effort historical bookkeeping; the canonical record is in `payments` + `clients.hosting_expires_at`.
  try {
    await env.DB.prepare(
      `INSERT INTO hosting_payments (id, wompi_reference, wompi_transaction_id, customer_email, amount_cents, plan, status, created_at, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, ?)`
    ).bind(uuid(), payment.reference, payment.wompi_transaction_id || null, client.email, payment.amount_cents, period === "annual" ? "anual" : "mensual", payment.created_at || Date.now(), now).run();
  } catch (e) { /* row may already exist on retry; ignore */ }

  // Email customer
  if (client.email && env.RESEND_API_KEY) {
    const periodLabel = period === "annual" ? "anual" : "mensual";
    const expiresStr = new Date(newExpiry * 1000).toLocaleDateString("es-CO");
    sendEmail(env, {
      to: client.email,
      subject: "Plan Hosting activo ✓",
      html: `<div style="font-family:system-ui;max-width:540px;margin:0 auto;padding:24px;color:#0a1840">
        <h1 style="font-family:Georgia,serif">¡Su Plan Hosting (${periodLabel}) está activo!</h1>
        <p>Vigencia hasta: <strong>${expiresStr}</strong></p>
        <p>Esto incluye: hospedaje administrado, certificado SSL, copias de seguridad, monitoreo y cambios mensuales incluidos. Cancele cuando quiera, sin contrato.</p>
        <p>Equipo PymeWebPro</p>
      </div>`,
    }).catch(() => {});
  }
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
    const subject = lang === "es" ? "Pago recibido: empecemos su sitio web" : "Payment received: let's start your site";
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
          <p><strong>${businessName || "(no business)"}</strong> · ${lead.email}</p>
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
// Encargado-del-tratamiento clause shown at checkout. Versioned so we can prove
// later exactly what wording each customer accepted.
const ENCARGADO_CLAUSE_VERSION = "v1.0-2026-04-30";
const ENCARGADO_CLAUSE_ES = `Autorizo a PymeWebPro (operado por NSC, NIT registrado en Colombia) a actuar como Encargado del Tratamiento de los datos personales que mi sitio web reciba de sus visitantes (formularios de contacto, suscripciones a newsletter, datos de analítica) bajo la Ley 1581 de 2012. Como Responsable del Tratamiento, asumo las obligaciones legales frente a los titulares y autorizo a PymeWebPro a procesar dichos datos en mi nombre, almacenarlos en servidores seguros (Cloudflare), y transferirlos cuando sea necesario para prestar el servicio. PymeWebPro guardará confidencialidad y aplicará medidas razonables de seguridad. Esta autorización puedo revocarla cancelando mi suscripción al servicio.`;
const ENCARGADO_CLAUSE_EN = `I authorize PymeWebPro (operated by NSC, registered in Colombia) to act as Data Processor for the personal data my website receives from its visitors (contact forms, newsletter subscriptions, analytics data) under Colombian Law 1581 of 2012. As Data Controller, I assume legal obligations toward data subjects and authorize PymeWebPro to process such data on my behalf, store it on secure servers (Cloudflare), and transfer it when necessary to provide the service. PymeWebPro will maintain confidentiality and apply reasonable security measures. I may revoke this authorization by cancelling my service subscription.`;

function confirmationHtml({ lead, quote, lang, lastPayment, justReturned }) {
  // Local alias · body uses esc() throughout; the worker-level helper is escapeHtml
  const esc = escapeHtml;
  const isEs = lang !== "en";
  if (lastPayment && lastPayment.status === "approved") return statusPage({ title: isEs ? "¡Pago recibido!" : "Payment received!", body: isEs ? "Le enviamos un correo con el enlace para empezar su proyecto." : "Check your email for the link to start your project.", color: "#10b981", icon: "✓" });
  if (justReturned && lastPayment && lastPayment.status === "pending") return statusPage({ title: isEs ? "Pago en proceso" : "Payment processing", body: isEs ? "Estamos esperando confirmación de Wompi." : "Waiting for confirmation from Wompi.", color: "#fbbf24", icon: "⏳" });
  if (!quote.chargeable) return statusPage({ title: isEs ? "Plan no seleccionado" : "No plan selected", body: "", color: "#fbbf24", icon: "?", showWa: true });

  const t = isEs ? {
    title: "Confirme su plan", subtitle: "Listo para arrancar, falta un paso.",
    plan: "Plan", hosting: "Hosting", discount: "Descuento de lanzamiento",
    total: "Total a pagar", iva: "IVA incluido",
    securePay: "Pago seguro vía Wompi (Bancolombia)", credit: "Tarjeta · Nequi · PSE · cuotas",
    installments: "Puede diferir el pago en 3, 6 o más cuotas con tarjeta de crédito. La disponibilidad y número de cuotas dependen de su banco.",
    authTitle: "Autorización legal (obligatoria)",
    authIntro: "Antes de proceder, por favor lea y acepte la siguiente cláusula. Sin esta autorización no podemos procesar legalmente los datos que su sitio web reciba de sus clientes.",
    authCheckbox: "He leído y acepto la cláusula anterior.",
    fullPrivacy: "Ver Política de Privacidad de PymeWebPro",
    payBtn: "Pagar con Wompi", paying: "Cargando…",
    helpWa: "¿Preguntas? Escríbanos por WhatsApp",
    needHelp: "¿No es lo correcto? Contáctenos por WhatsApp y le ayudamos.",
  } : {
    title: "Confirm your plan", subtitle: "One step away from getting started.",
    plan: "Plan", hosting: "Hosting", discount: "Launch discount",
    total: "Total", iva: "VAT included",
    securePay: "Secure payment via Wompi (Bancolombia)", credit: "Card · Nequi · PSE · installments",
    installments: "You can split payment into 3, 6 or more credit-card installments. Availability and number of installments depend on your bank.",
    authTitle: "Legal authorization (required)",
    authIntro: "Before proceeding, please read and accept the following clause. Without this authorization we can't legally process the visitor data your site will collect.",
    authCheckbox: "I've read and accept the clause above.",
    fullPrivacy: "View PymeWebPro's Privacy Policy",
    payBtn: "Pay with Wompi", paying: "Loading…",
    helpWa: "Questions? Message us on WhatsApp",
    needHelp: "Not what you expected? Contact us on WhatsApp and we'll help.",
  };
  const clause = isEs ? ENCARGADO_CLAUSE_ES : ENCARGADO_CLAUSE_EN;

  return `<!DOCTYPE html><html lang="${esc(lang)}"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t.title)} · PymeWebPro</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:linear-gradient(135deg,#0a0e27 0%,#1a1d3a 50%,#2d1b4e 100%);color:#fff;min-height:100vh;line-height:1.55}
.serif{font-family:'Cormorant Garamond',Georgia,serif}
.wrap{max-width:640px;margin:0 auto;padding:40px 20px}
.brand{display:flex;align-items:center;gap:.5rem;margin-bottom:30px}.brand-spark{color:#fbbf24}
.title{font-size:2.4rem;font-style:italic;font-weight:400;margin:0 0 6px;letter-spacing:-.01em}
.subtitle{color:rgba(255,255,255,0.6);margin:0 0 30px}
.card{background:rgba(255,255,255,0.04);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:28px;margin-bottom:18px}
.row{display:flex;justify-content:space-between;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.06)}
.row:last-child{border-bottom:0;padding-bottom:0}
.row .lbl{color:rgba(255,255,255,0.6)}.row .val{font-weight:600}
.total{margin-top:14px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.15);display:flex;justify-content:space-between;align-items:baseline}
.total .lbl{font-size:.85rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,0.6)}
.total .val{font-size:2rem;font-style:italic;color:#fbbf24}
.iva{font-size:.8rem;color:rgba(255,255,255,0.45);margin-top:4px}
.discount-row{color:#10b981}
.installments{font-size:.78rem;color:rgba(255,255,255,0.5);margin-top:14px;padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:4px}
.auth h3{margin:0 0 8px;font-size:1rem;color:#fbbf24;letter-spacing:.1em;text-transform:uppercase}
.auth-intro{font-size:.9rem;color:rgba(255,255,255,0.65);margin:0 0 14px}
.clause{font-size:.85rem;line-height:1.65;background:rgba(0,0,0,0.25);padding:16px 18px;border-radius:4px;color:rgba(255,255,255,0.85);margin-bottom:14px;max-height:240px;overflow-y:auto}
.check-row{display:flex;align-items:flex-start;gap:.7rem;cursor:pointer;padding:10px 0}
.check-row input{margin-top:3px;width:18px;height:18px;cursor:pointer;accent-color:#fbbf24}
.check-row span{font-size:.9rem;color:rgba(255,255,255,0.85)}
.policy-link{font-size:.8rem;color:#fbbf24;text-decoration:none;display:inline-block;margin-top:10px}
.pay-btn{width:100%;background:#fbbf24;color:#0a0e27;border:0;padding:18px 24px;border-radius:4px;font-family:inherit;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-size:.95rem;cursor:pointer;margin-top:10px}
.pay-btn:disabled{opacity:.35;cursor:not-allowed}
.pay-btn:not(:disabled):hover{filter:brightness(1.08)}
.trust{display:flex;align-items:center;justify-content:center;gap:1rem;margin-top:20px;color:rgba(255,255,255,0.45);font-size:.78rem;flex-wrap:wrap}
.wa-help{display:block;text-align:center;margin-top:24px;color:rgba(255,255,255,0.6);font-size:.85rem}
.wa-help a{color:#fbbf24;text-decoration:none;font-weight:600}
.err{padding:10px 14px;background:rgba(252,165,165,0.1);border:1px solid rgba(252,165,165,0.3);color:#fca5a5;border-radius:4px;margin-top:12px;font-size:.85rem;display:none}
</style>
</head><body>
<div class="wrap">
  <div class="brand"><span class="brand-spark">✦</span><span class="serif" style="font-style:italic;font-size:1.2rem">Pyme<span style="color:#fbbf24">WebPro</span></span></div>
  <h1 class="serif title">${esc(t.title)}</h1>
  <p class="subtitle">${esc(t.subtitle)}</p>

  <div class="card">
    <div class="row"><span class="lbl">${esc(t.plan)}</span><span class="val">${esc(planLabel(quote.plan, lang))}</span></div>
    <div class="row"><span class="lbl">${esc(t.hosting)}</span><span class="val">${esc(hostingLabel(quote.hosting, lang))}${quote.hosting_bundled ? ` <small style="color:#10b981">(${isEs ? "incluido" : "included"})</small>` : ""}</span></div>
    ${quote.discount_active ? `<div class="row discount-row"><span class="lbl">${esc(t.discount)}</span><span class="val">−${esc(formatCop(quote.discount_cop))} COP</span></div>` : ""}
    <div class="total">
      <div><div class="lbl">${esc(t.total)}</div><div class="iva">${esc(t.iva)}</div></div>
      <div class="val">${esc(formatCop(quote.total_cop))} COP</div>
    </div>
    <div class="installments">${esc(t.installments)}</div>
  </div>

  <div class="card auth">
    <h3>${esc(t.authTitle)}</h3>
    <p class="auth-intro">${esc(t.authIntro)}</p>
    <div class="clause">${esc(clause)}</div>
    <label class="check-row">
      <input type="checkbox" id="authBox" />
      <span>${esc(t.authCheckbox)}</span>
    </label>
    <a class="policy-link" href="https://pymewebpro.com/politica-de-datos.html" target="_blank" rel="noopener">${esc(t.fullPrivacy)} →</a>
  </div>

  <button id="payBtn" class="pay-btn" disabled>${esc(t.payBtn)} · ${esc(formatCop(quote.total_cop))} COP</button>
  <div class="err" id="errBox"></div>

  <div class="trust">
    <span>🔒 ${esc(t.securePay)}</span>
    <span>${esc(t.credit)}</span>
  </div>

  <div class="wa-help">
    ${esc(t.needHelp)}<br>
    <a href="/go/whatsapp?campaign=confirm_help">${esc(t.helpWa)} →</a>
  </div>
</div>
<script>
(function(){
  const box = document.getElementById('authBox');
  const btn = document.getElementById('payBtn');
  const err = document.getElementById('errBox');
  const tPaying = ${JSON.stringify(t.paying)};
  const tPay = ${JSON.stringify(t.payBtn + " · " + formatCop(quote.total_cop) + " COP")};
  box.addEventListener('change', function(){ btn.disabled = !box.checked; });
  btn.addEventListener('click', async function(){
    if (!box.checked) return;
    btn.disabled = true; btn.textContent = tPaying; err.style.display = 'none';
    try {
      const r = await fetch((window.PWP_BASE || '') + '/api/leads/${esc(lead.id)}/checkout', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ authorization_accepted: true, clause_version: ${JSON.stringify(ENCARGADO_CLAUSE_VERSION)} })
      });
      const j = await r.json();
      if (!r.ok || !j.checkout_url) throw new Error(j.error || 'No se pudo crear el checkout');
      location.href = j.checkout_url;
    } catch (e) {
      err.textContent = e.message;
      err.style.display = 'block';
      btn.disabled = false;
      btn.textContent = tPay;
    }
  });
})();
</script>
</body></html>`;
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
// FRONTEND_HTML moved to src/frontend.html and imported at the top of this file.
// See CLAUDE.md Recent changes 2026-05-19 (later x11) for the migration rationale.

// src/index.js  (the Worker entry)
//
// Master portal subpath note (2026-05-13):
// This worker also serves colguides.com/portal/pymewebpro/* as one tile of
// the master portal at colguides.com/portal. When a request arrives on that
// host+prefix, we strip "/portal/pymewebpro" from url.pathname before the
// router sees it, then rewrite outbound HTML/redirects via
// rewriteForPwpSubpath() so the prefix stays in the user's URL bar. The
// SPA reads window.PWP_BASE (injected into the HTML shell) to know its
// mount path for fetch() calls and history.pushState. See README +
// CLAUDE.md.
const src_default = {
  async fetch(originalRequest, env, ctx) {
    const PWP_BASE = "/portal/pymewebpro";
    const origUrl = new URL(originalRequest.url);
    const isColguidesPwp = (origUrl.hostname === "colguides.com" || origUrl.hostname === "www.colguides.com")
      && (origUrl.pathname === PWP_BASE || origUrl.pathname.startsWith(PWP_BASE + "/"));

    let request = originalRequest;
    if (isColguidesPwp) {
      const newUrl = new URL(origUrl);
      newUrl.pathname = origUrl.pathname.slice(PWP_BASE.length) || "/";
      request = new Request(newUrl.toString(), originalRequest);
    }

    let __pwpResponse = await (async () => {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
    // santi.pymewebpro.com: bilingual sales site for Santi. Single self-contained
    // HTML page. Anything other than GET on this host returns 405. Robots/health
    // requests get a tiny txt response.
    if (url.hostname === "santi.pymewebpro.com") {
      if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
      if (path === "/robots.txt") return new Response("User-agent: *\nAllow: /\n", { headers: { "Content-Type": "text/plain" } });
      return withSecurityHeaders(new Response(santiPageHTML(), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
      }));
    }
    try {
      if (path === "/api/health") return cors(json({ ok: true, timestamp: Date.now() }));
      // ─── Public Chief of Staff loader script ─────────────────────────
      // Served at /cos-widget.js (and the master-portal-prefixed equivalent).
      // No auth needed for the script itself; the chat endpoint it calls
      // requires Bearer ADMIN_TOKEN. Every portal page includes this with
      // <script src="https://colguides.com/portal/pymewebpro/cos-widget.js" defer></script>
      if (path === "/cos-widget.js" && request.method === "GET") {
        return new Response(COS_LOADER_JS, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
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
      // ─── Traffic analytics proxy (admin-only) ─────────────────────────
      // Lets the master-portal launcher fetch live Cloudflare analytics for
      // the public sites without ever exposing the COS_SHARED_SECRET to the
      // browser. Auth: same Bearer ADMIN_TOKEN as the rest of /api/admin/*.
      // Backend: calls Catalina's /api/agent dispatch on behalf of the user.
      if (path.startsWith("/api/admin/traffic/") && request.method === "GET") {
        if (!isAdmin(request, env)) return cors(json({ error: "Unauthorized" }, 401));
        return cors(await handleTrafficProxy(request, env, path, url));
      }
      // CRM API. Must run BEFORE the /api/admin/* catch-all because it has its own table-aware routing.
      if (path.startsWith("/api/admin/crm")) return cors(await handleAdminCRM(request, env, { json, isAdmin, uuid }));
      // Site audit API · used by the header "Test a site" button to produce a PDF-ready report.
      if (path === "/api/admin/site-audit") return cors(await handleSiteAuditAPI(request, env, { json, isAdmin }));
      // Lead enrichment endpoints · same auth pattern, runs before the catch-all.
      if (path.startsWith("/api/admin/enrich")) return cors(await handleEnrich(request, env, ctx, { json, isAdmin }));
      // Outbound prospecting · Google Places search + dedupe + bulk insert. Admin-only.
      if (path.startsWith("/api/admin/prospecting")) return cors(await handleProspecting(request, env, ctx, { json, isAdmin, uuid }));
      // Outreach drafter + cadence queue (Claude-generated WA/email + follow-up buckets). Admin-only.
      if (path.startsWith("/api/admin/outreach")) {
        return cors(await handleOutreach(request, env, ctx, { json, isAdmin, uuid }));
      }
      // Wompi deposit + balance link generator for the 30/70 split. Admin-only.
      if (path.match(/^\/api\/admin\/deals\/[^/]+\/(deposit|balance)-link$/)) {
        return cors(await handleDepositLinks(request, env, ctx, { json, isAdmin, uuid }));
      }
      // Chief of Staff agent. Must run BEFORE the /api/admin/* catch-all.
      if (path.startsWith("/api/admin/chief-of-staff")) return cors(await handleChiefOfStaff(request, env, { json, isAdmin, uuid }));
      // Proposal generator routes (POST generate + GET mockup/proposal pages).
      // The handler returns null if the path doesn't belong to it.
      {
        const __propResp = await handleProposalRoutes(request, env, { json, isAdmin, escapeHtml });
        if (__propResp) return cors(__propResp);
      }
      // ─── mockup engine routes (must run BEFORE the /api/admin/* and /api/* catch-alls) ───
      const __mockupResp = await handleMockups(request, env, ctx, { json, isAdmin, randomToken, uuid, sha256, escapeHtml });
      if (__mockupResp) return cors(__mockupResp);
      if (path.startsWith("/api/admin/")) return cors(await handleAdmin(request, env, ctx));
      if (path.startsWith("/api/files/")) return cors(await handleFiles(request, env, ctx));
      if (path.startsWith("/api/")) return cors(json({ error: "Not found" }, 404));
      // CRM is a tab inside the admin SPA. The SPA loads the CRM via an iframe
      // pointing to /admin/crm?embed=1, which serves the standalone CRM HTML.
      // Direct visits to /admin/crm (no query) fall through to the SPA, which
      // then opens the CRM tab automatically.
      if ((path === "/admin/crm" || path === "/admin/crm/") && url.searchParams.get("embed") === "1") {
        // Custom CSP so the SPA can iframe this page. withSecurityHeaders would
        // otherwise default to frame-ancestors 'none', which blocks the embed.
        const embedCSP = [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://unpkg.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: blob:",
          "connect-src 'self'",
          "frame-ancestors 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "form-action 'self'",
        ].join("; ");
        // NO Chief of Staff widget here. The CRM page is iframe-embedded
        // inside the SPA, and the SPA injects the widget on its own document.
        // Injecting again here would render a second floating bubble inside
        // the iframe, doubling the chief of staff on the CRM tab.
        return withSecurityHeaders(new Response(crmPageHTML(env), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "SAMEORIGIN",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": embedCSP,
          },
        }));
      }
      // Site audit report page · standalone HTML that fetches the JSON API on the
      // client (using the admin token in localStorage) and auto-opens the print
      // dialog for "Save as PDF". Opened in a new tab by the header button.
      if (path === "/admin/site-audit" || path === "/admin/site-audit/") {
        const target = url.searchParams.get("url");
        if (!target) {
          return new Response("Missing ?url= parameter", { status: 400, headers: { "Content-Type": "text/plain" } });
        }
        return new Response(siteAuditReportHTML(target), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
          },
        });
      }
      // SPA fallthrough. Load the Chief of Staff widget via the shared loader
      // script so every portal page (launcher, Catalina, PWP, Tasks) uses one
      // source of truth. The loader self-injects launcher + panel on DOM ready.
      const spaHtml = FRONTEND_HTML.replace(
        "</body>",
        '<script src="https://colguides.com/portal/pymewebpro/cos-widget.js" defer></script>\n'
        + '<script src="https://colguides.com/portal/notif-widget.js" defer></script>\n</body>'
      );
      return withSecurityHeaders(new Response(spaHtml, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "Referrer-Policy": "strict-origin-when-cross-origin"
        }
      }));
    } catch (err) {
      console.error("Worker error:", err, err.stack);
      return cors(json({ error: "Internal server error", detail: err.message }, 500));
    }
    })();

    if (isColguidesPwp) {
      __pwpResponse = await rewriteForPwpSubpath(__pwpResponse, PWP_BASE);
    }
    return __pwpResponse;
  },

  // Nightly cron · runs at 09:00 America/Bogota (14:00 UTC, see wrangler.toml).
  // Creates D+1 / D+3 / D+7 / D+14 follow-up tasks in `activities` for any
  // lead in the open funnel whose last touch landed exactly N days ago.
  // Capped at 50 task inserts per run; wraps in try/catch.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runNightlyCadenceSweep(env, event).catch((e) => {
      console.error("scheduled: cadence sweep crashed: " + (e && e.stack || e));
    }));
  }
};

// Bogotá local-midnight day index. America/Bogota is UTC-5 year-round (no DST).
function bogotaDayIndex(ms) {
  const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;
  return Math.floor((ms - BOGOTA_OFFSET_MS) / (24 * 60 * 60 * 1000));
}

async function runNightlyCadenceSweep(env, event) {
  const startedAt = Date.now();
  const counts = { scanned: 0, scheduled: 0, skipped_capped: 0, by_bucket: { 1: 0, 3: 0, 7: 0, 14: 0 } };
  const HARD_CAP = 50;
  const todayIdx = bogotaDayIndex(startedAt);
  const TARGET_DAYS = [1, 3, 7, 14];

  try {
    // Pull every open-funnel lead that has at least one previous touch.
    // Cap the candidate pool generously so we don't load the whole table; 2000
    // is plenty given the funnel is in the low hundreds today.
    const rows = await env.DB.prepare(
      "SELECT id, business_name, score, last_touched_at " +
      "  FROM leads " +
      " WHERE lead_stage IN ('new','contacted','marketing_qualified') " +
      "   AND last_touched_at IS NOT NULL " +
      " ORDER BY COALESCE(score, 0) DESC " +
      " LIMIT 2000"
    ).all();

    const candidates = rows.results || [];
    counts.scanned = candidates.length;

    for (const lead of candidates) {
      if (counts.scheduled >= HARD_CAP) { counts.skipped_capped += 1; continue; }
      const touchIdx = bogotaDayIndex(lead.last_touched_at);
      const ageDays = todayIdx - touchIdx;
      if (!TARGET_DAYS.includes(ageDays)) continue;

      // De-dupe: skip if a follow-up task for this bucket already exists.
      const dupSubject = "Follow-up D+" + ageDays + ": " + (lead.business_name || "(no name)");
      const existing = await env.DB.prepare(
        "SELECT id FROM activities WHERE lead_id = ? AND kind = 'task' AND subject = ? LIMIT 1"
      ).bind(lead.id, dupSubject).first();
      if (existing) continue;

      const now = Date.now();
      const dueAt = now + 2 * 60 * 60 * 1000; // due in 2 hours
      try {
        await env.DB.prepare(
          "INSERT INTO activities (id, kind, subject, body, lead_id, owner, occurred_at, due_at, created_at, updated_at, done) " +
          "VALUES (?, 'task', ?, ?, ?, 'santi', ?, ?, ?, ?, 0)"
        ).bind(
          crypto.randomUUID(),
          dupSubject,
          "Bucket: D+" + ageDays + ". Score=" + (lead.score == null ? "?" : lead.score) + ". Suggest WA/email follow-up.",
          lead.id,
          now, dueAt, now, now,
        ).run();
        counts.scheduled += 1;
        counts.by_bucket[ageDays] = (counts.by_bucket[ageDays] || 0) + 1;
      } catch (e) {
        console.warn("scheduled: insert failed for lead " + lead.id + ": " + (e && e.message || e));
      }
    }

    // Final summary row so we can verify the cron actually ran.
    try {
      const now = Date.now();
      await env.DB.prepare(
        "INSERT INTO activities (id, kind, subject, body, owner, occurred_at, created_at, updated_at, done) " +
        "VALUES (?, 'note', ?, ?, 'system', ?, ?, ?, 1)"
      ).bind(
        crypto.randomUUID(),
        "Nightly cadence sweep",
        JSON.stringify({
          ran_at: now,
          cron: (event && event.cron) || null,
          duration_ms: now - startedAt,
          ...counts,
        }),
        now, now, now,
      ).run();
    } catch (e) {
      console.warn("scheduled: summary insert failed: " + (e && e.message || e));
    }
  } catch (e) {
    console.error("scheduled: cadence sweep failed: " + (e && e.stack || e));
  }
}

/**
 * Traffic analytics proxy. Forwards GET /api/admin/traffic/<sub> to the
 * Catalina dispatch endpoint with the shared secret attached on the server.
 * The browser side never sees COS_SHARED_SECRET.
 *
 *   /api/admin/traffic/summary     → cg_traffic_summary   (Cloudflare, all requests)
 *   /api/admin/traffic/pages       → cg_top_pages         (Cloudflare, all requests)
 *   /api/admin/traffic/countries   → cg_top_countries     (Cloudflare, all requests)
 *   /api/admin/traffic/ga4-summary → ga4_traffic_summary  (GA4, real humans only)
 *   /api/admin/traffic/ga4-pages   → ga4_top_pages        (GA4, real humans only)
 *
 * The ga4-* variants pull from Google Analytics 4 via OAuth-as-Mike. They
 * report activeUsers (bot-filtered, real humans) instead of Cloudflare's
 * raw request counts. See catalina/src/ga4.js for the data shape.
 *
 * All query params are forwarded as the agent action params (site, period,
 * start_date, end_date, limit, etc.).
 */
async function handleTrafficProxy(request, env, path, url) {
  const sub = path.replace(/^\/api\/admin\/traffic\//, "").replace(/\/$/, "");
  const actionMap = {
    "summary":     "cg_traffic_summary",
    "pages":       "cg_top_pages",
    "countries":   "cg_top_countries",
    "ga4-summary": "ga4_traffic_summary",
    "ga4-pages":   "ga4_top_pages",
    "ga4-countries": "ga4_country_breakdown",
  };
  const action = actionMap[sub];
  if (!action) {
    return new Response(JSON.stringify({ ok: false, error: "Unknown traffic subpath: " + sub }), {
      status: 404, headers: { "content-type": "application/json" }
    });
  }
  const params = {};
  for (const [k, v] of url.searchParams) {
    // Coerce limit to integer if present.
    if (k === "limit") params[k] = parseInt(v, 10) || undefined;
    else params[k] = v;
  }
  if (!env.COS_SHARED_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: "COS_SHARED_SECRET not set on this worker" }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }
  const dispatchUrl = env.CATALINA_AGENT_URL || "https://catalina.medellin.guide/api/agent";
  const r = await fetch(dispatchUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cos-secret": env.COS_SHARED_SECRET
    },
    body: JSON.stringify({ action, params })
  });
  const data = await r.json().catch(() => ({ ok: false, error: "Bad response" }));
  return new Response(JSON.stringify(data), {
    status: r.ok ? 200 : (r.status || 500),
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

/**
 * Outbound rewrite when this worker is mounted under colguides.com/portal/pymewebpro/*.
 * Four jobs:
 *   1. Redirect Location headers: prepend PWP_BASE to root-relative redirects.
 *   2. HTML body: prepend PWP_BASE to href/action/src attributes that point
 *      at root-relative paths (skips protocol-relative `//host` URLs).
 *   3. Inject a tiny script that exposes `window.PWP_BASE` so the SPA's
 *      fetch helpers and client-side router can prepend it for in-app
 *      navigation and API calls.
 *   4. Inject the shared master-portal header strip at the top of every HTML
 *      response so the nav back to /portal/ and to sister portals (Catalina,
 *      Tasks) is always one click away.
 */
async function rewriteForPwpSubpath(response, base) {
  // Redirect Location header
  if (response.status >= 300 && response.status < 400) {
    const loc = response.headers.get("Location");
    if (loc && loc.startsWith("/") && !loc.startsWith("//")) {
      const h = new Headers(response.headers);
      h.set("Location", base + loc);
      return new Response(response.body, { status: response.status, headers: h });
    }
    return response;
  }
  const ct = response.headers.get("content-type") || "";
  if (!ct.toLowerCase().includes("text/html")) return response;
  let text = await response.text();
  // Inject window.PWP_BASE before any other script runs. Try after <head>,
  // fall back to before </head>, fall back to prepending the body.
  const baseScript = '<script>window.PWP_BASE=' + JSON.stringify(base) + ';</script>';
  if (text.includes("<head>")) {
    text = text.replace("<head>", "<head>\n" + baseScript);
  } else if (text.includes("</head>")) {
    text = text.replace("</head>", baseScript + "\n</head>");
  } else {
    text = baseScript + text;
  }
  // Rewrite root-relative href/action/src attributes. The negative lookahead
  // (?!/) skips protocol-relative `//cdn.example.com` URLs. The character
  // class lookahead ensures we only touch attributes whose value starts with
  // `/` followed by a path-like char (handles `/`, `?`, `#`, end-of-attr).
  text = text
    .replace(/(href|action|src)="\/(?!\/)/g, '$1="' + base + '/')
    .replace(/(href|action|src)='\/(?!\/)/g, "$1='" + base + "/");
  // Master-portal header strip. Same look as the launcher.
  text = injectMasterPortalHeader(text, "pymewebpro");
  const h = new Headers(response.headers);
  return new Response(text, { status: response.status, headers: h });
}

/**
 * Shared master-portal header strip. Same Fraunces + JetBrains Mono palette
 * as the launcher at colguides.com/portal/. Active-tile highlighted via the
 * `active` arg ("catalina" | "pymewebpro" | "tasks"). Self-contained with
 * scoped class prefix `cg-mph` to avoid colliding with the sub-portal's own
 * styles. The same snippet lives in each portal worker (catalina, pymewebpro,
 * tasks) so they can each inject it without an HTTP fetch.
 */
function masterPortalHeader(active) {
  const link = (slug, label, href) => {
    const cls = "cg-mph__link" + (active === slug ? " is-active" : "");
    return '<a href="' + href + '" class="' + cls + '">' + label + '</a>';
  };
  return [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap" media="print" onload="this.media=\'all\'">',
    '<style>',
    '.cg-mph{position:sticky;top:0;z-index:99999;background:#1A1612;color:#F2E9D5;border-bottom:1px solid #7A6A53;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;font-family:"Inter Tight",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:12px;letter-spacing:.04em;box-shadow:0 1px 0 rgba(255,255,255,.04)}',
    '.cg-mph *{box-sizing:border-box}',
    '.cg-mph__brand{font-family:"Fraunces",Georgia,serif;font-weight:700;font-size:18px;color:#F2E9D5;text-decoration:none;letter-spacing:-.01em;display:inline-flex;align-items:baseline;gap:8px;line-height:1}',
    '.cg-mph__brand em{font-style:italic;font-weight:500;color:#D24A1D}',
    '.cg-mph__brand span{color:#7A6A53;font-style:normal;font-weight:400;font-size:14px}',
    '.cg-mph__nav{display:flex;gap:14px;flex-wrap:wrap;font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:500}',
    '.cg-mph__link{color:#DCD0B3;text-decoration:none;padding:4px 0;border-bottom:1px solid transparent;transition:color .15s,border-color .15s}',
    '.cg-mph__link:hover{color:#F2E9D5;border-bottom-color:#D24A1D}',
    '.cg-mph__link.is-active{color:#F2E9D5;border-bottom-color:#F2E9D5}',
    '.cg-mph__sep{color:#7A6A53;user-select:none}',
    '@media (max-width:560px){.cg-mph{padding:8px 14px;font-size:11px}.cg-mph__brand{font-size:16px}.cg-mph__brand span{display:none}}',
    '</style>',
    '<header class="cg-mph" role="navigation" aria-label="Master portal">',
    '  <a class="cg-mph__brand" href="/portal/"><span>←</span>ColGuides <em>Master Portal</em></a>',
    '  <nav class="cg-mph__nav">',
    '    ' + link("dashboard", "Dashboard", "/portal/dashboard/"),
    '    <span class="cg-mph__sep">·</span>',
    '    ' + link("catalina", "Catalina", "/portal/catalina/"),
    '    <span class="cg-mph__sep">·</span>',
    '    ' + link("pymewebpro", "PymeWebPro", "/portal/pymewebpro/admin"),
    '    <span class="cg-mph__sep">·</span>',
    '    ' + link("tasks", "Tasks", "/portal/tasks/"),
    '    <span class="cg-mph__sep">·</span>',
    '    ' + link("partnerships", "Partnerships", "/portal/partnerships/"),
    '    <span class="cg-mph__sep">·</span>',
    '    ' + link("newsletter", "Newsletter", "/portal/newsletter/"),
    '  </nav>',
    '</header>'
  ].join("\n");
}

function injectMasterPortalHeader(html, active) {
  const header = masterPortalHeader(active);
  if (html.includes("<body>")) return html.replace("<body>", "<body>\n" + header);
  const bodyOpen = html.match(/<body[^>]*>/);
  if (bodyOpen) return html.replace(bodyOpen[0], bodyOpen[0] + "\n" + header);
  return header + html;
}

export { src_default as default };

// ============================================================================
// INFERRED D1 SCHEMA  (no CREATE TABLE in worker source · schema is in migrations)
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
//   id INTEGER PRIMARY KEY AUTOINCREMENT,  -- inferred; INSERT doesn't provide id'
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

