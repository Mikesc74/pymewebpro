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

  // Comments thread (both directions: client + admin) — keyed to latest pushed mockup
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

  // Live site URL (if shipped) — custom domain wins; otherwise the included
  // <slug>.sites.pymewebpro.com tenant subdomain (clean, brandable, free).
  const live = await env.DB.prepare(
    "SELECT slug, custom_domain FROM live_sites WHERE client_id = ? AND r2_prefix != ''",
  ).bind(client.id).first();
  const liveUrl = live
    ? (live.custom_domain ? `https://${live.custom_domain}` : `https://${live.slug}.sites.pymewebpro.com/`)
    : null;

  // Derive state — mockup iframe only appears AFTER admin "Push to client" (shipped_at IS NOT NULL)
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
      submitted_at: client.submitted_at || null,           // ms epoch — front-end derives 48h countdown
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
      subject: `💬 Client comment — ${session.business_name || session.email}`,
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
  // and contain nested objects — don't expose them to the SPA, which renders flat.
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
    <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">Thanks for reaching out. We've set up your client portal — click below to share your project details (logos, brand colors, content, and assets).</p>'
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
    // Branch on payment kind so the right fulfillment runs.
    if (payment.plan === "upgrade") await processUpgradePayment(env, payment);
    else if (payment.plan === "hosting") await processHostingPayment(env, payment);
    else await convertLeadOnApproval(env, payment);
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
  if (client.plan === "pro") return; // already upgraded — idempotent

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
        <p>— Equipo PymeWebPro</p>
      </div>`,
    }).catch(() => {});
  }
  // Email admin to regen
  if (env.ADMIN_EMAIL) {
    sendEmail(env, {
      to: env.ADMIN_EMAIL,
      subject: `🆙 Upgrade paid — regenerate mockup for ${client.business_name || client.email}`,
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

  // Mirror into the legacy hosting_payments table (different schema — has wompi_reference UNIQUE).
  // This is best-effort historical bookkeeping; the canonical record is in `payments` + `clients.hosting_expires_at`.
  try {
    await env.DB.prepare(
      `INSERT INTO hosting_payments (id, wompi_reference, wompi_transaction_id, customer_email, amount_cents, plan, status, created_at, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, ?)`
    ).bind(uuid(), payment.reference, payment.wompi_transaction_id || null, client.email, payment.amount_cents, period === "annual" ? "anual" : "mensual", payment.created_at || Date.now(), now).run();
  } catch (e) { /* row may already exist on retry — ignore */ }

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
        <p>— Equipo PymeWebPro</p>
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
// Encargado-del-tratamiento clause shown at checkout. Versioned so we can prove
// later exactly what wording each customer accepted.
const ENCARGADO_CLAUSE_VERSION = "v1.0-2026-04-30";
const ENCARGADO_CLAUSE_ES = `Autorizo a PymeWebPro (operado por NSC, NIT registrado en Colombia) a actuar como Encargado del Tratamiento de los datos personales que mi sitio web reciba de sus visitantes (formularios de contacto, suscripciones a newsletter, datos de analítica) bajo la Ley 1581 de 2012. Como Responsable del Tratamiento, asumo las obligaciones legales frente a los titulares y autorizo a PymeWebPro a procesar dichos datos en mi nombre, almacenarlos en servidores seguros (Cloudflare), y transferirlos cuando sea necesario para prestar el servicio. PymeWebPro guardará confidencialidad y aplicará medidas razonables de seguridad. Esta autorización puedo revocarla cancelando mi suscripción al servicio.`;
const ENCARGADO_CLAUSE_EN = `I authorize PymeWebPro (operated by NSC, registered in Colombia) to act as Data Processor for the personal data my website receives from its visitors (contact forms, newsletter subscriptions, analytics data) under Colombian Law 1581 of 2012. As Data Controller, I assume legal obligations toward data subjects and authorize PymeWebPro to process such data on my behalf, store it on secure servers (Cloudflare), and transfer it when necessary to provide the service. PymeWebPro will maintain confidentiality and apply reasonable security measures. I may revoke this authorization by cancelling my service subscription.`;

function confirmationHtml({ lead, quote, lang, lastPayment, justReturned }) {
  // Local alias — body uses esc() throughout; the worker-level helper is escapeHtml
  const esc = escapeHtml;
  const isEs = lang !== "en";
  if (lastPayment && lastPayment.status === "approved") return statusPage({ title: isEs ? "¡Pago recibido!" : "Payment received!", body: isEs ? "Le enviamos un correo con el enlace para empezar su proyecto." : "Check your email for the link to start your project.", color: "#10b981", icon: "✓" });
  if (justReturned && lastPayment && lastPayment.status === "pending") return statusPage({ title: isEs ? "Pago en proceso" : "Payment processing", body: isEs ? "Estamos esperando confirmación de Wompi." : "Waiting for confirmation from Wompi.", color: "#fbbf24", icon: "⏳" });
  if (!quote.chargeable) return statusPage({ title: isEs ? "Plan no seleccionado" : "No plan selected", body: "", color: "#fbbf24", icon: "?", showWa: true });

  const t = isEs ? {
    title: "Confirme su plan", subtitle: "Listo para arrancar — falta un paso.",
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
      const r = await fetch('/api/leads/${esc(lead.id)}/checkout', {
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
const FRONTEND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PymeWebPro Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    :root{
      --pwp-ink:#1A2032;
      --pwp-slate:#5A6478;
      --pwp-mute:#8A93A6;
      --pwp-line:#E7E6E1;
      --pwp-line-soft:#F1F0EB;
      --pwp-bg:#FAFAF7;
      --pwp-surface:#FFFFFF;
      --pwp-surface-2:#F6F5F0;
      --pwp-accent:#FF5C2E;
      --pwp-accent-soft:#FFEDE5;
      --pwp-accent-deep:#E6451A;
      --pwp-success:#10B981;
      --pwp-warn:#F59E0B;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: var(--pwp-bg); font-family: 'Inter', system-ui, sans-serif; color: var(--pwp-ink); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    body { font-size: 15px; line-height: 1.55; letter-spacing: -0.005em; }
    h1, h2, h3, h4, h5, h6 { font-family: 'Inter Tight', system-ui, sans-serif; letter-spacing: -0.02em; color: var(--pwp-ink); font-weight: 700; }
    .serif { font-family: 'Inter Tight', system-ui, sans-serif; font-weight: 700; letter-spacing: -0.015em; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    input, textarea, select { font-family: inherit; color: var(--pwp-ink); background: var(--pwp-surface); border: 1px solid var(--pwp-line); border-radius: 10px; transition: border-color .15s, box-shadow .15s; }
    input:focus, textarea:focus, select:focus { border-color: var(--pwp-accent) !important; outline: none; box-shadow: 0 0 0 3px var(--pwp-accent-soft); }
    button { font-family: inherit; }
    button:not(:disabled):hover { filter: brightness(1.04); }
    button:disabled { cursor: not-allowed; opacity: 0.5; }
    a { color: var(--pwp-accent-deep); text-decoration: none; }
    a:hover { color: var(--pwp-accent); }
    code { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.92em; background: var(--pwp-surface-2); padding: 2px 6px; border-radius: 6px; color: var(--pwp-ink); }
    ::selection { background: var(--pwp-accent-soft); color: var(--pwp-ink); }
    /* scrollbar polish */
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-thumb { background: rgba(26,32,50,0.18); border-radius: 8px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(26,32,50,0.32); }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="env,react">
    const { useState, useEffect, useCallback, useRef } = React;
    const SESSION_KEY = 'pwp_session';
    const ADMIN_KEY = 'pwp_admin';

    // ─── Bootstrap session from URL (?session=TOKEN or ?admin=TOKEN) ───
    // Lets us hand out a one-click test/preview URL without DevTools steps.
    (function bootstrapTokensFromUrl() {
      try {
        const qs = new URLSearchParams(window.location.search);
        const s = qs.get("session");
        const a = qs.get("admin");
        let touched = false;
        if (s) { localStorage.setItem(SESSION_KEY, s); qs.delete("session"); touched = true; }
        if (a) { localStorage.setItem(ADMIN_KEY, a);   qs.delete("admin");   touched = true; }
        if (touched) {
          const next = window.location.pathname + (qs.toString() ? "?" + qs.toString() : "") + window.location.hash;
          window.history.replaceState({}, "", next);
        }
      } catch (e) { /* ignore */ }
    })();

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
    const T = {"en":{"brand":"PymeWebPro","tagline":"Client Onboarding Portal","loginTitle":"Welcome","loginSub":"Enter your email to receive a secure login link","emailPh":"you@yourbusiness.com","sendLink":"Send Magic Link","sending":"Sending…","linkSent":"Check your inbox","linkSentSub":"We sent a login link to","backToLogin":"← Use a different email","progress":"Project Progress","complete":"complete","saving":"Saving…","saved":"Saved","saveError":"Couldn't save — check your connection","welcomeTitle":"Welcome — let's build your site","welcomeBody":"This takes about 5–10 minutes. Your answers save as you type, so feel free to leave and come back. Don't worry about getting every field perfect — we'll polish your copy ourselves before showing you the mockup.","welcomeCta":"Let's start","optional":"optional","sectionDone":"done","skipForNow":"Skip for now","intros":{"business":"The basics — these appear on your site and are the foundation for everything else. About 2 minutes.","contact":"How should visitors reach you? What you put here goes on the WhatsApp button, the footer, and the map.","brand":"Your logo and the colors that identify you. No logo yet? Upload any placeholder — we'll handle the rest.","visual":"Authentic photos of your business sell far better than stock images. 3 to 8 good photos is plenty.","content":"The tone and topics you want to convey. You don't need to write the final copy — that's our job. Just describe the feeling.","tech":"If you already own a domain or have hosting, tell us. If not, we set everything up for you.","growth":"Extra features included in your Growth plan. Fill in only what applies — leave the rest blank."},"verifying":"Verifying your link…","verifyFailed":"Link expired or invalid","sections":{"business":"Business Basics","contact":"Contact & Social","brand":"Brand Assets","visual":"Visual Direction","content":"Content & Themes","tech":"Technical Setup","growth":"Growth Add-Ons"},"fields":{"bizName":"Business Name","tagline":"Tagline / Slogan","whatYouDo":"What does your business do?","audience":"Who is your target audience?","nit":"Tax ID (NIT or cédula)","nitHelp":"Required for the privacy policy and terms pages","legalRepresentative":"Legal representative full name (optional)","phone":"Phone Number","email":"Public Email","address":"Business Address","whatsapp":"WhatsApp","ig":"Instagram","fb":"Facebook","li":"LinkedIn","logoUp":"Upload Logo (PNG, SVG, AI)","colors":"Brand Colors","colorsHelp":"Add hex codes or describe your palette","fonts":"Font Preferences","photos":"Upload Photography & Imagery","refSites":"Reference websites you like","photoAlts":"Describe each photo (one per line, in upload order)","photoAltsHelp":"Used for accessibility (screen readers) and SEO. Example line: 'Front of our bakery on Calle 50 with the team smiling'","tone":"Brand Tone","topics":"Key topics to cover","pages":"Sections needed","domain":"Existing Domain","hosting":"Current Hosting","bizEmail":"Business Email Setup","bookingsUrl":"Booking link (Calendly, Cal.com, etc.)","pdfUp":"Upload Catalog / Menu PDF","pdfLabel":"PDF button label","pdfLabelPh":"e.g. Menu, Catalog, Spec Sheet","waCatalogUrl":"WhatsApp Business catalog link","newsletterEnableLabel":"Enable newsletter signup form on the site","newsletterHelp":"Subscribers get stored and you'll be emailed each new sign-up","ga4Id":"Google Analytics 4 ID","ga4Help":"Looks like G-XXXXXXXXXX","metaPixelId":"Meta (Facebook) Pixel ID","metaPixelHelp":"15-16 digit number from Meta Events Manager","testimonials":"Testimonials","testimonialsHelp":"One per line: Name | Quote | Role (e.g.: María Pérez | Excelente servicio | Cliente desde 2022)","faqs":"FAQs","faqsHelp":"One per line: Question? | Answer","growthIntro":"These features are part of your Growth plan. Fill in only what applies — leave the rest blank.","bilingualLabel":"Generate an English version of my site too (en/)"},"ph":{"bizName":"Bakery La Esquina · Aurora Yoga Studio · Taller El Diamante","tagline":"e.g. Fresh bread since 1995 · Your day starts calm · Quick repairs, with warranty","whatYouDo":"In your own words: what do you sell or offer, what makes you different, who already trusts you…","audience":"Local families, professionals 30-50, small businesses needing X…","colors":"#0F172A and a warm gold · or just describe: 'navy blue + Colombian yellow', 'earthy & warm', etc.","tone":"Professional · friendly · bold · warm · direct · sober — pick a few","topics":"Sustainability, family heritage, fast turnaround, B2B specialists…","pages":"Home, About, Services, Portfolio, Contact (one per line)…"},"next":"Next","back":"Back","submit":"Submit & Notify Us","submitting":"Submitting…","submitted":"Submitted","submittedSub":"We’ve been notified. We’ll reach out shortly.","dragDrop":"Drop files here or click to upload"},"es":{"brand":"PymeWebPro","tagline":"Portal de Incorporación","loginTitle":"Bienvenido","loginSub":"Ingrese su correo para recibir un enlace de acceso","emailPh":"tu@tunegocio.com","sendLink":"Enviar Enlace","sending":"Enviando…","linkSent":"Revise su bandeja","linkSentSub":"Enviamos un enlace a","backToLogin":"← Usar otro correo","progress":"Progreso","complete":"completo","saving":"Guardando…","saved":"Guardado","saveError":"No se pudo guardar — verifique su conexión","welcomeTitle":"¡Bienvenido! Vamos a poner su sitio en línea","welcomeBody":"Esto le toma entre 5 y 10 minutos. Sus respuestas se guardan a medida que escribe, así que puede salir y volver cuando quiera. No se preocupe si algo no queda perfecto — pulimos el texto por usted antes de mostrarle el mockup.","welcomeCta":"Empecemos","optional":"opcional","sectionDone":"listo","skipForNow":"Saltar por ahora","intros":{"business":"Lo básico — estos datos aparecen en su sitio y son la base de todo lo demás. Unos 2 minutos.","contact":"¿Cómo prefiere que sus clientes lo contacten? Lo que ponga aquí va al botón de WhatsApp, al pie de página y al mapa.","brand":"Su logo y los colores que lo identifican. ¿No tiene logo todavía? Suba cualquier imagen — nosotros nos encargamos.","visual":"Fotos auténticas de su negocio venden mucho mejor que fotos de stock. 3 a 8 fotos buenas son suficientes.","content":"El tono y los temas que quiere transmitir. No tiene que escribir el texto final — eso lo hacemos nosotros. Solo descríbanos la sensación.","tech":"Si ya tiene un dominio o un hosting actual, díganoslo. Si no, todo lo configuramos por usted.","growth":"Funciones extra incluidas en su plan Crecimiento. Complete solo lo que aplique — deje el resto en blanco si no lo necesita."},"verifying":"Verificando…","verifyFailed":"Enlace caducado o inválido","sections":{"business":"Datos del Negocio","contact":"Contacto y Redes","brand":"Activos de Marca","visual":"Dirección Visual","content":"Contenido y Temas","tech":"Configuración Técnica","growth":"Funciones Crecimiento"},"fields":{"bizName":"Nombre del Negocio","tagline":"Eslogan","whatYouDo":"¿Qué hace su empresa?","audience":"¿Quién es su público objetivo?","nit":"NIT o cédula","nitHelp":"Requerido para la política de privacidad y los términos","legalRepresentative":"Representante legal (nombre completo, opcional)","phone":"Teléfono","email":"Correo Público","address":"Dirección","whatsapp":"WhatsApp","ig":"Instagram","fb":"Facebook","li":"LinkedIn","logoUp":"Subir Logo (PNG, SVG, AI)","colors":"Colores de Marca","colorsHelp":"Agregue códigos hex o describa su paleta","fonts":"Tipografía","photos":"Subir Fotografías","refSites":"Sitios de referencia","photoAlts":"Describa cada foto (una por línea, en orden de subida)","photoAltsHelp":"Se usa para accesibilidad (lectores de pantalla) y SEO. Ejemplo: 'Fachada de nuestra panadería en la Calle 50 con el equipo sonriendo'","tone":"Tono de Marca","topics":"Temas clave","pages":"Secciones necesarias","domain":"Dominio Existente","hosting":"Hosting Actual","bizEmail":"Correo Empresarial","bookingsUrl":"Enlace de reservas (Calendly, Cal.com, etc.)","pdfUp":"Subir catálogo / menú en PDF","pdfLabel":"Texto del botón PDF","pdfLabelPh":"ej. Menú, Catálogo, Ficha Técnica","waCatalogUrl":"Catálogo de WhatsApp Business","newsletterEnableLabel":"Activar formulario de suscripción en el sitio","newsletterHelp":"Los suscriptores se guardan y le enviamos un correo en cada nuevo registro","ga4Id":"ID de Google Analytics 4","ga4Help":"Formato G-XXXXXXXXXX","metaPixelId":"ID del Pixel de Meta (Facebook)","metaPixelHelp":"Número de 15-16 dígitos del Events Manager de Meta","testimonials":"Testimonios","testimonialsHelp":"Uno por línea: Nombre | Cita | Rol (ej.: María Pérez | Excelente servicio | Cliente desde 2022)","faqs":"Preguntas frecuentes","faqsHelp":"Uno por línea: ¿Pregunta? | Respuesta","growthIntro":"Estas funciones son parte de su plan Crecimiento. Complete solo lo que aplique — deje el resto en blanco.","bilingualLabel":"Generar también una versión en inglés (en/)"},"ph":{"bizName":"Panadería La Esquina · Estudio Yoga Aurora · Taller El Diamante","tagline":"ej. Pan caliente desde 1995 · Su día empieza con calma · Reparaciones rápidas con garantía","whatYouDo":"En sus propias palabras: qué vende u ofrece, qué lo hace diferente, quién ya le compra…","audience":"Familias del barrio, profesionales 30-50, pymes que necesitan X…","colors":"#0F172A y un dorado cálido · o simplemente describa: 'azul marino + amarillo Colombia', 'tierras cálidas', etc.","tone":"Profesional · cercano · juvenil · sobrio · directo · cálido — elija algunos","topics":"Sostenibilidad, tradición familiar, entrega rápida, especialistas en B2B…","pages":"Inicio, Nosotros, Servicios, Contacto (uno por línea)…"},"next":"Siguiente","back":"Atrás","submit":"Enviar y Notificarnos","submitting":"Enviando…","submitted":"Enviado","submittedSub":"Hemos sido notificados. Le contactaremos pronto.","dragDrop":"Suelte archivos aquí o haga clic"}};

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
        // If the client already submitted, jump straight to the Project Portal —
        // otherwise show the wizard so they can continue / complete intake.
        if (res.client && (res.client.status === 'submitted' || res.client.status === 'active')) {
          setStage('submitted');
        } else {
          setStage('portal');
        }
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

      if (stage === 'loading' || stage === 'verifying') return <Center><Loader size={32} color="#FF5C2E" className="spin" /><p style={{color:'rgba(26,32,50,0.6)',marginTop:'1.5rem'}}>{t.verifying}</p></Center>;
      if (stage === 'login' || stage === 'sending') return <LoginScreen t={t} lang={lang} setLang={setLang} email={email} setEmail={setEmail} onSubmit={handleSendLink} loading={stage==='sending'} error={error} />;
      if (stage === 'linksent') return <LinkSent t={t} email={email} onBack={() => setStage('login')} />;
      if (stage === 'submitted') return <ProjectPortal t={t} lang={lang} setLang={setLang} client={client} email={client?.email} onLogout={handleLogout} />;
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
                <Shield size={32} color="#FF5C2E" />
                <h1 className="serif" style={{...titleStyle,fontSize:'2.5rem',marginTop:'1rem'}}>Admin</h1>
                <p style={{color:'rgba(26,32,50,0.5)',fontSize:'0.9rem'}}>PymeWebPro Console</p>
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

      // Top nav button — used across all views (list AND detail) so admin always
      // has one-click access to Clients / Leads / WhatsApp regardless of where they are.
      const tabBtn = (id, label, Icon, count) => (
        <button onClick={() => setRoute('/admin' + (id==='clients'?'':'/'+id))} style={{
          background: tab===id ? 'rgba(255,92,46,0.12)' : 'transparent',
          color: tab===id ? '#FF5C2E' : 'rgba(26,32,50,0.55)',
          border: '1px solid ' + (tab===id ? 'rgba(255,92,46,0.3)' : 'rgba(26,32,50,0.08)'),
          padding: '0.4rem 0.85rem', borderRadius: '4px', cursor: 'pointer',
          fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          fontFamily: 'inherit'
        }}>
          <Icon size={13} /> {label}{typeof count === 'number' ? ' (' + count + ')' : ''}
        </button>
      );

      // Persistent admin chrome — always-on header + nav, content slot below.
      const Shell = ({ children }) => (
        <div style={{minHeight:'100vh',background:'#FAFAF7'}}>
          <header style={{...headerStyle, position:'sticky', top:0, zIndex:50, backdropFilter:'blur(8px)', background:'rgba(10,14,39,0.92)'}}>
            <div style={{display:'flex',alignItems:'center',gap:'1.25rem',flex:1,minWidth:0}}>
              <button onClick={()=>setRoute('/admin')} title="Home" style={{display:'flex',alignItems:'center',gap:'0.6rem',background:'transparent',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit'}}>
                <Shield size={18} color="#FF5C2E" />
                <span className="serif" style={{fontSize:'1.15rem',color:'#1A2032',whiteSpace:'nowrap'}}>Pyme<span style={{color:'#FF5C2E'}}>WebPro</span> · Admin</span>
              </button>
              <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap'}}>
                {tabBtn('clients', 'Clients', Users, clients.length || undefined)}
                {tabBtn('leads', 'Leads', Tag, (leadCounts.new || 0) + (leadCounts.contacted || 0) || undefined)}
                {tabBtn('clicks', 'WhatsApp', MsgIcon)}
              </div>
            </div>
            <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
              {tab === 'clients' && !detail && !leadDetail && (
                <>
                  <button onClick={async()=>{await adminApi('/api/admin/check-all-sites',{method:'POST'});loadClients();}} style={{...ghostBtn,padding:'0.4rem 0.75rem',fontSize:'0.78rem'}} title="Check the health of all sites"><Sparkle size={13} /> Check sites</button>
                  <button onClick={() => setShowInvite(true)} style={{...primaryBtn,padding:'0.4rem 0.85rem',fontSize:'0.78rem'}}><Plus size={13} /> Invite Client</button>
                </>
              )}
              <button onClick={() => { localStorage.removeItem(ADMIN_KEY); setAuthed(false); }} style={{...ghostBtn,padding:'0.4rem 0.75rem',fontSize:'0.78rem'}}>Sign Out</button>
            </div>
          </header>
          {children}
        </div>
      );

      if (detail) return <Shell><ClientDetail detail={detail} onBack={() => setRoute('/admin')} onRefresh={() => adminApi('/api/admin/clients/' + clientDetailMatch[1]).then(setDetail)} /></Shell>;
      if (leadDetail) return <Shell><LeadDetail lead={leadDetail} onBack={() => setRoute('/admin/leads')} onRefresh={() => adminApi('/api/admin/leads/' + leadDetailMatch[1]).then(r => setLeadDetail(r.lead))} setRoute={setRoute} /></Shell>;

      return (
        <Shell>
          <main style={{padding:'2.5rem 2rem',maxWidth:'1200px',margin:'0 auto'}}>

            {tab === 'clients' && (
              <>
                <h1 className="serif" style={{fontSize:'2.5rem',fontWeight:400,margin:'0 0 2rem'}}>Clients</h1>
                {loading ? <Loader size={24} className="spin" color="#FF5C2E" /> : (
                  clients.length === 0 ? (
                    <div style={{textAlign:'center',padding:'4rem',color:'rgba(26,32,50,0.4)'}}>
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
                  <h1 className="serif" style={{fontSize:'2.5rem',fontWeight:400,margin:0}}>Leads</h1>
                  <div style={{display:'flex',gap:'0.4rem'}}>
                    {['', 'new', 'contacted', 'converted', 'dismissed'].map(s => (
                      <button key={s||'all'} onClick={() => setStatusFilter(s)} style={{
                        background: statusFilter===s ? 'rgba(255,92,46,0.12)' : 'transparent',
                        color: statusFilter===s ? '#FF5C2E' : 'rgba(26,32,50,0.5)',
                        border: '1px solid ' + (statusFilter===s ? 'rgba(255,92,46,0.3)' : 'rgba(26,32,50,0.08)'),
                        padding: '0.35rem 0.75rem', borderRadius: '3px', cursor:'pointer', fontSize:'0.75rem', textTransform:'capitalize'
                      }}>{s || 'all'}{leadCounts[s] ? ' (' + leadCounts[s] + ')' : ''}</button>
                    ))}
                  </div>
                </div>
                {loading ? <Loader size={24} className="spin" color="#FF5C2E" /> : (
                  leads.length === 0 ? (
                    <div style={{textAlign:'center',padding:'4rem',color:'rgba(26,32,50,0.4)'}}>
                      No leads yet. They'll appear here as the contact form fires.'
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
                <h1 className="serif" style={{fontSize:'2.5rem',fontWeight:400,margin:'0 0 0.5rem'}}>WhatsApp Clicks</h1>
                <p style={{color:'rgba(26,32,50,0.5)',marginBottom:'2rem',fontSize:'0.9rem'}}>Anonymous click attribution — your <code style={{color:'#FF5C2E'}}>/go/whatsapp?campaign=…</code> redirect.</p>
                {loading ? <Loader size={24} className="spin" color="#FF5C2E" /> : clicks.length === 0 ? (
                  <div style={{textAlign:'center',padding:'4rem',color:'rgba(26,32,50,0.4)'}}>No clicks logged yet.</div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
                    {clicks.map(c => (
                      <div key={c.id} style={{display:'grid',gridTemplateColumns:'160px 140px 1fr',gap:'1rem',padding:'0.85rem 1rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'2px',fontSize:'0.85rem'}}>
                        <span style={{color:'rgba(26,32,50,0.5)'}}>{new Date(c.created_at).toLocaleString('en-US')}</span>
                        <span style={{color:'#FF5C2E'}}>{c.campaign || '(none)'}</span>
                        <span style={{color:'rgba(26,32,50,0.4)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.referrer || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
          {showInvite && <InviteModal onClose={() => setShowInvite(false)} onCreated={() => { setShowInvite(false); loadClients(); }} />}
        </Shell>
      );
    }

    function LeadRow({ l, onClick }) {
      const statusColor = { new: '#FF5C2E', contacted: '#60a5fa', converted: '#10b981', dismissed: '#94a3b8' }[l.status] || '#94a3b8';
      const sourceLabel = { contact_form: 'Form', whatsapp_click: 'WA click', whatsapp_message: 'WhatsApp', manual: 'Manual' }[l.source] || l.source;
      const planLabel = l.plan === 'esencial' ? 'Essential' : l.plan === 'pro' ? 'Pro' : '—';
      const hostingLabel = l.hosting === 'annual' ? '+ annual host' : l.hosting === 'monthly' ? '+ monthly host' : '';
      return (
        <div onClick={onClick} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto',gap:'1.25rem',alignItems:'center',padding:'1.25rem 1.5rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'4px',cursor:'pointer'}}>
          <div>
            <div className="serif" style={{fontSize:'1.1rem',marginBottom:'0.2rem'}}>{l.business_name || l.name || '(no name)'}</div>
            <div style={{color:'rgba(26,32,50,0.5)',fontSize:'0.85rem'}}>{l.email}{l.phone ? ' · ' + l.phone : ''}</div>
          </div>
          <div style={{textAlign:'right',minWidth:'80px'}}>
            <div style={{fontSize:'0.85rem',color:l.plan?'#FF5C2E':'rgba(26,32,50,0.3)'}}>{planLabel}</div>
            {hostingLabel ? <div style={{fontSize:'0.7rem',color:'rgba(26,32,50,0.4)'}}>{hostingLabel}</div> : null}
          </div>
          <span style={{fontSize:'0.7rem',color:'rgba(26,32,50,0.5)',textTransform:'uppercase',letterSpacing:'0.1em'}}>{sourceLabel}</span>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:statusColor}} />
            <span style={{fontSize:'0.8rem',color:'rgba(26,32,50,0.6)',textTransform:'capitalize'}}>{l.status}</span>
          </div>
          <span style={{fontSize:'0.75rem',color:'rgba(26,32,50,0.4)'}}>{new Date(l.created_at).toLocaleDateString('en-US')}</span>
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
        <div style={{minHeight:'100vh',background:'#FAFAF7'}}>
          <header style={headerStyle}>
            <button onClick={onBack} style={ghostBtn}><ChevL size={14} /> All Leads</button>
            <div className="serif" style={{fontSize:'1.25rem'}}>{lead.business_name || lead.name || lead.email}</div>
            <div style={{width:'120px'}}/>
          </header>
          <main style={{padding:'3rem 2rem',maxWidth:'900px',margin:'0 auto'}}>
            <div style={{display:'flex',alignItems:'baseline',gap:'1rem',marginBottom:'2rem'}}>
              <h1 className="serif" style={{fontSize:'2.5rem',fontWeight:400,margin:0}}>{lead.business_name || lead.name || '(no name)'}</h1>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem',marginBottom:'2rem'}}>
              <Stat label="Source" value={(lead.source || '').replace('_',' ')} />
              <Stat label="Language" value={lead.language === 'es' ? 'Spanish' : 'English'} />
              <Stat label="Created" value={new Date(lead.created_at).toLocaleDateString('en-US')} />
            </div>

            <div style={{padding:'1.5rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'4px',marginBottom:'2rem'}}>
              {lead.email && <LeadField k="Email" v={lead.email} />}
              {lead.phone && <LeadField k="Phone" v={lead.phone} />}
              {lead.business_name && <LeadField k="Business" v={lead.business_name} />}
              {lead.name && <LeadField k="Name" v={lead.name} />}
              {lead.message && <LeadField k="Message" v={lead.message} />}
              {lead.metadata && lead.metadata.utm_source && <LeadField k="UTM" v={[lead.metadata.utm_source, lead.metadata.utm_medium, lead.metadata.utm_campaign].filter(Boolean).join(' · ')} />}
              {lead.metadata && lead.metadata.referrer && <LeadField k="Referrer" v={lead.metadata.referrer} />}
              {lead.metadata && lead.metadata.extra && Object.entries(lead.metadata.extra).filter(([_,v])=>v).map(([k,v]) => <LeadField key={k} k={k} v={v} />)}
            </div>

            <h2 className="serif" style={{fontSize:'1.5rem',marginBottom:'1rem'}}>Status</h2>
            <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem',flexWrap:'wrap'}}>
              {['new','contacted','converted','dismissed'].map(s => (
                <button key={s} onClick={() => setStatus(s)} disabled={s==='converted' && lead.status !== 'converted'} style={{
                  background: status===s ? 'rgba(255,92,46,0.12)' : 'transparent',
                  color: status===s ? '#FF5C2E' : 'rgba(26,32,50,0.6)',
                  border: '1px solid ' + (status===s ? 'rgba(255,92,46,0.3)' : 'rgba(26,32,50,0.08)'),
                  padding: '0.5rem 1rem', borderRadius: '3px', cursor: s==='converted' && lead.status !== 'converted' ? 'not-allowed':'pointer', textTransform:'capitalize', opacity: s==='converted' && lead.status !== 'converted' ? 0.4 : 1
                }}>{s}</button>
              ))}
            </div>

            <h2 className="serif" style={{fontSize:'1.5rem',marginBottom:'1rem'}}>Notes</h2>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={5} placeholder="Internal notes — only visible to admins" style={{...inputStyle, fontFamily:'inherit', resize:'vertical'}} />

            <div style={{display:'flex',gap:'0.75rem',marginTop:'2rem',flexWrap:'wrap'}}>
              <button onClick={save} disabled={saving} style={primaryBtn}>{saving ? 'Saving…' : 'Save'}</button>
              {lead.status !== 'converted' && (
                <button onClick={convert} disabled={converting} style={{...primaryBtn,background:'#10B981',color:'#FFFFFF'}}>
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
          <div style={{fontSize:'0.7rem',color:'rgba(26,32,50,0.4)',marginBottom:'0.25rem',textTransform:'uppercase',letterSpacing:'0.1em'}}>{k}</div>
          <div style={{color:'rgba(26,32,50,0.9)',whiteSpace:'pre-wrap'}}>{v}</div>
        </div>
      );
    }

    function ClientRow({ c, onClick, onRefresh }) {
      const sections = c.sections_filled || 0;
      const isPro = c.plan === 'pro' || c.plan === 'crecimiento' || c.plan === 'growth';
      const totalSections = isPro ? 7 : 6;
      const pct = Math.round((sections / totalSections) * 100);
      const statusColor = { invited: '#94a3b8', in_progress: '#FF5C2E', submitted: '#10b981', active: '#10b981' }[c.status] || '#94a3b8';

      // Site health pill
      const sh = c.site_health;
      const healthOk = sh && sh.ok && sh.total_ms != null && sh.total_ms < 2500;
      const healthSlow = sh && sh.ok && sh.total_ms != null && sh.total_ms >= 2500;
      const healthBad = sh && !sh.ok;
      const healthColor = healthOk ? '#10b981' : healthSlow ? '#FF5C2E' : healthBad ? '#fca5a5' : 'rgba(26,32,50,0.18)';
      const healthLabel = sh ? (sh.ok ? (sh.total_ms < 1000 ? '<1s' : (sh.total_ms/1000).toFixed(1) + 's') : (sh.status_code || 'down')) : '—';

      async function resend(e) { e.stopPropagation(); await adminApi('/api/admin/clients/' + c.id + '/resend', { method: 'POST' }); alert('Magic link resent to ' + c.email); }
      async function openAsClient(e) {
        e.stopPropagation();
        try {
          const r = await adminApi('/api/admin/clients/' + c.id + '/preview-session', { method: 'POST' });
          if (r && r.url) window.open(r.url, '_blank', 'noopener');
        } catch (err) { alert("Couldn't open client portal: " + err.message); }
      }
      async function del(e) {
        e.stopPropagation();
        if (!confirm('Delete ' + (c.business_name || c.email) + '? This removes all data and uploaded files.')) return;
        await adminApi('/api/admin/clients/' + c.id, { method: 'DELETE' });
        onRefresh();
      }
      return (
        <div onClick={onClick} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto',gap:'1.25rem',alignItems:'center',padding:'1.25rem 1.5rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'4px',cursor:'pointer',transition:'all 0.2s'}}>
          <div>
            <div className="serif" style={{fontSize:'1.15rem',marginBottom:'0.25rem'}}>{c.business_name || '(unnamed)'}</div>
            <div style={{color:'rgba(26,32,50,0.5)',fontSize:'0.85rem'}}>
              {c.site_url ? <span style={{color:'rgba(26,32,50,0.6)'}}>{c.site_url.replace(/^https?:\\/\\//,'')}</span> : c.email}
            </div>
          </div>
          {c.site_url && (
            <div style={{display:'flex',alignItems:'center',gap:'0.4rem',padding:'3px 9px',borderRadius:'12px',background:'rgba(26,32,50,0.04)',border:'1px solid '+healthColor+'55'}} title={sh ? 'Last check: '+new Date(sh.checked_at).toLocaleString('en-US') : 'Not yet checked'}>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:healthColor}} />
              <span style={{fontSize:'0.72rem',color:'rgba(26,32,50,0.7)',fontFamily:'ui-monospace,monospace'}}>{healthLabel}</span>
            </div>
          )}
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:statusColor}} />
            <span style={{fontSize:'0.8rem',color:'rgba(26,32,50,0.6)',textTransform:'capitalize'}}>{c.status.replace('_',' ')}</span>
          </div>
          <div style={{minWidth:'120px'}}>
            <div style={{height:'4px',background:'rgba(26,32,50,0.08)',borderRadius:'2px',overflow:'hidden'}}>
              <div style={{height:'100%',width:pct+'%',background:'#FF5C2E'}} />
            </div>
            <div style={{fontSize:'0.7rem',color:'rgba(26,32,50,0.4)',marginTop:'0.25rem',textAlign:'right'}}>{sections}/{totalSections} sections · {c.file_count || 0} files</div>
          </div>
          <div style={{display:'flex',gap:'0.5rem'}}>
            <button onClick={openAsClient} title="Open client portal as this client (new tab)" style={{...iconBtn,color:'#FF5C2E',borderColor:'rgba(255,92,46,0.3)'}}>👁</button>
            <button onClick={resend} title="Resend invite" style={iconBtn}><Mail size={14} /></button>
            <button onClick={del} title="Delete" style={{...iconBtn,color:'#fca5a5'}}><Trash size={14} /></button>
          </div>
        </div>
      );
    }

    function ClientDetail({ detail, onBack, onRefresh }) {
      const { client, sections, files, deliverables } = detail;
      return (
        <div style={{minHeight:'100vh',background:'#FAFAF7'}}>
          <header style={headerStyle}>
            <button onClick={onBack} style={ghostBtn}><ChevL size={14} /> All Clients</button>
            <div className="serif" style={{fontSize:'1.25rem'}}>{client.business_name || client.email}</div>
            <div style={{width:'120px'}}/>
          </header>
          <main style={{padding:'3rem 2rem',maxWidth:'1000px',margin:'0 auto'}}>
            <div style={{display:'flex',alignItems:'baseline',gap:'1rem',marginBottom:'2rem'}}>
              <h1 className="serif" style={{fontSize:'2.5rem',fontWeight:400,margin:0}}>{client.business_name || '(unnamed)'}</h1>
              <span style={{color:'rgba(26,32,50,0.5)',fontSize:'0.9rem'}}>{client.email}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'3rem'}}>
              <Stat label="Plan" value={deliverables?.plan === 'pro' ? 'Growth' : deliverables?.plan === 'esencial' ? 'Essential' : '—'} />
              <Stat label="Status" value={client.status.replace('_',' ')} />
              <Stat label="Language" value={client.language === 'es' ? 'Spanish' : 'English'} />
              <Stat label="Submitted" value={client.submitted_at ? new Date(client.submitted_at).toLocaleDateString('en-US') : '—'} />
            </div>

            <SiteHealthPanel client={client} onChange={onRefresh} />

            <DomainPanel client={client} onChange={onRefresh} />
            <EmailForwardingPanel client={client} sections={sections} />
            <CustomCssPanel client={client} onRefresh={onRefresh} />

            <MockupsPanel client={client} onRefresh={onRefresh} />

            {deliverables && (
              <DeliverablesPanel
                clientId={client.id}
                deliverables={deliverables}
                onChange={onRefresh}
              />
            )}
            <h2 className="serif" style={{fontSize:'1.5rem',marginBottom:'1rem'}}>Intake Data</h2>
            {Object.keys(sections).length === 0 ? (
              <div style={{padding:'2rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',color:'rgba(26,32,50,0.5)',textAlign:'center'}}>No sections filled yet.</div>
            ) : Object.entries(sections).filter(([key]) => !key.startsWith('_')).map(([key, s]) => (
              <div key={key} style={{marginBottom:'1.5rem',padding:'1.5rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'4px'}}>
                <div style={{fontSize:'0.7rem',letterSpacing:'0.2em',color:'#FF5C2E',textTransform:'uppercase',marginBottom:'1rem'}}>{key}</div>
                {Object.entries(s.data || {}).map(([k,v]) => {
                  if (!v) return null;
                  // Defensive: stringify any non-primitive values so an object never reaches React as a child
                  const display = (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
                    ? String(v)
                    : JSON.stringify(v);
                  return (
                    <div key={k} style={{marginBottom:'0.75rem'}}>
                      <div style={{fontSize:'0.7rem',color:'rgba(26,32,50,0.4)',marginBottom:'0.25rem',textTransform:'uppercase',letterSpacing:'0.1em'}}>{k}</div>
                      <div style={{color:'rgba(26,32,50,0.9)',whiteSpace:'pre-wrap'}}>{display}</div>
                    </div>
                  );
                })}
              </div>
            ))}
            <h2 className="serif" style={{fontSize:'1.5rem',marginTop:'3rem',marginBottom:'1rem'}}>Files ({files.length})</h2>
            {files.length === 0 ? (
              <div style={{padding:'2rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',color:'rgba(26,32,50,0.5)',textAlign:'center'}}>No files uploaded.</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
                {files.map(f => (
                  <div key={f.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.85rem 1rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'2px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                      <span style={{fontSize:'0.7rem',color:'#FF5C2E',textTransform:'uppercase',letterSpacing:'0.1em',padding:'0.2rem 0.5rem',background:'rgba(255,92,46,0.1)',borderRadius:'2px'}}>{f.category}</span>
                      <span style={{color:'rgba(26,32,50,0.85)'}}>{f.filename}</span>
                      <span style={{fontSize:'0.75rem',color:'rgba(26,32,50,0.4)'}}>{formatSize(f.size_bytes)}</span>
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

    // ─── AI Assistant Chat Panel (per-client, admin-only) ──────────────────
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
        } catch (e) { alert("Couldn't save: " + e.message); }
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
      const dotColor = !health ? 'rgba(26,32,50,0.2)' : ok ? (total < 1500 ? '#10b981' : total < 3000 ? '#FF5C2E' : '#fca5a5') : '#fca5a5';
      const banner = !health ? 'Not checked yet' :
                     ok ? ('Site up · ' + total + 'ms total') :
                     ('Site down / error: ' + (health.status_code || health.error || 'no response'));

      return (
        <div style={{marginBottom:'2.5rem'}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'1rem'}}>
            <h2 className="serif" style={{fontSize:'1.5rem',margin:0}}>Site health</h2>
            {client.site_url && !editing && (
              <button onClick={check} disabled={checking} style={{...primaryBtn,padding:'8px 16px',fontSize:'0.85rem'}}>
                {checking ? 'Checking…' : 'Verify now'}
              </button>
            )}
          </div>

          {editing ? (
            <div style={{padding:'1.5rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'4px'}}>
              <div style={{fontSize:'0.85rem',color:'rgba(26,32,50,0.6)',marginBottom:'0.5rem'}}>Live site URL</div>
              <div style={{display:'flex',gap:'0.5rem'}}>
                <input value={siteUrl} onChange={e=>setSiteUrl(e.target.value)} placeholder="https://yourbusiness.com" style={{...inputStyle, flex:1}} />
                <button onClick={saveUrl} disabled={savingUrl} style={primaryBtn}>{savingUrl ? 'Saving…' : 'Save'}</button>
                {client.site_url && <button onClick={()=>{setSiteUrl(client.site_url);setEditing(false);}} style={ghostBtn}>Cancel</button>}
              </div>
            </div>
          ) : (
            <>
              <div style={{display:'flex',alignItems:'center',gap:'0.85rem',padding:'1rem 1.25rem',background:'rgba(26,32,50,0.03)',border:'1px solid '+dotColor+'55',borderRadius:'6px',marginBottom:'1rem'}}>
                <div style={{width:'12px',height:'12px',borderRadius:'50%',background:dotColor,flexShrink:0,boxShadow:'0 0 0 4px '+dotColor+'22'}} />
                <div style={{flex:1}}>
                  <a href={client.site_url} target="_blank" rel="noopener" style={{color:'#FF5C2E',textDecoration:'none',fontWeight:600}}>{client.site_url} →</a>
                  <div style={{fontSize:'0.8rem',color:'rgba(26,32,50,0.55)',marginTop:'0.15rem'}}>{banner}{health?.checked_at && ' · ' + new Date(health.checked_at).toLocaleString('en-US')}</div>
                </div>
                <button onClick={()=>setEditing(true)} style={{...ghostBtn,padding:'6px 12px',fontSize:'0.78rem'}}>Edit URL</button>
              </div>

              {health && (
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.75rem'}}>
                  <HealthStat label="TTFB" value={ttfb != null ? ttfb + ' ms' : '—'} hint="time to first byte" good={ttfb != null && ttfb < 800} bad={ttfb != null && ttfb > 1500} />
                  <HealthStat label="Total" value={total != null ? total + ' ms' : '—'} hint="full response" good={total != null && total < 1500} bad={total != null && total > 3000} />
                  <HealthStat label="Size" value={sizeKB != null ? sizeKB + ' KB' : '—'} hint="HTML payload" good={sizeKB && +sizeKB < 200} bad={sizeKB && +sizeKB > 500} />
                  <HealthStat label="Status" value={health.status_code || (health.error ? 'error' : '—')} hint={health.server || ''} good={ok} bad={!ok} />
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    function HealthStat({ label, value, hint, good, bad }) {
      const color = good ? '#10b981' : bad ? '#fca5a5' : 'rgba(26,32,50,0.85)';
      return (
        <div style={{padding:'0.85rem 1rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'4px'}}>
          <div style={{fontSize:'0.65rem',letterSpacing:'0.18em',color:'rgba(26,32,50,0.4)',textTransform:'uppercase',marginBottom:'0.35rem'}}>{label}</div>
          <div className="serif" style={{fontSize:'1.25rem',color,fontFamily:'ui-monospace,monospace',fontWeight:600}}>{value}</div>
          {hint && <div style={{fontSize:'0.7rem',color:'rgba(26,32,50,0.4)',marginTop:'0.2rem'}}>{hint}</div>}
        </div>
      );
    }

    function DomainPanel({ client, onChange }) {
      const [domain, setDomain] = useState(client.custom_domain || '');
      const [working, setWorking] = useState(false);
      const [result, setResult] = useState(null);
      const currentDomain = client.custom_domain || null;

      async function attach() {
        const clean = domain.trim().toLowerCase().replace(/^https?:\\/\\//, '').replace(/\\/.*$/, '').replace(/^www\\./, '');
        if (!clean || !/^[a-z0-9][a-z0-9.-]+\\.[a-z]{2,}$/.test(clean)) {
          alert('Invalid format. Use: yourbusiness.com');
          return;
        }
        if (!confirm('Attach the domain ' + clean + ' to this client? (Cloudflare zone + Worker route + DNS records)')) return;
        setWorking(true); setResult(null);
        try {
          const r = await adminApi('/api/admin/clients/' + client.id + '/domain', {
            method: 'POST', body: JSON.stringify({ domain: clean })
          });
          setResult(r);
          await onChange();
        } catch (e) { alert('Error: ' + e.message); }
        finally { setWorking(false); }
      }
      async function detach() {
        if (!confirm("Detach the domain? The site won't serve on it anymore but will still be at /site/<slug>/.")) return;
        try {
          await adminApi('/api/admin/clients/' + client.id + '/domain', { method: 'DELETE' });
          setDomain(''); setResult(null); await onChange();
        } catch (e) { alert('Error: ' + e.message); }
      }
      return (
        <div style={{marginBottom:'2.5rem'}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'1rem'}}>
            <h2 className="serif" style={{fontSize:'1.5rem',margin:0}}>Customer domain</h2>
            {currentDomain && <span style={{fontSize:'0.75rem',padding:'0.25rem 0.7rem',borderRadius:'999px',background:'rgba(16,185,129,0.18)',color:'#10b981',fontWeight:600}}>{currentDomain}</span>}
          </div>
          <div style={{padding:'1.25rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'4px'}}>
            <p style={{margin:'0 0 1rem',fontSize:'.88rem',color:'rgba(26,32,50,0.7)',lineHeight:1.55}}>Once the domain is ready (registered at any registrar), paste the name here and click Attach. The portal adds it to Cloudflare, creates the Worker route, sets up SSL automatically, and returns the nameservers the client needs to configure at their registrar.</p>
            <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
              <input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="yourbusiness.com" style={{...inputStyle,flex:1,minWidth:220}}/>
              <button onClick={attach} disabled={working} style={primaryBtn}>{working ? 'Attaching…' : 'Attach'}</button>
              {currentDomain && <button onClick={detach} style={ghostBtn}>Detach</button>}
            </div>
            {result && (
              <div style={{marginTop:'1rem',padding:'0.85rem 1rem',background:result.status==='ready'?'rgba(16,185,129,0.08)':'rgba(255,92,46,0.08)',border:'1px solid '+(result.status==='ready'?'rgba(16,185,129,0.3)':'rgba(255,92,46,0.3)'),borderRadius:'6px',fontSize:'0.9rem'}}>
                <div style={{color:result.status==='ready'?'#10b981':'#FF5C2E',fontWeight:600,marginBottom:'0.4rem'}}>Status: {result.status}</div>
                <div style={{color:'rgba(26,32,50,0.85)',lineHeight:1.5}}>{result.msg}</div>
                {result.nameservers && result.nameservers.length > 0 && (
                  <div style={{marginTop:'0.5rem',padding:'0.6rem 0.8rem',background:'#F6F5F0',borderRadius:'4px',fontFamily:'ui-monospace,monospace',fontSize:'0.85rem'}}>
                    {result.nameservers.map((ns, i) => (<div key={i}>{ns}</div>))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    function EmailForwardingPanel({ client, sections }) {
      // Pre-fill from the client's tech intake (already loaded via parent ClientDetail)
      const tech = (sections && sections.tech && sections.tech.data) || {};
      const [localParts, setLocalParts] = useState(tech.emailLocalPart || "");
      const [forwardTo, setForwardTo] = useState(tech.emailForwardTo || "");
      const [working, setWorking] = useState(false);
      const [result, setResult] = useState(null);
      const hasDomain = !!client.custom_domain;

      async function enable() {
        const lps = localParts.trim();
        const dest = forwardTo.trim().toLowerCase();
        if (!lps || !dest || !dest.includes('@')) { alert('Missing data. I need aliases and a destination email.'); return; }
        if (!confirm("Enable forwarding " + lps + "@" + client.custom_domain + " → " + dest + "?\\nCloudflare will send a verification email to " + dest + " — the client must click it.")) return;
        setWorking(true); setResult(null);
        try {
          const r = await adminApi('/api/admin/clients/' + client.id + '/email-forwarding', {
            method: 'POST', body: JSON.stringify({ localParts: lps, forwardTo: dest })
          });
          setResult(r);
        } catch (e) { alert('Error: ' + e.message); }
        finally { setWorking(false); }
      }

      return (
        <div style={{marginBottom:'2.5rem'}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'1rem'}}>
            <h2 className="serif" style={{fontSize:'1.5rem',margin:0}}>Email forwarding</h2>
            <span style={{fontSize:'0.7rem',color:'rgba(26,32,50,0.45)',letterSpacing:'.1em',textTransform:'uppercase'}}>Cloudflare Email Routing · free</span>
          </div>
          <div style={{padding:'1.25rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'4px'}}>
            {!hasDomain ? (
              <p style={{margin:0,color:'rgba(26,32,50,0.55)',fontSize:'.9rem'}}>Attach a domain first before configuring forwarding.</p>
            ) : (
              <>
                <p style={{margin:'0 0 1rem',fontSize:'.88rem',color:'rgba(26,32,50,0.7)',lineHeight:1.55}}>{"Enables Cloudflare's free email forwarding. The client will get a verification email at the destination — without that click, forwarding won't work."}</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.6rem',marginBottom:'.75rem'}}>
                  <div>
                    <label style={{fontSize:'.75rem',color:'rgba(26,32,50,0.55)',display:'block',marginBottom:'.25rem'}}>{"Aliases (comma-separated)"}</label>
                    <input value={localParts} onChange={e=>setLocalParts(e.target.value)} placeholder="hello, info, sales" style={inputStyle}/>
                    <div style={{fontSize:'.75rem',color:'rgba(26,32,50,0.4)',marginTop:'.3rem'}}>{"→ " + (localParts.split(',').map(s=>s.trim()).filter(Boolean).join('@'+(client.custom_domain||'domain.com')+', ') || 'alias') + "@" + (client.custom_domain || 'domain.com')}</div>
                  </div>
                  <div>
                    <label style={{fontSize:'.75rem',color:'rgba(26,32,50,0.55)',display:'block',marginBottom:'.25rem'}}>{"Destination (client's Gmail/Outlook)"}</label>
                    <input value={forwardTo} onChange={e=>setForwardTo(e.target.value)} placeholder="client@gmail.com" style={inputStyle}/>
                  </div>
                </div>
                <button onClick={enable} disabled={working} style={primaryBtn}>{working ? 'Configuring…' : 'Enable forwarding'}</button>
                {result && (
                  <div style={{marginTop:'1rem',padding:'.85rem 1rem',background:result.ok?'rgba(16,185,129,0.08)':'rgba(252,165,165,0.08)',border:'1px solid '+(result.ok?'rgba(16,185,129,0.3)':'rgba(252,165,165,0.4)'),borderRadius:'6px',fontSize:'.9rem'}}>
                    <div style={{color:result.ok?'#10b981':'#fca5a5',fontWeight:600,marginBottom:'.4rem'}}>{result.ok ? '✓ Configured' : 'Error'}</div>
                    <div style={{color:'rgba(26,32,50,0.85)',lineHeight:1.5}}>{result.verification_note || result.msg}</div>
                    {result.log && (
                      <details style={{marginTop:'.5rem'}}>
                        <summary style={{fontSize:'.78rem',color:'rgba(26,32,50,0.5)',cursor:'pointer'}}>Technical details</summary>
                        <pre style={{margin:'.5rem 0 0',padding:'.6rem',background:'#F6F5F0',borderRadius:'4px',fontSize:'.78rem',overflow:'auto'}}>{result.log.join('\\n')}</pre>
                      </details>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      );
    }

    function CustomCssPanel({ client, onRefresh }) {
      const [css, setCss] = useState(client.admin_css || '');
      const [saving, setSaving] = useState(false);
      const [savedAt, setSavedAt] = useState(null);
      const [open, setOpen] = useState(!!client.admin_css);

      async function save() {
        setSaving(true);
        try {
          const r = await adminApi('/api/admin/clients/' + client.id + '/admin-css', {
            method: 'PUT', body: JSON.stringify({ admin_css: css })
          });
          setSavedAt(Date.now());
          if (onRefresh) await onRefresh();
        } catch (e) { alert('Save failed: ' + e.message); }
        finally { setSaving(false); }
      }
      function clear() {
        if (!confirm('Clear all custom CSS for this client?')) return;
        setCss('');
        setTimeout(save, 0);
      }
      return (
        <div style={{marginBottom:'2.5rem'}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'1rem'}}>
            <h2 className="serif" style={{fontSize:'1.5rem',margin:0}}>Custom CSS</h2>
            <button onClick={()=>setOpen(o=>!o)} style={{...ghostBtn,fontSize:'.78rem'}}>{open ? 'Hide' : 'Show'}{client.admin_css ? ' · active' : ''}</button>
          </div>
          {open && (
            <div style={{padding:'1.25rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'4px'}}>
              <p style={{margin:'0 0 .85rem',fontSize:'.88rem',color:'rgba(26,32,50,0.7)',lineHeight:1.55}}>{"Inject raw CSS at the end of every rendered page for this client. Overrides anything in the blueprint. Use this for one-off visual tweaks the AI can't express via the JSON schema. Examples:"}</p>
              <pre style={{margin:'0 0 .85rem',padding:'.7rem .9rem',background:'#F6F5F0',border:'1px solid rgba(26,32,50,0.06)',borderRadius:'4px',fontSize:'.78rem',color:'rgba(26,32,50,0.6)',whiteSpace:'pre-wrap',fontFamily:'ui-monospace,monospace'}}>{".hero h1 { color: #FF5C2E; -webkit-text-stroke: 1.5px #ef4444; paint-order: stroke fill; }\\n.hero-bg { opacity: .05; }\\n.btn { border-radius: 999px; }"}</pre>
              <textarea value={css} onChange={e=>setCss(e.target.value)} rows={10} placeholder="/* Paste CSS here. Saved per-client. Re-generate the mockup to apply. */" style={{...inputStyle,fontFamily:'ui-monospace,SFMono-Regular,monospace',fontSize:'.85rem',resize:'vertical',padding:'.85rem 1rem'}} spellCheck="false"/>
              <div style={{display:'flex',gap:'.5rem',alignItems:'center',marginTop:'.85rem'}}>
                <button onClick={save} disabled={saving} style={primaryBtn}>{saving ? 'Saving…' : 'Save'}</button>
                {client.admin_css && <button onClick={clear} style={{...ghostBtn,color:'#fca5a5',borderColor:'rgba(252,165,165,0.4)'}}>Clear</button>}
                {savedAt && <span style={{fontSize:'.78rem',color:'#10b981'}}>✓ Saved · re-generate mockup to apply</span>}
                <span style={{marginLeft:'auto',fontSize:'.72rem',color:'rgba(26,32,50,0.4)'}}>{css.length} chars · max 64 KB</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    function MockupsPanel({ client, onRefresh }) {
      const [mockups, setMockups] = useState([]);
      const [comments, setComments] = useState({});
      const [preflight, setPreflight] = useState(null);
      const [loading, setLoading] = useState(false);
      const [shareUrls, setShareUrls] = useState({});
      const [shipping, setShipping] = useState({});
      const [uploadOpen, setUploadOpen] = useState(false);

      async function load() {
        setLoading(true);
        try {
          const r = await adminApi('/api/admin/clients/' + client.id + '/mockups');
          const list = r.mockups || [];
          setMockups(list);
          if (list.length) {
            const latest = list[0];
            const [c, p] = await Promise.all([
              adminApi('/api/admin/mockups/' + latest.id + '/comments').catch(() => ({comments:[]})),
              adminApi('/api/admin/mockups/' + latest.id + '/preflight').catch(() => null),
            ]);
            setComments(prev => ({ ...prev, [latest.id]: c.comments || [] }));
            setPreflight(p ? { mockupId: latest.id, ...p } : null);
          } else {
            setPreflight(null);
          }
        } catch (e) { alert('Error: ' + e.message); }
        finally { setLoading(false); }
      }
      useEffect(() => { load(); }, [client.id]);

      async function share(mid) {
        try {
          const r = await adminApi('/api/admin/mockups/' + mid + '/share', { method: 'POST', body: JSON.stringify({ ttl_days: 7 }) });
          setShareUrls(s => ({ ...s, [mid]: r.url }));
          try { await navigator.clipboard.writeText(r.url); } catch (_) {}
        } catch (e) { alert('Error: ' + e.message); }
      }
      async function preview(mid) {
        try {
          const r = await adminApi('/api/admin/mockups/' + mid + '/share', { method: 'POST', body: JSON.stringify({ ttl_days: 1 }) });
          const wrap = String(r.url || '').split('/m/').join('/preview-frame/');
          window.open(wrap || r.url, '_blank', 'noopener');
        } catch (e) { alert('Error: ' + e.message); }
      }
      async function ship(mid) {
        if (!confirm('Publish live? The client must have approved the design first.')) return;
        setShipping(s => ({ ...s, [mid]: true }));
        try {
          const r = await adminApi('/api/admin/mockups/' + mid + '/ship', { method: 'POST' });
          alert('Published: ' + r.url + (r.note ? '\\n\\n' + r.note : ''));
          await load();
        } catch (e) {
          if (e.message && e.message.includes('preflight')) {
            alert("Can't publish: preflight has errors. See the list above and fix them before continuing.");
          } else {
            alert('Error: ' + e.message);
          }
        }
        finally { setShipping(s => ({ ...s, [mid]: false })); }
      }
      async function pushToClient(mid) {
        if (!confirm("Send this mockup to the client? They'll get a 'Your mockup is ready' email.")) return;
        setShipping(s => ({ ...s, [mid]: true }));
        try {
          await adminApi('/api/admin/mockups/' + mid + '/push-to-client', { method: 'POST' });
          alert("Mockup sent to client. They've received an email and can now see it in their Project Portal.");
          await load();
        } catch (e) { alert('Error: ' + e.message); }
        finally { setShipping(s => ({ ...s, [mid]: false })); }
      }
      const latestMockupId = mockups[0]?.id;
      const preflightForLatest = preflight && preflight.mockupId === latestMockupId ? preflight : null;
      const canShipLatest = preflightForLatest ? preflightForLatest.canShip : true;
      const hasShippedMockup = mockups.some(m => m.status === 'shipped');
      const [adminReply, setAdminReply] = useState({});
      async function sendAdminReply(mid) {
        const text = (adminReply[mid] || '').trim();
        if (!text) return;
        try {
          await adminApi('/api/admin/mockups/' + mid + '/reply', { method: 'POST', body: JSON.stringify({ body: text }) });
          setAdminReply(r => ({ ...r, [mid]: '' }));
          await load();
        } catch (e) { alert('Error: ' + e.message); }
      }

      async function disableSite() {
        const reason = prompt('Reason for taking the site down (refund / fraud / customer_request):', 'refund');
        if (reason === null) return;
        if (!confirm('Confirm? The live site will no longer be accessible (HTTP 410).')) return;
        try {
          await adminApi('/api/admin/clients/' + client.id + '/site/disable', { method: 'POST', body: JSON.stringify({ reason }) });
          alert('Site taken down. A "Site unavailable" page will show on the slug.');
          await load();
        } catch (e) { alert('Error: ' + e.message); }
      }
      async function enableSite() {
        if (!confirm('Re-activate the site?')) return;
        try {
          await adminApi('/api/admin/clients/' + client.id + '/site/enable', { method: 'POST' });
          alert('Site re-activated.');
          await load();
        } catch (e) { alert('Error: ' + e.message); }
      }

      const planLabel = client.plan === 'pro' ? 'Growth' : client.plan === 'esencial' ? 'Essential' : '—';
      const planColor = client.plan === 'pro' ? '#10b981' : '#FF5C2E';
      const isProClient = client.plan === 'pro' || client.plan === 'crecimiento' || client.plan === 'growth';
      const revisionsTotal = isProClient ? 5 : 2;
      const pushedCount = mockups.filter(m => m.shipped_at).length;
      const revisionsUsed = Math.max(0, pushedCount - 1);
      const revisionsRemaining = Math.max(0, revisionsTotal - revisionsUsed);
      const revColor = revisionsRemaining === 0 ? '#fca5a5' : revisionsRemaining === 1 ? '#FF5C2E' : '#10b981';
      const nextVersion = (mockups[0]?.version || 0) + 1;

      function blueprintBadge(m) {
        if (!m.blueprint_key) return null;
        const isManual = m.blueprint_key === 'manual';
        const label = isManual ? 'MANUAL' : m.blueprint_key.replace('blueprint-','').toUpperCase();
        const color = isManual ? '#7dd3fc' : 'rgba(26,32,50,0.45)';
        const border = isManual ? 'rgba(125,211,252,0.45)' : 'rgba(26,32,50,0.15)';
        const bg = isManual ? 'rgba(125,211,252,0.08)' : 'transparent';
        return <span style={{marginLeft:'0.6rem',fontSize:'0.65rem',color,padding:'1px 6px',border:'1px solid '+border,background:bg,borderRadius:'3px',letterSpacing:'.05em'}} title={isManual ? 'Hand-built mockup uploaded by admin' : 'Legacy auto-gen template'}>{label}</span>;
      }

      return (
        <div style={{marginBottom:'2.5rem'}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'1rem',flexWrap:'wrap',gap:'0.75rem'}}>
            <div style={{display:'flex',alignItems:'baseline',gap:'0.85rem',flexWrap:'wrap'}}>
              <h2 className="serif" style={{fontSize:'1.5rem',margin:0}}>Mockups</h2>
              <span style={{fontSize:'0.7rem',padding:'0.25rem 0.7rem',borderRadius:'999px',background:planColor+'22',color:planColor,letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:600}}>Plan: {planLabel}</span>
              <span style={{fontSize:'0.7rem',padding:'0.25rem 0.7rem',borderRadius:'999px',background:revColor+'22',color:revColor,letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:600}} title={"Every time you send a mockup to the client counts as 1 round"}>{"Revisions: " + revisionsRemaining + "/" + revisionsTotal + " remaining"}</span>
            </div>
            <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
              <button onClick={()=>setUploadOpen(true)} style={primaryBtn}>
                {mockups.length ? '⇧ Upload mockup v' + nextVersion : '⇧ Upload mockup files'}
              </button>
              {hasShippedMockup && <button onClick={disableSite} style={{...ghostBtn,color:'#fca5a5',borderColor:'rgba(252,165,165,0.4)'}}>Take site down (refund)</button>}
              {hasShippedMockup && <button onClick={enableSite} style={{...ghostBtn,fontSize:'0.78rem'}}>Re-activate</button>}
            </div>
          </div>
          {uploadOpen && <UploadMockupModal client={client} nextVersion={nextVersion} onClose={()=>setUploadOpen(false)} onDone={async () => { setUploadOpen(false); await load(); if (onRefresh) await onRefresh(); }} />}
          {loading ? (
            <div style={{padding:'1rem',color:'rgba(26,32,50,0.5)'}}>Loading…</div>
          ) : mockups.length === 0 ? (
            <div style={{padding:'2rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',color:'rgba(26,32,50,0.5)',textAlign:'center',borderRadius:'4px'}}>
              No mockups yet. Build the site in Cowork, then click "Upload mockup files" to drop the rendered HTML and assets here.
            </div>
          ) : mockups.map(m => (
            <div key={m.id} style={{marginBottom:'1rem',padding:'1.25rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'6px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.75rem',flexWrap:'wrap',gap:'0.5rem'}}>
                <div>
                  <span style={{fontSize:'0.95rem',fontWeight:600,color:'#FF5C2E'}}>v{m.version}</span>
                  <span style={{marginLeft:'0.75rem',fontSize:'0.75rem',color:'rgba(26,32,50,0.5)',textTransform:'uppercase',letterSpacing:'0.1em'}}>{m.status}</span>
                  {blueprintBadge(m)}
                  <span style={{marginLeft:'0.75rem',fontSize:'0.75rem',color:'rgba(26,32,50,0.4)'}}>{new Date(m.created_at*1000).toLocaleString('en-US')}</span>
                </div>
                <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
                  <button onClick={()=>preview(m.id)} style={{...ghostBtn,borderColor:'#FF5C2E',color:'#FF5C2E'}}>👁 Preview</button>
                  <button onClick={()=>share(m.id)} style={ghostBtn}>Share (7 days)</button>
                  {!m.shipped_at && (
                    <button onClick={()=>pushToClient(m.id)} disabled={shipping[m.id]} style={{...primaryBtn,padding:'8px 14px',fontSize:'0.8rem',background:'#FF5C2E',color:'#FAFAF7'}}>
                      {shipping[m.id] ? 'Sending…' : '→ Send to client'}
                    </button>
                  )}
                  {m.shipped_at && !m.approved_at && (
                    <span style={{padding:'8px 14px',fontSize:'0.78rem',color:'rgba(26,32,50,0.6)',}}>Waiting for client approval…</span>
                  )}
                  {(m.approved_at || m.status==='shipped' && m.id===latestMockupId) && (
                    <button onClick={()=>ship(m.id)} disabled={shipping[m.id] || (m.id===latestMockupId && !canShipLatest)} title={(m.id===latestMockupId && !canShipLatest) ? 'Preflight has errors — fix before publishing' : (!m.approved_at ? "Client hasn't approved yet" : '')} style={{...primaryBtn,padding:'8px 14px',fontSize:'0.8rem',opacity:(m.id===latestMockupId && !canShipLatest)?0.4:1}}>
                      {shipping[m.id] ? 'Publishing…' : (m.status==='shipped' && m.shipped_url ? 'Re-publish' : 'Publish live')}
                    </button>
                  )}
                </div>
              </div>
              {m.id===latestMockupId && preflightForLatest && (preflightForLatest.errors.length>0 || preflightForLatest.warnings.length>0) && (
                <div style={{marginTop:'0.5rem',marginBottom:'0.75rem'}}>
                  {preflightForLatest.errors.length>0 && (
                    <div style={{padding:'0.75rem 1rem',background:'rgba(252,165,165,0.08)',border:'1px solid rgba(252,165,165,0.4)',borderRadius:'4px',marginBottom:'0.5rem'}}>
                      <div style={{fontSize:'0.7rem',color:'#fca5a5',textTransform:'uppercase',letterSpacing:'0.12em',fontWeight:600,marginBottom:'0.4rem'}}>{preflightForLatest.errors.length} error(s) — blocks launch</div>
                      {preflightForLatest.errors.map((e,idx)=>(<div key={idx} style={{fontSize:'0.85rem',color:'rgba(26,32,50,0.85)',padding:'0.2rem 0'}}>✗ {e.msg}</div>))}
                    </div>
                  )}
                  {preflightForLatest.warnings.length>0 && (
                    <div style={{padding:'0.75rem 1rem',background:'rgba(255,92,46,0.08)',border:'1px solid rgba(255,92,46,0.3)',borderRadius:'4px'}}>
                      <div style={{fontSize:'0.7rem',color:'#FF5C2E',textTransform:'uppercase',letterSpacing:'0.12em',fontWeight:600,marginBottom:'0.4rem'}}>{preflightForLatest.warnings.length} warning(s) — non-blocking</div>
                      {preflightForLatest.warnings.map((w,idx)=>(<div key={idx} style={{fontSize:'0.85rem',color:'rgba(26,32,50,0.75)',padding:'0.2rem 0'}}>⚠ {w.msg}</div>))}
                    </div>
                  )}
                </div>
              )}
              {m.id===latestMockupId && preflightForLatest && preflightForLatest.errors.length===0 && preflightForLatest.warnings.length===0 && (
                <div style={{padding:'0.5rem 0.85rem',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'4px',marginBottom:'0.75rem',fontSize:'0.85rem',color:'#10b981'}}>✓ Preflight: all clear, ready to launch.</div>
              )}
              {shareUrls[m.id] && (
                <div style={{padding:'0.6rem 0.85rem',background:'rgba(255,92,46,0.08)',border:'1px solid rgba(255,92,46,0.3)',borderRadius:'4px',marginBottom:'0.75rem',fontSize:'0.85rem'}}>
                  <span style={{color:'rgba(26,32,50,0.6)'}}>Temp link (copied):</span> <a href={shareUrls[m.id]} target="_blank" rel="noopener" style={{color:'#FF5C2E'}}>{shareUrls[m.id]}</a>
                </div>
              )}
              {m.shipped_url && (
                <div style={{padding:'0.6rem 0.85rem',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'4px',marginBottom:'0.75rem',fontSize:'0.85rem'}}>
                  <span style={{color:'rgba(26,32,50,0.6)'}}>Live:</span> <a href={m.shipped_url} target="_blank" rel="noopener" style={{color:'#10b981'}}>{m.shipped_url}</a>
                </div>
              )}
              {(comments[m.id] || []).length > 0 && (
                <div style={{marginTop:'0.75rem',padding:'0.75rem',background:'#F6F5F0',borderRadius:'4px'}}>
                  <div style={{fontSize:'0.7rem',color:'rgba(26,32,50,0.5)',marginBottom:'0.5rem',textTransform:'uppercase',letterSpacing:'0.12em'}}>Chat with client</div>
                  {comments[m.id].map(c => (
                    <div key={c.id} style={{padding:'0.5rem 0',borderBottom:'1px solid rgba(26,32,50,0.05)'}}>
                      <div style={{fontSize:'0.7rem',color:c.author==='admin'?'#FF5C2E':'rgba(26,32,50,0.4)'}}>{c.author==='admin'?'You (admin)':'Client'} · {new Date(c.created_at*1000).toLocaleString('en-US')}</div>
                      <div style={{color:'rgba(26,32,50,0.85)',fontSize:'0.9rem',marginTop:'0.2rem',whiteSpace:'pre-wrap'}}>{c.body}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{display:'flex',gap:'0.5rem',marginTop:'0.5rem'}}>
                <input value={adminReply[m.id] || ''} onChange={e=>setAdminReply(r=>({...r,[m.id]:e.target.value}))} placeholder={"Reply to client…" + (m.id !== latestMockupId ? " (older mockup)" : "")} style={{...inputStyle,padding:'0.5rem 0.75rem',flex:1,fontSize:'0.85rem'}}
                  onKeyDown={(e)=>{ if (e.key==='Enter' && (adminReply[m.id]||'').trim()) sendAdminReply(m.id); }} />
                <button onClick={()=>sendAdminReply(m.id)} style={ghostBtn}>Send</button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // ─── Upload Mockup Modal ──────────────────────────────────────────────
    // Pick (or drop) files → POST each to /manual-mockup/upload → POST /finalize.
    // Required: index.html.   Cap: 10 MB total.   Per-file cap: 5 MB.
    function UploadMockupModal({ client, nextVersion, onClose, onDone }) {
      const [files, setFiles] = useState([]); // [{file, status, error}]
      const [submitting, setSubmitting] = useState(false);
      const [progressMsg, setProgressMsg] = useState('');
      const inputRef = useRef(null);
      const dropRef = useRef(null);
      const TOTAL_CAP = 10 * 1024 * 1024;

      function addFiles(list) {
        const arr = Array.from(list || []);
        setFiles(prev => {
          const seen = new Set(prev.map(p => p.file.name));
          const merged = [...prev];
          for (const f of arr) {
            if (seen.has(f.name)) continue;
            merged.push({ file: f, status: 'pending', error: null });
          }
          return merged;
        });
      }
      function removeFile(name) {
        setFiles(prev => prev.filter(p => p.file.name !== name));
      }
      function onDrop(e) {
        e.preventDefault(); e.stopPropagation();
        if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
      }
      function onDragOver(e) { e.preventDefault(); }

      const totalBytes = files.reduce((s, f) => s + f.file.size, 0);
      const overCap = totalBytes > TOTAL_CAP;
      const hasIndexHtml = files.some(f => f.file.name === 'index.html');

      async function submit() {
        if (!hasIndexHtml) { alert('index.html is required.'); return; }
        if (overCap) { alert('Total upload exceeds 10 MB cap.'); return; }
        if (submitting) return;

        // Generate a UUID client-side for this mockup
        let mockupId = '';
        try { mockupId = crypto.randomUUID(); }
        catch (_) { mockupId = 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); }

        setSubmitting(true);
        try {
          // Upload each file in sequence so users see incremental progress
          for (let i = 0; i < files.length; i++) {
            const entry = files[i];
            setProgressMsg('Uploading ' + entry.file.name + ' (' + (i+1) + '/' + files.length + ')…');
            setFiles(prev => prev.map(p => p.file.name === entry.file.name ? {...p, status:'uploading', error:null} : p));
            try {
              const buf = await entry.file.arrayBuffer();
              const tokenForUpload = localStorage.getItem(ADMIN_KEY) || '';
              const r = await fetch('/api/admin/clients/' + client.id + '/manual-mockup/upload', {
                method: 'POST',
                headers: {
                  'Authorization': 'Bearer ' + tokenForUpload,
                  'Content-Type': entry.file.type || 'application/octet-stream',
                  'X-Mockup-Id': mockupId,
                  'X-Filename': entry.file.name,
                },
                body: buf,
              });
              if (!r.ok) {
                const j = await r.json().catch(() => ({}));
                throw new Error(j.msg || j.error || ('HTTP ' + r.status));
              }
              setFiles(prev => prev.map(p => p.file.name === entry.file.name ? {...p, status:'done'} : p));
            } catch (e) {
              setFiles(prev => prev.map(p => p.file.name === entry.file.name ? {...p, status:'error', error:e.message} : p));
              throw new Error('Upload failed for ' + entry.file.name + ': ' + e.message);
            }
          }
          setProgressMsg('Finalizing…');
          const fin = await adminApi('/api/admin/clients/' + client.id + '/manual-mockup/finalize', {
            method: 'POST',
            body: JSON.stringify({ mockup_id: mockupId, version: nextVersion }),
          });
          setProgressMsg('Done. Mockup v' + (fin.mockup?.version || nextVersion) + ' created.');
          await onDone();
        } catch (e) {
          alert('Upload failed: ' + e.message);
        } finally {
          setSubmitting(false);
        }
      }

      const overlay = {
        position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,
        display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem',
      };
      const card = {
        background:'#FAFAF7',border:'1px solid rgba(26,32,50,0.12)',borderRadius:'8px',
        width:'min(640px, 100%)',maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden',
      };
      function fmtSize(n) {
        if (n < 1024) return n + ' B';
        if (n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
        return (n/(1024*1024)).toFixed(2) + ' MB';
      }
      return (
        <div style={overlay} onClick={(e)=>{ if (e.target === e.currentTarget && !submitting) onClose(); }}>
          <div style={card}>
            <div style={{padding:'1rem 1.25rem',borderBottom:'1px solid rgba(26,32,50,0.08)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <h3 style={{margin:0,fontSize:'1.1rem',color:'#1A2032'}}>Upload mockup files</h3>
                <div style={{fontSize:'0.78rem',color:'rgba(26,32,50,0.55)',marginTop:'0.2rem'}}>v{nextVersion} for <strong>{client.business_name || client.email}</strong> · index.html required · 10 MB total cap</div>
              </div>
              <button onClick={onClose} disabled={submitting} style={{...iconBtn,padding:'4px 10px',fontSize:'1.2rem'}}>×</button>
            </div>
            <div style={{padding:'1.25rem',overflowY:'auto',flex:1}}>
              <div ref={dropRef} onDrop={onDrop} onDragOver={onDragOver}
                style={{border:'2px dashed rgba(26,32,50,0.2)',borderRadius:'8px',padding:'2rem 1rem',textAlign:'center',marginBottom:'1rem',cursor:'pointer'}}
                onClick={()=>inputRef.current && inputRef.current.click()}>
                <div style={{fontSize:'0.95rem',color:'rgba(26,32,50,0.85)',marginBottom:'0.4rem'}}>Drag &amp; drop files here, or click to browse</div>
                <div style={{fontSize:'0.75rem',color:'rgba(26,32,50,0.45)'}}>HTML, CSS, JS, images, fonts, sub-pages — index.html is required.</div>
                <input ref={inputRef} type="file" multiple style={{display:'none'}}
                  onChange={(e)=>{ addFiles(e.target.files); e.target.value=''; }} />
              </div>
              {files.length > 0 && (
                <div style={{border:'1px solid rgba(26,32,50,0.08)',borderRadius:'4px',background:'#F6F5F0'}}>
                  {files.map((f,idx)=>(
                    <div key={f.file.name} style={{display:'flex',alignItems:'center',gap:'0.6rem',padding:'0.5rem 0.75rem',borderBottom:idx===files.length-1?'none':'1px solid rgba(26,32,50,0.05)'}}>
                      <span style={{flex:1,fontSize:'0.85rem',color:f.file.name==='index.html'?'#FF5C2E':'rgba(26,32,50,0.85)',fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace'}}>{f.file.name}{f.file.name==='index.html' && <span style={{marginLeft:'0.4rem',fontSize:'0.65rem',color:'#FF5C2E'}}>(required)</span>}</span>
                      <span style={{fontSize:'0.75rem',color:'rgba(26,32,50,0.55)',whiteSpace:'nowrap'}}>{fmtSize(f.file.size)}</span>
                      <span style={{fontSize:'0.7rem',color:f.status==='done'?'#10b981':f.status==='error'?'#fca5a5':f.status==='uploading'?'#FF5C2E':'rgba(26,32,50,0.45)',minWidth:'56px',textAlign:'right'}}>{f.status==='pending'?'queued':f.status}</span>
                      <button onClick={()=>removeFile(f.file.name)} disabled={submitting} title="Remove" style={{...iconBtn,padding:'2px 8px',fontSize:'0.85rem'}}>×</button>
                    </div>
                  ))}
                  <div style={{padding:'0.5rem 0.75rem',fontSize:'0.75rem',color:overCap?'#fca5a5':'rgba(26,32,50,0.5)',borderTop:'1px solid rgba(26,32,50,0.05)'}}>
                    Total: {fmtSize(totalBytes)} {overCap && <span> · OVER CAP (10 MB)</span>}
                  </div>
                </div>
              )}
              {!hasIndexHtml && files.length > 0 && (
                <div style={{marginTop:'0.6rem',fontSize:'0.78rem',color:'#fca5a5'}}>⚠ index.html not in the list yet — required.</div>
              )}
              {progressMsg && <div style={{marginTop:'0.75rem',fontSize:'0.85rem',color:'#FF5C2E'}}>{progressMsg}</div>}
            </div>
            <div style={{padding:'0.85rem 1.25rem',borderTop:'1px solid rgba(26,32,50,0.08)',display:'flex',justifyContent:'flex-end',gap:'0.5rem'}}>
              <button onClick={onClose} disabled={submitting} style={ghostBtn}>Cancel</button>
              <button onClick={submit} disabled={submitting || !hasIndexHtml || files.length===0 || overCap} style={primaryBtn}>
                {submitting ? 'Uploading…' : 'Create mockup v' + nextVersion}
              </button>
            </div>
          </div>
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
          alert("Couldn't update: " + e.message);
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
            <h2 className="serif" style={{fontSize:'1.5rem',margin:0}}>Deliverables</h2>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem',fontSize:'0.85rem',color:'rgba(26,32,50,0.7)'}}>
              <span><b style={{color:'#10b981'}}>{summary.done}</b> done</span>
              <span style={{color:'rgba(26,32,50,0.3)'}}>·</span>
              <span><b style={{color:'#FF5C2E'}}>{summary.in_progress}</b> in progress</span>
              <span style={{color:'rgba(26,32,50,0.3)'}}>·</span>
              <span><b style={{color:'#94a3b8'}}>{summary.pending}</b> pending</span>
              {summary.na > 0 && <><span style={{color:'rgba(26,32,50,0.3)'}}>·</span><span><b style={{color:'#475569'}}>{summary.na}</b> N/A</span></>}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{height:'6px',background:'rgba(26,32,50,0.08)',borderRadius:'3px',overflow:'hidden',marginBottom:'1.5rem'}}>
            <div style={{height:'100%',width:summary.pct+'%',background:'linear-gradient(90deg,#FF5C2E,#10b981)',transition:'width .25s'}}/>
          </div>
          <div style={{textAlign:'right',fontSize:'0.75rem',color:'rgba(26,32,50,0.4)',marginTop:'-1rem',marginBottom:'1.5rem'}}>{summary.pct}% complete</div>

          {Object.entries(grouped).map(([gKey, gItems]) => (
            <div key={gKey} style={{marginBottom:'2rem'}}>
              <div style={{fontSize:'0.7rem',letterSpacing:'0.18em',color:'#FF5C2E',textTransform:'uppercase',marginBottom:'0.75rem'}}>
                {groups[gKey] || gKey}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
                {gItems.map(it => (
                  <div key={it.key} style={{
                    display:'grid',gridTemplateColumns:'24px 1fr auto',gap:'0.75rem',alignItems:'center',
                    padding:'0.6rem 0.85rem',
                    background:it.status==='done' ? 'rgba(16,185,129,0.06)' : it.status==='in_progress' ? 'rgba(255,92,46,0.06)' : 'rgba(26,32,50,0.03)',
                    border:'1px solid '+(it.status==='done' ? 'rgba(16,185,129,0.25)' : it.status==='in_progress' ? 'rgba(255,92,46,0.25)' : 'rgba(26,32,50,0.08)'),
                    borderRadius:'3px'
                  }}>
                    <span style={{color:statusColor(it.status),fontSize:'1rem',textAlign:'center',fontWeight:700}}>{statusIcon(it.status)}</span>
                    <span style={{
                      color: it.status==='na' ? 'rgba(26,32,50,0.35)' : 'rgba(26,32,50,0.92)',
                      textDecoration: it.status==='done' ? 'none' : 'none',
                      fontSize:'0.92rem'
                    }}>
                      {it.label}
                      {it.plan === 'pro' && <span style={{marginLeft:'0.5rem',fontSize:'0.65rem',padding:'1px 6px',border:'1px solid rgba(252,209,22,0.4)',color:'#fcd116',borderRadius:'3px',letterSpacing:'0.08em',textTransform:'uppercase'}}>Growth</span>}
                    </span>
                    <select value={it.status} onChange={e => setStatus(it.key, e.target.value)} style={{
                      background: it.status==='pending' ? 'rgba(251,113,133,0.18)'
                                : it.status==='in_progress' ? 'rgba(255,92,46,0.18)'
                                : it.status==='done' ? 'rgba(16,185,129,0.18)'
                                : 'rgba(26,32,50,0.05)',
                      color: it.status==='pending' ? '#fda4af'
                           : it.status==='in_progress' ? '#FF5C2E'
                           : it.status==='done' ? '#10b981'
                           : 'rgba(26,32,50,0.6)',
                      border: '1px solid ' + (
                        it.status==='pending' ? 'rgba(251,113,133,0.45)'
                      : it.status==='in_progress' ? 'rgba(255,92,46,0.5)'
                      : it.status==='done' ? 'rgba(16,185,129,0.45)'
                      : 'rgba(26,32,50,0.12)'),
                      borderRadius:'3px',padding:'4px 8px',fontSize:'0.78rem',
                      cursor:'pointer',fontFamily:'inherit',fontWeight:600
                    }}>
                      <option value="pending" style={{background:'#FFFFFF',color:'#1A2032'}}>Pending</option>
                      <option value="in_progress" style={{background:'#FFFFFF',color:'#1A2032'}}>In progress</option>
                      <option value="done" style={{background:'#FFFFFF',color:'#1A2032'}}>Done</option>
                      <option value="na" style={{background:'#FFFFFF',color:'#1A2032'}}>N/A</option>
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
        <div style={{padding:'1.25rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'4px'}}>
          <div style={{fontSize:'0.7rem',letterSpacing:'0.2em',color:'rgba(26,32,50,0.4)',textTransform:'uppercase',marginBottom:'0.5rem'}}>{label}</div>
          <div className="serif" style={{fontSize:'1.5rem',color:'#1A2032',textTransform:'capitalize'}}>{value}</div>
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
          <div onClick={e=>e.stopPropagation()} style={{maxWidth:'480px',width:'100%',background:'#FAFAF7',border:'1px solid rgba(26,32,50,0.1)',borderRadius:'4px',padding:'2.5rem'}}>
            <h2 className="serif" style={{fontSize:'1.75rem',margin:'0 0 1.5rem'}}>Invite Client</h2>
            {result ? (
              <>
                <div style={{padding:'1rem',background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'2px',marginBottom:'1rem',fontSize:'0.9rem'}}>
                  <Check size={14} style={{display:'inline',marginRight:'0.5rem'}} color="#10b981" /> Invite sent
                </div>
                <div style={{fontSize:'0.75rem',color:'rgba(26,32,50,0.5)',marginBottom:'0.5rem'}}>Direct invite link (also emailed):</div>
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
                        <button key={l} onClick={()=>setLanguage(l)} style={{flex:1,padding:'0.75rem',background:language===l?'rgba(255,92,46,0.15)':'rgba(26,32,50,0.03)',border:'1px solid '+(language===l?'#FF5C2E':'rgba(26,32,50,0.1)'),color:language===l?'#FF5C2E':'rgba(26,32,50,0.7)',borderRadius:'2px',cursor:'pointer',fontFamily:'inherit'}}>{l==='en'?'English':'Español'}</button>
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
                <Sparkle size={20} color="#FF5C2E"/>
                <span style={{color:'#FF5C2E',letterSpacing:'0.3em',fontSize:'0.75rem',textTransform:'uppercase'}}>{t.tagline}</span>
              </div>
              <h1 className="serif" style={titleStyle}>Pyme<span style={{color:'#FF5C2E'}}>WebPro</span></h1>
              <div style={{height:'1px',width:'60px',background:'#FF5C2E',margin:'1.5rem auto'}}/>
              <p style={{color:'rgba(26,32,50,0.7)',fontSize:'1rem',margin:0}}>{t.loginTitle}</p>
              <p style={{color:'rgba(26,32,50,0.4)',fontSize:'0.9rem',marginTop:'0.5rem'}}>{t.loginSub}</p>
            </div>
            <div style={cardStyle}>
              <div style={{position:'relative',marginBottom:'1.5rem'}}>
                <Mail size={18} style={{position:'absolute',left:'1rem',top:'50%',transform:'translateY(-50%)',color:'rgba(26,32,50,0.4)'}}/>
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
            <div style={{width:'80px',height:'80px',borderRadius:'50%',background:'rgba(255,92,46,0.1)',border:'1px solid #FF5C2E',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 2rem'}}><Mail size={32} color="#FF5C2E"/></div>
            <h2 className="serif" style={{color:'#1A2032',fontSize:'2rem',margin:0}}>{t.linkSent}</h2>
            <p style={{color:'rgba(26,32,50,0.6)',marginTop:'1rem'}}>{t.linkSentSub}</p>
            <p style={{color:'#FF5C2E',fontSize:'1.1rem',marginTop:'0.5rem'}}>{email}</p>
            <button onClick={onBack} style={{...ghostBtn,marginTop:'3rem'}}>{t.backToLogin}</button>
          </div>
        </Center>
      );
    }

    function Submitted({ t }) {
      return (
        <Center>
          <div style={{maxWidth:'500px',textAlign:'center'}}>
            <div style={{width:'100px',height:'100px',borderRadius:'50%',background:'#FF5C2E',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 2rem'}}><Check size={48} color="#FAFAF7" strokeWidth={3}/></div>
            <h2 className="serif" style={{color:'#1A2032',fontSize:'2.5rem',margin:0}}>{t.submitted}</h2>
            <p style={{color:'rgba(26,32,50,0.6)',marginTop:'1.5rem',fontSize:'1.05rem',lineHeight:1.6}}>{t.submittedSub}</p>
          </div>
        </Center>
      );
    }

    // Customer-facing post-submit portal: mockup preview + chat + approve + upsells
    function ProjectPortal({ t, lang, setLang, client, email, onLogout }) {
      const [data, setData] = useState(null);
      const [loading, setLoading] = useState(true);
      const [posting, setPosting] = useState(false);
      const [msg, setMsg] = useState("");
      const [viewport, setViewport] = useState("desktop");
      const isEs = lang !== "en";

      async function load() {
        try {
          const r = await api("/api/client/project");
          setData(r);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
      }
      useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, []);

      async function send() {
        const text = msg.trim();
        if (!text) return;
        setPosting(true);
        try {
          await api("/api/client/project/comment", { method: "POST", body: JSON.stringify({ body: text }) });
          setMsg("");
          await load();
        } catch (e) { alert("Error: " + e.message); }
        finally { setPosting(false); }
      }
      async function approve() {
        const ok = confirm(isEs ? "¿Aprobar este diseño? Procederemos a lanzarlo en vivo." : "Approve this design? We will proceed to launch it.");
        if (!ok) return;
        try { await api("/api/client/project/approve", { method: "POST" }); await load(); }
        catch (e) { alert("Error: " + e.message); }
      }
      async function upgrade() {
        try {
          const r = await api("/api/client/project/upgrade", { method: "POST" });
          if (r.checkout_url) location.href = r.checkout_url;
        } catch (e) { alert("Error: " + e.message); }
      }
      async function buyHosting(period) {
        try {
          const r = await api("/api/client/project/hosting", { method: "POST", body: JSON.stringify({ period }) });
          if (r.checkout_url) location.href = r.checkout_url;
        } catch (e) { alert("Error: " + e.message); }
      }

      if (loading) return <Center><div style={{color:"rgba(26,32,50,0.5)"}}>{isEs ? "Cargando…" : "Loading…"}</div></Center>;
      if (!data) return <Center><div style={{color:"#fca5a5"}}>{isEs ? "No se pudo cargar el proyecto." : "Could not load project."}</div></Center>;

      const project = data.project || {};
      const opts = data.options || {};
      const state = project.state;

      // Shared header
      const Header = () => (
        <header style={headerStyle}>
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
            <Sparkle size={18} color="#FF5C2E"/>
            <span className="serif" style={{fontSize:"1.25rem"}}>Pyme<span style={{color:"#FF5C2E"}}>WebPro</span></span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"1rem"}}>
            <button onClick={()=>setLang(lang==="en"?"es":"en")} style={langBtn}>{lang==="en"?"ES":"EN"}</button>
            <span style={{color:"rgba(26,32,50,0.5)",fontSize:"0.85rem"}}>{email}</span>
            <button onClick={onLogout} style={{background:"transparent",border:"none",color:"rgba(26,32,50,0.4)",cursor:"pointer"}}><LogOut size={18}/></button>
          </div>
        </header>
      );

      // ─── State: waiting for mockup (48h live countdown) ──────────────
      if (state === "waiting_for_mockup") {
        return <WaitingForMockup project={project} opts={opts} isEs={isEs} email={email} t={t} lang={lang} setLang={setLang} onLogout={onLogout} />;
      }

      // ─── State: live ──────────────────────────────────────────────────
      if (state === "live") {
        return (
          <div style={{minHeight:"100vh",background:"#FAFAF7",color:"#1A2032"}}>
            <Header/>
            <main style={{padding:"4rem 2rem",maxWidth:"720px",margin:"0 auto",textAlign:"center"}}>
              <div style={{width:"100px",height:"100px",borderRadius:"50%",background:"#10b981",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 2rem"}}><Check size={48} color="#FAFAF7" strokeWidth={3}/></div>
              <h1 className="serif" style={{fontSize:"2.6rem",fontWeight:400,margin:"0 0 1.25rem"}}>{isEs ? "¡Su sitio está en vivo!" : "Your site is live!"}</h1>
              {project.live_url && <p style={{margin:"0 0 2rem"}}><a href={project.live_url} target="_blank" rel="noopener" style={{color:"#FF5C2E",fontSize:"1.15rem",fontWeight:600}}>{project.live_url} →</a></p>}
              <p style={{color:"rgba(26,32,50,0.65)",lineHeight:1.65,marginBottom:"2.5rem"}}>{isEs ? "Cualquier cambio o duda, escríbanos en el chat más abajo. Estamos a su lado." : "Any changes or questions? Message us in the chat below. We are here to help."}</p>
              <ChatPanel comments={project.comments || []} onSend={send} value={msg} onChange={setMsg} posting={posting} t={t} lang={lang}/>
            </main>
          </div>
        );
      }

      // ─── State: approved, building ────────────────────────────────────
      if (state === "approved_building") {
        return (
          <div style={{minHeight:"100vh",background:"#FAFAF7",color:"#1A2032"}}>
            <Header/>
            <main style={{padding:"4rem 2rem",maxWidth:"640px",margin:"0 auto"}}>
              <div style={{textAlign:"center"}}>
                <div style={{width:"80px",height:"80px",borderRadius:"50%",background:"rgba(16,185,129,0.18)",border:"1px solid #10b981",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 2rem"}}><Check size={32} color="#10b981"/></div>
                <h1 className="serif" style={{fontSize:"2.4rem",fontWeight:400,margin:"0 0 1.25rem",textAlign:"center"}}>{isEs ? "Diseño aprobado — estamos en los últimos detalles" : "Design approved — we are finishing up"}</h1>
                <p style={{color:"rgba(26,32,50,0.65)",lineHeight:1.65,marginBottom:"2rem",textAlign:"center"}}>{isEs ? "Le notificamos por correo cuando su sitio esté en vivo." : "We will email you when your site is live."}</p>
              </div>
              <ChatPanel comments={project.comments || []} onSend={send} value={msg} onChange={setMsg} posting={posting} t={t} lang={lang}/>
            </main>
          </div>
        );
      }

      // ─── State: reviewing mockup (the main interactive state) ────────
      const previewWidths = { desktop: "100%", tablet: "768px", mobile: "375px" };
      return (
        <div style={{minHeight:"100vh",background:"#FAFAF7",color:"#1A2032"}}>
          <Header/>
          <main style={{padding:"2rem",maxWidth:"1280px",margin:"0 auto"}}>
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:"1rem"}}>
              <div>
                <h1 className="serif" style={{fontSize:"2rem",fontWeight:400,margin:0}}>{isEs ? "Su mockup está listo" : "Your mockup is ready"}</h1>
                <p style={{color:"rgba(26,32,50,0.6)",marginTop:".4rem",fontSize:".95rem"}}>{isEs ? "Versión " : "Version "}{(project.mockup && project.mockup.version) || 1} · {isEs ? "revíselo, pida cambios o apruébelo abajo" : "review it, request changes, or approve below"}</p>
                {project.revisions && (
                  <p style={{color:"rgba(26,32,50,0.5)",marginTop:".25rem",fontSize:".82rem"}}>
                    {isEs
                      ? ("Ronda de revisión " + (project.revisions.used + 1) + " de " + (project.revisions.total + 1) + " · " + project.revisions.remaining + " ronda" + (project.revisions.remaining===1?"":"s") + " restante" + (project.revisions.remaining===1?"":"s"))
                      : ("Revision round " + (project.revisions.used + 1) + " of " + (project.revisions.total + 1) + " · " + project.revisions.remaining + " round" + (project.revisions.remaining===1?"":"s") + " remaining")}
                  </p>
                )}
              </div>
              <div style={{display:"flex",gap:".4rem"}}>
                {["desktop","tablet","mobile"].map(v => (
                  <button key={v} onClick={()=>setViewport(v)} style={{padding:".5rem 1rem",background:viewport===v?"rgba(255,92,46,0.15)":"rgba(26,32,50,0.04)",border:"1px solid "+(viewport===v?"#FF5C2E":"rgba(26,32,50,0.1)"),color:viewport===v?"#FF5C2E":"rgba(26,32,50,0.6)",borderRadius:"4px",cursor:"pointer",fontFamily:"inherit",fontSize:".82rem",textTransform:"capitalize"}}>{v}</button>
                ))}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"minmax(0, 1fr) 360px",gap:"1.5rem"}}>
              {/* Mockup iframe */}
              <div style={{background:"#0f1640",border:"1px solid rgba(26,32,50,0.08)",borderRadius:"6px",padding:"1rem",display:"flex",justifyContent:"center"}}>
                {project.mockup && project.mockup.preview_url ? (
                  <iframe src={project.mockup.preview_url} style={{width:previewWidths[viewport],maxWidth:"100%",height:"720px",border:0,borderRadius:"4px",background:"#fff",transition:"width .3s"}} title="Mockup preview" />
                ) : <div style={{padding:"3rem",color:"rgba(26,32,50,0.4)"}}>{isEs ? "Mockup no disponible" : "Mockup not available"}</div>}
              </div>

              {/* Right side — chat + approve + upsells */}
              <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
                <button onClick={approve} style={{...primaryBtn,width:"100%",padding:"1.1rem",fontSize:".95rem"}}>
                  <Check size={18} strokeWidth={3}/> {isEs ? "Aprobar este diseño" : "Approve this design"}
                </button>
                <ChatPanel comments={project.comments || []} onSend={send} value={msg} onChange={setMsg} posting={posting} t={t} lang={lang}/>

                {/* Upsells */}
                {opts.can_upgrade && (
                  <div style={{padding:"1.25rem",background:"rgba(255,92,46,0.06)",border:"1px solid rgba(255,92,46,0.25)",borderRadius:"6px"}}>
                    <div style={{fontSize:".7rem",letterSpacing:".15em",color:"#FF5C2E",textTransform:"uppercase",marginBottom:".4rem",fontWeight:600}}>{isEs ? "Mejorar a Crecimiento" : "Upgrade to Growth"}</div>
                    <div style={{fontSize:".88rem",color:"rgba(26,32,50,0.8)",lineHeight:1.5,marginBottom:".75rem"}}>{isEs ? "Blog, galería ampliada, descargas en PDF, equipo y FAQ. Bilingüe ES + EN. 1 año de hosting incluido. 5 rondas de cambios en total." : "Blog, extended gallery, PDF downloads, team and FAQ. Bilingual ES + EN. 1 year of hosting included. 5 revision rounds total."}</div>
                    <button onClick={upgrade} style={{...primaryBtn,width:"100%",fontSize:".85rem",padding:".75rem"}}>{"+ $" + (opts.upgrade_amount_cop||0).toLocaleString("es-CO") + " COP"}</button>
                  </div>
                )}
                <div style={{padding:"1.25rem",background:"rgba(26,32,50,0.03)",border:"1px solid rgba(26,32,50,0.08)",borderRadius:"6px"}}>
                  <div style={{fontSize:".7rem",letterSpacing:".15em",color:"rgba(26,32,50,0.5)",textTransform:"uppercase",marginBottom:".4rem",fontWeight:600}}>{isEs ? "Plan Hosting" : "Hosting Plan"}</div>
                  <div style={{fontSize:".88rem",color:"rgba(26,32,50,0.8)",lineHeight:1.5,marginBottom:".75rem"}}>{isEs ? "Hospedaje + cambios mensuales + soporte. Cancele cuando quiera." : "Hosting + monthly changes + support. Cancel anytime."}</div>
                  <div style={{display:"flex",gap:".5rem"}}>
                    <button onClick={()=>buyHosting("monthly")} style={{...ghostBtn,flex:1,fontSize:".8rem",padding:".7rem .5rem"}}>{"$" + (opts.hosting_monthly_cop||0).toLocaleString("es-CO") + "/mes"}</button>
                    <button onClick={()=>buyHosting("annual")} style={{...primaryBtn,flex:1,fontSize:".8rem",padding:".7rem .5rem"}}>{"$" + (opts.hosting_annual_cop||0).toLocaleString("es-CO") + "/año"}</button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      );
    }

    // 48-hour countdown screen shown immediately after intake submission,
    // before admin pushes the mockup. Auto-refreshes every minute so the
    // clock stays current and the page transitions when the mockup ships.
    function WaitingForMockup({ project, opts, isEs, email, t, lang, setLang, onLogout }) {
      const submittedAt = Number(project.submitted_at || Date.now());
      const deadline = submittedAt + 48 * 3600 * 1000;
      const [tick, setTick] = useState(Date.now());
      useEffect(() => { const id = setInterval(() => setTick(Date.now()), 60000); return () => clearInterval(id); }, []);
      const remainingMs = Math.max(0, deadline - tick);
      const hours = Math.floor(remainingMs / 3600000);
      const minutes = Math.floor((remainingMs % 3600000) / 60000);
      const overdue = remainingMs === 0;
      return (
        <div style={{minHeight:"100vh",background:"#FAFAF7",color:"#1A2032"}}>
          <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"1.25rem 2rem",borderBottom:"1px solid rgba(26,32,50,0.06)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
              <Sparkle size={18} color="#FF5C2E"/>
              <span className="serif" style={{fontSize:"1.25rem"}}>Pyme<span style={{color:"#FF5C2E"}}>WebPro</span></span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"1rem"}}>
              <button onClick={()=>setLang(lang==="en"?"es":"en")} style={{background:"transparent",border:"1px solid rgba(26,32,50,0.15)",color:"rgba(26,32,50,0.7)",padding:".4rem .8rem",borderRadius:"4px",fontSize:".82rem",cursor:"pointer"}}>{lang==="en"?"ES":"EN"}</button>
              <span style={{color:"rgba(26,32,50,0.5)",fontSize:"0.85rem"}}>{email}</span>
              <button onClick={onLogout} style={{background:"transparent",border:"none",color:"rgba(26,32,50,0.4)",cursor:"pointer"}}><LogOut size={18}/></button>
            </div>
          </header>
          <main style={{padding:"4rem 2rem",maxWidth:"640px",margin:"0 auto",textAlign:"center"}}>
            <div style={{width:"80px",height:"80px",borderRadius:"50%",background:"rgba(255,92,46,0.12)",border:"1px solid #FF5C2E",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 2rem"}}><Loader size={32} color="#FF5C2E" className="spin"/></div>
            <h1 className="serif" style={{fontSize:"2.4rem",fontWeight:400,margin:"0 0 1.25rem"}}>{isEs ? "Estamos preparando su mockup" : "We're preparing your mockup"}</h1>
            {!overdue ? (
              <>
                <div style={{fontFamily:"Fraunces, serif",fontSize:"3.5rem",fontWeight:300,color:"#FF5C2E",margin:"1rem 0 .5rem",letterSpacing:".02em"}}>{hours}<span style={{fontSize:"1.4rem",color:"rgba(26,32,50,0.5)",margin:"0 .35rem"}}>{isEs?"h":"h"}</span>{minutes}<span style={{fontSize:"1.4rem",color:"rgba(26,32,50,0.5)",margin:"0 .35rem"}}>m</span></div>
                <p style={{color:"rgba(26,32,50,0.6)",fontSize:".88rem",marginBottom:"2rem"}}>{isEs ? "tiempo estimado restante" : "estimated time remaining"}</p>
              </>
            ) : (
              <p style={{color:"#FF5C2E",fontSize:"1.05rem",marginBottom:"2rem"}}>{isEs ? "Lo estamos finalizando — recibirá el aviso pronto." : "We're finalising it — you'll get the notice shortly."}</p>
            )}
            <p style={{color:"rgba(26,32,50,0.7)",fontSize:"1.05rem",lineHeight:1.65,margin:"0 0 2rem"}}>{isEs ? "Le enviaremos un correo cuando esté listo para revisar. Esta página se actualiza sola." : "We'll email you when it's ready to review. This page refreshes itself."}</p>
            <p style={{color:"rgba(26,32,50,0.45)",fontSize:".9rem"}}>{isEs ? "¿Olvidó algo? " : "Forgot something? "}<a href="#" onClick={(e)=>{e.preventDefault();location.reload();}} style={{color:"#FF5C2E"}}>{isEs ? "Editar mis datos" : "Edit my info"}</a></p>
          </main>
        </div>
      );
    }

    // Reusable chat thread for the project portal
    function ChatPanel({ comments, onSend, value, onChange, posting, t, lang }) {
      const isEs = lang !== "en";
      return (
        <div style={{background:"rgba(26,32,50,0.03)",border:"1px solid rgba(26,32,50,0.08)",borderRadius:"6px",padding:"1rem"}}>
          <div style={{fontSize:".7rem",letterSpacing:".15em",color:"rgba(26,32,50,0.5)",textTransform:"uppercase",marginBottom:".75rem",fontWeight:600}}>{isEs ? "Chat con el equipo" : "Chat with the team"}</div>
          <div style={{maxHeight:"320px",overflowY:"auto",display:"flex",flexDirection:"column",gap:".5rem",marginBottom:".75rem"}}>
            {(comments || []).length === 0 ? (
              <div style={{color:"rgba(26,32,50,0.7)",fontSize:".85rem",padding:".75rem .9rem",background:"rgba(255,92,46,0.06)",border:"1px solid rgba(255,92,46,0.2)",borderRadius:"6px",lineHeight:"1.5"}}>{isEs ? "Aún no hay mensajes. Si quiere algún cambio, escríbalo abajo. PymeWebPro responde dentro de 24 horas hábiles." : "No messages yet. Type below if you want changes. PymeWebPro replies within 24 business hours."}</div>
            ) : (
              <>
                {(comments || []).map(c => (
                  <div key={c.id} style={{padding:".6rem .8rem",background:c.author==="admin"?"rgba(255,92,46,0.08)":"rgba(26,32,50,0.04)",border:"1px solid "+(c.author==="admin"?"rgba(255,92,46,0.2)":"rgba(26,32,50,0.06)"),borderRadius:"4px"}}>
                    <div style={{fontSize:".7rem",color:c.author==="admin"?"#FF5C2E":"rgba(26,32,50,0.45)",marginBottom:".2rem",fontWeight:600}}>{c.author==="admin"?"PymeWebPro":(isEs?"Usted":"You")} · {new Date(c.created_at*1000).toLocaleString(isEs?"es-CO":"en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                    <div style={{color:"rgba(26,32,50,0.9)",fontSize:".9rem",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{c.body}</div>
                  </div>
                ))}
                {!comments.some(c => c.author === "admin") && (
                  <div style={{marginTop:".25rem",color:"rgba(255,92,46,0.75)",fontSize:".78rem",padding:".5rem .75rem",borderLeft:"2px solid rgba(255,92,46,0.4)",lineHeight:"1.45"}}>{isEs ? "PymeWebPro está revisando, le respondemos dentro de 24 horas hábiles." : "PymeWebPro is reviewing, we'll reply within 24 business hours."}</div>
                )}
              </>
            )}
          </div>
          <textarea value={value} onChange={(e)=>onChange(e.target.value)} placeholder={isEs?"Escriba su mensaje…":"Type your message…"} rows={3} style={{...inputStyle,resize:"vertical",fontSize:".9rem",padding:".7rem .85rem"}}/>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:".5rem"}}>
            <button onClick={onSend} disabled={posting || !value.trim()} style={{...primaryBtn,fontSize:".82rem",padding:".55rem 1.1rem"}}>{posting?(isEs?"Enviando…":"Sending…"):(isEs?"Enviar":"Send")}</button>
          </div>
        </div>
      );
    }

    // ─── Wizard step config ────────────────────────────────────────────
    // Single source of truth for the step-by-step intake flow.
    // Each step: key + section + group + question/help/placeholder per locale + input type.
    // proOnly steps are filtered out for Esencial customers.
    const WIZARD_STEPS = [
      // Datos básicos
      { key:'bizName', section:'business', group:{es:'Datos básicos',en:'The basics'}, type:'text',
        q:{es:'¿Cómo se llama su negocio?',en:"What's your business name?"},
        h:{es:'Aparecerá en el título de la página, el footer y en su logo si no nos sube uno.',en:"Appears in the page title, footer, and logo if you don't upload one."},
        p:{es:'Panadería La Esquina',en:'La Esquina Bakery'} },
      { key:'nit', section:'business', group:{es:'Datos básicos',en:'The basics'}, type:'text',
        q:{es:'¿Cuál es su NIT o cédula?',en:"What's your tax ID (NIT or cédula)?"},
        h:{es:'Lo necesitamos para la política de privacidad y los términos de su sitio (Ley 1581 de 2012).',en:'Required for the privacy policy and terms (Colombian Law 1581 of 2012).'},
        p:{es:'900.123.456-7',en:'900.123.456-7'} },
      { key:'legalRepresentative', section:'business', group:{es:'Datos básicos',en:'The basics'}, type:'text',
        q:{es:'¿Nombre del representante legal?',en:'Legal representative name?'},
        h:{es:'Opcional. Aparece en la política de privacidad como contacto formal.',en:'Optional. Listed in the privacy policy as the formal contact.'},
        p:{es:'',en:''} },
      { key:'tagline', section:'business', group:{es:'Datos básicos',en:'The basics'}, type:'text',
        q:{es:'En una frase, ¿qué hace su negocio?',en:'In one sentence, what does your business do?'},
        h:{es:'Esta frase aparece en grande debajo del nombre. La pulimos antes de mostrarle el mockup.',en:'Appears prominently under the business name. We polish it before the mockup.'},
        p:{es:'Pan caliente desde 1995. Producción artesanal, atención cercana.',en:'Fresh bread since 1995. Artisan-made, friendly service.'} },
      { key:'whatYouDo', section:'business', group:{es:'Datos básicos',en:'The basics'}, type:'textarea',
        q:{es:'Cuéntenos un poco más: ¿qué vende u ofrece, qué lo hace diferente, quién ya le compra?',en:'Tell us more: what do you sell, what makes you different, who already buys from you?'},
        h:{es:'En sus propias palabras. Nosotros lo convertimos en texto profesional.',en:'In your own words. We turn it into polished site copy.'},
        p:{es:'',en:''} },
      { key:'audience', section:'business', group:{es:'Datos básicos',en:'The basics'}, type:'textarea',
        q:{es:'¿Quién es su cliente ideal?',en:'Who is your ideal customer?'},
        h:{es:'Familias del barrio, profesionales 30-50 años, otras pymes... lo que aplique.',en:'Local families, professionals 30-50, other small businesses... whatever fits.'},
        p:{es:'',en:''} },

      // Contacto
      { key:'phone', section:'contact', group:{es:'Cómo lo contactan',en:'How visitors reach you'}, type:'tel',
        q:{es:'¿Su teléfono público?',en:'Public phone number?'},
        h:{es:'Aparece en el botón Llamar y en el footer.',en:'Shown in the Call button and footer.'},
        p:{es:'+57 300 123 4567',en:'+57 300 123 4567'} },
      { key:'whatsapp', section:'contact', group:{es:'Cómo lo contactan',en:'How visitors reach you'}, type:'tel',
        q:{es:'¿Su WhatsApp Business?',en:'WhatsApp Business number?'},
        h:{es:'Si es el mismo del teléfono, déjelo en blanco — usaremos el de arriba.',en:"If same as your phone, leave blank — we'll reuse it."},
        p:{es:'+57 300 123 4567',en:'+57 300 123 4567'} },
      { key:'email', section:'contact', group:{es:'Cómo lo contactan',en:'How visitors reach you'}, type:'email',
        q:{es:'¿Email público para clientes?',en:'Public email for customers?'},
        h:{es:'No tiene que ser su correo personal. Le configuramos info@sunegocio.com si quiere.',en:"Doesn't have to be your personal email. We set up info@yourbusiness.com if you like."},
        p:{es:'info@sunegocio.com',en:'info@yourbusiness.com'} },
      { key:'address', section:'contact', group:{es:'Cómo lo contactan',en:'How visitors reach you'}, type:'text',
        q:{es:'¿Dirección física?',en:'Physical address?'},
        h:{es:'Si atiende en una ubicación. Si no, sáltela.',en:"If you've a physical location. Otherwise skip."},
        p:{es:'Calle 50 # 23-45, Medellín',en:'Calle 50 # 23-45, Medellín'} },
      { key:'instagram', section:'contact', group:{es:'Cómo lo contactan',en:'How visitors reach you'}, type:'text',
        q:{es:'¿Instagram?',en:'Instagram?'},
        h:{es:'URL completo o @handle.',en:'Full URL or @handle.'},
        p:{es:'@sunegocio',en:'@yourbusiness'} },
      { key:'fb', section:'contact', group:{es:'Cómo lo contactan',en:'How visitors reach you'}, type:'text',
        q:{es:'¿Facebook?',en:'Facebook?'},
        h:{es:'',en:''},
        p:{es:'facebook.com/sunegocio',en:'facebook.com/yourbusiness'} },

      // Marca
      { key:'__logoUpload', section:'brand', group:{es:'Su marca',en:'Your brand'}, type:'file', category:'logo',
        q:{es:'Suba su logo',en:'Upload your logo'},
        h:{es:'PNG con fondo transparente es lo ideal. Si no tiene logo, sáltelo — usaremos su nombre en una tipografía bonita.',en:"PNG with transparent background is ideal. No logo? Skip — we'll use your business name in a nice font."},
        accept:'image/*,.ai,.eps' },
      { key:'colors', section:'brand', group:{es:'Su marca',en:'Your brand'}, type:'text',
        q:{es:'¿Sus colores de marca?',en:'Your brand colors?'},
        h:{es:'Hex (#003893) o solo descríbalos: "azul marino + amarillo Colombia", "tonos cálidos terrosos".',en:'Hex codes (#003893) or just describe: "navy blue + Colombian yellow", "warm earthy tones".'},
        p:{es:'#003893, #fcd116',en:'#003893, #fcd116'} },
      { key:'fonts', section:'brand', group:{es:'Su marca',en:'Your brand'}, type:'text',
        q:{es:'¿Tipografía preferida?',en:'Font preference?'},
        h:{es:'Si tiene una en mente. Si no, elegimos una que combine.',en:"If you've one in mind. Otherwise we pick one that fits."},
        p:{es:'Inter, Montserrat, Lato...',en:'Inter, Montserrat, Lato...'} },

      // Visual — combined upload + per-photo description
      { key:'__photosWithAlts', section:'visual', group:{es:'Imágenes',en:'Imagery'}, type:'photos', category:'photo', multi:true,
        q:{es:'Suba sus fotos y descríbalas',en:'Upload your photos and describe each'},
        h:{es:'Fotos reales del negocio venden mucho mejor que stock. Suba de 3 a 8 fotos. Por cada foto, escriba una breve descripción — se usa para accesibilidad y SEO.',en:'Real photos sell far better than stock. Upload 3 to 8 photos. For each, write a short description — used for accessibility and SEO.'},
        accept:'image/*,video/*' },
      { key:'refSites', section:'visual', group:{es:'Imágenes',en:'Imagery'}, type:'textarea',
        q:{es:'¿Sitios web que le gustan?',en:'Websites you like?'},
        h:{es:'Pegue 1 a 3 URLs. Nos ayuda a entender su gusto visual.',en:'Paste 1 to 3 URLs. Helps us understand your visual taste.'},
        p:{es:'https://...',en:'https://...'} },

      // Contenido
      { key:'tone', section:'content', group:{es:'Voz y contenido',en:'Voice and content'}, type:'text',
        q:{es:'¿Tono de marca?',en:'Brand tone?'},
        h:{es:'Cercano · profesional · juvenil · cálido · directo · sobrio. Elija lo que aplica.',en:'Friendly · professional · youthful · warm · direct · sober. Pick what fits.'},
        p:{es:'cercano y profesional',en:'friendly and professional'} },
      { key:'topics', section:'content', group:{es:'Voz y contenido',en:'Voice and content'}, type:'textarea',
        q:{es:'¿Temas o mensajes clave?',en:'Key topics or messages?'},
        h:{es:'Tradición familiar, entrega rápida, sostenibilidad, especialistas en B2B...',en:'Family heritage, fast turnaround, sustainability, B2B specialists...'},
        p:{es:'',en:''} },
      { key:'pages', section:'content', group:{es:'Voz y contenido',en:'Voice and content'}, type:'textarea',
        q:{es:'¿Qué secciones quiere en su sitio?',en:'Which sections do you want?'},
        h:{es:'Por defecto: inicio, servicios, sobre nosotros, contacto, ubicación. Mencione si quiere cambios.',en:'Default: home, services, about, contact, location. Tell us if you want changes.'},
        p:{es:'',en:''} },

      // Técnico
      { key:'domain', section:'tech', group:{es:'Dominio y técnico',en:'Domain & technical'}, type:'text',
        q:{es:'¿Tiene un dominio (.com) ya?',en:'Do you already have a domain?'},
        h:{es:'Si lo registró, escríbalo. Si no, sáltelo — le ayudamos a comprarlo y configurarlo.',en:'If registered, type it. Otherwise skip — we help you buy and set it up.'},
        p:{es:'minegocio.com',en:'mybusiness.com'},
        cta:{
          href:'https://www.namecheap.com/?aff=7255105',
          label:{es:'Comprar en Namecheap',en:'Buy at Namecheap'},
          note:{
            es:'¿Aún no tiene dominio? Recomendamos Namecheap: ~$50.000 a $150.000 COP/año, queda a su nombre, privacidad WHOIS gratis. Nosotros lo configuramos sin costo adicional.',
            en:'No domain yet? We recommend Namecheap: ~$15 USD/year, registered in your name, free WHOIS privacy. We configure it at no extra cost.'
          }
        } },
      { key:'hosting', section:'tech', group:{es:'Dominio y técnico',en:'Domain & technical'}, type:'text',
        q:{es:'¿Tiene hosting actualmente?',en:'Do you currently have hosting?'},
        h:{es:'Si paga hospedaje en algún lado, díganoslo. Si no, sáltelo.',en:'If you pay for hosting somewhere, tell us. Otherwise skip.'},
        p:{es:'',en:''} },
      // Email forwarding — free via Cloudflare Email Routing once we attach the domain.
      // Two clean inputs replace the old open-ended bizEmail prompt.
      { key:'emailLocalPart', section:'tech', group:{es:'Correo profesional',en:'Professional email'}, type:'text',
        q:{es:'¿Qué dirección de correo quiere en su dominio?',en:'What email address do you want on your domain?'},
        h:{es:'Solo la parte antes del @. Ejemplos: hola, info, contacto, ventas. Si tiene varios en mente, sepárelos por comas.',en:'Just the part before the @. Examples: hello, info, contact, sales. Separate multiple with commas.'},
        p:{es:'hola',en:'hello'} },
      { key:'emailForwardTo', section:'tech', group:{es:'Correo profesional',en:'Professional email'}, type:'text',
        q:{es:'¿A dónde lo reenviamos?',en:'Where should it forward to?'},
        h:{es:'Su correo personal donde revisa todos los días (Gmail, Outlook, etc). El reenvío es gratuito vía Cloudflare. ¿Quiere un buzón completo? Le ayudamos a configurar Google Workspace ($7/usuario/mes).',en:'Your personal inbox you check daily (Gmail, Outlook, etc). Forwarding is free via Cloudflare. Want a full mailbox? We can help you set up Google Workspace ($7/user/month).'},
        p:{es:'tu@gmail.com',en:'you@gmail.com'} },

      // Tracking IDs — both plans (Esencial gets the site wired for GA4/Meta too)
      { key:'ga4Id', section:'tech', group:{es:'Analítica y marketing',en:'Analytics & marketing'}, type:'text',
        q:{es:'¿ID de Google Analytics 4?',en:'Google Analytics 4 ID?'},
        h:{es:'Formato G-XXXXXXXXXX. Sáltelo si no tiene cuenta — se la creamos.',en:"Format G-XXXXXXXXXX. Skip if you don't have one — we set it up."},
        p:{es:'G-XXXXXXXXXX',en:'G-XXXXXXXXXX'} },
      { key:'metaPixelId', section:'tech', group:{es:'Analítica y marketing',en:'Analytics & marketing'}, type:'text',
        q:{es:'¿ID del Meta Pixel?',en:'Meta Pixel ID?'},
        h:{es:'15-16 dígitos. Solo si corre ads en Facebook o Instagram.',en:'15-16 digits. Only if you run Facebook or Instagram ads.'},
        p:{es:'1234567890123456',en:'1234567890123456'} },

      // Testimonials — both plans (it's a core Esencial section)
      { key:'testimonials', section:'content', group:{es:'Testimonios',en:'Testimonials'}, type:'textarea',
        q:{es:'¿Tiene testimonios reales de clientes?',en:"Do you have real customer testimonials?"},
        h:{es:'Uno por línea, formato: Nombre | Cita | Rol. Solo testimonios reales con permiso.',en:'One per line: Name | Quote | Role. Only real testimonials with permission.'},
        p:{es:'María Pérez | Excelente servicio | Cliente desde 2022',en:'María Pérez | Excellent service | Customer since 2022'} },

      // Crecimiento extras (proOnly): blog · extended gallery · PDF downloads · team · FAQ
      { key:'blogTopics', section:'growth', group:{es:'Blog',en:'Blog'}, type:'textarea', proOnly:true,
        q:{es:'¿Sobre qué temas quiere publicar en el blog?',en:'What topics do you want to blog about?'},
        h:{es:'Liste 3-6 temas o títulos iniciales. Nosotros redactamos los primeros artículos.',en:"List 3-6 topics or initial titles. We'll write the first posts."},
        p:{es:'Cómo elegir el mejor café · Tips de barismo · Recetas con espresso',en:'How to choose the best coffee · Barista tips · Espresso recipes'} },
      { key:'__pdfUpload', section:'growth', group:{es:'Descargas en PDF',en:'PDF downloads'}, type:'file', category:'pdf', proOnly:true,
        q:{es:'Suba los PDFs descargables (menú, catálogo, ficha técnica…)',en:'Upload downloadable PDFs (menu, catalog, spec sheet…)'},
        h:{es:'Puede subir varios. Aparecen como botones de descarga en una sección dedicada.',en:'You can upload several. They appear as download buttons in a dedicated section.'},
        accept:'application/pdf' },
      { key:'pdfLabel', section:'growth', group:{es:'Descargas en PDF',en:'PDF downloads'}, type:'text', proOnly:true,
        q:{es:'Título de la sección de descargas',en:'Downloads section title'},
        h:{es:'Ejemplo: "Descargue nuestro menú", "Catálogo 2026".',en:'Example: "Download our menu", "2026 Catalog".'},
        p:{es:'Descargas',en:'Downloads'} },
      { key:'teamBios', section:'growth', group:{es:'Equipo',en:'Team'}, type:'textarea', proOnly:true,
        q:{es:'¿Quiénes forman su equipo?',en:'Who is on your team?'},
        h:{es:'Una persona por línea, formato: Nombre | Rol | Bio corta. Suba sus fotos en el paso de fotos.',en:'One person per line: Name | Role | Short bio. Upload their photos in the photo step.'},
        p:{es:'Ana Gómez | Fundadora y barista jefe | 10 años en café de especialidad',en:'Ana Gómez | Founder & head barista | 10 years in specialty coffee'} },
      { key:'faqs', section:'growth', group:{es:'Preguntas frecuentes',en:'FAQ'}, type:'textarea', proOnly:true,
        q:{es:'¿Preguntas frecuentes que recibe?',en:'Frequently asked questions you receive?'},
        h:{es:'Una por línea, formato: ¿Pregunta? | Respuesta.',en:'One per line: Question? | Answer.'},
        p:{es:'¿Hacen domicilios? | Sí, en toda Medellín.',en:'Do you deliver? | Yes, anywhere in Medellín.'} },
    ];

    function Portal({ t, lang, setLang, client, email, data, setData, files, setFiles, section, setSection, onLogout, onSubmit, submitting }) {
      const isPro = client && (client.plan === 'pro' || client.plan === 'crecimiento' || client.plan === 'growth');
      const allSteps = WIZARD_STEPS.filter(s => !s.proOnly || isPro);
      const total = allSteps.length;
      const loc = (o) => (o && (o[lang] || o.es || '')) || '';

      const initialView = (() => {
        const filledFields = Object.keys(data || {}).some(k => data[k] && String(data[k]).trim());
        return (filledFields || (files && files.length > 0)) ? 'step' : 'welcome';
      })();
      const [view, setView] = useState(initialView);
      const [step, setStep] = useState(0);
      const [saving, setSaving] = useState(false);

      const cur = allSteps[step] || null;
      const progress = total > 0 ? Math.round(((step) / total) * 100) : 0;

      async function persistSection(sec) {
        const fields = WIZARD_STEPS.filter(s => s.section === sec && !s.key.startsWith('__')).map(s => s.key);
        const payload = {};
        fields.forEach(f => payload[f] = data[f] || '');
        try { await api('/api/client/intake/' + sec, { method: 'PUT', body: JSON.stringify(payload) }); } catch (_) {}
      }
      async function next() {
        if (!cur) return;
        if (!cur.key.startsWith('__')) { setSaving(true); await persistSection(cur.section); setSaving(false); }
        if (step + 1 >= total) setView('review');
        else setStep(step + 1);
      }
      function back() { if (step > 0) setStep(step - 1); else setView('welcome'); }
      function jumpTo(i) { setStep(i); setView('step'); }

      // Client-side image resize. Reduces a 5MB phone photo to ~250KB by
      // resizing to a max width and re-encoding as WebP (with JPEG fallback).
      // Skips: non-images, SVG (vector), GIF (animation), PDFs, and files
      // already under 200KB. Logos use a smaller max (800px).
      async function maybeResizeImage(file, category) {
        if (!file || !file.type) return file;
        if (!file.type.startsWith("image/")) return file;
        if (file.type === "image/svg+xml" || file.type === "image/gif") return file;
        if (file.size < 200 * 1024) return file;
        const maxWidth = category === "logo" ? 800 : 1600;
        const quality = 0.85;
        return new Promise((resolve) => {
          const img = new Image();
          const url = URL.createObjectURL(file);
          img.onload = () => {
            URL.revokeObjectURL(url);
            const ratio = Math.min(1, maxWidth / img.width);
            const w = Math.max(1, Math.round(img.width * ratio));
            const h = Math.max(1, Math.round(img.height * ratio));
            const canvas = document.createElement("canvas");
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob((blob) => {
              if (!blob || blob.size >= file.size) { resolve(file); return; }
              const baseName = file.name.replace(/\\.[^.]+$/, "");
              const ext = blob.type === "image/webp" ? ".webp" : ".jpg";
              resolve(new File([blob], baseName + ext, { type: blob.type }));
            }, "image/webp", quality);
          };
          img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
          img.src = url;
        });
      }

      async function handleFileUpload(file, category) {
        if (!file) return;
        // Truly unique tempId — Date.now() collides for batch drops in the
        // same millisecond, which caused duplicate/lost files in the UI.
        const tempId = "temp-" + Date.now() + "-" + Math.floor(Math.random() * 1e9);
        setFiles(p => [{ id: tempId, filename: file.name, category, uploading: true, size_bytes: file.size }, ...p]);
        try {
          const toSend = await maybeResizeImage(file, category);
          const res = await fetch("/api/files/upload?category=" + category + "&filename=" + encodeURIComponent(toSend.name), {
            method: "POST",
            headers: { "Authorization": "Bearer " + localStorage.getItem(SESSION_KEY), "Content-Type": toSend.type || "application/octet-stream" },
            body: toSend
          });
          const j = await res.json();
          if (!res.ok) throw new Error(j.error);
          setFiles(p => p.map(f => f.id === tempId ? { ...j.file, uploaded_at: Date.now() } : f));
        } catch (e) {
          setFiles(p => p.filter(f => f.id !== tempId));
          alert("Upload failed: " + e.message);
        }
      }
      async function handleFileDelete(fileId) {
        setFiles(p => p.filter(f => f.id !== fileId));
        try { await api("/api/files/" + fileId, { method: "DELETE" }); } catch {}
      }

      // ─── Welcome view ─────────────────────────────────────────────────
      if (view === 'welcome') {
        return (
          <div style={pageStyle}>
            <Orbs/>
            <button onClick={()=>setLang(lang==='en'?'es':'en')} style={{position:'absolute',top:'2rem',right:'2rem',...langBtn,zIndex:10}}>{lang==='en'?'ES':'EN'}</button>
            <div style={{maxWidth:'560px',width:'100%',position:'relative',zIndex:1}}>
              <div style={{textAlign:'center',marginBottom:'2.5rem'}}>
                <Sparkle size={48} color="#FF5C2E"/>
              </div>
              <h1 className="serif" style={{...titleStyle,fontSize:'3rem',textAlign:'center',marginBottom:'1.5rem'}}>{lang==='es'?'¡Bienvenido!':'Welcome!'}</h1>
              <p style={{color:'rgba(26,32,50,0.75)',fontSize:'1.05rem',lineHeight:1.65,textAlign:'center',marginBottom:'1rem'}}>
                {lang==='es'
                  ? 'Vamos a poner su sitio en línea. Esto le toma unos 15 minutos.'
                  : "Let's get your site online. About 15 minutes."}
              </p>
              <p style={{color:'rgba(26,32,50,0.55)',fontSize:'.95rem',lineHeight:1.65,textAlign:'center',marginBottom:'2.5rem'}}>
                {lang==='es'
                  ? 'Cada pregunta es opcional — si no sabe la respuesta, salte y nosotros lo manejamos. Sus respuestas se guardan a medida que escribe.'
                  : "Every question is optional — if you don't know, skip and we handle it. Your answers save as you type."}
              </p>
              <div style={{textAlign:'center'}}>
                <button onClick={()=>setView('step')} style={{...primaryBtn,fontSize:'1rem',padding:'1rem 2.25rem'}}>
                  {lang==='es'?'Empezar':"Let's start"} <ChevR size={16}/>
                </button>
              </div>
              <p style={{textAlign:'center',marginTop:'2rem',fontSize:'.8rem',color:'rgba(26,32,50,0.35)'}}>
                {client && client.plan ? ('Plan: ' + ((client.plan==='pro'||client.plan==='crecimiento')?'Crecimiento':'Esencial')) : ''}
              </p>
            </div>
          </div>
        );
      }

      // ─── Review view ─────────────────────────────────────────────────
      if (view === 'review') {
        // Group steps by section for rendering
        const groups = {};
        allSteps.forEach((s, idx) => {
          const g = s.section;
          if (!groups[g]) groups[g] = { label: loc(s.group), items: [] };
          groups[g].items.push({ ...s, idx });
        });
        return (
          <div style={{minHeight:'100vh',background:'#FAFAF7',color:'#1A2032'}}>
            <header style={headerStyle}>
              <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <Sparkle size={18} color="#FF5C2E"/>
                <span className="serif" style={{fontSize:'1.25rem'}}>Pyme<span style={{color:'#FF5C2E'}}>WebPro</span></span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                <button onClick={()=>setLang(lang==='en'?'es':'en')} style={langBtn}>{lang==='en'?'ES':'EN'}</button>
                <span style={{color:'rgba(26,32,50,0.5)',fontSize:'.85rem'}}>{email}</span>
                <button onClick={onLogout} style={{background:'transparent',border:'none',color:'rgba(26,32,50,0.4)',cursor:'pointer'}}><LogOut size={18}/></button>
              </div>
            </header>
            <main style={{padding:'3rem 2rem',maxWidth:'780px',margin:'0 auto'}}>
              <h1 className="serif" style={{fontSize:'2.5rem',fontWeight:400,margin:'0 0 1rem'}}>{lang==='es'?'Revisión final':'Final review'}</h1>
              <p style={{color:'rgba(26,32,50,0.65)',marginBottom:'2.5rem',lineHeight:1.6}}>
                {lang==='es'
                  ? 'Repase sus respuestas. Puede editar cualquier campo antes de enviar.'
                  : 'Review your answers. You can edit any field before submitting.'}
              </p>
              {Object.entries(groups).map(([gKey, g]) => (
                <div key={gKey} style={{marginBottom:'2rem'}}>
                  <div style={{fontSize:'.7rem',letterSpacing:'.2em',color:'#FF5C2E',textTransform:'uppercase',marginBottom:'.75rem'}}>{g.label}</div>
                  {g.items.map(s => {
                    let answer;
                    if (s.key === '__logoUpload') answer = files.filter(f => f.category === 'logo').map(f => f.filename).join(', ');
                    else if (s.key === '__photosWithAlts') { const ph = files.filter(f => f.category === 'photo'); answer = ph.length ? ph.length + ' ' + (lang==='es'?'fotos':'photos') : ''; }
                    else if (s.key === '__pdfUpload') answer = files.filter(f => f.category === 'pdf').map(f => f.filename).join(', ');
                    else if (s.type === 'yesno') answer = data[s.key] === '1' ? (lang==='es'?'Sí':'Yes') : (data[s.key] === '0' ? 'No' : '');
                    else answer = data[s.key] || '';
                    const isSet = answer && String(answer).trim();
                    return (
                      <div key={s.key} onClick={()=>jumpTo(s.idx)} style={{padding:'.85rem 1rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'4px',marginBottom:'.4rem',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'.75rem'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:'.78rem',color:'rgba(26,32,50,0.5)',marginBottom:'.2rem'}}>{loc(s.q)}</div>
                          <div style={{color:isSet?'rgba(26,32,50,0.9)':'rgba(26,32,50,0.35)',fontStyle:isSet?'normal':'italic',whiteSpace:'pre-wrap',wordBreak:'break-word',fontSize:'.92rem'}}>
                            {isSet ? String(answer) : (lang==='es'?'(saltado)':'(skipped)')}
                          </div>
                        </div>
                        <span style={{color:'#FF5C2E',fontSize:'.78rem',whiteSpace:'nowrap'}}>{lang==='es'?'Editar':'Edit'} →</span>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div style={{display:'flex',gap:'.75rem',marginTop:'2rem',paddingTop:'1.5rem',borderTop:'1px solid rgba(26,32,50,0.08)'}}>
                <button onClick={()=>{ setStep(0); setView('step'); }} style={{...secondaryBtn,flex:1}}>
                  <ChevL size={16}/> {lang==='es'?'Volver al inicio':'Back to start'}
                </button>
                <button onClick={onSubmit} disabled={submitting} style={{...primaryBtn,flex:2}}>
                  {submitting?<><Loader size={16} className="spin"/>{t.submitting}</>:(lang==='es'?'Enviar — empezamos su sitio':"Submit — let's build your site")}
                </button>
              </div>
            </main>
          </div>
        );
      }

      // ─── Step view ────────────────────────────────────────────────────
      if (!cur) { setView('review'); return null; }
      const skipLabel = lang==='es' ? 'Saltar' : 'Skip';
      const continueLabel = lang==='es' ? 'Continuar' : 'Continue';
      const backLabel = lang==='es' ? 'Atrás' : 'Back';

      return (
        <div style={{minHeight:'100vh',background:'#FAFAF7',color:'#1A2032',display:'flex',flexDirection:'column'}}>
          <header style={headerStyle}>
            <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
              <Sparkle size={18} color="#FF5C2E"/>
              <span className="serif" style={{fontSize:'1.25rem'}}>Pyme<span style={{color:'#FF5C2E'}}>WebPro</span></span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
              {saving && <span style={{color:'rgba(26,32,50,0.4)',fontSize:'.78rem'}}><Loader size={12} className="spin"/> {t.saving}</span>}
              <button onClick={()=>setLang(lang==='en'?'es':'en')} style={langBtn}>{lang==='en'?'ES':'EN'}</button>
              <span style={{color:'rgba(26,32,50,0.5)',fontSize:'.85rem'}}>{email}</span>
              <button onClick={onLogout} style={{background:'transparent',border:'none',color:'rgba(26,32,50,0.4)',cursor:'pointer'}}><LogOut size={18}/></button>
            </div>
          </header>
          <div style={{height:'4px',background:'rgba(26,32,50,0.06)',position:'relative'}}>
            <div style={{position:'absolute',inset:0,width:progress+'%',background:'linear-gradient(90deg,#FF5C2E,#f59e0b)',transition:'width .4s'}}/>
          </div>
          <main style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem',position:'relative'}}>
            <Orbs/>
            <div style={{maxWidth:'620px',width:'100%',position:'relative',zIndex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.75rem'}}>
                <span style={{fontSize:'.7rem',letterSpacing:'.2em',textTransform:'uppercase',color:'#FF5C2E',fontWeight:600}}>{loc(cur.group)}</span>
                <span style={{color:'rgba(26,32,50,0.3)'}}>·</span>
                <span style={{fontSize:'.78rem',color:'rgba(26,32,50,0.5)'}}>{step+1} {lang==='es'?'de':'of'} {total}</span>
              </div>
              <h1 className="serif" style={{fontSize:'1.85rem',fontWeight:400,margin:'0 0 .85rem',lineHeight:1.25}}>{loc(cur.q)}</h1>
              {loc(cur.h) && <p style={{color:'rgba(26,32,50,0.6)',fontSize:'.95rem',lineHeight:1.6,margin:'0 0 1.25rem'}}>{loc(cur.h)}</p>}
              {cur.cta && (
                <div style={{background:'rgba(255,92,46,0.07)',border:'1px solid rgba(255,92,46,0.25)',borderRadius:'6px',padding:'1rem 1.15rem',marginBottom:'1.75rem'}}>
                  <p style={{color:'rgba(26,32,50,0.82)',fontSize:'.9rem',lineHeight:1.6,margin:'0 0 .75rem'}}>{loc(cur.cta.note)}</p>
                  <a href={cur.cta.href} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:'.4rem',background:'#FF5C2E',color:'#FAFAF7',padding:'.6rem 1.1rem',borderRadius:'4px',fontSize:'.86rem',fontWeight:600,textDecoration:'none'}}>{loc(cur.cta.label)} →</a>
                </div>
              )}
              <div style={{marginBottom:'2rem'}}>
                {cur.type === 'text' || cur.type === 'tel' || cur.type === 'email' ? (
                  <input type={cur.type} value={data[cur.key]||''} onChange={e=>setData(p=>({...p,[cur.key]:e.target.value}))} placeholder={loc(cur.p)} style={{...inputStyle,fontSize:'1rem',padding:'1rem 1.1rem'}} autoFocus/>
                ) : cur.type === 'textarea' ? (
                  <textarea value={data[cur.key]||''} onChange={e=>setData(p=>({...p,[cur.key]:e.target.value}))} placeholder={loc(cur.p)} rows={4} style={{...inputStyle,resize:'vertical',fontSize:'1rem',padding:'1rem 1.1rem'}} autoFocus/>
                ) : cur.type === 'yesno' ? (
                  <div style={{display:'flex',gap:'.75rem'}}>
                    {[['1', lang==='es'?'Sí':'Yes'], ['0', 'No']].map(([v,lbl]) => {
                      const active = data[cur.key] === v;
                      return <button key={v} onClick={()=>setData(p=>({...p,[cur.key]:v}))} style={{flex:1,padding:'1.1rem',background:active?'rgba(255,92,46,0.15)':'rgba(26,32,50,0.03)',border:'1px solid '+(active?'#FF5C2E':'rgba(26,32,50,0.1)'),color:active?'#FF5C2E':'rgba(26,32,50,0.85)',borderRadius:'4px',cursor:'pointer',fontFamily:'inherit',fontSize:'1.1rem',fontWeight:500}}>{lbl}</button>;
                    })}
                  </div>
                ) : cur.type === 'file' ? (
                  <FileDrop label="" dragText={t.dragDrop} category={cur.category} files={files.filter(f=>f.category===cur.category)} onUpload={handleFileUpload} onDelete={handleFileDelete} accept={cur.accept} multi={!!cur.multi}/>
                ) : cur.type === 'photos' ? (
                  <PhotosWithAlts
                    files={files.filter(f=>f.category===cur.category)}
                    accept={cur.accept}
                    multi={!!cur.multi}
                    onUpload={handleFileUpload}
                    onDelete={handleFileDelete}
                    onUpdateAlt={async (fileId, alt) => {
                      setFiles(p => p.map(f => f.id === fileId ? { ...f, alt_text: alt } : f));
                      try { await api("/api/client/files/" + fileId + "/alt", { method:"PUT", body: JSON.stringify({ alt_text: alt }) }); } catch (_) {}
                    }}
                    lang={lang}
                    dragText={t.dragDrop}
                  />
                ) : null}
              </div>
              <div style={{display:'flex',gap:'.75rem',justifyContent:'space-between',alignItems:'center'}}>
                <button onClick={back} style={{...secondaryBtn,padding:'.7rem 1rem'}}><ChevL size={14}/> {backLabel}</button>
                <div style={{display:'flex',gap:'.5rem'}}>
                  <button onClick={next} style={{...ghostBtn,fontSize:'.8rem',padding:'.7rem 1rem'}}>{skipLabel} →</button>
                  <button onClick={next} style={{...primaryBtn,padding:'.85rem 1.5rem'}}>{continueLabel} <ChevR size={14}/></button>
                </div>
              </div>
            </div>
          </main>
        </div>
      );
    }
    function _UNUSED_SECTION_KEYS() {
      const sectionKeys = ['business','contact','brand','visual','content','tech'];
      const sectionIcons = isPro
        ? [Brief,Phone,Palette,Img,FT,Settings,Sparkle]
        : [Brief,Phone,Palette,Img,FT,Settings];
      const SecIcon = sectionIcons[section];
      const currentKey = sectionKeys[section];
      const sectionFields = {
        business:['bizName','tagline','whatYouDo','audience','nit','legalRepresentative'],
        contact:['phone','email','address','whatsapp','ig','fb','li','tw'],
        brand:['colors','fonts'], visual:['refSites'],
        content:['tone','topics','pages'], tech:['domain','hosting','emailLocalPart','emailForwardTo'],
        growth:['bilingual','bookingsUrl','pdfLabel','waCatalogUrl','newsletterEnabled','ga4Id','metaPixelId','testimonials','faqs']
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

      // (kept as legacy stub — wizard's handleFileUpload is the active one)
      async function handleFileUpload(file, category) { /* unused */ }
      async function handleFileDelete(fileId) { /* unused */ }

      const allFields = Object.values(sectionFields).flat();
      const filledCount = allFields.filter(f => data[f] && String(data[f]).trim()).length + (files.length > 0 ? 2 : 0);
      const progress = Math.min(100, Math.round((filledCount / (allFields.length + 2)) * 100));

      // Per-section completion: section is "started" if any of its fields has a value,
      // or (for brand/visual) if any matching file has been uploaded.
      const sectionStarted = (key) => {
        const fields = sectionFields[key] || [];
        if (fields.some(f => data[f] && String(data[f]).trim())) return true;
        if (key === 'brand' && files.some(f => f.category === 'logo')) return true;
        if (key === 'visual' && files.some(f => f.category === 'photo')) return true;
        if (key === 'growth' && files.some(f => f.category === 'pdf')) return true;
        return false;
      };

      // First-visit detection — show welcome banner only when nothing has been filled yet
      const [welcomeDismissed, setWelcomeDismissed] = useState(false);
      const isFirstVisit = filledCount === 0 && !welcomeDismissed;

      return (
        <div style={{minHeight:'100vh',background:'#FAFAF7',color:'#1A2032'}}>
          <header style={headerStyle}>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
              <Sparkle size={18} color="#FF5C2E"/>
              <span className="serif" style={{fontSize:'1.25rem'}}>Pyme<span style={{color:'#FF5C2E'}}>WebPro</span></span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
              <SaveInd status={saveStatus[currentKey]} t={t}/>
              <button onClick={()=>setLang(lang==='en'?'es':'en')} style={langBtn}>{lang==='en'?'ES':'EN'}</button>
              <span style={{color:'rgba(26,32,50,0.5)',fontSize:'0.85rem'}}>{email}</span>
              <button onClick={onLogout} style={{background:'transparent',border:'none',color:'rgba(26,32,50,0.4)',cursor:'pointer'}}><LogOut size={18}/></button>
            </div>
          </header>
          <div style={{display:'grid',gridTemplateColumns:'280px 1fr',minHeight:'calc(100vh - 70px)'}}>
            <aside style={{borderRight:'1px solid rgba(26,32,50,0.08)',padding:'2rem 1rem',background:'#F6F5F0'}}>
              <div style={{padding:'0 1rem',marginBottom:'2rem'}}>
                <div style={{fontSize:'0.7rem',letterSpacing:'0.2em',color:'rgba(26,32,50,0.4)',textTransform:'uppercase',marginBottom:'0.5rem'}}>{t.progress}</div>
                <div style={{height:'6px',background:'rgba(26,32,50,0.08)',borderRadius:'3px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:progress+'%',background:'linear-gradient(90deg,#FF5C2E,#f59e0b)',transition:'width 0.4s'}}/>
                </div>
                <div style={{fontSize:'0.8rem',color:'#FF5C2E',marginTop:'0.5rem'}}>{progress}% {t.complete}</div>
              </div>
              {sectionKeys.map((key,i) => {
                const Ic = sectionIcons[i]; const active = i===section;
                const started = sectionStarted(key);
                return <button key={key} onClick={()=>setSection(i)} title={started ? t.sectionDone : ''} style={{width:'100%',display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.85rem 1rem',marginBottom:'0.25rem',background:active?'rgba(255,92,46,0.1)':'transparent',border:'none',borderLeft:active?'2px solid #FF5C2E':'2px solid transparent',color:active?'#FF5C2E':'rgba(26,32,50,0.7)',cursor:'pointer',fontFamily:'inherit',fontSize:'0.9rem',textAlign:'left'}}>
                  <Ic size={16}/>
                  <span style={{flex:1}}>{t.sections[key]}</span>
                  {started && <span aria-label={t.sectionDone} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'18px',height:'18px',borderRadius:'50%',background:'rgba(16,185,129,0.18)',color:'#10b981',fontSize:'0.75rem',fontWeight:700}}>✓</span>}
                </button>;
              })}
              <div style={{padding:'1rem',marginTop:'1.5rem',color:'rgba(26,32,50,0.4)',fontSize:'0.78rem',lineHeight:1.5}}>
                {t.welcomeBody.split('. ')[1] || ''}
              </div>
            </aside>
            <main style={{padding:'3rem 4rem',maxWidth:'900px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'0.5rem'}}>
                <SecIcon size={24} color="#FF5C2E"/>
                <span style={{fontSize:'0.75rem',letterSpacing:'0.2em',color:'rgba(26,32,50,0.4)',textTransform:'uppercase'}}>{section+1} / {sectionKeys.length}</span>
              </div>
              <h1 className="serif" style={{fontSize:'2.5rem',fontWeight:400,margin:'0 0 1rem'}}>{t.sections[currentKey]}</h1>
              <p style={{color:'rgba(26,32,50,0.65)',fontSize:'1rem',lineHeight:1.55,margin:'0 0 2.5rem',maxWidth:'640px'}}>{(t.intros && t.intros[currentKey]) || ''}</p>
              {isFirstVisit && (
                <div style={{padding:'1.5rem 1.75rem',background:'linear-gradient(135deg,rgba(255,92,46,0.08),rgba(255,92,46,0.02))',border:'1px solid rgba(255,92,46,0.25)',borderRadius:'8px',marginBottom:'2.5rem',display:'flex',gap:'1rem',alignItems:'flex-start'}}>
                  <Sparkle size={20} color="#FF5C2E" style={{marginTop:'2px',flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div className="serif" style={{fontSize:'1.15rem',color:'#FF5C2E',marginBottom:'0.4rem'}}>{t.welcomeTitle}</div>
                    <div style={{color:'rgba(26,32,50,0.75)',fontSize:'0.92rem',lineHeight:1.55}}>{t.welcomeBody}</div>
                    <button onClick={()=>setWelcomeDismissed(true)} style={{marginTop:'1rem',background:'#FF5C2E',color:'#FAFAF7',border:0,padding:'0.6rem 1.2rem',borderRadius:'4px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:'0.85rem'}}>{t.welcomeCta} →</button>
                  </div>
                </div>
              )}
              <div style={{display:'flex',flexDirection:'column',gap:'1.5rem'}}>
                {currentKey==='business' && <>
                  <Field label={t.fields.bizName} value={data.bizName||''} onChange={v=>update('bizName',v)} placeholder={t.ph.bizName}/>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'1rem'}}>
                    <Field label={t.fields.nit} value={data.nit||''} onChange={v=>update('nit',v)} placeholder="900.123.456-7" help={t.fields.nitHelp}/>
                    <Field label={t.fields.legalRepresentative} value={data.legalRepresentative||''} onChange={v=>update('legalRepresentative',v)} placeholder=""/>
                  </div>
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
                  <Field label={t.fields.photoAlts} value={data.photoAlts||''} onChange={v=>update('photoAlts',v)} textarea help={t.fields.photoAltsHelp} placeholder={'Fachada de nuestra panadería\\nEl equipo en la mañana\\nProductos del día'}/>
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
                {currentKey==='growth' && <>
                  <p style={{margin:'0 0 1rem',color:'rgba(26,32,50,0.55)',fontSize:'0.9rem',}}>{t.fields.growthIntro}</p>
                  <label style={{display:'flex',alignItems:'center',gap:'0.6rem',padding:'0.85rem 1rem',background:'rgba(255,92,46,0.06)',border:'1px solid rgba(255,92,46,0.2)',borderRadius:'4px',cursor:'pointer'}}>
                    <input type="checkbox" checked={data.bilingual==='1'} onChange={e=>update('bilingual',e.target.checked?'1':'')}/>
                    <span style={{color:'rgba(26,32,50,0.85)',fontSize:'0.9rem'}}>{t.fields.bilingualLabel}</span>
                  </label>
                  <Field label={t.fields.bookingsUrl} value={data.bookingsUrl||''} onChange={v=>update('bookingsUrl',v)} placeholder="https://calendly.com/su-negocio"/>
                  <FileDrop label={t.fields.pdfUp} dragText={t.dragDrop} category="pdf" files={files.filter(f=>f.category==='pdf')} onUpload={handleFileUpload} onDelete={handleFileDelete} accept="application/pdf"/>
                  <Field label={t.fields.pdfLabel} value={data.pdfLabel||''} onChange={v=>update('pdfLabel',v)} placeholder={t.fields.pdfLabelPh}/>
                  <Field label={t.fields.waCatalogUrl} value={data.waCatalogUrl||''} onChange={v=>update('waCatalogUrl',v)} placeholder="https://wa.me/c/..."/>
                  <label style={{display:'flex',alignItems:'center',gap:'0.6rem',padding:'0.85rem 1rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'4px',cursor:'pointer'}}>
                    <input type="checkbox" checked={data.newsletterEnabled==='1'} onChange={e=>update('newsletterEnabled',e.target.checked?'1':'')}/>
                    <span style={{color:'rgba(26,32,50,0.85)',fontSize:'0.9rem'}}>{t.fields.newsletterEnableLabel}</span>
                  </label>
                  {data.newsletterEnabled==='1' && <p style={{margin:'-0.5rem 0 0',fontSize:'0.78rem',color:'rgba(26,32,50,0.45)'}}>{t.fields.newsletterHelp}</p>}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                    <Field label={t.fields.ga4Id} value={data.ga4Id||''} onChange={v=>update('ga4Id',v)} placeholder="G-XXXXXXXXXX" help={t.fields.ga4Help}/>
                    <Field label={t.fields.metaPixelId} value={data.metaPixelId||''} onChange={v=>update('metaPixelId',v)} placeholder="123456789012345" help={t.fields.metaPixelHelp}/>
                  </div>
                  <Field label={t.fields.testimonials} value={data.testimonials||''} onChange={v=>update('testimonials',v)} textarea placeholder={"María Pérez | Excelente servicio, llegamos al doble de clientes | Dueña, Café del Centro\\nJorge Ramos | Profesionales y rápidos | Gerente, Logística JR"} help={t.fields.testimonialsHelp}/>
                  <Field label={t.fields.faqs} value={data.faqs||''} onChange={v=>update('faqs',v)} textarea placeholder={"¿Cuánto tarda el envío? | Entre 2 y 5 días hábiles a nivel nacional.\\n¿Tienen garantía? | Sí, 30 días contra defectos de fábrica."} help={t.fields.faqsHelp}/>
                </>}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'4rem',paddingTop:'2rem',borderTop:'1px solid rgba(26,32,50,0.08)'}}>
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
          {help && <div style={{fontSize:'0.75rem',color:'rgba(26,32,50,0.35)',marginTop:'0.4rem',}}>{help}</div>}
        </div>
      );
    }

    // Composite component for the wizard photos step: drop zone + per-file
    // thumbnail with inline alt-text input. Each input writes back via onUpdateAlt
    // (which persists alt_text on the file row).
    function PhotosWithAlts({ files, accept, multi, onUpload, onDelete, onUpdateAlt, lang, dragText }) {
      const inputRef = useRef(null);
      const [drag, setDrag] = useState(false);
      const handleFiles = (fl) => Array.from(fl).forEach(f => onUpload(f, "photo"));
      return (
        <div>
          <div
            onDragOver={(e)=>{e.preventDefault();setDrag(true);}}
            onDragLeave={()=>setDrag(false)}
            onDrop={(e)=>{e.preventDefault();setDrag(false);if(e.dataTransfer.files)handleFiles(e.dataTransfer.files);}}
            onClick={()=>inputRef.current && inputRef.current.click()}
            style={{padding:'1.5rem',background:drag?'rgba(255,92,46,0.08)':'rgba(26,32,50,0.03)',border:'2px dashed '+(drag?'#FF5C2E':'rgba(26,32,50,0.15)'),borderRadius:'4px',cursor:'pointer',textAlign:'center',marginBottom:'1rem'}}>
            <Upload size={20} color="#FF5C2E" />
            <div style={{color:'rgba(26,32,50,0.7)',fontSize:'.9rem',marginTop:'.5rem'}}>{dragText}</div>
            <input ref={inputRef} type="file" accept={accept} multiple={!!multi} style={{display:'none'}} onChange={(e)=>{if(e.target.files)handleFiles(e.target.files);e.target.value='';}}/>
          </div>
          {files.length === 0 ? null : (
            <div style={{display:'flex',flexDirection:'column',gap:'.6rem'}}>
              {files.map(f => (
                <div key={f.id} style={{display:'flex',gap:'.75rem',alignItems:'flex-start',padding:'.7rem .85rem',background:'rgba(26,32,50,0.03)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'4px'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.4rem'}}>
                      {f.uploading
                        ? <Loader size={14} className="spin" color="#FF5C2E"/>
                        : <Check size={14} color="#10b981"/>}
                      <span style={{fontSize:'.85rem',color:'rgba(26,32,50,0.85)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{f.filename}</span>
                      <span style={{fontSize:'.7rem',color:'rgba(26,32,50,0.4)',whiteSpace:'nowrap'}}>{formatSize(f.size_bytes)}</span>
                    </div>
                    {!f.uploading && (
                      <input
                        type="text"
                        defaultValue={f.alt_text || ''}
                        onBlur={(e)=>{ if (e.target.value !== (f.alt_text || '')) onUpdateAlt(f.id, e.target.value); }}
                        placeholder={lang==='es'?'Describa esta foto (ej: Fachada de la panadería)':'Describe this photo (e.g. Front of the bakery)'}
                        style={{...inputStyle,padding:'.45rem .65rem',fontSize:'.85rem'}}
                      />
                    )}
                  </div>
                  {!f.uploading && (
                    <button onClick={()=>onDelete(f.id)} style={{background:'transparent',border:'none',color:'rgba(26,32,50,0.4)',cursor:'pointer',padding:'.3rem',marginTop:'.2rem'}} aria-label="Delete"><Trash size={14}/></button>
                  )}
                </div>
              ))}
            </div>
          )}
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
            style={{border:dragging?'1px solid #FF5C2E':'1px dashed rgba(255,92,46,0.4)',background:dragging?'rgba(255,92,46,0.08)':'rgba(255,92,46,0.03)',padding:'2.5rem',borderRadius:'2px',textAlign:'center',cursor:'pointer',transition:'all 0.2s'}}>
            <Upload size={28} color="#FF5C2E" style={{marginBottom:'0.75rem'}}/>
            <div style={{color:'rgba(26,32,50,0.6)',fontSize:'0.9rem'}}>{dragText}</div>
            <input ref={inputRef} type="file" accept={accept} multiple={multi} onChange={e=>handleFiles(e.target.files)} style={{display:'none'}}/>
          </div>
          {files.length>0 && (
            <div style={{marginTop:'1rem',display:'flex',flexDirection:'column',gap:'0.5rem'}}>
              {files.map(f => (
                <div key={f.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.75rem 1rem',background:'rgba(26,32,50,0.04)',border:'1px solid rgba(26,32,50,0.08)',borderRadius:'2px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.75rem',minWidth:0}}>
                    {f.uploading ? <Loader size={16} className="spin" color="#FF5C2E"/> : <Check size={16} color="#FF5C2E"/>}
                    <span style={{color:'rgba(26,32,50,0.85)',fontSize:'0.9rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.filename}</span>
                    {f.size_bytes && <span style={{color:'rgba(26,32,50,0.4)',fontSize:'0.75rem'}}>{formatSize(f.size_bytes)}</span>}
                  </div>
                  {!f.uploading && <button onClick={()=>onDelete(f.id)} style={{background:'transparent',border:'none',color:'rgba(26,32,50,0.4)',cursor:'pointer',padding:'0.25rem'}}><Trash size={14}/></button>}
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
        saving:{text:t.saving,color:'rgba(26,32,50,0.5)',ic:<Loader size={12} className="spin"/>},
        saved:{text:t.saved,color:'#FF5C2E',ic:<Check size={12}/>},
        error:{text:t.saveError,color:'#ef4444',ic:<Alert size={12}/>}
      };
      const c = map[status]; if (!c) return null;
      return <span style={{display:'flex',alignItems:'center',gap:'0.4rem',fontSize:'0.75rem',color:c.color}}>{c.ic}{c.text}</span>;
    }

    function Center({ children }) { return <div style={pageStyle}><Orbs/>{children}</div>; }
    function Orbs() {
      return <>
        <div style={{position:'absolute',top:'-10%',left:'-5%',width:'420px',height:'420px',borderRadius:'50%',background:'radial-gradient(circle,rgba(255,92,46,0.10) 0%,transparent 65%)',filter:'blur(60px)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:'-10%',right:'-5%',width:'480px',height:'480px',borderRadius:'50%',background:'radial-gradient(circle,rgba(255,205,160,0.30) 0%,transparent 70%)',filter:'blur(70px)',pointerEvents:'none'}}/>
      </>;
    }
    function formatSize(b) { if (!b) return ''; if (b<1024) return b+' B'; if (b<1048576) return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(1)+' MB'; }

    const pageStyle = { minHeight:'100vh',background:'#FAFAF7',display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem',position:'relative',overflow:'hidden' };
    const titleStyle = { fontSize:'3rem',fontWeight:700,color:'#1A2032',margin:0,letterSpacing:'-0.025em',fontFamily:"'Inter Tight', system-ui, sans-serif",lineHeight:1.05 };
    const cardStyle = { background:'#FFFFFF',border:'1px solid #E7E6E1',borderRadius:'14px',padding:'2.5rem',boxShadow:'0 1px 2px rgba(26,32,50,0.04)' };
    const inputStyle = { width:'100%',background:'#FFFFFF',border:'1px solid #E7E6E1',color:'#1A2032',padding:'0.9rem 1rem',borderRadius:'10px',fontSize:'0.95rem',boxSizing:'border-box',outline:'none',transition:'border-color .15s, box-shadow .15s' };
    const fieldLabel = { display:'block',fontSize:'0.78rem',fontWeight:600,letterSpacing:'0.02em',color:'#5A6478',marginBottom:'0.5rem' };
    const primaryBtn = { display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',background:'#FF5C2E',color:'#FFFFFF',border:'none',padding:'0.85rem 1.5rem',borderRadius:'10px',cursor:'pointer',fontFamily:'inherit',fontWeight:600,fontSize:'0.92rem',letterSpacing:'-0.005em',boxShadow:'0 1px 2px rgba(230,69,26,0.25)' };
    const secondaryBtn = { display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',background:'#FFFFFF',border:'1px solid #E7E6E1',color:'#1A2032',padding:'0.85rem 1.5rem',borderRadius:'10px',cursor:'pointer',fontFamily:'inherit',fontWeight:600,fontSize:'0.92rem',letterSpacing:'-0.005em' };
    const ghostBtn = { display:'inline-flex',alignItems:'center',gap:'0.5rem',background:'transparent',color:'#5A6478',border:'1px solid #E7E6E1',padding:'0.6rem 1.1rem',borderRadius:'10px',cursor:'pointer',fontFamily:'inherit',fontSize:'0.88rem',fontWeight:500 };
    const langBtn = { background:'#F6F5F0',border:'1px solid #E7E6E1',color:'#FF5C2E',padding:'0.4rem 0.9rem',borderRadius:'999px',cursor:'pointer',fontFamily:'inherit',fontSize:'0.78rem',fontWeight:600 };
    const headerStyle = { borderBottom:'1px solid #E7E6E1',padding:'1.1rem 2rem',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,0.85)',backdropFilter:'saturate(180%) blur(12px)',position:'sticky',top:0,zIndex:50 };
    const iconBtn = { background:'#F6F5F0',border:'1px solid #E7E6E1',color:'#5A6478',padding:'0.55rem',borderRadius:'10px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' };

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
      // ─── mockup engine routes (must run BEFORE the /api/admin/* and /api/* catch-alls) ───
      const __mockupResp = await handleMockups(request, env, ctx, { json, isAdmin, randomToken, uuid, sha256, escapeHtml });
      if (__mockupResp) return cors(__mockupResp);
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

