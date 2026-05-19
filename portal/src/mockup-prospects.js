// mockup-prospects.js · admin CRUD for sales-prospect mockups.
//
// All routes are admin-only (gated by helpers.isAdmin upstream in mockups.js).
//
// Routes:
//   GET    /api/admin/mockup-prospects               · list (newest first)
//   POST   /api/admin/mockup-prospects               · create from a brief
//   GET    /api/admin/mockup-prospects/:id           · get one by id or slug
//   PUT    /api/admin/mockup-prospects/:id           · update (any field)
//   DELETE /api/admin/mockup-prospects/:id           · archive (status='archived', not hard delete)
//
// All writes set updated_at = Date.now(). Inserts also set created_at + id.
//
// The handler is exported as handleMockupProspects(req, env, helpers) and
// returns null when the path doesn't match, so mockups.js can dispatch to
// the next handler.

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const ID_RE   = /^[a-f0-9]{32}$/;

const FIELDS = [
  "slug",
  "business_name",
  "instagram_url",
  "facebook_url",
  "tiktok_url",
  "website_url",
  "style_brief",
  "owner_name",
  "owner_whatsapp",
  "cal_link",
  "notes",
  "chatbot_system_prompt",
  "status",
];

const STATUSES = new Set(["brief", "building", "live", "archived"]);

function normalizeSlug(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return SLUG_RE.test(s) ? s : null;
}

function normalizeWhatsApp(raw) {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return digits;
}

function pickWritable(body) {
  const out = {};
  for (const k of FIELDS) {
    if (k in body) {
      let v = body[k];
      if (typeof v === "string") v = v.trim();
      if (v === "") v = null;
      out[k] = v;
    }
  }
  if (out.slug != null) out.slug = normalizeSlug(out.slug);
  if (out.owner_whatsapp != null) out.owner_whatsapp = normalizeWhatsApp(out.owner_whatsapp);
  if (out.status != null && !STATUSES.has(out.status)) out.status = null;
  return out;
}

function publicShape(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    business_name: row.business_name,
    instagram_url: row.instagram_url,
    facebook_url: row.facebook_url,
    tiktok_url: row.tiktok_url,
    website_url: row.website_url,
    style_brief: row.style_brief,
    owner_name: row.owner_name,
    owner_whatsapp: row.owner_whatsapp,
    cal_link: row.cal_link,
    notes: row.notes,
    chatbot_system_prompt: row.chatbot_system_prompt,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    mockup_url: row.slug ? "https://mockups.pymewebpro.com/" + row.slug + "/" : null,
  };
}

async function fetchById(env, idOrSlug) {
  // Accept either the 32-hex id or the slug. Slug is the friendlier path.
  if (ID_RE.test(idOrSlug)) {
    return env.DB.prepare("SELECT * FROM mockup_prospects WHERE id = ?").bind(idOrSlug).first();
  }
  const slug = normalizeSlug(idOrSlug);
  if (!slug) return null;
  return env.DB.prepare("SELECT * FROM mockup_prospects WHERE slug = ?").bind(slug).first();
}

// ─── Public dispatch ────────────────────────────────────────────────────────

export async function handleMockupProspects(req, env, helpers) {
  const { json } = helpers;
  const url = new URL(req.url);
  const p = url.pathname;
  const m = req.method;

  if (!p.startsWith("/api/admin/mockup-prospects")) return null;
  if (!helpers.isAdmin(req, env)) return json({ error: "unauthorized" }, 401);

  // List + create
  if (p === "/api/admin/mockup-prospects") {
    if (m === "GET")  return listProspects(env, json, url);
    if (m === "POST") return createProspect(env, json, req);
    return json({ error: "method_not_allowed" }, 405);
  }

  // Single-resource ops
  const idMatch = p.match(/^\/api\/admin\/mockup-prospects\/([A-Za-z0-9-]+)\/?$/);
  if (idMatch) {
    const idOrSlug = idMatch[1];
    if (m === "GET")    return getProspect(env, json, idOrSlug);
    if (m === "PUT")    return updateProspect(env, json, req, idOrSlug);
    if (m === "DELETE") return deleteProspect(env, json, idOrSlug);
    return json({ error: "method_not_allowed" }, 405);
  }

  return json({ error: "not_found" }, 404);
}

// ─── Handlers ───────────────────────────────────────────────────────────────

