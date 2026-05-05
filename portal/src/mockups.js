// mockups.js — manual mockup uploads, share links, comments, and ship-to-Pages.
//
// As of May 2026, mockups are NO LONGER auto-generated. Mike builds sites by
// hand in Cowork and uploads the rendered HTML + assets through the admin UI.
// The auto-gen pipeline (Opus 4.7 + blueprint variants) is archived under
// src/_archived/ for reference.
//
// Reuses portal helpers from utils.js: json, isAdmin, randomToken, uuid, sha256, escapeHtml.
// Reuses portal bindings: env.DB (D1), env.ASSETS (R2 = pymewebpro-client-assets).
// Env vars: CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID (for ship-to-Pages,
// custom-domain attach, Email Routing, screenshot capture).
//
// R2 layout for manual mockups:
//   manual/<clientId>/<mockupId>/index.html   — required
//   manual/<clientId>/<mockupId>/<file>        — optional sibling files
//
// Legacy auto-gen mockups still serve fine — their html_r2_key starts with
// `mockups/...` and assets live at `<prefix>/asset/<name>`. The previewAsset
// route handles both layouts.

import { renderRobots, renderSitemap } from "./legal.js";
// Admin AI chat removed — no Anthropic-in-the-portal. All build work happens in Cowork now.
// import { handleAdminChat } from "./admin-chat.js";  // archived → src/_archived/admin-chat.js
import { MANUAL_MOCKUPS } from "./manual-mockups.js";

// ─── Public dispatch (called from index.js) ─────────────────────────────────

export async function handleMockups(req, env, ctx, helpers) {
  // helpers = { json, isAdmin, randomToken, uuid, sha256, escapeHtml }
  const url = new URL(req.url);
  const p = url.pathname;
  const m = req.method;

  // Custom-domain serving — if the request Host matches a custom_domain, route to that client's site
  const reqHost = (req.headers.get("host") || "").toLowerCase().replace(/^www\./, "");
  const knownHosts = ["portal.pymewebpro.com", "pymewebpro.com"];

  // ── Manual mockups host (mockups.pymewebpro.com) ─────────────────────────
  // Custom-built one-off marketing sites (e.g. Schedulator) that bypass the
  // PYME auto-generator. Keyed by URL slug; HTML is fully self-contained and
  // lives in src/manual-mockups.js. New mockups can be added by appending to
  // the MANUAL_MOCKUPS map — no other code changes required.
  if (m === "GET" && reqHost === "mockups.pymewebpro.com") {
    const slugMatch = p.match(/^\/([a-z0-9-]+)\/?$/);
    const slug = slugMatch ? slugMatch[1] : null;
    if (slug && MANUAL_MOCKUPS[slug]) {
      return new Response(MANUAL_MOCKUPS[slug], {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "x-robots-tag": "noindex, nofollow",
          "cache-control": "public, max-age=300",
        },
      });
    }
    // Index page listing available mockups
    if (p === "/" || p === "") {
      return new Response(`<html><body style="font-family:system-ui;padding:40px;background:#0a0e1a;color:#fff"><h1>PymeWebPro Mockups</h1><ul>${Object.keys(MANUAL_MOCKUPS).map(s => "<li><a href=\"/" + s + "\" style=\"color:#fbbf24\">" + s + "</a></li>").join("")}</ul></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } });
    }
    return new Response("Mockup not found", { status: 404 });
  }

  // Tenant subdomain: <slug>.sites.pymewebpro.com — every client auto-published here
  const sitesMatch = reqHost.match(/^([a-z0-9-]+)\.sites\.pymewebpro\.com$/);
  if (m === "GET" && sitesMatch) {
    const slug = sitesMatch[1];
    const exists = await env.DB.prepare(
      "SELECT slug FROM live_sites WHERE slug = ? AND r2_prefix != ''",
    ).bind(slug).first();
    if (exists) {
      // Mark with X-Robots-Tag: noindex so search engines crawl the real domain instead
      const resp = await serveLiveSite(env, slug, p === "" ? "/" : p);
      if (resp && resp.headers && !resp.headers.has("X-Robots-Tag")) {
        const newHeaders = new Headers(resp.headers);
        newHeaders.set("X-Robots-Tag", "noindex, nofollow");
        return new Response(resp.body, { status: resp.status, headers: newHeaders });
      }
      return resp;
    }
  }

  if (m === "GET" && reqHost && !knownHosts.includes(reqHost) && !reqHost.endsWith(".workers.dev") && !reqHost.endsWith(".sites.pymewebpro.com")) {
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

  // Public lead-form endpoint — every customer site posts here; we forward to client's email
  mt = p.match(/^\/api\/lead\/([A-Za-z0-9-]+)$/);
  if (mt && m === "POST") return leadFormSubmit(env, helpers, mt[1], req);
  if (mt && m === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });

  // Admin preview wrapper with desktop/tablet/mobile viewport switcher.
  // Loads the actual mockup inside a constrained iframe so Mike can verify
  // responsive behaviour without opening DevTools.
  mt = p.match(/^\/preview-frame\/([A-Za-z0-9_-]+)\/?$/);
  if (mt && m === "GET") return previewFrame(env, mt[1]);

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
  // This block handles all admin/mockups/* AND any /api/admin/clients/<id>/<sub>
  // routes registered below (mockups, site/disable, site/enable, domain,
  // email-forwarding, blueprint). Routes that don't match here fall through
  // to handleAdmin in index.js via the `return null` at the end of the function.
  if (p.startsWith("/api/admin/mockups") || p.startsWith("/api/admin/clients/")) {
    if (!helpers.isAdmin(req, env)) return helpers.json({ error: "unauthorized" }, 401);

    mt = p.match(/^\/api\/admin\/clients\/([A-Za-z0-9-]+)\/mockups$/);
    // POST (auto-generate) was removed in the May 2026 refactor — manual uploads
    // are the new path. Mocking this with 410 Gone so any stale clients (browser
    // tabs, scripts) get a clear signal instead of a confusing 404.
    if (mt && m === "POST") return helpers.json({ error: "auto_generation_removed", msg: "Auto-generation is no longer supported. Upload mockup files via POST /api/admin/clients/:id/manual-mockup/upload + /finalize." }, 410);
    if (mt && m === "GET") return listForClient(env, helpers, mt[1]);

    // ── Manual mockup upload (replaces auto-gen) ─────────────────────────
    mt = p.match(/^\/api\/admin\/clients\/([A-Za-z0-9-]+)\/manual-mockup\/upload$/);
    if (mt && m === "POST") return manualMockupUpload(env, helpers, mt[1], req);

    mt = p.match(/^\/api\/admin\/clients\/([A-Za-z0-9-]+)\/manual-mockup\/finalize$/);
    if (mt && m === "POST") return manualMockupFinalize(env, helpers, mt[1], req);

    mt = p.match(/^\/api\/admin\/clients\/([A-Za-z0-9-]+)\/manual-mockup\/([A-Za-z0-9-]+)\/file\/(.+)$/);
    if (mt && m === "DELETE") return manualMockupDeleteFile(env, helpers, mt[1], mt[2], decodeURIComponent(mt[3]));

    mt = p.match(/^\/api\/admin\/mockups\/([A-Za-z0-9-]+)$/);
    if (mt && m === "GET") return getMockup(env, helpers, mt[1]);

    mt = p.match(/^\/api\/admin\/mockups\/([A-Za-z0-9-]+)\/share$/);
    if (mt && m === "POST") return createShare(env, helpers, mt[1], req);

    mt = p.match(/^\/api\/admin\/mockups\/([A-Za-z0-9-]+)\/comments$/);
    if (mt && m === "GET") return listComments(env, helpers, mt[1]);

    mt = p.match(/^\/api\/admin\/mockups\/([A-Za-z0-9-]+)\/reply$/);
    if (mt && m === "POST") return postAdminReply(env, helpers, mt[1], req);

    // /regenerate route removed (auto-gen archived). Returns 410 so stale clients see a clear error.
    mt = p.match(/^\/api\/admin\/mockups\/([A-Za-z0-9-]+)\/regenerate$/);
    if (mt && m === "POST") return helpers.json({ error: "auto_generation_removed", msg: "Regeneration is no longer supported. Upload a new manual mockup version instead." }, 410);

    mt = p.match(/^\/api\/admin\/mockups\/([A-Za-z0-9-]+)\/preflight$/);
    if (mt && m === "GET") return preflightMockup(env, helpers, mt[1]);

    // /blueprint route removed (no more blueprint variants). 410 for clarity.
    mt = p.match(/^\/api\/admin\/clients\/([A-Za-z0-9-]+)\/blueprint$/);
    if (mt && m === "PUT") return helpers.json({ error: "blueprints_removed", msg: "Blueprint variants no longer apply (manual-mockup workflow)." }, 410);

    mt = p.match(/^\/api\/admin\/clients\/([A-Za-z0-9-]+)\/admin-css$/);
    if (mt && m === "PUT") return setClientAdminCss(env, helpers, mt[1], req);

    mt = p.match(/^\/api\/admin\/mockups\/([A-Za-z0-9-]+)\/push-to-client$/);
    if (mt && m === "POST") return pushMockupToClient(env, helpers, mt[1]);

    mt = p.match(/^\/api\/admin\/mockups\/([A-Za-z0-9-]+)\/ship$/);
    if (mt && m === "POST") return shipMockup(env, helpers, mt[1], req);

    mt = p.match(/^\/api\/admin\/clients\/([A-Za-z0-9-]+)\/site\/disable$/);
    if (mt && m === "POST") return disableSite(env, helpers, mt[1], req);

    mt = p.match(/^\/api\/admin\/clients\/([A-Za-z0-9-]+)\/site\/enable$/);
    if (mt && m === "POST") return enableSite(env, helpers, mt[1]);

    mt = p.match(/^\/api\/admin\/clients\/([A-Za-z0-9-]+)\/domain$/);
    if (mt && m === "POST") return attachDomain(env, helpers, mt[1], req);
    if (mt && m === "DELETE") return detachDomain(env, helpers, mt[1]);

    mt = p.match(/^\/api\/admin\/clients\/([A-Za-z0-9-]+)\/email-forwarding$/);
    if (mt && m === "POST") return enableEmailForwarding(env, helpers, mt[1], req);

    // Admin AI chat endpoint removed — return 410 Gone for any old SPA still calling it
    if (/^\/api\/admin\/clients\/[A-Za-z0-9-]+\/ai-chat$/.test(p)) {
      return helpers.json({ error: "removed", msg: "AI chat moved out of the portal. All site building now happens in Cowork." }, 410);
    }
  }

  return null; // fall through to portal's existing dispatcher
}

// ─── Manual mockup upload ───────────────────────────────────────────────────
// Replaces the legacy auto-gen pipeline (Opus 4.7 + blueprints). The admin
// builds a site by hand in Cowork, then uploads index.html plus any sibling
// files (CSS, JS, images, fonts, sub-pages) through the admin SPA.
//
// Two-step flow so the client SPA can stream individual files via fetch():
//   1) POST /upload — one file per call, identified by X-Mockup-Id + X-Filename
//   2) POST /finalize — once all files are in R2, create the mockups row
//
// R2 layout:  manual/<clientId>/<mockupId>/<filename>
// Mockup row: blueprint_key='manual', html_r2_key='manual/<...>/index.html'

const MANUAL_UPLOAD_ALLOWED_EXTS = new Set([
  ".html", ".htm", ".css", ".js", ".mjs",
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico",
  ".woff", ".woff2", ".ttf", ".otf",
  ".json", ".xml", ".txt", ".md", ".pdf",
]);
const MANUAL_UPLOAD_MAX_BYTES_PER_FILE = 5 * 1024 * 1024; // 5 MB per file

function isSafeManualFilename(name) {
  if (!name || typeof name !== "string") return false;
  if (name.length > 200) return false;
  if (name.includes("..")) return false;
  if (name.startsWith("/")) return false;
  if (name.startsWith(".")) return false;
  // Allow simple paths like "img/hero.png" (one nested directory deep) but
  // reject anything weirder.
  if (!/^[A-Za-z0-9._\-/]+$/.test(name)) return false;
  if (name.split("/").length > 3) return false;
  // Extension allowlist
  const dotIdx = name.lastIndexOf(".");
  if (dotIdx < 0) return false;
  const ext = name.slice(dotIdx).toLowerCase();
  if (!MANUAL_UPLOAD_ALLOWED_EXTS.has(ext)) return false;
  return true;
}

function manualR2Prefix(clientId, mockupId) {
  return `manual/${clientId}/${mockupId}`;
}

async function manualMockupUpload(env, helpers, clientId, req) {
  const client = await env.DB.prepare("SELECT id FROM clients WHERE id = ?").bind(clientId).first();
  if (!client) return helpers.json({ error: "client_not_found" }, 404);

  const mockupId = String(req.headers.get("X-Mockup-Id") || "").trim();
  const filename = String(req.headers.get("X-Filename") || "").trim();
  const ct = req.headers.get("Content-Type") || "application/octet-stream";

  if (!/^[A-Za-z0-9-]{8,64}$/.test(mockupId)) {
    return helpers.json({ error: "invalid_mockup_id", msg: "X-Mockup-Id must be a UUID-shaped string." }, 400);
  }
  if (!isSafeManualFilename(filename)) {
    return helpers.json({ error: "invalid_filename", msg: "Filename rejected (path traversal, disallowed extension, or unsafe chars)." }, 400);
  }

  const bytes = await req.arrayBuffer();
  if (bytes.byteLength === 0) return helpers.json({ error: "empty_file" }, 400);
  if (bytes.byteLength > MANUAL_UPLOAD_MAX_BYTES_PER_FILE) {
    return helpers.json({ error: "file_too_large", max: MANUAL_UPLOAD_MAX_BYTES_PER_FILE, got: bytes.byteLength }, 413);
  }

  const key = `${manualR2Prefix(clientId, mockupId)}/${filename}`;
  await env.ASSETS.put(key, bytes, {
    httpMetadata: { contentType: String(ct).split(";")[0].trim() || guessType("/" + filename) },
  });
  return helpers.json({ ok: true, key, size: bytes.byteLength, mockup_id: mockupId, filename });
}

async function manualMockupFinalize(env, helpers, clientId, req) {
  const client = await env.DB.prepare("SELECT id, business_name FROM clients WHERE id = ?").bind(clientId).first();
  if (!client) return helpers.json({ error: "client_not_found" }, 404);

  const body = await req.json().catch(() => ({}));
  const mockupId = String(body.mockup_id || "").trim();
  if (!/^[A-Za-z0-9-]{8,64}$/.test(mockupId)) {
    return helpers.json({ error: "invalid_mockup_id" }, 400);
  }

  // Make sure the upload actually happened (index.html must exist)
  const indexKey = `${manualR2Prefix(clientId, mockupId)}/index.html`;
  const indexHead = await env.ASSETS.head(indexKey).catch(() => null);
  if (!indexHead) {
    return helpers.json({ error: "no_index_html", msg: "index.html missing in R2 for this mockup ID. Re-upload it before finalizing." }, 400);
  }

  // Compute the version (1-based, monotonic per client)
  let version = Number(body.version) | 0;
  if (!version || version < 1) {
    const last = await env.DB.prepare("SELECT MAX(version) as v FROM mockups WHERE client_id = ?")
      .bind(clientId).first();
    version = (last && last.v ? last.v : 0) + 1;
  }

  // Avoid creating duplicate rows if the admin double-clicks the finalize button
  const existing = await env.DB.prepare("SELECT id FROM mockups WHERE id = ?").bind(mockupId).first();
  if (existing) {
    const row = await env.DB.prepare("SELECT id, version, status, html_r2_key, blueprint_key, created_at FROM mockups WHERE id = ?")
      .bind(mockupId).first();
    return helpers.json({ ok: true, mockup: row, already_existed: true });
  }

  await env.DB.prepare(`
    INSERT INTO mockups (id, client_id, version, blueprint_key, html_r2_key, prompt, anthropic_model, status, created_by)
    VALUES (?, ?, ?, 'manual', ?, NULL, 'manual-upload', 'draft', 'admin')
  `).bind(mockupId, clientId, version, indexKey).run();

  // Auto-mark the deliverables that an uploaded mockup necessarily implies.
  // Mike still owns whether each one is *actually* satisfied by the upload —
  // these are reasonable defaults so the deliverables panel doesn't lie.
  const autoKeys = [
    "design_brand_colors", "design_typography",
    "page_home", "page_services", "page_about", "page_contact", "page_location",
    "feat_whatsapp_btn", "feat_social_bar", "feat_contact_form",
    "seo_meta_tags", "seo_sitemap", "seo_robots", "seo_structured_data", "seo_speed",
  ];
  await autoMarkDeliverables(env, clientId, autoKeys);

  const row = await env.DB.prepare("SELECT id, version, status, html_r2_key, blueprint_key, created_at FROM mockups WHERE id = ?")
    .bind(mockupId).first();
  return helpers.json({ ok: true, mockup: row });
}

async function manualMockupDeleteFile(env, helpers, clientId, mockupId, filename) {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(mockupId)) return helpers.json({ error: "invalid_mockup_id" }, 400);
  if (!isSafeManualFilename(filename)) return helpers.json({ error: "invalid_filename" }, 400);
  const key = `${manualR2Prefix(clientId, mockupId)}/${filename}`;
  await env.ASSETS.delete(key);
  return helpers.json({ ok: true, key });
}

// ─── Legacy auto-gen entry points (REMOVED — see src/_archived/auto-gen.js) ─
// generateForClient / regenerate / callClaude / translateToEnglish /
// parseTestimonials / parseFaqs / setClientBlueprint were here.
// They are NOT imported anywhere now; the dispatcher returns 410 Gone for
// the old POST routes so any stale UI surfaces a useful error.


// ─── Listing / fetching ─────────────────────────────────────────────────────

async function listForClient(env, helpers, clientId) {
  const rows = await env.DB.prepare(
    "SELECT id, version, status, html_r2_key, blueprint_key, shipped_at, shipped_url, approved_at, created_at FROM mockups WHERE client_id = ? ORDER BY version DESC",
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

// Renders an HTML wrapper with desktop/tablet/mobile viewport switcher buttons.
// The actual mockup loads inside an iframe at the selected width.
async function previewFrame(env, token) {
  // Verify the token is still valid before rendering the chrome — avoids the
  // "frame loads but iframe shows 'Enlace caducado'" confusion.
  const link = await loadShare(env, token);
  if (!link) return new Response("Enlace caducado o no válido", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const safeToken = encodeURIComponent(token);
  const html = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Vista previa · PymeWebPro</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;height:100%;background:#0a0e27;color:#fff;font-family:Inter,system-ui,-apple-system,sans-serif}
  .bar{position:fixed;top:0;left:0;right:0;z-index:10;background:rgba(10,14,39,.95);backdrop-filter:blur(8px);border-bottom:1px solid rgba(255,255,255,.08);padding:.6rem 1rem;display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
  .bar .title{font-style:italic;font-family:Georgia,serif;font-size:.95rem;color:rgba(255,255,255,.65);margin-right:auto}
  .bar .title b{color:#fbbf24;font-style:normal;font-weight:600}
  .vw-btn{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.75);padding:.4rem .8rem;border-radius:4px;cursor:pointer;font:inherit;font-size:.78rem;letter-spacing:.05em;text-transform:uppercase;display:inline-flex;align-items:center;gap:.35rem}
  .vw-btn:hover{background:rgba(255,255,255,.08);color:#fff}
  .vw-btn[data-active="1"]{background:rgba(251,191,36,.15);border-color:#fbbf24;color:#fbbf24}
  .vw-btn .dim{color:rgba(255,255,255,.4);font-weight:400;text-transform:none;letter-spacing:0}
  .open-raw{margin-left:auto;color:rgba(255,255,255,.5);text-decoration:none;font-size:.78rem;padding:.4rem .8rem;border-radius:4px;border:1px solid rgba(255,255,255,.12)}
  .open-raw:hover{color:#fff;background:rgba(255,255,255,.04)}
  .stage{position:absolute;inset:60px 0 0 0;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:1.5rem;background:repeating-linear-gradient(45deg,rgba(255,255,255,.015) 0 2px,transparent 2px 12px)}
  .frame{background:#fff;border-radius:8px;box-shadow:0 12px 50px rgba(0,0,0,.4);transition:width .35s cubic-bezier(.4,0,.2,1),height .35s cubic-bezier(.4,0,.2,1);overflow:hidden;border:1px solid rgba(255,255,255,.06)}
  .frame iframe{width:100%;height:100%;border:0;display:block;background:#fff}
  /* Sizes match common device viewports — frames keep their TRUE width so the
     site's media queries fire as they would on a real device. The .stage has
     overflow:auto, so admins on narrow laptops can horizontally scroll to see
     the full desktop layout instead of squashing it into mobile. */
  .vw-desktop .frame{width:1280px;height:820px;flex-shrink:0}
  .vw-laptop  .frame{width:1024px;height:720px;flex-shrink:0}
  .vw-tablet  .frame{width:768px;height:1024px;flex-shrink:0}
  .vw-mobile  .frame{width:375px;height:780px;border-radius:24px;border:6px solid #1a1a2e;flex-shrink:0}
  /* On phone-size admin viewports, allow tablet/mobile previews to fit */
  @media (max-width:780px){.vw-tablet .frame,.vw-mobile .frame{max-width:100%}}
</style>
</head>
<body class="vw-desktop">
  <div class="bar">
    <div class="title">Vista previa <b>·</b> <span style="color:rgba(255,255,255,.45);font-size:.85rem">solo administradores</span></div>
    <button class="vw-btn" data-vw="desktop" data-active="1">🖥️ Desktop <span class="dim">1280</span></button>
    <button class="vw-btn" data-vw="laptop">💻 Laptop <span class="dim">1024</span></button>
    <button class="vw-btn" data-vw="tablet">📱 Tablet <span class="dim">768</span></button>
    <button class="vw-btn" data-vw="mobile">📱 Mobile <span class="dim">375</span></button>
    <a class="open-raw" href="/m/${safeToken}/" target="_blank" rel="noopener">Abrir directo ↗</a>
  </div>
  <div class="stage">
    <div class="frame"><iframe src="/m/${safeToken}/" title="Mockup" loading="eager"></iframe></div>
  </div>
  <script>
  (function(){
    var body=document.body;
    var btns=document.querySelectorAll('.vw-btn');
    function setVw(v){
      body.className='vw-'+v;
      btns.forEach(function(b){b.dataset.active = b.dataset.vw===v ? '1' : '';});
      try{localStorage.setItem('pwp_preview_vw', v);}catch(_){}
    }
    var saved=null;try{saved=localStorage.getItem('pwp_preview_vw');}catch(_){}
    if(saved && ['desktop','laptop','tablet','mobile'].indexOf(saved)>=0) setVw(saved);
    btns.forEach(function(b){b.addEventListener('click',function(){setVw(b.dataset.vw);});});
    // Keyboard shortcuts: 1/2/3/4 for the four viewports
    document.addEventListener('keydown',function(e){
      if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
      if(e.key==='1')setVw('desktop'); else if(e.key==='2')setVw('laptop');
      else if(e.key==='3')setVw('tablet'); else if(e.key==='4')setVw('mobile');
    });
  })();
  </script>
</body></html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
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
  const prefix = m.html_r2_key.replace(/\/index\.html$/, "");
  // Two layouts in the wild:
  //   - Auto-gen (legacy):   <prefix>/asset/<name>   (prefix starts with `mockups/...`)
  //   - Manual upload (new): <prefix>/<name>          (prefix starts with `manual/...`)
  // Try the manual layout first if the key looks manual; otherwise the legacy
  // /asset/ subfolder. Fall back to whichever the first miss didn't cover so
  // mixed setups (custom uploads inside a legacy auto-gen prefix) still resolve.
  const isManual = prefix.startsWith("manual/");
  const candidates = isManual
    ? [`${prefix}/${name}`, `${prefix}/asset/${name}`]
    : [`${prefix}/asset/${name}`, `${prefix}/${name}`];
  for (const key of candidates) {
    const obj = await env.ASSETS.get(key);
    if (obj) {
      return new Response(obj.body, {
        headers: { "content-type": obj.httpMetadata?.contentType || guessType("/" + name) },
      });
    }
  }
  return new Response("not found", { status: 404 });
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

async function postAdminReply(env, helpers, mockupId, req) {
  const body = await req.json().catch(() => ({}));
  const text = String(body.body || "").trim().slice(0, 4000);
  if (!text) return helpers.json({ error: "empty" }, 400);
  const id = helpers.uuid();
  await env.DB.prepare(
    "INSERT INTO mockup_comments (id, mockup_id, section, body, author) VALUES (?, ?, NULL, ?, 'admin')",
  ).bind(id, mockupId, text).run();
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
  const m = await env.DB.prepare("SELECT id, client_id, html_r2_key, blueprint_key FROM mockups WHERE id = ?")
    .bind(mockupId).first();
  if (!m) return helpers.json({ error: "not found" }, 404);

  const client = await env.DB.prepare("SELECT id, plan, business_name, deliverables_state FROM clients WHERE id = ?")
    .bind(m.client_id).first();
  if (!client) return helpers.json({ error: "client not found" }, 404);
  const plan = String(client.plan || "esencial").toLowerCase();
  const isPro = plan === "pro" || plan === "crecimiento" || plan === "growth";
  const isManual = m.blueprint_key === "manual";

  const errors = [];
  const warnings = [];

  // ── Manual mockups: skip the intake-derived checks (no logo/photo/NIT
  // requirement when the admin hand-built the page). Just verify the HTML
  // exists in R2 and looks reasonable.
  if (isManual) {
    const obj = await env.ASSETS.get(m.html_r2_key);
    if (!obj) {
      errors.push({ code: "html_missing", msg: "index.html missing from R2 — re-upload before publishing." });
    } else {
      const html = await obj.text();
      if (!/<h1\b/i.test(html)) warnings.push({ code: "no_h1", msg: "No <h1> tag — bad for SEO." });
      if (!/<meta\s+name=["']description["']/i.test(html)) warnings.push({ code: "no_meta_desc", msg: "Missing meta description tag." });
      if (!/property=["']og:image["']/i.test(html)) warnings.push({ code: "no_og_image", msg: "No og:image — link previews on Slack/WhatsApp/Facebook will look bare." });
      if (/src=["']http:\/\//i.test(html) || /href=["']http:\/\/(?!schema\.org)/i.test(html)) {
        warnings.push({ code: "mixed_content", msg: "http:// URLs detected in the HTML (mixed-content risk on https sites)." });
      }
    }
    return helpers.json({ plan, errors, warnings, canShip: errors.length === 0, mockup_kind: "manual" });
  }

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

// Push a draft mockup to the client portal (gates the iframe via shipped_at).
// This does NOT publish the production site — that's still shipMockup/launch.
// Sends "Tu mockup está listo" email via Resend (bilingual for Crecimiento).
async function pushMockupToClient(env, helpers, mockupId) {
  const m = await env.DB.prepare("SELECT id, client_id, version, shipped_at FROM mockups WHERE id = ?")
    .bind(mockupId).first();
  if (!m) return helpers.json({ error: "not found" }, 404);

  const client = await env.DB.prepare("SELECT id, business_name, email, language, plan FROM clients WHERE id = ?")
    .bind(m.client_id).first();
  if (!client) return helpers.json({ error: "client not found" }, 404);

  // Idempotent: if already pushed, just return ok
  const now = Math.floor(Date.now() / 1000);
  if (!m.shipped_at) {
    await env.DB.prepare(
      "UPDATE mockups SET shipped_at = ? WHERE id = ?",
    ).bind(now, mockupId).run();
  }

  // (Project portal auto-mints its own share link on first read; no need here.)
  const portalUrl = `${env.APP_URL || "https://portal.pymewebpro.com"}/`;

  // Notify client — bilingual for Crecimiento clients, ES otherwise
  const isPro = client.plan === "pro" || client.plan === "crecimiento" || client.plan === "growth";
  const isEn = client.language === "en";
  const subject = isEn
    ? "Your mockup is ready to review"
    : "¡Su mockup está listo para revisar!";
  const htmlEs = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:540px;margin:0 auto;padding:24px;color:#1a1a1a">
    <h1 style="font-family:Georgia,serif;font-style:italic;font-weight:400;font-size:1.8rem;margin:0 0 16px">¡Su mockup está listo!</h1>
    <p style="line-height:1.6;color:#444">Hola${client.business_name ? ` <strong>${escapeHtml(client.business_name)}</strong>` : ""}, ya puede revisar el primer diseño de su sitio en su Portal del Proyecto.</p>
    <p style="margin:24px 0"><a href="${portalUrl}" style="display:inline-block;background:#0a0e27;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Ver mi mockup →</a></p>
    <p style="line-height:1.6;color:#666;font-size:.92rem">Desde el portal puede pedir cambios por chat o aprobar el diseño. Tiene <strong>${isPro ? 5 : 2} rondas de cambios</strong> incluidas en su plan.</p>
    <p style="line-height:1.6;color:#999;font-size:.85rem;margin-top:32px;border-top:1px solid #eee;padding-top:16px">Si no abrió este correo, puede ignorarlo. — PymeWebPro</p>
  </div>`;
  const htmlEn = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:540px;margin:0 auto;padding:24px;color:#1a1a1a">
    <h1 style="font-family:Georgia,serif;font-style:italic;font-weight:400;font-size:1.8rem;margin:0 0 16px">Your mockup is ready</h1>
    <p style="line-height:1.6;color:#444">Hi${client.business_name ? ` <strong>${escapeHtml(client.business_name)}</strong>` : ""}, the first design of your site is ready to review in your Project Portal.</p>
    <p style="margin:24px 0"><a href="${portalUrl}" style="display:inline-block;background:#0a0e27;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">View my mockup →</a></p>
    <p style="line-height:1.6;color:#666;font-size:.92rem">From the portal you can request changes via chat or approve the design. You have <strong>${isPro ? 5 : 2} revision rounds</strong> included in your plan.</p>
    <p style="line-height:1.6;color:#999;font-size:.85rem;margin-top:32px;border-top:1px solid #eee;padding-top:16px">If you didn't expect this email, you can ignore it. — PymeWebPro</p>
  </div>`;
  const html = isEn ? htmlEn : htmlEs;

  // Send the "mockup ready" email and AWAIT + log the result so we can debug
  // when emails don't land. The fire-and-forget pattern was hiding silent failures.
  let emailResult = { sent: false, reason: null };
  if (!client.email) {
    emailResult.reason = "no_client_email";
  } else if (!env.RESEND_API_KEY) {
    emailResult.reason = "resend_key_missing";
  } else {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: env.FROM_EMAIL || "PymeWebPro <noreply@pymewebpro.com>",
          to: [client.email],
          subject,
          html,
        }),
      });
      const txt = await r.text().catch(() => "");
      if (r.ok) {
        emailResult.sent = true;
        try { emailResult.resend_id = JSON.parse(txt).id; } catch (_) {}
      } else {
        emailResult.reason = `resend_status_${r.status}`;
        emailResult.detail = txt.slice(0, 400);
      }
    } catch (e) {
      emailResult.reason = "fetch_threw";
      emailResult.detail = String(e && e.message || e);
    }
  }

  // Audit-log the result so failed sends are visible without leaving the portal
  try {
    await env.DB.prepare(
      "INSERT INTO audit_log (client_id, event, metadata, created_at) VALUES (?, 'mockup_pushed_email', ?, ?)",
    ).bind(client.id, JSON.stringify({ to: client.email, mockup_id: mockupId, ...emailResult }), Math.floor(Date.now()/1000)).run();
  } catch (_) {}

  return helpers.json({ ok: true, shipped_at: m.shipped_at || now, email: emailResult });
}

// Tiny HTML escaper for the email template
function escapeHtml(s) { return String(s||"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]); }

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

  // Default published URL is the tenant subdomain; clients can attach their own
  // custom domain afterwards via the admin Domain Panel.
  const liveUrl = `https://${slug}.sites.pymewebpro.com/`;

  await env.DB.prepare(
    "UPDATE mockups SET status='shipped', shipped_at=?, shipped_url=? WHERE id=?",
  ).bind(Math.floor(Date.now() / 1000), liveUrl, mockupId).run();

  // ── Auto-mark ship-time deliverables ─────────────────────────────────────
  const shipKeys = ["setup_ssl", "setup_hosting_year", "close_handover"];
  // If the client also has a custom domain attached, those setup items are done too
  const liveRow = await env.DB.prepare("SELECT custom_domain FROM live_sites WHERE client_id = ?")
    .bind(m.client_id).first();
  if (liveRow?.custom_domain) {
    shipKeys.push("setup_domain", "setup_dns");
  }
  await autoMarkDeliverables(env, m.client_id, shipKeys);

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

// ─── Email Forwarding (Cloudflare Email Routing) ─────────────────────────
// Enables Email Routing on the client's zone and creates rule(s):
//   <localPart>@<domain>  →  <forwardTo>
// Multiple local parts supported via comma-separated string ("hola, info, ventas").
// Cloudflare emails the destination address a verification link — the client (or you)
// must click it before forwarding actually fires.
async function enableEmailForwarding(env, helpers, clientId, req) {
  const body = await req.json().catch(() => ({}));
  const localParts = String(body.localParts || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const forwardTo = String(body.forwardTo || "").trim().toLowerCase();
  if (!localParts.length || !forwardTo || !forwardTo.includes("@")) {
    return helpers.json({ error: "invalid_input", msg: "Necesito el alias (ej. 'hola, info') y el correo destino." }, 400);
  }
  // Validate each local part
  for (const lp of localParts) {
    if (!/^[a-z0-9._-]+$/.test(lp)) {
      return helpers.json({ error: "invalid_local_part", msg: `Alias inválido: "${lp}". Solo letras, números, punto, guion y guion bajo.` }, 400);
    }
  }

  // Look up the client's domain
  const live = await env.DB.prepare("SELECT custom_domain FROM live_sites WHERE client_id = ?").bind(clientId).first();
  const domain = live?.custom_domain;
  if (!domain) {
    return helpers.json({ error: "no_domain", msg: "Adjunte primero un dominio al cliente." }, 400);
  }

  if (!env.CLOUDFLARE_API_TOKEN) {
    return helpers.json({ error: "no_token", msg: "CLOUDFLARE_API_TOKEN no configurado en wrangler. Configure el secret y reintente." }, 500);
  }

  const cfHeaders = { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "content-type": "application/json" };
  const log = [];

  try {
    // 1) Find the zone
    const zonesRes = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(domain)}`, { headers: cfHeaders });
    const zonesJson = await zonesRes.json();
    const zone = zonesJson?.result?.[0];
    if (!zone) return helpers.json({ error: "zone_not_found", msg: `No encontré la zona ${domain} en Cloudflare.` }, 404);
    log.push(`Zone found: ${zone.id}`);

    // 2) Enable Email Routing on the zone (idempotent — code 1004 = already enabled)
    const enableRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/email/routing/enable`, {
      method: "POST", headers: cfHeaders,
    });
    const enableJson = await enableRes.json();
    if (enableJson.success || enableJson?.errors?.[0]?.code === 1004) {
      log.push("Email Routing enabled");
    } else {
      log.push("Enable warning: " + (enableJson?.errors?.[0]?.message || "unknown"));
    }

    // 3) Add MX/SPF DNS records (idempotent — Cloudflare API handles duplicates)
    const dnsRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/email/routing/dns`, {
      method: "POST", headers: cfHeaders,
    });
    const dnsJson = await dnsRes.json();
    log.push(dnsJson.success ? "MX records added" : "MX warning: " + (dnsJson?.errors?.[0]?.message || ""));

    // 4) Register the destination address — sends a verification email
    const destRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/email/routing/addresses`, {
      method: "POST", headers: cfHeaders,
      body: JSON.stringify({ email: forwardTo }),
    });
    const destJson = await destRes.json();
    let destinationVerified = false;
    if (destJson.success) {
      log.push(`Destination ${forwardTo} created — verification email sent`);
    } else if (destJson?.errors?.[0]?.code === 1003 /* already exists */) {
      log.push(`Destination ${forwardTo} already registered`);
      destinationVerified = true;
    } else {
      log.push("Destination warning: " + (destJson?.errors?.[0]?.message || ""));
    }

    // 5) Create a rule for each local part: <local>@<domain> → <forwardTo>
    for (const lp of localParts) {
      const ruleRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/email/routing/rules`, {
        method: "POST", headers: cfHeaders,
        body: JSON.stringify({
          name: `Forward ${lp}@${domain}`,
          enabled: true,
          matchers: [{ type: "literal", field: "to", value: `${lp}@${domain}` }],
          actions: [{ type: "forward", value: [forwardTo] }],
        }),
      });
      const ruleJson = await ruleRes.json();
      log.push(ruleJson.success
        ? `Rule created: ${lp}@${domain} → ${forwardTo}`
        : `Rule failed (${lp}): ` + (ruleJson?.errors?.[0]?.message || "unknown"));
    }

    // 6) Persist the config + auto-mark the deliverable
    await env.DB.prepare(`
      UPDATE clients SET
        deliverables_state = json_patch(coalesce(deliverables_state, '{}'), ?)
      WHERE id = ?
    `).bind(JSON.stringify({ setup_email_forward: { status: "done", note: `${localParts.join(", ")}@${domain} → ${forwardTo}` } }), clientId).run().catch(() => {});

    return helpers.json({
      ok: true,
      domain, localParts, forwardTo,
      destination_verified: destinationVerified,
      verification_note: destinationVerified
        ? "Reenvío activo. Pruebe enviando un correo a " + localParts[0] + "@" + domain + "."
        : "Cloudflare envió un correo de verificación a " + forwardTo + ". El reenvío empieza a funcionar después de hacer clic en ese link.",
      log,
    });
  } catch (e) {
    return helpers.json({ error: "api_error", msg: "Error llamando Cloudflare: " + e.message, log }, 500);
  }
}

// Admin pastes raw CSS that gets injected at the END of <head> on every
// rendered page for this client. Total visual control — overrides anything
// the blueprint sets. Capped at 64KB to keep R2 / D1 sane.
async function setClientAdminCss(env, helpers, clientId, req) {
  const body = await req.json().catch(() => ({}));
  const css = String(body.admin_css || "").slice(0, 64 * 1024);
  // Strip any </style> sequences — would break the wrapping <style> tag.
  // Also strip any <script> tags as a defense-in-depth measure (CSS shouldn't
  // contain scripts, but admin-pasted content shouldn't be a vector either).
  const safe = css.replace(/<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "");
  const r = await env.DB.prepare("UPDATE clients SET admin_css = ?, updated_at = ? WHERE id = ?")
    .bind(safe || null, Date.now(), clientId).run();
  return helpers.json({ ok: true, length: safe.length, changes: r.meta?.changes ?? 0 });
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

// ─── Auto-mark deliverables ───────────────────────────────────────────────
// Read clients.deliverables_state JSON, set each key in `keys` to 'done',
// write back. Idempotent and merges with whatever Mike manually changed.
async function autoMarkDeliverables(env, clientId, keys) {
  if (!keys || !keys.length) return;
  const row = await env.DB.prepare("SELECT deliverables_state FROM clients WHERE id = ?")
    .bind(clientId).first();
  let state = {};
  try { state = row?.deliverables_state ? JSON.parse(row.deliverables_state) : {}; } catch (_) {}
  let changed = false;
  for (const key of keys) {
    if (state[key] !== "done") { state[key] = "done"; changed = true; }
  }
  if (!changed) return;
  await env.DB.prepare("UPDATE clients SET deliverables_state = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(state), Date.now(), clientId).run();
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

// ─── Lead-form forwarder ────────────────────────────────────────────────────
// Customer sites POST contact-form submissions here; we email the client.
// Honeypot + Habeas Data consent + size limits, no DB write (just an email).
async function leadFormSubmit(env, helpers, clientId, req) {
  const cors = corsHeaders();
  const client = await env.DB.prepare("SELECT id, email, business_name FROM clients WHERE id = ?")
    .bind(clientId).first();
  if (!client) return new Response(JSON.stringify({ error: "client not found" }), { status: 404, headers: { "content-type": "application/json", ...cors } });

  let body = {};
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) body = await req.json().catch(() => ({}));
  else if (ct.includes("form")) {
    const fd = await req.formData();
    body = Object.fromEntries(fd.entries());
  }

  // Honeypot
  if (body.company_url) {
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", ...cors } });
  }
  // Habeas Data consent
  if (body.habeas_data_accepted !== true && body.habeas_data_accepted !== "true" && body.habeas_data_accepted !== "on") {
    return new Response(JSON.stringify({ error: "habeas_data_required" }), { status: 400, headers: { "content-type": "application/json", ...cors } });
  }

  const name = String(body.name || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
  const phone = String(body.phone || "").trim().slice(0, 60);
  const message = String(body.message || "").trim().slice(0, 4000);
  const source = String(body.source || "").trim().slice(0, 500);

  if (!name || !email || !email.includes("@") || !message) {
    return new Response(JSON.stringify({ error: "invalid_fields" }), { status: 400, headers: { "content-type": "application/json", ...cors } });
  }

  // Audit log so the client can come back if their email server eats one
  try {
    await env.DB.prepare(`
      INSERT INTO audit_log (id, client_id, action, payload_json, created_at)
      VALUES (?, ?, 'lead_form_submission', ?, ?)
    `).bind(helpers.uuid(), clientId, JSON.stringify({ name, email, phone, message, source }), Math.floor(Date.now()/1000)).run();
  } catch (_) { /* table optional */ }

  // Forward to client's email
  if (env.RESEND_API_KEY && client.email) {
    const replyTo = email; // so client can reply directly to the lead
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env.FROM_EMAIL || "PymeWebPro <noreply@pymewebpro.com>",
        to: [client.email],
        reply_to: replyTo,
        subject: `Nuevo lead desde su sitio: ${name}`,
        html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:540px;margin:0 auto;padding:24px;color:#1a1a1a">
          <h2 style="margin:0 0 16px;font-family:Georgia,serif">Nuevo lead desde su sitio</h2>
          <table style="width:100%;border-collapse:collapse;margin:0 0 16px">
            <tr><td style="padding:6px 0;color:#666;width:90px">Nombre:</td><td style="padding:6px 0;font-weight:600">${helpers.escapeHtml(name)}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Correo:</td><td style="padding:6px 0"><a href="mailto:${helpers.escapeHtml(email)}">${helpers.escapeHtml(email)}</a></td></tr>
            ${phone ? `<tr><td style="padding:6px 0;color:#666">Teléfono:</td><td style="padding:6px 0"><a href="tel:${helpers.escapeHtml(phone)}">${helpers.escapeHtml(phone)}</a></td></tr>` : ""}
            ${source ? `<tr><td style="padding:6px 0;color:#666">Página:</td><td style="padding:6px 0;color:#999;font-size:.85rem">${helpers.escapeHtml(source)}</td></tr>` : ""}
          </table>
          <div style="background:#f7f5f0;border-left:3px solid #fbbf24;padding:14px 18px;border-radius:4px;white-space:pre-wrap;line-height:1.5">${helpers.escapeHtml(message)}</div>
          <p style="margin:24px 0 0;color:#999;font-size:.82rem">Puede responder directamente a este correo — irá al lead.<br>— PymeWebPro</p>
        </div>`,
      }),
    }).catch(() => {});
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", ...cors } });
}