async function listProspects(env, json, url) {
  const status = url.searchParams.get("status");
  const validStatus = status && STATUSES.has(status) ? status : null;

  const sql = validStatus
    ? "SELECT * FROM mockup_prospects WHERE status = ? ORDER BY updated_at DESC LIMIT 200"
    : "SELECT * FROM mockup_prospects WHERE status != 'archived' ORDER BY updated_at DESC LIMIT 200";

  const stmt = validStatus
    ? env.DB.prepare(sql).bind(validStatus)
    : env.DB.prepare(sql);

  const result = await stmt.all();
  return json({ prospects: (result.results || []).map(publicShape) });
}

async function createProspect(env, json, req) {
  let body;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const fields = pickWritable(body || {});
  if (!fields.slug) return json({ error: "missing_or_invalid_slug" }, 400);
  if (!fields.business_name) return json({ error: "missing_business_name" }, 400);

  // Reject duplicate slugs early so the SPA can suggest a different one.
  const dup = await env.DB.prepare("SELECT id FROM mockup_prospects WHERE slug = ?").bind(fields.slug).first();
  if (dup) return json({ error: "slug_taken" }, 409);

  const id = crypto.randomUUID().replace(/-/g, "");
  const now = Date.now();
  const status = fields.status || "brief";

  await env.DB.prepare(
    "INSERT INTO mockup_prospects (" +
      "id, slug, business_name, instagram_url, facebook_url, tiktok_url, website_url, " +
      "style_brief, owner_name, owner_whatsapp, cal_link, notes, chatbot_system_prompt, " +
      "status, created_at, updated_at" +
    ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    id,
    fields.slug,
    fields.business_name,
    fields.instagram_url   ?? null,
    fields.facebook_url    ?? null,
    fields.tiktok_url      ?? null,
    fields.website_url     ?? null,
    fields.style_brief     ?? null,
    fields.owner_name      ?? null,
    fields.owner_whatsapp  ?? null,
    fields.cal_link        ?? null,
    fields.notes           ?? null,
    fields.chatbot_system_prompt ?? null,
    status,
    now, now,
  ).run();

  const row = await env.DB.prepare("SELECT * FROM mockup_prospects WHERE id = ?").bind(id).first();
  return json({ prospect: publicShape(row) }, 201);
}

async function getProspect(env, json, idOrSlug) {
  const row = await fetchById(env, idOrSlug);
  if (!row) return json({ error: "not_found" }, 404);
  return json({ prospect: publicShape(row) });
}

async function updateProspect(env, json, req, idOrSlug) {
  const existing = await fetchById(env, idOrSlug);
  if (!existing) return json({ error: "not_found" }, 404);

  let body;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const fields = pickWritable(body || {});
  // slug can be updated, but reject if it collides with another row
  if (fields.slug && fields.slug !== existing.slug) {
    const dup = await env.DB.prepare(
      "SELECT id FROM mockup_prospects WHERE slug = ? AND id != ?"
    ).bind(fields.slug, existing.id).first();
    if (dup) return json({ error: "slug_taken" }, 409);
  }

  const setClauses = [];
  const args = [];
  for (const [k, v] of Object.entries(fields)) {
    setClauses.push(k + " = ?");
    args.push(v);
  }
  if (setClauses.length === 0) return json({ prospect: publicShape(existing) }); // no-op

  setClauses.push("updated_at = ?");
  args.push(Date.now());
  args.push(existing.id);

  await env.DB.prepare(
    "UPDATE mockup_prospects SET " + setClauses.join(", ") + " WHERE id = ?"
  ).bind(...args).run();

  const row = await env.DB.prepare("SELECT * FROM mockup_prospects WHERE id = ?").bind(existing.id).first();
  return json({ prospect: publicShape(row) });
}

async function deleteProspect(env, json, idOrSlug) {
  const existing = await fetchById(env, idOrSlug);
  if (!existing) return json({ error: "not_found" }, 404);

  // Soft delete · keeps history and keeps the chatbot working if someone
  // still has the mockup URL open. Use status='archived' so list view hides it
  // by default.
  await env.DB.prepare(
    "UPDATE mockup_prospects SET status = 'archived', updated_at = ? WHERE id = ?"
  ).bind(Date.now(), existing.id).run();

  return json({ ok: true });
}
