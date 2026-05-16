// ============================================================================
// PymeWebPro CRM module · pipeline + activities, spreadsheet-style admin grid
// ============================================================================
// Mounted by src/index.js:
//   - GET  /admin/crm                  -> serves the standalone HTML grid app
//   - GET  /api/admin/crm/grid         -> returns { leads, clients, deals, activities }
//   - GET  /api/admin/crm/<table>      -> list rows of a single table
//   - POST /api/admin/crm/<table>      -> create row, returns {row}
//   - PATCH /api/admin/crm/<table>/<id>-> update row, returns {row}
//   - DELETE /api/admin/crm/<table>/<id>
//
// `<table>` is one of: leads, clients, deals, activities.
// Admin auth is the same Bearer token pattern as the rest of /api/admin/* (uses
// the `isAdmin` helper passed in from index.js).
//
// No em dashes ANYWHERE per house style.

const TABLES = ["leads", "clients", "deals", "activities"];

// Whitelisted columns per table. Used to filter the UPDATE payload so a client
// can't write to e.g. `created_at` or unknown columns.
const EDITABLE_COLUMNS = {
  leads: [
    "source", "name", "email", "phone", "business_name", "message", "language",
    "status", "plan", "hosting", "notes",
    // Lead funnel columns (added by 0002_lead_funnel.sql).
    "lead_stage", "last_touched_at", "last_touched_kind", "touches_count",
    "next_action", "next_action_due",
    // Enrichment columns (added by 0003_lead_enrichment.sql).
    "heat", "score", "category", "city", "instagram", "whatsapp",
    "current_site", "cms", "motion", "address", "suggested_pitch",
    "followers", "on_today_list",
    // Social URL columns (added by 0005_socials_and_proposals.sql).
    "facebook_url", "x_url", "tiktok_url",
  ],
  clients: [
    "email", "business_name", "status", "language", "plan", "site_url",
  ],
  deals: [
    "title", "lead_id", "client_id", "stage", "plan",
    "value_cad_cents", "value_cop_cents", "probability", "expected_close",
    "owner", "source", "next_action", "next_action_due", "notes", "closed_at",
    // Proposal package columns (added by 0005_socials_and_proposals.sql).
    "proposal_status",
  ],
  activities: [
    "kind", "subject", "body", "lead_id", "client_id", "deal_id",
    "owner", "outcome", "occurred_at", "due_at", "done",
  ],
};

// Required NOT NULL fields for INSERT. Keep aligned with migrations.
const REQUIRED_ON_INSERT = {
  leads: [],            // creating leads from the CRM is rare; defaults are forgiving
  clients: ["email"],   // UNIQUE NOT NULL
  deals: ["title"],
  activities: ["kind", "subject"],
};

export async function handleAdminCRM(request, env, helpers) {
  const { json, isAdmin, uuid } = helpers;
  if (!isAdmin(request, env)) return json({ error: "Unauthorized" }, 401);

  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // GET /api/admin/crm/grid -> all four tables in one response, for first paint.
  if (path === "/api/admin/crm/grid" && method === "GET") {
    return await loadGrid(env, json);
  }

  // Match /api/admin/crm/<table> or /api/admin/crm/<table>/<id>
  const m = path.match(/^\/api\/admin\/crm\/([a-z]+)(?:\/([\w-]+))?$/);
  if (!m) return json({ error: "Not found" }, 404);
  const table = m[1];
  const id = m[2];
  if (!TABLES.includes(table)) return json({ error: "Unknown table" }, 404);

  if (method === "GET" && !id)  return await listRows(env, table, url, json);
  if (method === "POST" && !id) return await createRow(env, table, request, json, uuid);
  if (method === "PATCH" && id) return await updateRow(env, table, id, request, json);
  if (method === "DELETE" && id) return await deleteRow(env, table, id, json);

  return json({ error: "Method not allowed" }, 405);
}

// ---- Grid loader -----------------------------------------------------------

async function loadGrid(env, json) {
  // Pull a working window: ~500 rows per table. Mike + Santi are not at the
  // scale where pagination matters yet; revisit if any table tops a few thousand.
  const [leads, clients, deals, activities] = await Promise.all([
    env.DB.prepare(
      `SELECT id, source, name, email, phone, business_name, message, language,
              status, plan, hosting, notes, converted_client_id,
              lead_stage, last_touched_at, last_touched_kind, touches_count,
              next_action, next_action_due,
              heat, score, category, city, instagram, whatsapp,
              current_site, cms, motion, address, suggested_pitch,
              followers, on_today_list,
              facebook_url, x_url, tiktok_url,
              created_at, updated_at
         FROM leads ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 8000`
    ).all(),
    env.DB.prepare(
      `SELECT id, email, business_name, status, language, plan, site_url,
              created_at, updated_at, submitted_at
         FROM clients ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 500`
    ).all(),
    env.DB.prepare(
      `SELECT * FROM deals ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 500`
    ).all(),
    env.DB.prepare(
      `SELECT * FROM activities ORDER BY COALESCE(occurred_at, created_at) DESC LIMIT 500`
    ).all(),
  ]);

  return json({
    leads: leads.results || [],
    clients: clients.results || [],
    deals: deals.results || [],
    activities: activities.results || [],
    counts: {
      leads: (leads.results || []).length,
      clients: (clients.results || []).length,
      deals: (deals.results || []).length,
      activities: (activities.results || []).length,
    },
    generated_at: Date.now(),
  });
}

// ---- CRUD ------------------------------------------------------------------

async function listRows(env, table, url, json) {
  // Optional ?search= filter on common text columns. Cheap LIKE scan; fine at
  // current volumes.
  const search = (url.searchParams.get("search") || "").trim();
  let sql = `SELECT * FROM ${table} ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 500`;
  let binds = [];
  if (search) {
    const cols = searchColumns(table);
    if (cols.length) {
      const where = cols.map((c) => `${c} LIKE ?`).join(" OR ");
      const like = "%" + search + "%";
      sql = `SELECT * FROM ${table} WHERE ${where} ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 500`;
      binds = cols.map(() => like);
    }
  }
  const rows = await env.DB.prepare(sql).bind(...binds).all();
  return json({ rows: rows.results || [] });
}

function searchColumns(table) {
  switch (table) {
    case "leads": return ["name", "email", "business_name", "notes", "message"];
    case "clients": return ["email", "business_name"];
    case "deals": return ["title", "notes", "next_action"];
    case "activities": return ["subject", "body"];
    default: return [];
  }
}

async function createRow(env, table, request, json, uuid) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!body || typeof body !== "object") return json({ error: "Invalid payload" }, 400);

  const required = REQUIRED_ON_INSERT[table];
  for (const f of required) {
    if (!body[f] || String(body[f]).trim() === "") {
      return json({ error: `Missing required field: ${f}` }, 400);
    }
  }

  const cols = EDITABLE_COLUMNS[table];
  const payload = {};
  for (const c of cols) {
    if (body[c] !== undefined) payload[c] = coerce(c, body[c]);
  }
  const now = Date.now();
  payload.id = uuid();
  payload.created_at = now;
  payload.updated_at = now;

  // Leads use UNIQUE(email) in some setups; clients table definitely does.
  if (table === "clients" && payload.email) {
    const dup = await env.DB.prepare("SELECT id FROM clients WHERE email = ?").bind(payload.email).first();
    if (dup) return json({ error: "Client with that email already exists", existing_id: dup.id }, 409);
  }

  const keys = Object.keys(payload);
  const placeholders = keys.map(() => "?").join(", ");
  const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`;
  await env.DB.prepare(sql).bind(...keys.map((k) => payload[k])).run();

  const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(payload.id).first();
  return json({ row });
}

async function updateRow(env, table, id, request, json) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!body || typeof body !== "object") return json({ error: "Invalid payload" }, 400);

  const cols = EDITABLE_COLUMNS[table];
  const sets = [];
  const binds = [];
  for (const c of cols) {
    if (body[c] !== undefined) {
      sets.push(`${c} = ?`);
      binds.push(coerce(c, body[c]));
    }
  }
  if (!sets.length) return json({ error: "No editable fields supplied" }, 400);

  // Always bump updated_at on UPDATE.
  sets.push("updated_at = ?");
  binds.push(Date.now());

  binds.push(id);
  const sql = `UPDATE ${table} SET ${sets.join(", ")} WHERE id = ?`;
  const res = await env.DB.prepare(sql).bind(...binds).run();
  if (!res.meta || res.meta.changes === 0) {
    // Row may not exist OR no values changed. Distinguish.
    const exists = await env.DB.prepare(`SELECT id FROM ${table} WHERE id = ?`).bind(id).first();
    if (!exists) return json({ error: "Row not found" }, 404);
  }
  const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
  return json({ row });
}

async function deleteRow(env, table, id, json) {
  await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}

// Light type coercion. Anything ending in `_at`, `_cents`, `_due`, or named
// `probability`/`done` is normalized to integer; empty strings become null.
function coerce(col, val) {
  if (val === "" || val === undefined) return null;
  if (val === null) return null;
  if (
    col.endsWith("_at") ||
    col.endsWith("_cents") ||
    col.endsWith("_due") ||
    col === "probability" ||
    col === "done"
  ) {
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      const t = Date.parse(val);
      return Number.isFinite(t) ? t : null;
    }
    const n = Number(val);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  if (col === "phone" || col === "whatsapp") {
    return normalizePhone(val);
  }
  return val;
}

// Normalize a Colombian phone or WhatsApp number to +57XXXXXXXXXX form when
// possible. Falls back to the digits-with-leading-plus for anything that
// doesn't fit Colombian conventions (e.g. a +1 US/CA contact).
function normalizePhone(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith("3")) return "+57" + digits;
  if (digits.length === 12 && digits.startsWith("57")) return "+" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  if (s.startsWith("+")) return "+" + digits;
  return "+" + digits;
}

// ============================================================================
// /admin/crm page · standalone Excel-style grid (vanilla JS, no React)
// ============================================================================
export function crmPageHTML(env) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>CRM · PymeWebPro</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,700;0,900;1,500&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,700;0,900;1,500&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"></noscript>
<style>
:root {
  --paper:    #F2E9D5;
  --paper-2:  #E8DFC8;
  --paper-3:  #DDD4B8;
  --ink:      #1A1612;
  --ink-soft: #3A2F26;
  --ink-mute: rgba(26,22,18,.50);
  --ink-faint: rgba(26,22,18,.09);
  --ink-line:  rgba(26,22,18,.16);
  --p:      #D24A1D;
  --p-deep: #A8381A;
  --p-bg:   rgba(210,74,29,.09);
  --green: #166534; --green-bg: rgba(22,101,52,.10);
  --amber: #92400E; --amber-bg: rgba(146,64,14,.12);
  --red:   #991B1B; --red-bg:   rgba(153,27,27,.10);
  --blue:  #1D4ED8; --blue-bg:  rgba(29,78,216,.10);
  --row-hover: #EBE1CC;
  --serif: 'Fraunces', Georgia, serif;
  --sans:  'Inter Tight', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --mono:  'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  /* Legacy aliases keep all var(--accent), var(--bg) etc. working unchanged */
  --bg:         var(--paper);
  --accent:     var(--p);
  --accent-bg:  var(--p-bg);
  --header-bg:  var(--ink);
  --header-ink: var(--paper);
  --pill-bg:    rgba(26,22,18,.07);
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg); color: var(--ink);
  font-family: var(--sans);
  font-size: 14px;
  min-height: 100vh;
  display: flex; flex-direction: column;
  background-image: radial-gradient(rgba(26,22,18,.05) 1px, transparent 1px);
  background-size: 3px 3px;
  -webkit-font-smoothing: antialiased;
}
header {
  background: var(--ink);
  color: var(--paper);
  padding: 0.7rem 1.5rem;
  display: flex; align-items: center; gap: 1rem;
  position: sticky; top: 0; z-index: 50;
  border-bottom: 3px double rgba(242,233,213,.2);
}
/* When embedded as an iframe in the admin SPA the parent already shows a
   header, so we suppress ours. The body class is set by inline script below. */
body.embed > header { display: none; }
body.embed nav.tabs { top: 0; }
header .brand { display: flex; align-items: baseline; gap: 0.35rem; font-family: var(--serif); font-weight: 900; font-size: 1.1rem; letter-spacing: -0.01em; }
header .brand em { font-style: italic; font-weight: 500; color: var(--p); }
header .brand span { font-family: var(--mono); font-size: 0.62rem; letter-spacing: .14em; text-transform: uppercase; color: rgba(242,233,213,.45); margin-left: 0.35rem; vertical-align: middle; }
header .spacer { flex: 1; }
header a.back { color: rgba(242,233,213,.6); text-decoration: none; font-family: var(--mono); font-size: 0.62rem; letter-spacing: .1em; text-transform: uppercase; }
header a.back:hover { color: var(--p); }

nav.tabs {
  background: var(--paper-2); border-bottom: 2px solid var(--ink-line);
  padding: 0.45rem 1.5rem; display: flex; gap: 0.3rem; align-items: center;
  position: sticky; top: 48px; z-index: 49; flex-wrap: wrap;
}
nav.tabs button {
  background: transparent; border: 1px solid var(--ink-faint);
  padding: 0.35rem 0.75rem; border-radius: 3px; cursor: pointer;
  font-size: 0.69rem; letter-spacing: 0.09em; text-transform: uppercase;
  font-family: var(--mono); color: var(--ink-soft);
  display: inline-flex; align-items: center; gap: 0.35rem;
  transition: all 0.1s;
}
nav.tabs button:hover { background: var(--paper-3); color: var(--ink); }
nav.tabs button.active {
  background: var(--accent-bg); color: var(--accent);
  border-color: rgba(210,74,29,.3);
}
nav.tabs .count {
  font-size: 0.65rem; padding: 1px 6px; border-radius: 8px;
  background: rgba(26,22,18,.07); color: var(--ink-mute);
}
nav.tabs button.active .count { background: rgba(210,74,29,.18); color: var(--accent); }
nav.tabs .grow { flex: 1; }
nav.tabs input.search {
  border: 1px solid var(--ink-line); padding: 0.35rem 0.55rem;
  border-radius: 3px; font-family: var(--mono); font-size: 0.72rem;
  background: var(--paper); color: var(--ink); min-width: 200px;
}
nav.tabs input.search:focus { outline: none; border-color: var(--p); }
nav.tabs button.primary {
  background: var(--p); color: var(--paper); border-color: var(--p); font-weight: 700;
}
nav.tabs button.primary:hover { background: var(--p-deep); }
nav.tabs button.ghost { color: var(--ink-soft); }

main { flex: 1; padding: 0; overflow: auto; }

.login {
  max-width: 420px; margin: 4rem auto; padding: 2rem;
  background: var(--paper-2); border: 1.5px solid var(--ink); border-radius: 4px;
  box-shadow: 4px 4px 0 var(--ink);
}
.login h2 { font-family: var(--serif); font-weight: 700; margin: 0 0 1.5rem; font-size: 1.5rem; letter-spacing: -0.01em; }
.login input { width: 100%; padding: 0.75rem; border: 1px solid var(--ink-line); border-radius: 4px; font-size: 0.95rem; font-family: inherit; }
.login button { width: 100%; padding: 0.75rem; background: var(--accent); color: white; border: none; border-radius: 4px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; margin-top: 1rem; font-family: inherit; font-size: 0.85rem; }
.login .err { color: var(--red); font-size: 0.85rem; margin-top: 0.75rem; }

.grid-wrap { padding: 0; }
table.sheet {
  width: 100%;
  border-collapse: separate; border-spacing: 0;
  background: var(--paper);
  font-size: 13px;
}
table.sheet thead th {
  background: var(--paper-2);
  color: var(--ink); font-weight: 600; text-align: left;
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid var(--ink-line);
  border-right: 1px solid var(--ink-faint);
  position: sticky; top: 0; z-index: 5;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase;
}
table.sheet thead th .sortarrow { color: var(--ink-soft); margin-left: 4px; font-size: 0.75rem; }
table.sheet thead th:first-child { padding-left: 1.2rem; }
table.sheet tbody td {
  padding: 0; border-bottom: 1px solid var(--ink-faint);
  border-right: 1px solid var(--ink-faint);
  vertical-align: middle; white-space: nowrap;
  max-width: 280px;
}
table.sheet tbody td:first-child { padding-left: 0; }
table.sheet tbody tr:hover td { background: var(--row-hover); }
table.sheet tbody td .cell {
  padding: 0.4rem 0.6rem; min-height: 24px;
  overflow: hidden; text-overflow: ellipsis;
  cursor: cell;
}
table.sheet tbody td:first-child .cell { padding-left: 1.2rem; }
table.sheet tbody td input.edit, table.sheet tbody td select.edit, table.sheet tbody td textarea.edit {
  width: 100%; padding: 0.4rem 0.55rem;
  border: 2px solid var(--accent); background: var(--paper);
  font-family: var(--mono); font-size: 13px; font-weight: 600;
  outline: none;
}
table.sheet tbody td textarea.edit { min-height: 60px; resize: vertical; font-weight: 400; }
table.sheet tbody td.actions { width: 80px; text-align: right; padding-right: 0.6rem; }
table.sheet tbody td.actions button {
  background: transparent; border: none; cursor: pointer;
  color: var(--ink-soft); font-size: 1rem; padding: 0.2rem 0.4rem;
}
table.sheet tbody td.actions button:hover { color: var(--red); }
table.sheet tbody tr.new-row td .cell { color: var(--ink-soft); font-style: italic; }
.row-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem; color: var(--ink-soft);
}
.empty {
  padding: 3rem; text-align: center; color: var(--ink-soft);
  font-family: var(--serif); font-style: italic;
}

/* Stage / status pills */
.pill {
  display: inline-block; padding: 2px 8px; border-radius: 10px;
  font-size: 0.72rem; font-weight: 600; letter-spacing: 0.04em;
  background: var(--pill-bg); color: var(--ink);
}
.pill.green { background: rgba(22,163,74,0.12); color: var(--green); }
.pill.amber { background: rgba(217,119,6,0.14); color: var(--amber); }
.pill.red { background: rgba(220,38,38,0.12); color: var(--red); }
.pill.blue { background: rgba(37,99,235,0.12); color: var(--blue); }
.pill.purp { background: rgba(109,40,217,0.10); color: #6D28D9; }
.pill.gray { background: var(--pill-bg); color: var(--ink-soft); }

.toast {
  position: fixed; bottom: 1.5rem; right: 1.5rem;
  background: var(--ink); color: white; padding: 0.7rem 1rem;
  border-radius: 4px; font-size: 0.85rem; opacity: 0;
  transition: opacity 0.2s; z-index: 100; pointer-events: none;
}
.toast.show { opacity: 1; }
.toast.err { background: var(--red); }

.statusbar {
  background: var(--header-bg); color: rgba(255,255,255,0.55);
  padding: 0.4rem 1.5rem; font-size: 0.75rem;
  display: flex; gap: 1.5rem;
}
.statusbar .ok { color: #4ade80; }

/* ---- Kanban funnel ---- */
.kanban-toolbar {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 1rem 0;
  font-size: 0.78rem; color: var(--ink-soft);
}
.kanban-toolbar select {
  font-size: 0.78rem; padding: 3px 8px; border-radius: 4px;
  border: 1px solid var(--ink-line); background: var(--paper); color: var(--ink);
  cursor: pointer;
}
.kanban-toolbar select:focus { outline: none; border-color: var(--accent); }
.kanban {
  display: flex; gap: 0.75rem;
  padding: 1rem 1rem 2rem; overflow-x: auto;
  align-items: flex-start;
  min-height: calc(100vh - 200px);
  min-width: max-content;
}
#kanban-wrap { overflow-x: auto; }
.kanban .col {
  flex: 0 0 260px;
  width: 260px;
  min-width: 260px;
  max-width: 260px;
  background: var(--paper-2);
  border: 1px solid var(--ink-line);
  border-radius: 4px;
  display: flex; flex-direction: column;
  max-height: calc(100vh - 200px);
  overflow: hidden;
}
.kanban .col-head {
  padding: 0.6rem 0.85rem;
  border-bottom: 1px solid var(--ink-line);
  display: flex; align-items: center; justify-content: space-between;
  font-family: var(--mono); font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase;
  font-weight: 700;
  position: sticky; top: 0; background: var(--paper-2); z-index: 2;
  border-radius: 4px 4px 0 0;
}
.kanban .col-head .dot {
  width: 8px; height: 8px; border-radius: 50%;
  display: inline-block; margin-right: 6px; vertical-align: middle;
}
.kanban .col-head .num {
  font-size: 0.7rem; padding: 1px 7px; border-radius: 10px;
  background: var(--paper); color: var(--ink-soft); font-weight: 600;
  letter-spacing: 0;
}
.kanban .col-body {
  flex: 1; overflow-y: auto; padding: 0.5rem;
  display: flex; flex-direction: column; gap: 0.5rem;
  min-height: 60px;
}
.kanban .col.drag-over .col-body {
  background: rgba(255,92,46,0.06);
  outline: 2px dashed rgba(255,92,46,0.35);
  outline-offset: -4px;
  border-radius: 4px;
}
.kanban .card {
  background: var(--paper);
  border: 1px solid var(--ink-line);
  border-left: 3px solid var(--ink-mute);
  border-radius: 3px;
  padding: 0.48rem 0.6rem;
  font-size: 0.8rem;
  cursor: grab;
  box-shadow: 0 1px 2px rgba(26,22,18,.03);
  transition: transform 0.1s, box-shadow 0.1s;
  min-width: 0;
  flex-shrink: 0;
  overflow: hidden;
  word-break: break-word;
}
.kanban .card:hover { box-shadow: 2px 2px 0 var(--ink-line); }
.kanban .card.dragging { opacity: 0.4; cursor: grabbing; }
.kanban .card.selected {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  background: rgba(255,92,46,0.05);
  box-shadow: 0 2px 8px rgba(255,92,46,0.2);
}
.kanban .card.selected.dragging { opacity: 0.4; }
.kanban .card.t-lead   { border-left-color: #6b7280; }
.kanban .card.t-deal   { border-left-color: var(--accent); }
.kanban .card.t-client { border-left-color: #16a34a; }
.kanban .card .title {
  font-weight: 600; color: var(--ink); margin-bottom: 0.18rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.kanban .card .meta {
  font-family: var(--mono); font-size: 0.63rem; color: var(--ink-mute);
  display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;
  min-width: 0; overflow: hidden;
}
.kanban .card .meta > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.kanban .card .type-pill {
  font-size: 0.62rem; padding: 1px 6px; border-radius: 3px;
  letter-spacing: 0.05em; text-transform: uppercase; font-weight: 700;
  background: var(--pill-bg); color: var(--ink-soft);
}
.kanban .card.t-lead .type-pill   { background: #e5e7eb; color: #374151; }
.kanban .card.t-deal .type-pill   { background: rgba(255,92,46,0.15); color: var(--accent); }
.kanban .card.t-client .type-pill { background: rgba(22,163,74,0.15); color: #16a34a; }
.kanban .card .money { font-weight: 600; color: var(--ink); }
/* Social icon row on lead cards. Each icon is a compact monogram link that
   opens the social profile in a new tab. Empty slots render dimmed so Santi
   can see which socials still need to be filled. */
.kanban .card .socials {
  display: flex; gap: 4px; margin-top: 6px;
}
.kanban .card .soc {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px;
  font: 700 9px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  text-decoration: none; border-radius: 4px;
  letter-spacing: 0.02em;
}
.kanban .card .soc-empty {
  background: transparent; color: var(--ink-soft);
  border: 1px dashed var(--ink-line);
}
.kanban .card .soc-instagram    { background: #E1306C; color: #fff; }
.kanban .card .soc-facebook_url { background: #1877F2; color: #fff; }
.kanban .card .soc-x_url        { background: #000000; color: #fff; }
.kanban .card .soc-tiktok_url   { background: #111111; color: #25F4EE; border: 1px solid #FE2C55; }
.kanban .card .soc:hover { opacity: 0.85; transform: translateY(-1px); }
/* Contact status strip on deal Kanban cards. */
.kanban .card .contact-status {
  font-size: 0.68rem; margin-top: 0.35rem;
  padding: 2px 6px; border-radius: 3px; display: inline-block;
}
.kanban .card .contact-status.cs-new {
  background: rgba(249,115,22,0.12); color: #c2410c;
  font-weight: 600;
}
.kanban .card .contact-status.cs-touched {
  background: rgba(37,99,235,0.1); color: #1d4ed8;
}
/* Proposal status badge inline in the deal meta row. */
.kanban .card .proposal-badge {
  display: inline-block; padding: 1px 6px; border-radius: 3px;
  font-size: 0.62rem; font-weight: 700; letter-spacing: 0.04em;
  text-transform: uppercase; text-decoration: none;
  background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0;
}
.kanban .card .proposal-badge.gen { background: #FEF3C7; color: #92400E; border-color: #FDE68A; }
.kanban .card .proposal-badge.err { background: #FEE2E2; color: #991B1B; border-color: #FECACA; }
.kanban .col-foot {
  padding: 0.4rem 0.6rem; border-top: 1px solid var(--ink-faint);
  font-size: 0.7rem; color: var(--ink-soft); text-align: center;
}
.kanban .empty-col {
  text-align: center; color: var(--ink-soft);
  font-size: 0.75rem; padding: 1rem 0.5rem; font-style: italic;
}

/* ---- Bulk action bar (multi-select) ---- */
.bulkbar {
  position: fixed; bottom: 1.25rem; left: 50%;
  transform: translateX(-50%);
  background: var(--ink); color: white;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
  padding: 0.65rem 0.85rem;
  display: flex; gap: 0.55rem; align-items: center;
  z-index: 150; font-size: 0.85rem;
  animation: bulkin 0.15s ease-out;
}
@keyframes bulkin {
  from { transform: translateX(-50%) translateY(20px); opacity: 0; }
  to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
}
.bulkbar .count {
  font-weight: 700; padding: 0 0.4rem;
  color: white;
}
.bulkbar select, .bulkbar button {
  background: rgba(255,255,255,0.08);
  color: white;
  border: 1px solid rgba(255,255,255,0.18);
  padding: 0.4rem 0.7rem; border-radius: 4px;
  font-family: inherit; font-size: 0.78rem;
  letter-spacing: 0.04em; cursor: pointer;
}
.bulkbar select:hover, .bulkbar button:hover {
  background: rgba(255,255,255,0.16);
}
.bulkbar .danger {
  background: rgba(220,38,38,0.18);
  border-color: rgba(220,38,38,0.4);
}
.bulkbar .danger:hover { background: rgba(220,38,38,0.32); }
.bulkbar .ghost { background: transparent; border-color: rgba(255,255,255,0.12); }
.bulkbar .sep {
  width: 1px; height: 22px; background: rgba(255,255,255,0.15);
  margin: 0 0.1rem;
}

/* ---- Contact card modal ---- */
.modal-bg {
  position: fixed; inset: 0;
  background: rgba(26,22,18,0.6);
  z-index: 200;
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
  backdrop-filter: blur(2px);
}
.modal {
  background: var(--paper); border-radius: 6px;
  border: 1.5px solid var(--ink);
  width: 760px; max-width: 100%;
  height: 90vh;
  box-shadow: 6px 6px 0 var(--ink);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.modal-body {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
}
.modal-activities {
  flex: 0 0 auto;
  max-height: 220px;
  min-height: 0;
  overflow-y: auto;
}
.modal-head {
  padding: 1.1rem 1.5rem 0.85rem;
  border-bottom: 1px solid var(--ink-line);
  display: flex; align-items: flex-start; gap: 0.85rem;
  background: linear-gradient(180deg, var(--paper-2) 0%, var(--paper) 100%);
}
.modal-head .title-wrap {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 0.35rem;
}
.modal-head .title-line { display: flex; align-items: center; gap: 0.55rem; }
.modal-head .type-pill {
  font-size: 0.66rem; padding: 3px 9px; border-radius: 3px;
  letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700;
  background: var(--pill-bg); color: var(--ink-soft);
}
.modal-head.t-lead   .type-pill { background: #e5e7eb; color: #374151; }
.modal-head.t-deal   .type-pill { background: rgba(255,92,46,0.15); color: var(--accent); }
.modal-head.t-client .type-pill { background: rgba(22,163,74,0.15); color: #16a34a; }
.modal-head h2 {
  margin: 0; font-family: var(--serif); font-weight: 700;
  font-size: 1.4rem; line-height: 1.2; letter-spacing: -0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.modal-head .summary {
  display: flex; gap: 0.35rem; flex-wrap: wrap;
  align-items: center;
  font-size: 0.78rem; color: var(--ink-soft);
}
.modal-head .summary .dot { color: rgba(26,32,50,0.22); }
.modal-head .close {
  background: none; border: none; cursor: pointer;
  font-size: 1.7rem; color: var(--ink-soft); line-height: 1;
  padding: 0 0.25rem; align-self: flex-start;
}
.modal-head .close:hover { color: var(--ink); }
.modal-actions {
  display: flex; gap: 0.4rem; padding: 0.6rem 1.5rem;
  background: var(--paper-2); border-bottom: 1px solid var(--ink-line);
  flex-wrap: wrap;
}
.modal-actions a, .modal-actions button {
  display: inline-flex; align-items: center; gap: 0.4rem;
  background: var(--paper); color: var(--ink);
  border: 1px solid var(--ink-line);
  padding: 0.4rem 0.75rem; border-radius: 4px;
  font-size: 0.78rem; font-weight: 600;
  cursor: pointer; text-decoration: none;
  font-family: inherit;
}
.modal-actions a:hover, .modal-actions button:hover {
  background: var(--row-hover); color: var(--ink); text-decoration: none;
  border-color: var(--ink-soft);
}
.modal-actions a.wa { background: #25D366; color: white; border-color: #25D366; }
.modal-actions a.wa:hover { background: #1FA851; border-color: #1FA851; }
.modal-actions a.tel { color: var(--accent); }
.modal-actions a.tel:hover { background: var(--accent-bg); border-color: rgba(255,92,46,0.35); }
.modal-actions a.disabled {
  opacity: 0.4; pointer-events: none;
  text-decoration: line-through;
}
.modal-actions .wa-split {
  display: inline-flex; align-items: stretch; border-radius: 4px; overflow: hidden;
}
.modal-actions .wa-split a.wa { border-radius: 4px 0 0 4px; border-right: 1px solid rgba(255,255,255,0.25); }
.modal-actions .wa-split button.wa-templates {
  background: #25D366; color: white; border: 1px solid #25D366;
  border-radius: 0 4px 4px 0; cursor: pointer;
  padding: 0.4rem 0.55rem; font-size: 0.78rem; font-weight: 700;
}
.modal-actions .wa-split button.wa-templates:hover { background: #1FA851; }
#wa-tpl-popover {
  z-index: 300; width: 360px;
  background: var(--paper); border: 1px solid var(--ink-line);
  border-radius: 6px; box-shadow: 0 12px 32px rgba(0,0,0,0.2);
  padding: 0.4rem; display: flex; flex-direction: column; gap: 2px;
  max-height: 460px; overflow-y: auto;
}
#wa-tpl-popover .wa-tpl-head {
  padding: 0.5rem 0.7rem 0.6rem; font-size: 0.7rem; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--ink-soft); font-weight: 700;
  border-bottom: 1px solid var(--ink-line); margin-bottom: 0.3rem;
}
#wa-tpl-popover .wa-tpl-item {
  display: flex; flex-direction: column; gap: 0.2rem; align-items: flex-start;
  text-align: left; background: var(--paper); border: 1px solid transparent;
  border-radius: 4px; padding: 0.5rem 0.7rem; cursor: pointer;
  font-family: inherit; font-size: 0.78rem; color: var(--ink);
}
#wa-tpl-popover .wa-tpl-item:hover { background: var(--row-hover); border-color: var(--ink-line); }
#wa-tpl-popover .wa-tpl-item b { font-size: 0.82rem; }
#wa-tpl-popover .wa-tpl-item span { color: var(--ink-soft); font-size: 0.72rem; line-height: 1.4; font-style: italic; }
#wa-tpl-popover .wa-tpl-foot {
  padding: 0.5rem 0.7rem; font-size: 0.7rem; color: var(--ink-soft);
  border-top: 1px solid var(--ink-line); margin-top: 0.3rem;
}
.modal-body { padding: 1.4rem 1.5rem; }
.modal-body .row { display: flex; gap: 0.75rem; }
.modal-body .row > .field { flex: 1; }
.modal-body .field { margin-bottom: 0.85rem; }
.modal-body .field-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0 0.85rem;
}
@media (max-width: 640px) {
  .modal-body .field-grid { grid-template-columns: 1fr; }
}
.modal-body .field-group {
  margin-top: 1.2rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--ink-line);
}
.modal-body .field-group-title {
  margin: 0 0 0.55rem; font-size: 0.78rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--ink-soft);
}
.modal-body .proposal-link {
  color: var(--accent); text-decoration: none; font-weight: 600;
}
.modal-body .proposal-link:hover { text-decoration: underline; }
.modal-body .proposal-badge {
  display: inline-block; padding: 2px 8px; border-radius: 4px;
  font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em;
  text-transform: uppercase;
  background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0;
}
.modal-body .proposal-badge.gen { background: #FEF3C7; color: #92400E; border-color: #FDE68A; }
.modal-body .proposal-badge.err { background: #FEE2E2; color: #991B1B; border-color: #FECACA; }
/* Notes journal: history block above the draft input. White scrolling
   panel; preserves the timestamp lines that get prepended on save. */
.modal-body .notes-history {
  background: var(--paper-2);
  border: 1px solid var(--ink-line);
  border-radius: 4px;
  padding: 0.75rem 0.9rem;
  max-height: 240px; overflow-y: auto;
  white-space: pre-wrap;
  font-size: 13px; line-height: 1.55;
  color: var(--ink);
}
.modal-body .notes-history.notes-empty {
  color: var(--ink-soft); font-style: italic;
}
.modal-body label {
  display: block; margin-bottom: 0.2rem;
  font-size: 0.65rem; letter-spacing: 0.07em; text-transform: uppercase;
  color: var(--ink-soft); font-weight: 600;
}
.modal-body input, .modal-body select, .modal-body textarea {
  width: 100%; padding: 0.5rem 0.6rem;
  border: 1px solid var(--ink-line); border-radius: 3px;
  font-family: inherit; font-size: 0.88rem;
  background: var(--paper); color: var(--ink);
}
.modal-body input:focus, .modal-body select:focus, .modal-body textarea:focus {
  outline: 2px solid rgba(210,74,29,.3); border-color: var(--p);
}
.modal-body textarea { min-height: 70px; resize: vertical; font-family: inherit; }
.modal-body textarea.ta.big {
  min-height: 220px;
  line-height: 1.45;
  font-size: 0.92rem;
  padding: 0.7rem 0.8rem;
  background: var(--paper);
  border: 1px solid var(--ink-line);
}
.modal-body textarea.ta.big:focus {
  background: var(--paper);
  border-color: var(--p);
  outline: 2px solid rgba(210,74,29,.15);
}
.modal-body .field-big {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px dashed var(--ink-faint);
}
.modal-body .field-big label {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  color: var(--ink);
  font-weight: 700;
  margin-bottom: 0.45rem;
}
.modal-body .meta-line {
  font-size: 0.7rem; color: var(--ink-soft);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  margin-bottom: 0.6rem;
}
.modal-body .read-only-val {
  font-size: 0.9rem; color: var(--ink);
  padding: 0.35rem 0.5rem;
  background: var(--pill-bg); border-radius: 4px;
}
.modal-foot {
  padding: 0.85rem 1.25rem;
  border-top: 1px solid var(--ink-line);
  display: flex; gap: 0.5rem; justify-content: space-between;
}
.modal-foot .left, .modal-foot .right { display: flex; gap: 0.5rem; }
.modal-foot button {
  padding: 0.55rem 1.1rem; border-radius: 4px;
  cursor: pointer; font-family: inherit; font-size: 0.78rem;
  letter-spacing: 0.06em; text-transform: uppercase; font-weight: 700;
}
.modal-foot .primary { background: var(--accent); color: white; border: 1px solid var(--accent); }
.modal-foot .primary:hover { background: #e84a1a; }
.modal-foot .danger { background: transparent; color: var(--red); border: 1px solid rgba(220,38,38,0.3); }
.modal-foot .danger:hover { background: rgba(220,38,38,0.06); }
.modal-foot .ghost { background: transparent; color: var(--ink-soft); border: 1px solid var(--ink-line); }
.modal-foot .ghost:hover { background: var(--row-hover); color: var(--ink); }
.modal-activities {
  padding: 0.85rem 1.25rem 1rem;
  border-top: 1px dashed var(--ink-faint);
  background: var(--paper-2);
  border-radius: 0 0 5px 5px;
}
.modal-activities h3 {
  font-size: 0.65rem; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-soft); margin: 0 0 0.5rem; font-weight: 700;
  display: flex; justify-content: space-between; align-items: center;
}
.modal-activities h3 button {
  background: transparent; border: 1px solid var(--ink-line);
  padding: 0.2rem 0.55rem; border-radius: 3px; cursor: pointer;
  font-size: 0.7rem; letter-spacing: 0.05em; color: var(--ink);
  font-family: inherit; text-transform: none; font-weight: 500;
}
.modal-activities h3 button:hover { background: var(--row-hover); }
.modal-activities .act {
  padding: 0.5rem 0; border-bottom: 1px solid var(--ink-faint);
  font-size: 0.83rem;
}
.modal-activities .act:last-child { border-bottom: none; }
.modal-activities .act .when {
  color: var(--ink-soft); font-size: 0.7rem;
  display: flex; gap: 0.4rem; align-items: center; margin-bottom: 2px;
}
.modal-activities .act .body { color: var(--ink); }
.modal-activities .none {
  font-size: 0.78rem; color: var(--ink-soft); font-style: italic;
}

/* ---- Lead funnel (high-volume spreadsheet) ---- */
.lf-pills {
  display: flex; gap: 0.4rem; flex-wrap: wrap;
  padding: 0.75rem 1rem 0.5rem;
  background: var(--paper-2);
  border-bottom: 1px solid var(--ink-line);
}
.lf-pill {
  background: transparent;
  border: 1px solid var(--ink-faint);
  padding: 0.35rem 0.8rem; border-radius: 14px;
  font-family: inherit; font-size: 0.78rem;
  color: var(--ink); cursor: pointer;
  display: inline-flex; align-items: center; gap: 0.4rem;
}
.lf-pill:hover { background: var(--row-hover); }
.lf-pill.active {
  background: var(--accent-bg); color: var(--accent);
  border-color: rgba(255,92,46,0.35);
  font-weight: 700;
}
.lf-pill .n {
  font-size: 0.7rem;
  padding: 1px 7px; border-radius: 8px;
  background: var(--pill-bg); color: var(--ink-soft);
  font-weight: 600;
}
.lf-pill.active .n { background: rgba(255,92,46,0.2); color: var(--accent); }
.lf-pills-secondary {
  padding-top: 0.4rem;
  border-top: 1px dashed var(--ink-faint);
  align-items: center;
}
.lf-pills-secondary select.lf-category {
  background: var(--paper);
  border: 1px solid var(--ink-line);
  padding: 0.35rem 0.55rem;
  border-radius: 14px;
  font-family: inherit;
  font-size: 0.78rem;
  color: var(--ink);
  cursor: pointer;
  max-width: 260px;
}
.lf-pills-secondary select.lf-category:focus {
  outline: 2px solid rgba(255,92,46,0.2);
  border-color: var(--accent);
}

.lf-sheet { font-size: 12.5px; }
.lf-sheet tbody td.actions {
  width: 160px;
  white-space: nowrap;
  text-align: right;
  padding-right: 0.6rem;
}
.lf-sheet tbody td.actions button {
  background: transparent; border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
  padding: 0.2rem 0.45rem;
  font-size: 0.95rem;
  color: var(--ink-soft);
  line-height: 1;
  margin-left: 0.1rem;
}
.lf-sheet tbody td.actions button:hover {
  background: var(--paper);
  border-color: var(--ink-line);
  color: var(--ink);
}
.lf-sheet tbody td.actions button[data-act="promote"]:hover {
  background: var(--accent-bg); border-color: rgba(255,92,46,0.35); color: var(--accent);
}
/* Uncontacted (new stage) lead rows get an orange left-border so Santi can
   spot them instantly. The "Mark contacted" button only shows on these rows. */
.lf-sheet tbody tr.lf-uncontacted { border-left: 3px solid #f97316; }
.lf-sheet tbody tr.lf-uncontacted > td:first-child { background: rgba(249,115,22,0.04); }
.lf-sheet tbody td.actions button[data-act="contact"] {
  background: #22c55e; color: #fff; border: 1px solid #16a34a;
  border-radius: 3px; font-size: 0.7rem; padding: 2px 7px;
  cursor: pointer; white-space: nowrap; margin-right: 0.25rem;
}
.lf-sheet tbody td.actions button[data-act="contact"]:hover {
  background: #16a34a; border-color: #15803d;
}
.lf-sheet td .cell {
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 220px;
}
.lf-sheet a.link {
  color: var(--blue, #2563eb);
  text-decoration: none;
}
.lf-sheet a.link:hover { text-decoration: underline; }

/* Drag-to-reorder columns */
.lf-sheet thead th[data-col] { cursor: grab; }
.lf-sheet thead th[data-col]:active { cursor: grabbing; }
.lf-sheet thead th.col-dragging { opacity: 0.45; }
.lf-sheet thead th.col-drop-before { box-shadow: inset 3px 0 0 var(--accent); }
.lf-sheet thead th.col-drop-after  { box-shadow: inset -3px 0 0 var(--accent); }
.lf-sheet thead th .grip {
  color: var(--ink-soft); font-size: 0.6rem; margin-right: 0.25rem;
  opacity: 0.5;
}
.lf-sheet thead th:hover .grip { opacity: 1; color: var(--accent); }

.lf-foot {
  padding: 0.6rem 1rem;
  background: var(--paper-2);
  border-top: 1px solid var(--ink-line);
  font-size: 0.8rem; color: var(--ink-soft);
  display: flex; align-items: center; gap: 0.75rem;
  flex-wrap: wrap;
}
.lf-foot button {
  background: var(--paper); border: 1px solid var(--ink-line);
  padding: 0.3rem 0.7rem; border-radius: 3px;
  font-family: var(--mono); font-size: 0.72rem; color: var(--ink);
  cursor: pointer;
}
.lf-foot button:disabled { opacity: 0.4; cursor: not-allowed; }
.lf-foot button:hover:not(:disabled) { background: var(--row-hover); }
.lf-foot .ps {
  background: var(--paper); border: 1px solid var(--ink-line);
  padding: 0.25rem 0.45rem; border-radius: 3px;
  font-family: inherit; font-size: 0.75rem;
}
.lf-sheet td.empty {
  text-align: center; padding: 2rem;
  color: var(--ink-soft); font-style: italic;
}
.lf-sheet tr.lf-selected td {
  background: rgba(255,92,46,0.08) !important;
  box-shadow: inset 3px 0 0 var(--accent);
}
.lf-sheet tr.lf-selected:hover td { background: rgba(255,92,46,0.13) !important; }

/* ---- Today dashboard ---- */
.today-page {
  max-width: 980px; margin: 0 auto;
  padding: 1.5rem 1.25rem 3rem;
}
.today-hero {
  display: flex; justify-content: space-between; align-items: flex-end;
  gap: 1.5rem;
  margin-bottom: 1.75rem; padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--ink-line);
}
.today-greet h2 {
  font-family: var(--serif); font-weight: 700;
  font-size: 2rem; margin: 0; color: var(--ink); letter-spacing: -0.02em;
}
.today-date {
  font-size: 0.85rem; color: var(--ink-soft);
  text-transform: capitalize; margin-top: 0.2rem;
}
.today-summary { display: flex; gap: 1rem; flex-wrap: wrap; }
.today-kpi {
  background: var(--paper-2); border: 1px solid var(--ink-line);
  border-radius: 4px; padding: 0.65rem 1rem;
  min-width: 130px;
}
.today-kpi .kpi-num {
  font-family: var(--serif); font-size: 1.5rem; line-height: 1;
  color: var(--p); font-weight: 700; letter-spacing: -0.02em;
}
.today-kpi .kpi-label {
  font-family: var(--mono); font-size: 0.65rem; color: var(--ink-soft); margin-top: 0.25rem;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.today-group {
  background: var(--paper-2); border: 1px solid var(--ink-line);
  border-radius: 4px; padding: 1.1rem 1.25rem 1.25rem;
  margin-bottom: 1.1rem;
}
.today-group-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 0.25rem;
}
.today-group-head h3 {
  margin: 0; font-family: var(--serif); font-weight: 700;
  font-size: 1.2rem; color: var(--ink); letter-spacing: -0.01em;
}
.today-group-head span {
  background: var(--accent-bg); color: var(--accent);
  padding: 2px 9px; border-radius: 10px;
  font-size: 0.75rem; font-weight: 700;
}
.today-group-sub {
  margin: 0 0 0.85rem; font-size: 0.83rem; color: var(--ink-soft);
}
.today-list { display: flex; flex-direction: column; gap: 0.4rem; }
.today-item {
  display: flex; align-items: center; gap: 0.85rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--ink-line); border-radius: 6px;
  background: var(--paper);
  cursor: pointer;
  transition: border-color 0.1s, box-shadow 0.1s;
}
.today-item.today-selected {
  background: rgba(255,92,46,0.06);
  border-color: rgba(255,92,46,0.35);
  box-shadow: inset 3px 0 0 var(--accent);
}
.today-item .t-check {
  display: flex; align-items: center; justify-content: center;
  padding: 0.25rem; cursor: pointer;
  flex-shrink: 0;
}
.today-item .t-check input,
.today-group-head .group-check input {
  width: 18px; height: 18px; cursor: pointer; accent-color: var(--accent);
}
.today-group-head { gap: 0.6rem; align-items: center; }
.today-group-head .group-check {
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; padding: 0.25rem;
}
.today-item:hover {
  border-color: var(--ink-soft);
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
}
.today-item .t-info { flex: 1; min-width: 0; }
.today-item .t-title {
  font-weight: 600; color: var(--ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  display: flex; align-items: baseline; gap: 0.55rem;
}
.today-item .t-title-domain {
  font-weight: 400;
}
.today-item .t-contact {
  display: flex; flex-wrap: wrap; gap: 0.35rem;
  margin-top: 0.4rem;
}
.today-item .chip {
  display: inline-flex; align-items: center; gap: 0.3rem;
  font-size: 0.76rem;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(26,32,50,0.05);
  border: 1px solid rgba(26,32,50,0.08);
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap; max-width: 260px;
  overflow: hidden; text-overflow: ellipsis;
}
.today-item .chip:hover { background: rgba(26,32,50,0.1); text-decoration: none; color: var(--ink); }
.today-item .chip .ico { font-size: 0.78rem; opacity: 0.7; }
.today-item .chip-site { background: rgba(37,99,235,0.08); border-color: rgba(37,99,235,0.18); color: var(--blue, #2563EB); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.today-item .chip-site:hover { background: rgba(37,99,235,0.16); color: var(--blue, #2563EB); }
.today-item .chip-wa   { background: rgba(37,211,102,0.12); border-color: rgba(37,211,102,0.3); color: #1FA851; }
.today-item .chip-wa:hover { background: rgba(37,211,102,0.22); color: #1FA851; }
.today-item .chip-tel  { background: rgba(255,92,46,0.08); border-color: rgba(255,92,46,0.22); color: var(--accent); }
.today-item .chip-tel:hover { background: rgba(255,92,46,0.16); color: var(--accent); }
.today-item .chip-mail { background: rgba(217,119,6,0.08); border-color: rgba(217,119,6,0.22); color: #B45309; }
.today-item .chip-mail:hover { background: rgba(217,119,6,0.16); color: #B45309; }
.today-item .chip-ig   { background: rgba(225,48,108,0.08); border-color: rgba(225,48,108,0.2); color: #C13584; }
.today-item .chip-ig:hover { background: rgba(225,48,108,0.16); color: #C13584; }
.today-item .chip-fb   { background: rgba(24,119,242,0.08); border-color: rgba(24,119,242,0.2); color: #1877F2; }
.today-item .chip-fb:hover { background: rgba(24,119,242,0.16); color: #1877F2; }
.today-item .chip-x    { background: rgba(0,0,0,0.06); border-color: rgba(0,0,0,0.18); color: #000; }
.today-item .chip-tt   { background: rgba(0,0,0,0.06); border-color: rgba(0,0,0,0.18); color: #000; }
.today-item .chip-person { background: rgba(26,32,50,0.04); border-color: rgba(26,32,50,0.08); color: var(--ink-soft); }
.today-item .t-meta {
  display: flex; gap: 0.45rem; align-items: center;
  margin-top: 0.2rem; font-size: 0.78rem; color: var(--ink-soft);
}
.today-item .t-meta > span:not(.pill) {
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.today-item .reason {
  font-size: 0.78rem; color: var(--ink-soft);
  margin-top: 0.25rem;
}
.today-item .reason.r-overdue { color: var(--red); font-weight: 600; }
.today-item .reason.r-due-today { color: var(--amber); font-weight: 600; }
.today-item .reason.r-hot-untouched { color: var(--accent); font-weight: 600; }
.today-item .reason.r-stuck-deal { color: #92400E; font-weight: 600; }
.today-item .reason.r-fresh-activity { color: var(--green); }
.today-item .t-actions {
  display: flex; gap: 0.15rem; flex-shrink: 0;
}
.today-item .t-actions button {
  background: transparent; border: 1px solid transparent;
  border-radius: 3px; cursor: pointer;
  padding: 0.25rem 0.45rem; font-size: 0.95rem;
  color: var(--ink-soft); line-height: 1;
}
.today-item .t-actions button:hover {
  background: var(--paper); border-color: var(--ink-line); color: var(--ink);
}
.today-empty {
  text-align: center; padding: 3rem 1rem;
  background: var(--paper); border: 1px dashed var(--ink-line); border-radius: 8px;
  color: var(--ink-soft);
}
.today-empty .empty-icon {
  width: 60px; height: 60px; border-radius: 50%;
  background: rgba(22,163,74,0.12); color: var(--green);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 1.8rem; font-weight: 700; margin-bottom: 0.75rem;
}
.today-empty h3 {
  font-family: var(--serif); font-weight: 700;
  font-size: 1.3rem; margin: 0 0 0.4rem; color: var(--ink);
}
@media (max-width: 640px) {
  .today-hero { flex-direction: column; align-items: flex-start; }
  .today-greet h2 { font-size: 1.5rem; }
}
</style>
</head>
<body>
<script>
  // If we're loaded inside an iframe (admin SPA "CRM" tab), tag the body so
  // CSS can hide our own header (the parent SPA shows one).
  if (window.self !== window.top) document.body.classList.add("embed");
</script>

<header>
  <div class="brand">Pyme<em>WebPro</em><span>CRM</span></div>
  <div class="spacer"></div>
  <a href="/admin" class="back">← admin</a>
</header>

<div id="root"></div>

<div class="toast" id="toast"></div>

<script>
// ----------- state -----------
// Shared storage key with the React admin SPA so a single sign-in unlocks both.
const ADMIN_KEY = "pwp_admin";
// Lead funnel replaces the old Leads tab. Deals are shown in the Prospect
// funnel kanban, so no separate Deals tab either. The underlying DATA tables
// (leads + deals) still exist and are used by the funnel + modal.
const TABLES = ["today", "funnel", "activities"];
const DATA_TABLES = ["leads", "clients", "deals", "activities"];
const TABLE_LABELS = {
  today: "Today", funnel: "Pipeline", activities: "Activities",
};
const TABLE_ICONS  = {
  today: "☀", funnel: "🔀", activities: "📋",
};

// Prospect (kanban) funnel: raw leads + deals + won-state clients.
// "Leads" column shows raw incoming leads (lead_stage: new). From there
// they move to Qualifying once they become a deal.
const FUNNEL_COLUMNS = [
  { id: "lead",        label: "Leads",                dot: "#9CA3AF" },
  { id: "qualifying",  label: "Marketing Qualified",  dot: "#2563eb" },
  { id: "proposal",    label: "Sales Qualified",      dot: "#d97706" },
  { id: "negotiation", label: "Proposal / Mockup",    dot: "#8B5CF6" },
  { id: "won",         label: "Won",                  dot: "#16a34a" },
  { id: "lost",        label: "Lost",                 dot: "#dc2626" },
];

// Lead funnel stages: where high-volume outreach (cold calls, WhatsApp, email)
// happens before a lead becomes a prospect. SQL exits to the kanban.
const LEAD_FUNNEL_STAGES = [
  { id: "new",                 label: "New",                 dot: "#6b7280" },
  { id: "contacted",           label: "Contacted",           dot: "#2563eb" },
  { id: "marketing_qualified", label: "Marketing Qualified", dot: "#d97706" },
  { id: "sales_qualified",     label: "Sales Qualified",     dot: "#16a34a" },
  { id: "disqualified",        label: "Disqualified",        dot: "#dc2626" },
];

const HEAT_OPTIONS = ["", "HOT", "WARM", "COOL", "COLD", "DEAD"];

// Lead funnel grid columns. Surfaces the cold-outreach enrichment data
// (heat / category / city / score / motion / current site) alongside the
// funnel stage.
const LEAD_FUNNEL_COLS = [
  { key: "heat",              label: "Heat",       type: "select", options: HEAT_OPTIONS, pill: heatPill },
  { key: "business_name",     label: "Business",   type: "text" },
  { key: "category",          label: "Category",   type: "text" },
  { key: "city",              label: "City",       type: "text" },
  { key: "current_site",      label: "Site",       type: "link" },
  { key: "email",             label: "Email",      type: "text" },
  { key: "phone",             label: "Phone",      type: "text" },
  { key: "lead_stage",        label: "Stage",      type: "select", options: LEAD_FUNNEL_STAGES.map((s) => s.id), pill: leadStagePill },
  { key: "score",             label: "Score",      type: "int" },
  { key: "motion",            label: "Motion",     type: "select", options: ["", "new_build", "upgrade"], pill: motionPill },
  { key: "last_touched_at",   label: "Last touch", type: "date", readonly: true },
  { key: "touches_count",     label: "Touches",    type: "int", readonly: true },
  { key: "next_action",       label: "Next action", type: "text" },
  { key: "next_action_due",   label: "Due",        type: "date" },
];

const state = {
  authed: !!localStorage.getItem(ADMIN_KEY),
  active: (location.hash.replace("#", "") || "today").replace("leadfunnel", "funnel"),
  data: { leads: [], clients: [], deals: [], activities: [] },
  counts: {},
  // No default sort. Rows render in the order returned by the server (updated_at
  // DESC at fetch time). Editing a row no longer kicks it to the top. The user
  // can click a column header to sort explicitly.
  sort: { col: null, dir: "desc" },
  search: "",
  editing: null, // { table, id, col }
  lookups: { leadById: new Map(), clientById: new Map(), dealById: new Map(), dealsByLead: new Map() },
  funnelSort: "",  // "" | "contacted_desc" | "contacted_asc"
  selected: new Set(), // keys: "type:id"
};
if (!TABLES.includes(state.active)) state.active = "today";

// Selection helpers shared across click + drag + bulk actions.
function selKey(type, id) { return type + ":" + id; }
function isSelected(type, id) { return state.selected.has(selKey(type, id)); }
function clearSelection() {
  if (state.selected.size === 0) return;
  state.selected.clear();
  if (state.active === "funnel") renderFunnel();
}

// ----------- column definitions -----------
// Each col: { key, label, type, options?, fk?, width?, readonly?, formatter?, parser? }
const COLS = {
  leads: [
    { key: "business_name", label: "Business",   type: "text", width: "18%" },
    { key: "name",          label: "Contact",    type: "text", width: "12%" },
    { key: "email",         label: "Email",      type: "text", width: "16%" },
    { key: "phone",         label: "Phone",      type: "text", width: "11%" },
    { key: "lead_stage",    label: "Stage",      type: "select", options: LEAD_FUNNEL_STAGES.map((s) => s.id), pill: leadStagePill, width: "11%" },
    { key: "status",        label: "Status",     type: "select", options: ["new","contacted","converted","dismissed"], pill: leadStatusPill, width: "9%" },
    { key: "source",        label: "Source",     type: "select", options: ["contact_form","whatsapp_click","whatsapp_message","manual"], width: "10%" },
    { key: "plan",          label: "Plan",       type: "select", options: ["","esencial","pro"], width: "7%" },
    { key: "notes",         label: "Notes",      type: "textarea", width: "auto" },
    { key: "updated_at",    label: "Updated",    type: "date", readonly: true, width: "9%" },
  ],
  clients: [
    { key: "business_name", label: "Business",   type: "text", width: "22%" },
    { key: "email",         label: "Email",      type: "text", width: "22%" },
    { key: "status",        label: "Status",     type: "select", options: ["invited","in_progress","submitted","active"], pill: clientStatusPill, width: "12%" },
    { key: "plan",          label: "Plan",       type: "select", options: ["","esencial","pro"], pill: planPill, width: "9%" },
    { key: "language",      label: "Lang",       type: "select", options: ["en","es"], width: "7%" },
    { key: "site_url",      label: "Site URL",   type: "text", width: "auto" },
    { key: "updated_at",    label: "Updated",    type: "date", readonly: true, width: "10%" },
  ],
  deals: [
    { key: "title",           label: "Deal",          type: "text", width: "25%" },
    { key: "lead_id",         label: "Lead",          type: "fk", fk: "leads", width: "16%" },
    { key: "client_id",       label: "Client",        type: "fk", fk: "clients", width: "16%" },
    { key: "stage",           label: "Stage",         type: "select", options: ["qualifying","proposal","negotiation","won","lost"], optionLabels: { qualifying:"Mktg Qualified", proposal:"Sales Qualified", negotiation:"Proposal / Mockup", won:"Won", lost:"Lost" }, pill: stagePill, width: "11%" },
    { key: "value_cop_cents", label: "Value (COP)",   type: "money", width: "12%" },
    { key: "owner",           label: "Owner",         type: "select", options: ["santi","mike"], width: "9%" },
    { key: "next_action",     label: "Next action",   type: "text", width: "auto" },
    { key: "updated_at",      label: "Updated",       type: "date", readonly: true, width: "11%" },
  ],
  activities: [
    { key: "occurred_at",  label: "When",     type: "date", width: "11%" },
    { key: "kind",         label: "Kind",     type: "select", options: ["call","whatsapp","email","meeting","note","task"], pill: kindPill, width: "9%" },
    { key: "subject",      label: "Subject",  type: "text", width: "20%" },
    { key: "body",         label: "Detail",   type: "textarea", width: "auto" },
    { key: "lead_id",      label: "Lead",     type: "fk", fk: "leads", width: "12%" },
    { key: "client_id",    label: "Client",   type: "fk", fk: "clients", width: "12%" },
    { key: "deal_id",      label: "Deal",     type: "fk", fk: "deals", width: "12%" },
    { key: "owner",        label: "Owner",    type: "select", options: ["santi","mike"], width: "7%" },
    { key: "outcome",      label: "Outcome",  type: "select", options: ["","positive","neutral","negative","no_response"], width: "9%" },
    { key: "done",         label: "Done",     type: "checkbox", width: "5%" },
  ],
};

// ----------- helpers -----------
function getToken() { return localStorage.getItem(ADMIN_KEY) || ""; }

// Master-portal base path. The worker injects window.PWP_BASE when serving
// under colguides.com/portal/pymewebpro/*; on portal.pymewebpro.com (legacy)
// it stays undefined and pwpBase() returns "".
function pwpBase() { return window.PWP_BASE || ""; }

async function api(path, opts) {
  const res = await fetch(pwpBase() + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + getToken(),
      ...(opts && opts.headers || {}),
    },
  });
  if (res.status === 401) { localStorage.removeItem(ADMIN_KEY); state.authed = false; render(); throw new Error("Unauthorized"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
  return data;
}

function toast(msg, isErr) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.toggle("err", !!isErr);
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2200);
}

function fmtDate(ms) {
  if (!ms) return "";
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "";
  const d = new Date(n);
  const today = new Date(); today.setHours(0,0,0,0);
  const that = new Date(d); that.setHours(0,0,0,0);
  const diff = Math.round((that - today) / (24*3600*1000));
  if (diff === 0) return "Today " + d.toTimeString().slice(0,5);
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (Math.abs(diff) < 7) return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return d.toLocaleDateString(undefined, { year: "2-digit", month: "short", day: "numeric" });
}

function fmtMoney(cents, ccy) {
  if (cents === null || cents === undefined || cents === "") return "";
  const n = Number(cents);
  if (!Number.isFinite(n)) return "";
  const dollars = n / 100;
  return (ccy === "COP" ? "$" : "CAD $") + dollars.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function dateInputValue(ms) {
  if (!ms) return "";
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate());
}

// ----------- pills -----------
function leadStatusPill(v)   { return pillFor(v, { new:"blue", contacted:"amber", converted:"green", dismissed:"gray" }); }
function leadStagePill(v) {
  const labels = { new:"New", contacted:"Contacted", marketing_qualified:"MQL", sales_qualified:"SQL", disqualified:"Disqualified" };
  const colors = { new:"gray", contacted:"blue", marketing_qualified:"amber", sales_qualified:"green", disqualified:"red" };
  if (!v) return "";
  const cls = colors[v] || "gray";
  return '<span class="pill ' + cls + '">' + escHtml(labels[v] || v) + '</span>';
}
function heatPill(v) {
  if (!v) return "";
  // DEAD means the prospect's website is dead/unreachable · a rebuild
  // opportunity, so it's a hot lead. Same red as HOT.
  const map = { HOT:"red", DEAD:"red", WARM:"amber", COOL:"blue", COLD:"blue" };
  const cls = map[String(v).toUpperCase()] || "gray";
  return '<span class="pill ' + cls + '">' + escHtml(v) + '</span>';
}
function motionPill(v) {
  if (!v) return "";
  const labels = { new_build: "Build", upgrade: "Upgrade" };
  const colors = { new_build: "green", upgrade: "blue" };
  const cls = colors[v] || "gray";
  return '<span class="pill ' + cls + '">' + escHtml(labels[v] || v) + '</span>';
}
function clientStatusPill(v) { return pillFor(v, { invited:"gray", in_progress:"amber", submitted:"blue", active:"green" }); }
function planPill(v)         { return pillFor(v, { esencial:"blue", pro:"green" }); }
function stagePill(v) {
  const labels = { qualifying:"Mktg Qual", proposal:"Sales Qual", negotiation:"Proposal", won:"Won", lost:"Lost" };
  const colors = { qualifying:"blue", proposal:"amber", negotiation:"purp", won:"green", lost:"red" };
  if (!v) return "";
  return '<span class="pill ' + (colors[v] || "gray") + '">' + escHtml(labels[v] || v) + '</span>';
}
function kindPill(v)         { return pillFor(v, { call:"blue", whatsapp:"green", email:"amber", meeting:"blue", note:"gray", task:"amber" }); }
function pillFor(v, map) {
  if (v === null || v === undefined || v === "") return "";
  const cls = map[v] || "gray";
  return '<span class="pill ' + cls + '">' + escHtml(String(v)) + "</span>";
}
function escHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

// ----------- data loading -----------
async function loadAll() {
  try {
    const d = await api("/api/admin/crm/grid");
    state.data = { leads: d.leads, clients: d.clients, deals: d.deals, activities: d.activities };
    state.counts = d.counts || {};
    rebuildLookups();
    render();
  } catch (e) { toast(e.message, true); }
}

function rebuildLookups() {
  state.lookups.leadById = new Map(state.data.leads.map((r) => [r.id, r]));
  state.lookups.clientById = new Map(state.data.clients.map((r) => [r.id, r]));
  state.lookups.dealById = new Map(state.data.deals.map((r) => [r.id, r]));
  // lead_id -> deal (first match). Used to hide promoted leads from the active
  // lead funnel once they have a deal card in the Kanban.
  state.lookups.dealsByLead = new Map(
    state.data.deals.filter((d) => d.lead_id).map((d) => [d.lead_id, d])
  );
}

// ----------- rendering -----------
function render() {
  const root = document.getElementById("root");
  if (!state.authed) {
    root.innerHTML = '<div class="login"><h2>Admin</h2><input id="t" type="password" placeholder="Admin token" /><div class="err" id="err"></div><button id="b">Sign In</button></div>';
    document.getElementById("b").onclick = signIn;
    document.getElementById("t").onkeydown = (e) => { if (e.key === "Enter") signIn(); };
    document.getElementById("t").focus();
    return;
  }
  let body;
  if (state.active === "today")       body = '<main><div id="today-wrap"></div></main>';
  else if (state.active === "funnel") body = '<main><div id="kanban-wrap"></div></main>';
  else                                body = '<main><div class="grid-wrap" id="grid"></div></main>';
  root.innerHTML = renderTabs() + body + renderStatusbar();
  bindTabHandlers();
  if (state.active === "today")       renderToday();
  else if (state.active === "funnel") renderFunnel();
  else                                renderGrid();
}

function renderTabs() {
  const isFunnel = state.active === "funnel";
  const isToday = state.active === "today";
  return '<nav class="tabs">' +
    TABLES.map((t) => {
      const active = t === state.active ? "active" : "";
      let n;
      if (t === "today") {
        n = computeTodayItems().length;
      } else if (t === "funnel") {
        n = state.data.leads.filter((l) => !["converted","dismissed"].includes(l.status)).length
          + state.data.deals.length + state.data.clients.length;
      } else {
        n = state.counts[t] || (state.data[t] && state.data[t].length) || 0;
      }
      return '<button data-tab="' + t + '" class="' + active + '">' + TABLE_ICONS[t] + " " + TABLE_LABELS[t] + ' <span class="count">' + n + "</span></button>";
    }).join("") +
    '<div class="grow"></div>' +
    '<input class="search" id="search" placeholder="Filter…" value="' + escHtml(state.search) + '" />' +
    (isFunnel || isToday ? "" : '<button class="primary" id="add">+ New row</button>') +
    (isFunnel || isToday ? "" : '<button class="ghost" id="export">Export .csv</button>') +
    '<button class="ghost" id="refresh">↻</button>' +
    '<button class="ghost" id="logout">Sign out</button>' +
    "</nav>";
}

function renderStatusbar() {
  const t = state.active;
  if (t === "today") {
    const n = computeTodayItems().length;
    return '<div class="statusbar">' +
      "<span>" + n + " action items on your plate</span>" +
      '<span class="ok">● connected</span>' +
      "<span>Click any row to open the contact card. Inline buttons log touches without leaving this page.</span>" +
      "</div>";
  }
  if (t === "funnel") {
    const total = state.data.leads.length + state.data.deals.length + state.data.clients.length;
    const pipelineCents = state.data.deals
      .filter((d) => ["qualifying","proposal","negotiation"].includes(d.stage))
      .reduce((s, d) => s + (Number(d.value_cop_cents) || 0), 0);
    return '<div class="statusbar">' +
      "<span>" + total + " items in the funnel</span>" +
      "<span>Open pipeline: " + fmtMoney(Math.round(pipelineCents), "COP") + "</span>" +
      '<span class="ok">● connected</span>' +
      "<span>Drag a card between columns to update its stage.</span>" +
      "</div>";
  }
  const n = state.data[t] ? state.data[t].length : 0;
  return '<div class="statusbar">' +
    "<span>" + n + " rows in <b>" + TABLE_LABELS[t] + "</b></span>" +
    '<span class="ok">● connected</span>' +
    "<span>Tip: click any cell to edit. Enter saves, Esc cancels.</span>" +
    "</div>";
}

function bindTabHandlers() {
  document.querySelectorAll("nav.tabs button[data-tab]").forEach((b) => {
    b.onclick = () => {
      state.active = b.dataset.tab; state.search = ""; state.selected.clear();
      const bar = document.getElementById("bulkbar"); if (bar) bar.remove();
      location.hash = state.active; render();
    };
  });
  const addBtn = document.getElementById("add");
  if (addBtn) addBtn.onclick = addRow;
  const expBtn = document.getElementById("export");
  if (expBtn) expBtn.onclick = exportCsv;
  document.getElementById("refresh").onclick = loadAll;
  document.getElementById("logout").onclick = () => { localStorage.removeItem(ADMIN_KEY); state.authed = false; render(); };
  const s = document.getElementById("search");
  s.oninput = (e) => {
    state.search = e.target.value;
    if (state.active === "today") renderToday();
    else if (state.active === "funnel") renderFunnel();
    else if (state.active === "leadfunnel") renderLeadFunnel();
    else renderGrid();
  };
}

function signIn() {
  const tok = document.getElementById("t").value.trim();
  localStorage.setItem(ADMIN_KEY, tok);
  state.authed = true;
  loadAll();
}

function renderGrid() {
  const t = state.active;
  const cols = COLS[t];
  let rows = state.data[t] || [];

  // search
  if (state.search) {
    const q = state.search.toLowerCase();
    rows = rows.filter((r) => cols.some((c) => {
      const v = r[c.key];
      if (v === null || v === undefined) return false;
      return String(v).toLowerCase().includes(q);
    }));
  }

  // sort
  if (state.sort.col) {
    const dir = state.sort.dir === "asc" ? 1 : -1;
    rows = rows.slice().sort((a, b) => {
      let va = a[state.sort.col]; let vb = b[state.sort.col];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  const grid = document.getElementById("grid");
  if (!rows.length) { grid.innerHTML = '<div class="empty">No ' + TABLE_LABELS[t].toLowerCase() + " yet. Click <b>+ New row</b> to add one.</div>"; return; }

  const head = "<thead><tr>" +
    cols.map((c) => {
      const arrow = state.sort.col === c.key ? (state.sort.dir === "asc" ? "▲" : "▼") : "";
      return '<th data-col="' + c.key + '" style="width:' + (c.width || "auto") + '">' + escHtml(c.label) + ' <span class="sortarrow">' + arrow + '</span></th>';
    }).join("") +
    '<th style="width:80px"></th></tr></thead>';

  const body = "<tbody>" + rows.map((r) => renderRow(t, cols, r)).join("") + "</tbody>";

  grid.innerHTML = '<table class="sheet">' + head + body + "</table>";

  // sort handlers
  grid.querySelectorAll("thead th[data-col]").forEach((th) => {
    th.onclick = () => {
      const col = th.dataset.col;
      if (state.sort.col === col) state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
      else { state.sort.col = col; state.sort.dir = "asc"; }
      renderGrid();
    };
  });

  // cell click -> edit
  grid.querySelectorAll("td[data-id]").forEach((td) => {
    td.addEventListener("click", onCellClick);
  });
  // delete handlers
  grid.querySelectorAll("button[data-del]").forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); deleteRow(t, b.dataset.del); };
  });
}

// ===========================================================================
// Kanban funnel: unified lead -> deal -> client view, drag-droppable.
// ===========================================================================

// Determine which column a row belongs in. Returns null if the row should be
// hidden. Leads are shown in the Kanban according to their lead_stage:
//   new / contacted          -> "lead" column
//   marketing_qualified      -> "qualifying" column
//   sales_qualified          -> "proposal" column
//   disqualified             -> hidden
function cardColumn(type, row, ctx) {
  if (type === "lead") {
    // Skip converted/dismissed leads.
    const skipStatus = ["converted", "dismissed"];
    if (skipStatus.includes(row.status)) return null;
    // Map lead_stage to the matching Kanban column.
    const stageToCol = {
      new:                 "lead",
      contacted:           "lead",
      marketing_qualified: "qualifying",
      sales_qualified:     "proposal",
      disqualified:        null,
    };
    if (row.lead_stage && stageToCol.hasOwnProperty(row.lead_stage)) {
      return stageToCol[row.lead_stage];
    }
    return "lead"; // fallback for leads with no stage set yet
  }
  if (type === "deal") {
    return row.stage || "qualifying";
  }
  if (type === "client") {
    // Show clients in Won, unless a deal already covers them in Won.
    if (ctx.wonDealsByClient.has(row.id)) return null;
    return "won";
  }
  return null;
}

// Search filter for funnel cards. Cheap textual scan.
function cardMatchesSearch(type, row, q) {
  if (!q) return true;
  const lc = q.toLowerCase();
  const blob = [
    row.title, row.name, row.business_name, row.email, row.phone,
    row.subject, row.notes, row.next_action,
  ].filter(Boolean).join(" ").toLowerCase();
  return blob.includes(lc);
}

function renderFunnel() {
  const ctx = buildFunnelContext();
  const q = state.search;

  const cardsByCol = {};
  FUNNEL_COLUMNS.forEach((c) => { cardsByCol[c.id] = []; });

  // Order matters for "Updated" sort within a column.
  state.data.deals.forEach((d) => {
    const col = cardColumn("deal", d, ctx);
    if (!col || !cardsByCol[col]) return;
    if (!cardMatchesSearch("deal", d, q)) return;
    cardsByCol[col].push({ type: "deal", row: d });
  });
  state.data.leads.forEach((l) => {
    const col = cardColumn("lead", l, ctx);
    if (!col || !cardsByCol[col]) return;
    if (!cardMatchesSearch("lead", l, q)) return;
    cardsByCol[col].push({ type: "lead", row: l });
  });
  state.data.clients.forEach((c) => {
    const col = cardColumn("client", c, ctx);
    if (!col || !cardsByCol[col]) return;
    if (!cardMatchesSearch("client", c, q)) return;
    cardsByCol[col].push({ type: "client", row: c });
  });

  // Optional sort within each column by last-contacted date.
  if (state.funnelSort) {
    const dir = state.funnelSort === "contacted_asc" ? 1 : -1;
    FUNNEL_COLUMNS.forEach((col) => {
      cardsByCol[col.id].sort((a, b) => {
        const ta = getLastContactedAt(a);
        const tb = getLastContactedAt(b);
        // Uncontacted cards (ts=0): oldest-first puts them at top, newest-first at bottom.
        if (!ta && !tb) return 0;
        if (!ta) return dir === 1 ? -1 : 1;
        if (!tb) return dir === 1 ? 1 : -1;
        return (ta - tb) * dir;
      });
    });
  }

  const sortSelect =
    '<div class="kanban-toolbar">' +
    '<label>Sort by:</label>' +
    '<select id="funnel-sort">' +
      '<option value="">Default order</option>' +
      '<option value="contacted_desc"' + (state.funnelSort === "contacted_desc" ? " selected" : "") + '>Last contacted: newest first</option>' +
      '<option value="contacted_asc"'  + (state.funnelSort === "contacted_asc"  ? " selected" : "") + '>Last contacted: oldest first (uncontacted at top)</option>' +
    '</select>' +
    '</div>';

  const wrap = document.getElementById("kanban-wrap");
  wrap.innerHTML = sortSelect + '<div class="kanban">' +
    FUNNEL_COLUMNS.map((c) => renderColumn(c, cardsByCol[c.id])).join("") +
    "</div>";

  document.getElementById("funnel-sort").onchange = (e) => {
    state.funnelSort = e.target.value;
    renderFunnel();
  };

  // Bind drag-and-drop AND click-to-open on every card.
  wrap.querySelectorAll(".card").forEach((el) => {
    el.addEventListener("dragstart", onCardDragStart);
    el.addEventListener("dragend", onCardDragEnd);
    el.addEventListener("click", onCardClick);
  });
  wrap.querySelectorAll(".col").forEach((el) => {
    el.addEventListener("dragover", onColDragOver);
    el.addEventListener("dragleave", onColDragLeave);
    el.addEventListener("drop", onColDrop);
  });
  renderBulkBar();
}

// ---- Bulk action bar (multi-select) ----------------------------------------

// Bulk bar for the Lead funnel spreadsheet · only renders when at least one
// lead row is selected. Provides per-field bulk apply: stage, heat, owner,
// plus a Delete and Clear. Kanban has its own renderBulkBar() that handles
// deal+client selections.
function renderLeadBulkBar() {
  const leadKeys = Array.from(state.selected).filter((k) => k.startsWith("lead:"));
  const existing = document.getElementById("lf-bulkbar");
  if (leadKeys.length === 0) { if (existing) existing.remove(); return; }

  const stageOpts = LEAD_FUNNEL_STAGES.map((s) => '<option value="' + s.id + '">' + escHtml(s.label) + '</option>').join("");
  const heatOpts  = ["HOT", "WARM", "COOL", "COLD", "DEAD"]
    .map((h) => '<option value="' + h + '">' + h + '</option>').join("");

  const html =
    '<span class="count">' + leadKeys.length + ' selected</span>' +
    '<span class="sep"></span>' +
    '<select id="lf-bulk-stage"><option value="">Stage…</option>' + stageOpts + '</select>' +
    '<select id="lf-bulk-heat"><option value="">Heat…</option>' + heatOpts + '</select>' +
    '<select id="lf-bulk-owner"><option value="">Owner…</option><option value="santi">santi</option><option value="mike">mike</option></select>' +
    '<button id="lf-bulk-enrich" title="Find missing phone/email/socials via web search">✨ Enrich (' + leadKeys.length + ')</button>' +
    '<button class="danger" id="lf-bulk-delete">Delete</button>' +
    '<span class="sep"></span>' +
    '<button class="ghost" id="lf-bulk-clear" title="Clear selection (Esc)">Clear</button>';

  let bar = existing;
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "lf-bulkbar"; bar.className = "bulkbar";
    document.body.appendChild(bar);
  }
  bar.innerHTML = html;
  document.getElementById("lf-bulk-stage").onchange = (e) => { bulkApplyToLeads({ lead_stage: e.target.value }); e.target.value = ""; };
  document.getElementById("lf-bulk-heat").onchange  = (e) => { bulkApplyToLeads({ heat: e.target.value }); e.target.value = ""; };
  document.getElementById("lf-bulk-owner").onchange = (e) => { bulkApplyToLeads({}, e.target.value); e.target.value = ""; };
  document.getElementById("lf-bulk-delete").onclick = bulkDeleteLeads;
  document.getElementById("lf-bulk-clear").onclick  = clearSelection;
  const enrichLf = document.getElementById("lf-bulk-enrich");
  if (enrichLf) enrichLf.onclick = todayBulkEnrich; // same handler · works on whatever leads are selected
}

// Apply a partial patch to every selected lead. If ownerForActivities is
// provided, also retag activity ownership downstream (we don't actually
// rewrite activities here · that would be its own batch endpoint).
async function bulkApplyToLeads(patch, ownerForActivities) {
  const leadKeys = Array.from(state.selected).filter((k) => k.startsWith("lead:"));
  if (!leadKeys.length) return;
  const fullPatch = { ...patch };
  if (ownerForActivities) {
    // We store owner inside the activities table, not leads. But if Santi is
    // bulk-reassigning, future activities should default to that owner. Easiest
    // for now: nothing to write on the leads · just toast confirmation.
    toast("Future activities will default to " + ownerForActivities);
  }
  if (!Object.keys(fullPatch).length) { renderLeadBulkBar(); return; }
  // If we're bulk-setting lead_stage to sales_qualified, that's a promotion
  // per-row · use the single-row path so each lead gets its deal.
  if (fullPatch.lead_stage === "sales_qualified") {
    if (!confirm("Promote " + leadKeys.length + " leads to the Prospect funnel? A deal will be created for each.")) return;
  }
  let ok = 0, fail = 0;
  for (const k of leadKeys) {
    const id = k.split(":")[1];
    try {
      // Re-route SQL through the per-row promotion so deals get created.
      if (fullPatch.lead_stage === "sales_qualified") {
        await promoteOneSilent(id);
        ok += 1;
        continue;
      }
      const body = { ...fullPatch };
      // Keep legacy status mirrored when lead_stage changes.
      if (body.lead_stage === "contacted") body.status = "contacted";
      else if (body.lead_stage === "disqualified") body.status = "dismissed";
      else if (body.lead_stage === "new" || body.lead_stage === "marketing_qualified") body.status = "new";
      const res = await api("/api/admin/crm/leads/" + id, { method: "PATCH", body: JSON.stringify(body) });
      replaceRow("leads", id, res.row);
      ok += 1;
    } catch { fail += 1; }
  }
  state.selected.clear();
  rebuildLookups();
  renderLeadFunnel();
  document.querySelector("nav.tabs").outerHTML = renderTabs();
  bindTabHandlers();
  toast("Updated " + ok + (fail ? " · " + fail + " failed" : "") + " leads");
}

// Lighter promote-to-SQL used during bulk apply. Same DB writes as
// promoteToSQL but no confirm prompt and no per-call toast.
async function promoteOneSilent(leadId) {
  const lead = state.data.leads.find((r) => r.id === leadId);
  if (!lead) return;
  if (lead.lead_stage === "sales_qualified") return;
  const leadRes = await api("/api/admin/crm/leads/" + leadId, {
    method: "PATCH",
    body: JSON.stringify({ lead_stage: "sales_qualified", status: "converted" }),
  });
  replaceRow("leads", leadId, leadRes.row);
  const lr = leadRes.row;
  const dealPayload = {
    title: lr.business_name || lr.name || lr.email || "Untitled deal",
    lead_id: lr.id,
    stage: "qualifying",
    plan: lr.plan || null,
    owner: "santi",
  };
  const dealRes = await api("/api/admin/crm/deals", { method: "POST", body: JSON.stringify(dealPayload) });
  state.data.deals.unshift(dealRes.row);
  state.counts.deals = (state.counts.deals || 0) + 1;
}

async function bulkDeleteLeads() {
  const leadKeys = Array.from(state.selected).filter((k) => k.startsWith("lead:"));
  if (!leadKeys.length) return;
  if (!confirm("Delete " + leadKeys.length + " leads? This cannot be undone.")) return;
  let ok = 0, fail = 0;
  for (const k of leadKeys) {
    const id = k.split(":")[1];
    try {
      await api("/api/admin/crm/leads/" + id, { method: "DELETE" });
      state.data.leads = state.data.leads.filter((r) => r.id !== id);
      ok += 1;
    } catch { fail += 1; }
  }
  state.counts.leads = Math.max(0, (state.counts.leads || ok) - ok);
  state.selected.clear();
  rebuildLookups();
  renderLeadFunnel();
  document.querySelector("nav.tabs").outerHTML = renderTabs();
  bindTabHandlers();
  toast("Deleted " + ok + (fail ? " · " + fail + " failed" : "") + " leads");
}

function renderBulkBar() {
  const existing = document.getElementById("bulkbar");
  if (state.selected.size === 0) { if (existing) existing.remove(); return; }
  const html =
    '<span class="count">' + state.selected.size + ' selected</span>' +
    '<span class="sep"></span>' +
    '<select id="bulkmove" title="Move all to a column">' +
      '<option value="">Move to…</option>' +
      FUNNEL_COLUMNS.map((c) => '<option value="' + c.id + '">' + escHtml(c.label) + "</option>").join("") +
    "</select>" +
    '<button class="danger" id="bulkdelete">Delete</button>' +
    '<span class="sep"></span>' +
    '<button class="ghost" id="bulkclear" title="Clear selection (Esc)">Clear</button>';

  let bar = existing;
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "bulkbar"; bar.className = "bulkbar";
    document.body.appendChild(bar);
  }
  bar.innerHTML = html;
  document.getElementById("bulkmove").onchange = (e) => { bulkMove(e.target.value); e.target.value = ""; };
  document.getElementById("bulkdelete").onclick = bulkDelete;
  document.getElementById("bulkclear").onclick = clearSelection;
}

async function bulkMove(targetCol) {
  if (!targetCol) return;
  const items = Array.from(state.selected).map((k) => { const [t, i] = k.split(":"); return { type: t, id: i }; });
  let moved = 0;
  for (const it of items) {
    const fc = currentColumnFor(it.type, it.id);
    if (fc === targetCol) continue;
    try { await applyFunnelMove(it.type, it.id, fc, targetCol); moved += 1; } catch {}
  }
  state.selected.clear();
  renderFunnel();
  toast("Moved " + moved + " items to " + targetCol);
}

async function bulkDelete() {
  const n = state.selected.size;
  if (!n) return;
  if (!confirm("Delete " + n + " items? This cannot be undone.")) return;
  const items = Array.from(state.selected).map((k) => { const [t, i] = k.split(":"); return { type: t, id: i }; });
  let deleted = 0;
  for (const it of items) {
    const table = PLURAL[it.type];
    try {
      await api("/api/admin/crm/" + table + "/" + it.id, { method: "DELETE" });
      state.data[table] = state.data[table].filter((r) => r.id !== it.id);
      state.counts[table] = Math.max(0, (state.counts[table] || 1) - 1);
      deleted += 1;
    } catch (e) {
      toast("Failed: " + e.message, true);
    }
  }
  state.selected.clear();
  rebuildLookups();
  renderFunnel();
  // Refresh top nav counts.
  document.querySelector("nav.tabs").outerHTML = renderTabs();
  bindTabHandlers();
  toast("Deleted " + deleted + " items");
}

// Click on a funnel card opens the contact card modal. Suppress when a drag
// just ended (some browsers fire click on drop). 150ms guard is plenty.
// Cmd/Ctrl/Shift + click toggles multi-select instead of opening the modal.
let cardDragEndedAt = 0;
function onCardClick(e) {
  if (Date.now() - cardDragEndedAt < 150) return;
  // Children with data-stop=1 (e.g. social icon links) handle their own
  // click and should not also open the modal.
  if (e.target && e.target.closest && e.target.closest('[data-stop="1"]')) return;
  const el = e.currentTarget;
  const type = el.dataset.type;
  const id = el.dataset.id;
  if (e.metaKey || e.ctrlKey || e.shiftKey) {
    e.preventDefault();
    const k = selKey(type, id);
    if (state.selected.has(k)) state.selected.delete(k);
    else state.selected.add(k);
    renderFunnel();
    return;
  }
  // Plain click: drop any existing selection and open the modal.
  if (state.selected.size > 0) state.selected.clear();
  openCard(type, id);
}

// Returns the last-contacted timestamp for a card (deal, lead, or client).
// Checks last_touched_at on the linked lead first, then falls back to the
// most recent activity in state. Returns 0 if never contacted.
function getLastContactedAt(c) {
  const r = c.row;
  const linked = c.type === "deal" && r.lead_id ? state.lookups.leadById.get(r.lead_id) : null;
  const leadRow = c.type === "lead" ? r : linked;
  let ts = leadRow && leadRow.last_touched_at ? Number(leadRow.last_touched_at) : 0;
  if (!ts) {
    const leadId = leadRow && leadRow.id;
    const dealId = c.type === "deal" ? r.id : null;
    state.data.activities.forEach((a) => {
      if ((dealId && a.deal_id === dealId) || (leadId && a.lead_id === leadId)) {
        const t = Number(a.occurred_at);
        if (t > ts) ts = t;
      }
    });
  }
  return ts;
}

function buildFunnelContext() {
  const dealsByLead = new Map();
  const wonDealsByClient = new Map();
  state.data.deals.forEach((d) => {
    if (d.lead_id) dealsByLead.set(d.lead_id, d);
    if (d.client_id && d.stage === "won") wonDealsByClient.set(d.client_id, d);
  });
  return { dealsByLead, wonDealsByClient };
}

function renderColumn(colDef, cards) {
  const head = '<div class="col-head"><span><span class="dot" style="background:' + colDef.dot + '"></span>' + colDef.label + '</span><span class="num">' + cards.length + '</span></div>';
  const body = '<div class="col-body">' +
    (cards.length ? cards.map(renderCard).join("") : '<div class="empty-col">·</div>') +
    "</div>";
  // Optional foot: total deal value in the column.
  let foot = "";
  if (["qualifying","proposal","negotiation","won"].includes(colDef.id)) {
    const sum = cards
      .filter((c) => c.type === "deal")
      .reduce((s, c) => s + (Number(c.row.value_cop_cents) || 0), 0);
    if (sum > 0) foot = '<div class="col-foot">Total: ' + fmtMoney(sum, "COP") + "</div>";
  }
  return '<div class="col" data-col="' + colDef.id + '">' + head + body + foot + "</div>";
}

function renderCard(c) {
  const t = c.type;
  const r = c.row;
  let title = "";
  let meta = "";
  let socials = "";
  let contactStatus = "";
  if (t === "lead") {
    title = r.business_name || r.name || r.email || "(unnamed lead)";
    const bits = [];
    if (r.name && title !== r.name) bits.push(escHtml(r.name));
    if (r.email) bits.push(escHtml(r.email));
    if (r.source) bits.push(escHtml(r.source));
    meta = '<span class="type-pill">Lead</span>' + (bits.length ? '<span>' + bits.join(" · ") + '</span>' : "");
    socials = renderSocialIcons(r);
  } else if (t === "deal") {
    title = r.title || "(untitled deal)";
    const bits = [];
    if (r.value_cop_cents) bits.push('<span class="money">' + escHtml(fmtMoney(r.value_cop_cents, "COP")) + '</span>');
    if (r.owner) bits.push(escHtml(r.owner));
    // Proposal status badge so we can see at a glance whether a proposal
    // package has been generated for this deal.
    if (r.proposal_status === "ready") bits.push('<a class="proposal-badge" target="_blank" href="/admin/proposal/' + escHtml(r.id) + '">Proposal ready</a>');
    else if (r.proposal_status === "generating") bits.push('<span class="proposal-badge gen">Generating...</span>');
    else if (r.proposal_status === "error") bits.push('<span class="proposal-badge err">Proposal error</span>');
    meta = '<span class="type-pill">Deal</span>' + bits.map((b) => '<span>' + b + '</span>').join("");
    // Contact status strip. Use last_touched_at from the lead if set; otherwise
    // fall back to the most recent activity linked to this deal or its lead.
    // This handles leads that had activities logged before last_touched_at existed.
    const linked = r.lead_id ? state.lookups.leadById.get(r.lead_id) : null;
    let lastTouch = linked && linked.last_touched_at ? Number(linked.last_touched_at) : 0;
    if (!lastTouch) {
      const linkedLeadId = linked && linked.id;
      const dealId = r.id;
      state.data.activities.forEach((a) => {
        if ((a.deal_id === dealId || (linkedLeadId && a.lead_id === linkedLeadId)) && Number(a.occurred_at) > lastTouch) {
          lastTouch = Number(a.occurred_at);
        }
      });
    }
    if (!lastTouch) {
      contactStatus = '<div class="contact-status cs-new">Not contacted</div>';
    } else {
      contactStatus = '<div class="contact-status cs-touched">Last contacted: ' + escHtml(fmtDate(lastTouch)) + "</div>";
    }
  } else if (t === "client") {
    title = r.business_name || r.email;
    const bits = [];
    if (r.plan) bits.push(escHtml(r.plan));
    if (r.status) bits.push(escHtml(r.status));
    meta = '<span class="type-pill">Client</span>' + bits.map((b) => '<span>' + b + '</span>').join("");
  }
  const sel = isSelected(t, r.id) ? " selected" : "";
  return '<div class="card t-' + t + sel + '" draggable="true" data-type="' + t + '" data-id="' + escHtml(r.id) + '">' +
    '<div class="title">' + escHtml(title) + "</div>" +
    '<div class="meta">' + meta + "</div>" +
    contactStatus +
    socials +
    "</div>";
}

// Renders a small row of icon-shaped links to Instagram, Facebook, X, TikTok.
// Each icon is its own link with .stop on click so clicking it doesn't open
// the card modal. Empty handles render an outlined placeholder so Santi can
// see at a glance which socials are missing.
function renderSocialIcons(r) {
  if (!r) return "";
  const def = [
    { key: "instagram",    label: "IG", url: r.instagram },
    { key: "facebook_url", label: "FB", url: r.facebook_url },
    { key: "x_url",        label: "X",  url: r.x_url },
    { key: "tiktok_url",   label: "TT", url: r.tiktok_url },
  ];
  const present = def.filter((s) => s.url && String(s.url).trim());
  if (!present.length) return "";
  const items = def.map((s) => {
    const has = s.url && String(s.url).trim();
    if (!has) return '<span class="soc soc-empty" title="' + s.label + ' not set">' + s.label + '</span>';
    const href = normalizeSocialUrl(s.key, s.url);
    return '<a class="soc soc-' + s.key + '" href="' + escHtml(href) + '" target="_blank" rel="noopener" data-stop="1" title="' + s.label + ': ' + escHtml(s.url) + '">' + s.label + '</a>';
  }).join("");
  return '<div class="socials">' + items + "</div>";
}

// Turns whatever the user typed (handle, partial URL, full URL) into a
// clickable target. Conservative: if it already starts with http we trust it,
// otherwise we map the handle to the canonical site.
function normalizeSocialUrl(key, raw) {
  const v = String(raw || "").trim();
  if (/^https?:\\/\\//i.test(v)) return v;
  const handle = v.replace(/^@/, "");
  if (key === "instagram")    return "https://instagram.com/" + handle;
  if (key === "facebook_url") return "https://facebook.com/"  + handle;
  if (key === "x_url")        return "https://x.com/"         + handle;
  if (key === "tiktok_url")   return "https://tiktok.com/@"   + handle;
  return v;
}

// ---- Drag & drop ----------------------------------------------------------

let dragPayload = null; // { type, id, fromCol, multi: boolean }

function onCardDragStart(e) {
  const el = e.currentTarget;
  const type = el.dataset.type;
  const id = el.dataset.id;
  const fromCol = el.closest(".col")?.dataset.col;
  // If the user starts dragging a card that isn't part of the selection, the
  // selection is replaced. Dragging a selected card moves the whole selection.
  if (state.selected.size > 0 && !isSelected(type, id)) {
    state.selected.clear();
  }
  const multi = state.selected.size > 1 && isSelected(type, id);
  dragPayload = { type, id, fromCol, multi };
  el.classList.add("dragging");
  if (multi) {
    // Mark every selected card as dragging so they all dim together.
    document.querySelectorAll(".kanban .card.selected").forEach((c) => c.classList.add("dragging"));
  }
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", multi ? ("multi:" + state.selected.size) : (type + ":" + id));
}
function onCardDragEnd(e) {
  e.currentTarget.classList.remove("dragging");
  // Clear the "dragging" class from any sibling selected cards too.
  document.querySelectorAll(".kanban .card.dragging").forEach((c) => c.classList.remove("dragging"));
  cardDragEndedAt = Date.now();
}
function onColDragOver(e) {
  if (!dragPayload) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  e.currentTarget.classList.add("drag-over");
}
function onColDragLeave(e) {
  e.currentTarget.classList.remove("drag-over");
}
async function onColDrop(e) {
  e.preventDefault();
  const col = e.currentTarget;
  col.classList.remove("drag-over");
  if (!dragPayload) return;
  const target = col.dataset.col;
  const payload = dragPayload;
  dragPayload = null;

  if (payload.multi) {
    // Bulk move: every selected card moves to the dropped-on column.
    const items = Array.from(state.selected).map((k) => {
      const [t, i] = k.split(":");
      return { type: t, id: i };
    });
    let moved = 0;
    for (const it of items) {
      const fc = currentColumnFor(it.type, it.id);
      if (fc === target) continue;
      try {
        await applyFunnelMove(it.type, it.id, fc, target);
        moved += 1;
      } catch {}
    }
    state.selected.clear();
    renderFunnel();
    toast("Moved " + moved + " items to " + target);
    return;
  }

  if (target === payload.fromCol) return; // no-op
  await applyFunnelMove(payload.type, payload.id, payload.fromCol, target);
}

// Where is this row currently rendered on the kanban? Used for bulk moves so
// applyFunnelMove can short-circuit no-op transitions.
function currentColumnFor(type, id) {
  const table = PLURAL[type];
  const row = state.data[table].find((r) => r.id === id);
  if (!row) return null;
  const ctx = buildFunnelContext();
  return cardColumn(type, row, ctx);
}

// Map a drop onto the right DB update. Returns silently after toasting.
async function applyFunnelMove(type, id, fromCol, toCol) {
  try {
    if (type === "lead") {
      // Dragging a raw lead out of the Leads column promotes it to "contacted"
      // so it appears in the Lead Funnel spreadsheet for follow-up.
      if (toCol === "lead") return; // no-op
      if (toCol === "won" || toCol === "lost") { toast("Promote a lead to a deal first", true); return; }
      const res = await api("/api/admin/crm/leads/" + id, {
        method: "PATCH",
        body: JSON.stringify({ lead_stage: "contacted", status: "contacted" }),
      });
      replaceRow("leads", id, res.row);
      rebuildLookups();
      renderFunnel();
      toast("Lead moved to Contacted in Lead Funnel");
      return;
    }
    if (type === "deal") {
      const VALID = ["qualifying","proposal","negotiation","won","lost"];
      if (!VALID.includes(toCol)) { toast("Deals can't move to " + toCol, true); return; }
const body = { stage: toCol };
      if (toCol === "won" || toCol === "lost") body.closed_at = Date.now();
      const res = await api("/api/admin/crm/deals/" + id, { method: "PATCH", body: JSON.stringify(body) });
      replaceRow("deals", id, res.row);
      // Auto-advance linked lead to SQL when deal reaches proposal.
      if (toCol === "proposal") {
        const deal = res.row;
        const linkedLead = deal.lead_id ? state.lookups.leadById.get(deal.lead_id) : null;
        if (linkedLead && linkedLead.lead_stage !== "sales_qualified") {
          try {
            const lr = await api("/api/admin/crm/leads/" + deal.lead_id, {
              method: "PATCH", body: JSON.stringify({ lead_stage: "sales_qualified", status: "converted" }),
            });
            replaceRow("leads", deal.lead_id, lr.row);
            rebuildLookups();
          } catch (_) {}
        }
      }
      toast("Deal moved to " + toCol);
    }
    else if (type === "client") {
      if (toCol === "lost") {
        const res = await api("/api/admin/crm/clients/" + id, { method: "PATCH", body: JSON.stringify({ status: "invited" }) });
        replaceRow("clients", id, res.row);
        toast("Client status reset");
      } else {
        toast("Clients can only be moved to Lost from the funnel", true);
        return;
      }
    }
    rebuildLookups();
    renderFunnel();
    document.querySelector("nav.tabs").outerHTML = renderTabs();
    bindTabHandlers();
  } catch (e) {
    toast(e.message || "Move failed", true);
  }
}

function replaceRow(table, id, row) {
  const idx = state.data[table].findIndex((r) => r.id === id);
  if (idx >= 0 && row) state.data[table][idx] = row;
}

// ===========================================================================
// Today dashboard: aggregates everything that needs Santi's attention now.
// Four sections:
//   1. Overdue / due today  · leads with next_action_due <= today
//   2. Hot, untouched       · HOT or DEAD heat with zero touches yet
//   3. Stuck deals          · deals in the same stage for >7 days
//   4. Fresh activity       · leads/deals updated in the last 24h
// Each row shows the contact name and the same inline action buttons
// (☎ 📱 ✉ ↗ ⇪) as the lead grid so Santi can act without leaving the page.
// ===========================================================================

const DAY_MS = 24 * 60 * 60 * 1000;

function todayStartMs() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
}

// True if this lead has any way for Santi to reach them. Leads with none of
// these fields are unactionable until someone enriches the record.
function hasReachableChannel(lead) {
  if (!lead) return false;
  return !!(
    (lead.phone && String(lead.phone).trim()) ||
    (lead.whatsapp && String(lead.whatsapp).trim()) ||
    (lead.email && String(lead.email).trim()) ||
    (lead.instagram && String(lead.instagram).trim()) ||
    (lead.facebook_url && String(lead.facebook_url).trim()) ||
    (lead.current_site && String(lead.current_site).trim())
  );
}
function todayEndMs() {
  const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime();
}

// Returns a flat array of { kind, lead?, deal?, reason, weight } for the
// current state. Used by the Today tab and the nav counter.
function computeTodayItems() {
  const todayEnd = todayEndMs();
  const now = Date.now();
  const items = [];

  // 1. Overdue / due today.
  state.data.leads.forEach((l) => {
    if (l.next_action_due && l.next_action_due <= todayEnd && (l.lead_stage || "new") !== "disqualified") {
      const overdue = l.next_action_due < now - DAY_MS;
      items.push({
        kind: overdue ? "overdue" : "due-today",
        lead: l,
        reason: overdue ? "Overdue: " + (l.next_action || "follow up") : "Due today: " + (l.next_action || "follow up"),
        weight: overdue ? 1 : 2,
      });
    }
  });

  // 2. HOT / DEAD with zero touches AND at least one contact channel.
  // Leads with no phone, email, or social are unactionable · they go to a
  // separate "Needs enrichment" bucket below.
  state.data.leads.forEach((l) => {
    const heat = (l.heat || "").toUpperCase();
    if ((heat === "HOT" || heat === "DEAD") && (l.touches_count || 0) === 0 &&
        (l.lead_stage || "new") === "new") {
      if (hasReachableChannel(l)) {
        items.push({
          kind: "hot-untouched",
          lead: l,
          reason: heat + " lead with no contact yet",
          weight: 3,
        });
      } else {
        items.push({
          kind: "needs-enrichment",
          lead: l,
          reason: heat + " lead but no phone, email or social on file",
          weight: 6,
        });
      }
    }
  });

  // 3. Stuck deals: same stage for >7 days, not won/lost.
  state.data.deals.forEach((d) => {
    if (["won","lost"].includes(d.stage)) return;
    const last = d.updated_at || d.created_at || 0;
    const days = (now - last) / DAY_MS;
    if (days >= 7) {
      items.push({
        kind: "stuck-deal",
        deal: d,
        reason: "Stuck in " + (d.stage || "qualifying") + " for " + Math.floor(days) + " days",
        weight: 4,
      });
    }
  });

  // 4. Fresh activity in last 24h (signal there's a conversation happening).
  const since = now - DAY_MS;
  state.data.activities.forEach((a) => {
    if ((a.occurred_at || a.created_at || 0) < since) return;
    const lead = a.lead_id ? state.data.leads.find((l) => l.id === a.lead_id) : null;
    const deal = a.deal_id ? state.data.deals.find((d) => d.id === a.deal_id) : null;
    if (!lead && !deal) return;
    items.push({
      kind: "fresh-activity",
      lead, deal,
      reason: (a.kind || "note") + " · " + (a.subject || ""),
      weight: 5,
    });
  });

  // De-dup: if the same lead appears in multiple categories, keep the lowest
  // weight (highest priority).
  const seen = new Map();
  items.forEach((it) => {
    const k = (it.lead && it.lead.id) || (it.deal && it.deal.id);
    if (!k) return;
    const cur = seen.get(k);
    if (!cur || it.weight < cur.weight) seen.set(k, it);
  });
  return Array.from(seen.values()).sort((a, b) => a.weight - b.weight);
}

function renderToday() {
  const wrap = document.getElementById("today-wrap");
  if (!wrap) return;
  const items = computeTodayItems();
  const q = (state.search || "").toLowerCase();
  const filtered = q
    ? items.filter((it) => {
        const r = it.lead || it.deal || {};
        const blob = [r.business_name, r.name, r.title, r.email, r.city, r.category].filter(Boolean).join(" ").toLowerCase();
        return blob.includes(q) || (it.reason || "").toLowerCase().includes(q);
      })
    : items;

  const groups = {
    "overdue":         { title: "Overdue", subtitle: "Action was due before today", items: [] },
    "due-today":       { title: "Due today", subtitle: "Action due today · contact now", items: [] },
    "hot-untouched":   { title: "Hot leads · ready to contact", subtitle: "HOT or DEAD prospects with phone, email or social on file", items: [] },
    "stuck-deal":      { title: "Stuck deals", subtitle: "Same stage for over 7 days · time to nudge", items: [] },
    "fresh-activity":  { title: "Fresh activity (last 24h)", subtitle: "Conversations in progress", items: [] },
    "needs-enrichment":{ title: "Needs enrichment", subtitle: "Hot prospects with no contact channel · either research them or bulk-disqualify", items: [] },
  };
  filtered.forEach((it) => { if (groups[it.kind]) groups[it.kind].items.push(it); });

  // Date header.
  const date = new Date();
  const dateStr = date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const html = ['<div class="today-page">',
    '<div class="today-hero">',
      '<div class="today-greet">',
        '<h2>Buenos dias, Santi</h2>',
        '<div class="today-date">' + escHtml(dateStr) + '</div>',
      '</div>',
      '<div class="today-summary">',
        renderTodayKpi("Action items", filtered.length, ""),
        renderTodayKpi("Open pipeline", fmtMoney(state.data.deals.filter((d) => !["won","lost"].includes(d.stage)).reduce((s, d) => s + (Number(d.value_cop_cents) || 0), 0), "COP"), "in active deals"),
        renderTodayKpi("Hot untouched", state.data.leads.filter((l) => ["HOT","DEAD"].includes((l.heat||"").toUpperCase()) && (l.touches_count || 0) === 0).length, "leads"),
      '</div>',
    '</div>'
  ];

  Object.keys(groups).forEach((gk) => {
    const g = groups[gk];
    if (!g.items.length) return;
    const allKeys = g.items.map((it) => selKey((it.lead ? "lead" : "deal"), (it.lead || it.deal).id));
    const allSel = allKeys.length > 0 && allKeys.every((k) => state.selected.has(k));
    html.push('<section class="today-group">' +
      '<div class="today-group-head">' +
        '<label class="group-check" title="Select all in this section"><input type="checkbox" class="t-group-cb"' + (allSel ? " checked" : "") + ' data-group="' + gk + '" /></label>' +
        '<h3>' + escHtml(g.title) + '</h3>' +
        '<span>' + g.items.length + '</span>' +
      '</div>' +
      '<p class="today-group-sub">' + escHtml(g.subtitle) + '</p>' +
      '<div class="today-list">' +
        g.items.map(renderTodayItem).join("") +
      '</div>' +
    '</section>');
  });

  if (filtered.length === 0) {
    html.push('<div class="today-empty">' +
      '<div class="empty-icon">✓</div>' +
      '<h3>Inbox zero.</h3>' +
      '<p>Nothing urgent right now. Open the Lead funnel to keep working through cold prospects, or take a coffee.</p>' +
    '</div>');
  }

  html.push('</div>');
  wrap.innerHTML = html.join("");

  // Bind row clicks · open the modal for the lead or deal.
  wrap.querySelectorAll(".today-item").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest("button[data-act]") || e.target.closest("a") || e.target.closest(".t-check") || e.target.closest("input.t-cb")) return;
      openCard(el.dataset.type, el.dataset.id);
    });
  });
  // Per-row checkbox.
  wrap.querySelectorAll("input.t-cb").forEach((cb) => {
    cb.addEventListener("click", (e) => e.stopPropagation());
    cb.addEventListener("change", (e) => {
      const k = selKey(cb.dataset.type, cb.dataset.id);
      if (cb.checked) state.selected.add(k); else state.selected.delete(k);
      renderToday();
    });
  });
  // Per-section "select all" checkbox.
  wrap.querySelectorAll("input.t-group-cb").forEach((cb) => {
    cb.addEventListener("click", (e) => e.stopPropagation());
    cb.addEventListener("change", () => {
      const gk = cb.dataset.group;
      const itemsInGroup = computeTodayItems().filter((it) => it.kind === gk);
      itemsInGroup.forEach((it) => {
        const r = it.lead || it.deal;
        const type = it.lead ? "lead" : "deal";
        const k = selKey(type, r.id);
        if (cb.checked) state.selected.add(k); else state.selected.delete(k);
      });
      renderToday();
    });
  });
  wrap.querySelectorAll(".today-item button[data-act]").forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const act = b.dataset.act;
      const id = b.dataset.id;
      const type = b.dataset.type;
      if (act === "open") openCard(type, id);
      else if (act === "call" && type === "lead")  quickLogTouch(id, "call");
      else if (act === "wa"   && type === "lead")  quickLogTouch(id, "whatsapp");
      else if (act === "email"&& type === "lead")  quickLogTouch(id, "email");
      else if (act === "promote" && type === "lead") promoteToSQL(id);
      else if (act === "delete") {
        if (type === "lead") deleteLead(id);
        else if (type === "deal") { if (confirm("Delete this deal?")) (async () => {
          try { await api("/api/admin/crm/deals/" + id, { method: "DELETE" });
            state.data.deals = state.data.deals.filter((d) => d.id !== id);
            renderToday(); toast("Deleted"); } catch (e) { toast(e.message, true); }
        })(); }
      }
    };
  });
  renderTodayBulkBar();
}

// Bulk bar for the Today dashboard. Handles mixed selections of leads + deals.
// Leads get a lead-stage dropdown and a heat dropdown; deals get a deal-stage
// dropdown; both share the Delete button.
function renderTodayBulkBar() {
  const existing = document.getElementById("today-bulkbar");
  const leadKeys = Array.from(state.selected).filter((k) => k.startsWith("lead:"));
  const dealKeys = Array.from(state.selected).filter((k) => k.startsWith("deal:"));
  const total = leadKeys.length + dealKeys.length;
  if (total === 0) { if (existing) existing.remove(); return; }

  const parts = ['<span class="count">' + total + ' selected</span><span class="sep"></span>'];
  if (leadKeys.length) {
    parts.push('<select id="today-lead-stage"><option value="">Lead stage…</option>' +
      LEAD_FUNNEL_STAGES.map((s) => '<option value="' + s.id + '">' + escHtml(s.label) + '</option>').join("") +
      '</select>');
    parts.push('<select id="today-heat"><option value="">Heat…</option>' +
      ["HOT","WARM","COOL","COLD","DEAD"].map((h) => '<option value="' + h + '">' + h + '</option>').join("") +
      '</select>');
  }
  if (dealKeys.length) {
    parts.push('<select id="today-deal-stage"><option value="">Deal stage…</option>' +
      FUNNEL_COLUMNS.map((c) => '<option value="' + c.id + '">' + escHtml(c.label) + '</option>').join("") +
      '</select>');
  }
  if (leadKeys.length) {
    parts.push('<button id="today-bulk-enrich" title="Find missing phone/email/socials via web search">✨ Enrich (' + leadKeys.length + ')</button>');
  }
  parts.push('<button class="danger" id="today-bulk-delete">Delete (' + total + ')</button>');
  parts.push('<span class="sep"></span><button class="ghost" id="today-bulk-clear" title="Clear selection (Esc)">Clear</button>');

  let bar = existing;
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "today-bulkbar"; bar.className = "bulkbar";
    document.body.appendChild(bar);
  }
  bar.innerHTML = parts.join("");

  const leadStageEl = document.getElementById("today-lead-stage");
  if (leadStageEl) leadStageEl.onchange = (e) => { todayBulkApply({ lead_stage: e.target.value }, null); e.target.value = ""; };
  const heatEl = document.getElementById("today-heat");
  if (heatEl) heatEl.onchange = (e) => { todayBulkApply({ heat: e.target.value }, null); e.target.value = ""; };
  const dealStageEl = document.getElementById("today-deal-stage");
  if (dealStageEl) dealStageEl.onchange = (e) => { todayBulkApply(null, { stage: e.target.value }); e.target.value = ""; };
  document.getElementById("today-bulk-delete").onclick = todayBulkDelete;
  document.getElementById("today-bulk-clear").onclick = () => { state.selected.clear(); renderToday(); };
  const enrichBtn = document.getElementById("today-bulk-enrich");
  if (enrichBtn) enrichBtn.onclick = todayBulkEnrich;
}

async function todayBulkEnrich() {
  const leadKeys = Array.from(state.selected).filter((k) => k.startsWith("lead:"));
  if (!leadKeys.length) return;
  const ids = leadKeys.map((k) => k.split(":")[1]);
  if (!confirm("Search the web to fill missing phone / email / socials for " + ids.length + " leads? Takes ~30 seconds per 25 leads, cost ~$0.01 each.")) return;
  toast("Enriching " + ids.length + " leads · please wait...");
  try {
    // Server caps at 25 per request; chunk if larger.
    const chunks = [];
    for (let i = 0; i < ids.length; i += 25) chunks.push(ids.slice(i, i + 25));
    let totalFilled = 0, totalSkipped = 0, totalFailed = 0;
    for (const ch of chunks) {
      const r = await api("/api/admin/enrich/run", { method: "POST", body: JSON.stringify({ ids: ch }) });
      if (r.summary) {
        totalFilled += r.summary.filled || 0;
        totalSkipped += r.summary.skipped || 0;
        totalFailed += r.summary.failed || 0;
      }
    }
    // Refresh lead data so the new contact info shows up immediately.
    await loadAll();
    state.selected.clear();
    if (state.active === "today") renderToday();
    else if (state.active === "leadfunnel") renderLeadFunnel();
    toast("Enriched: " + totalFilled + " filled · " + totalSkipped + " unchanged · " + totalFailed + " failed");
  } catch (e) { toast(e.message, true); }
}

// Apply patches to each selected row. leadPatch -> leads in selection,
// dealPatch -> deals in selection. Either can be null to skip.
async function todayBulkApply(leadPatch, dealPatch) {
  const leadKeys = Array.from(state.selected).filter((k) => k.startsWith("lead:"));
  const dealKeys = Array.from(state.selected).filter((k) => k.startsWith("deal:"));
  let ok = 0, fail = 0;

  if (leadPatch && leadKeys.length) {
    // Special: bulk SQL promotion creates a deal for each lead.
    if (leadPatch.lead_stage === "sales_qualified") {
      if (!confirm("Promote " + leadKeys.length + " leads to Sales Qualified? A deal will be created for each.")) return;
    }
    for (const k of leadKeys) {
      const id = k.split(":")[1];
      try {
        if (leadPatch.lead_stage === "sales_qualified") {
          await promoteOneSilent(id);
        } else {
          const body = { ...leadPatch };
          if (body.lead_stage === "contacted") body.status = "contacted";
          else if (body.lead_stage === "disqualified") body.status = "dismissed";
          else if (body.lead_stage === "new" || body.lead_stage === "marketing_qualified") body.status = "new";
          const res = await api("/api/admin/crm/leads/" + id, { method: "PATCH", body: JSON.stringify(body) });
          replaceRow("leads", id, res.row);
        }
        ok += 1;
      } catch { fail += 1; }
    }
  }

  if (dealPatch && dealKeys.length) {
    for (const k of dealKeys) {
      const id = k.split(":")[1];
      try {
        const body = { ...dealPatch };
        if (body.stage === "won" || body.stage === "lost") body.closed_at = Date.now();
        const res = await api("/api/admin/crm/deals/" + id, { method: "PATCH", body: JSON.stringify(body) });
        replaceRow("deals", id, res.row);
        ok += 1;
      } catch { fail += 1; }
    }
  }

  state.selected.clear();
  rebuildLookups();
  renderToday();
  document.querySelector("nav.tabs").outerHTML = renderTabs();
  bindTabHandlers();
  toast("Updated " + ok + (fail ? " · " + fail + " failed" : ""));
}

async function todayBulkDelete() {
  const keys = Array.from(state.selected);
  if (!keys.length) return;
  if (!confirm("Delete " + keys.length + " items? This cannot be undone.")) return;
  let ok = 0, fail = 0;
  for (const k of keys) {
    const [t, id] = k.split(":");
    const table = PLURAL[t];
    try {
      await api("/api/admin/crm/" + table + "/" + id, { method: "DELETE" });
      state.data[table] = state.data[table].filter((r) => r.id !== id);
      ok += 1;
    } catch { fail += 1; }
  }
  state.selected.clear();
  rebuildLookups();
  renderToday();
  document.querySelector("nav.tabs").outerHTML = renderTabs();
  bindTabHandlers();
  toast("Deleted " + ok + (fail ? " · " + fail + " failed" : ""));
}

function renderTodayKpi(label, value, suffix) {
  return '<div class="today-kpi">' +
    '<div class="kpi-num">' + escHtml(String(value)) + '</div>' +
    '<div class="kpi-label">' + escHtml(label) + (suffix ? " · " + escHtml(suffix) : "") + '</div>' +
  '</div>';
}

function renderTodayItem(it) {
  const r = it.lead || it.deal || {};
  const isLead = !!it.lead;
  // For deal cards, pull the domain from the linked lead (deals don't have a
  // current_site / email of their own).
  const contactForDomain = isLead ? r : (r.lead_id ? state.lookups.leadById.get(r.lead_id) : null);
  const domain = extractContactDomain(contactForDomain || {});
  const title = r.business_name || r.title || r.name || r.email || "(unnamed)";
  const subtitle = isLead
    ? [r.name && r.name !== r.business_name ? r.name : "", r.city, r.category].filter(Boolean).join(" · ")
    : ["Deal", r.stage, r.value_cop_cents ? fmtMoney(r.value_cop_cents, "COP") : ""].filter(Boolean).join(" · ");
  const heat = isLead && r.heat ? heatPill(r.heat) : "";
  const stage = isLead && r.lead_stage ? leadStagePill(r.lead_stage) : (r.stage ? stagePill(r.stage) : "");
  const reasonClass = "reason r-" + it.kind;
  const domainHtml = domain
    ? '<a class="t-domain" href="' + escHtml(domain.url) + '" target="_blank" rel="noopener" title="' + escHtml(domain.source === "site" ? "From current_site" : "From email domain") + '" onclick="event.stopPropagation()">' +
        '<span class="t-domain-icon">' + (domain.source === "site" ? "🌐" : "✉") + '</span>' +
        escHtml(domain.host) +
      '</a>'
    : '';

  const type = isLead ? "lead" : "deal";
  const sel = state.selected.has(selKey(type, r.id));
  let actions = '<button data-act="open" data-id="' + escHtml(r.id) + '" data-type="' + type + '" title="Open">↗</button>' +
                '<button data-act="delete" data-id="' + escHtml(r.id) + '" data-type="' + type + '" title="Delete">🗑</button>';
  if (isLead) {
    actions =
      '<button data-act="call"  data-id="' + escHtml(r.id) + '" data-type="lead" title="Log a call">☎</button>' +
      '<button data-act="wa"    data-id="' + escHtml(r.id) + '" data-type="lead" title="Log WhatsApp">📱</button>' +
      '<button data-act="email" data-id="' + escHtml(r.id) + '" data-type="lead" title="Log email">✉</button>' +
      '<button data-act="open"  data-id="' + escHtml(r.id) + '" data-type="lead" title="Open">↗</button>' +
      '<button data-act="promote" data-id="' + escHtml(r.id) + '" data-type="lead" title="Mark Sales Qualified">⇪</button>' +
      '<button data-act="delete"  data-id="' + escHtml(r.id) + '" data-type="lead" title="Delete this lead">🗑</button>';
  }

  const contactStrip = renderContactStrip(contactForDomain || (isLead ? r : null));

  return '<div class="today-item' + (sel ? " today-selected" : "") + '" data-type="' + type + '" data-id="' + escHtml(r.id) + '">' +
    '<label class="t-check" title="Select"><input type="checkbox" class="t-cb"' + (sel ? " checked" : "") + ' data-id="' + escHtml(r.id) + '" data-type="' + type + '" /></label>' +
    '<div class="t-info">' +
      '<div class="t-title">' +
        escHtml(title) +
      '</div>' +
      (contactStrip ? '<div class="t-contact">' + contactStrip + '</div>' : '') +
      '<div class="t-meta">' + heat + stage + '<span>' + escHtml(subtitle) + '</span></div>' +
      '<div class="' + reasonClass + '">' + escHtml(it.reason) + '</div>' +
    '</div>' +
    '<div class="t-actions">' + actions + '</div>' +
  '</div>';
}

// Renders the inline contact strip shown on every Today row. Each chip is
// clickable and opens the appropriate channel (tel:, mailto:, wa.me, instagram,
// etc.). Empty fields are skipped silently. Returns "" when nothing to show.
function renderContactStrip(row) {
  if (!row) return "";
  const chips = [];
  const domain = extractContactDomain(row);
  if (domain) {
    chips.push('<a class="chip chip-site" href="' + escHtml(domain.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="' + (domain.source === "site" ? "Current site" : "From email domain") + '">' +
      '<span class="ico">🌐</span>' + escHtml(domain.host) + '</a>');
  }
  const cleanPhone = (s) => String(s || "").replace(/[^\\d+]/g, "");
  const cleanWa    = (s) => String(s || "").replace(/[^\\d]/g, "");

  const phone = (row.phone || "").toString().trim();
  if (phone) {
    chips.push('<a class="chip chip-tel" href="tel:' + escHtml(cleanPhone(phone)) + '" onclick="event.stopPropagation()" title="Call">' +
      '<span class="ico">☎</span>' + escHtml(phone) + '</a>');
  }
  const wa = (row.whatsapp || row.phone || "").toString().trim();
  if (wa) {
    chips.push('<a class="chip chip-wa" href="https://wa.me/' + escHtml(cleanWa(wa)) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="WhatsApp">' +
      '<span class="ico">📱</span>WhatsApp</a>');
  }
  const email = (row.email || "").toString().trim();
  if (email) {
    chips.push('<a class="chip chip-mail" href="mailto:' + escHtml(email) + '" onclick="event.stopPropagation()" title="Email">' +
      '<span class="ico">✉</span>' + escHtml(email) + '</a>');
  }
  // Social links · normalize handles to URLs.
  const igRaw = (row.instagram || "").toString().trim();
  if (igRaw) {
    const handle = igRaw.replace(/^@/, "").replace(/^https?:\\/\\/(www\\.)?instagram\\.com\\//i, "").replace(/\\/$/, "");
    const url = /^https?:\\/\\//i.test(igRaw) ? igRaw : "https://instagram.com/" + handle;
    chips.push('<a class="chip chip-ig" href="' + escHtml(url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Instagram">' +
      '<span class="ico">📷</span>' + escHtml("@" + handle) + '</a>');
  }
  const fbRaw = (row.facebook_url || "").toString().trim();
  if (fbRaw) {
    const url = /^https?:\\/\\//i.test(fbRaw) ? fbRaw : "https://facebook.com/" + fbRaw.replace(/^@/, "");
    chips.push('<a class="chip chip-fb" href="' + escHtml(url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Facebook">' +
      '<span class="ico">f</span>Facebook</a>');
  }
  const xRaw = (row.x_url || "").toString().trim();
  if (xRaw) {
    const handle = xRaw.replace(/^@/, "").replace(/^https?:\\/\\/(www\\.)?(x|twitter)\\.com\\//i, "").replace(/\\/$/, "");
    const url = /^https?:\\/\\//i.test(xRaw) ? xRaw : "https://x.com/" + handle;
    chips.push('<a class="chip chip-x" href="' + escHtml(url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="X (Twitter)">' +
      '<span class="ico">𝕏</span>' + escHtml("@" + handle) + '</a>');
  }
  const ttRaw = (row.tiktok_url || "").toString().trim();
  if (ttRaw) {
    const handle = ttRaw.replace(/^@/, "").replace(/^https?:\\/\\/(www\\.)?tiktok\\.com\\/@?/i, "").replace(/\\/$/, "");
    const url = /^https?:\\/\\//i.test(ttRaw) ? ttRaw : "https://tiktok.com/@" + handle;
    chips.push('<a class="chip chip-tt" href="' + escHtml(url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="TikTok">' +
      '<span class="ico">♪</span>' + escHtml("@" + handle) + '</a>');
  }
  // Contact person name as a non-clickable chip if it adds info beyond the title.
  const cname = (row.name || "").toString().trim();
  const biz = (row.business_name || "").toString().trim();
  if (cname && cname !== biz) {
    chips.push('<span class="chip chip-person"><span class="ico">👤</span>' + escHtml(cname) + '</span>');
  }
  return chips.join("");
}

// Returns { host, url, source } where source is "site" or "email", or null
// if neither current_site nor email has a usable host. Used by the Today
// dashboard to surface the domain inline · saves a click into the modal.
function extractContactDomain(row) {
  if (!row) return null;
  const site = (row.current_site || "").toString().trim();
  if (site) {
    try {
      const url = /^https?:\\/\\//i.test(site) ? site : "https://" + site;
      const host = new URL(url).host.replace(/^www\\./, "");
      if (host) return { host, url, source: "site" };
    } catch {}
  }
  const email = (row.email || "").toString().trim();
  if (email && email.includes("@")) {
    const raw = email.split("@")[1].toLowerCase().split(/[\\s>?,]/)[0].replace(/^www\\./, "").trim();
    // Skip free / catch-all email providers · they don't represent the
    // business's own domain.
    const skip = new Set([
      "gmail.com","hotmail.com","outlook.com","yahoo.com","yahoo.es","live.com",
      "icloud.com","me.com","aol.com","protonmail.com","proton.me","msn.com",
    ]);
    if (raw && !skip.has(raw)) {
      return { host: raw, url: "https://" + raw, source: "email" };
    }
  }
  return null;
}

// ===========================================================================
// Lead funnel: high-volume spreadsheet for early-stage outreach. Cold call,
// WhatsApp, email · log each touch in the activities table, advance the lead
// through raw -> contacted -> MQL -> SQL. Hitting SQL auto-creates a deal in
// the prospect kanban and the lead disappears from this view.
// ===========================================================================

// Column-order persistence: the user can drag column headers to reorder the
// Lead funnel grid. Order is stored in localStorage so it survives reloads.
const LF_COL_ORDER_KEY = "pwp_lf_col_order";

function loadLeadColOrder() {
  try {
    const stored = localStorage.getItem(LF_COL_ORDER_KEY);
    if (!stored) return null;
    const arr = JSON.parse(stored);
    if (!Array.isArray(arr)) return null;
    const valid = new Set(LEAD_FUNNEL_COLS.map((c) => c.key));
    const filtered = arr.filter((k) => valid.has(k));
    // Append any newly added columns (so a release that adds a column doesn't
    // hide it for users with an older saved order).
    LEAD_FUNNEL_COLS.forEach((c) => { if (!filtered.includes(c.key)) filtered.push(c.key); });
    return filtered;
  } catch { return null; }
}
function saveLeadColOrder(arr) {
  try { localStorage.setItem(LF_COL_ORDER_KEY, JSON.stringify(arr)); } catch {}
}
function getOrderedLeadCols() {
  if (!state.leadColOrder) state.leadColOrder = loadLeadColOrder() || LEAD_FUNNEL_COLS.map((c) => c.key);
  const byKey = Object.fromEntries(LEAD_FUNNEL_COLS.map((c) => [c.key, c]));
  return state.leadColOrder.map((k) => byKey[k]).filter(Boolean);
}

// Drag-to-reorder column headers in the lead funnel grid. The dragged column
// is dropped before/after the target based on whether the cursor is in the
// left/right half of the target header.
let lfDraggingCol = null;
let lfColDragJustEnded = false;

function onLfColDragStart(e) {
  const th = e.currentTarget;
  lfDraggingCol = th.dataset.col;
  th.classList.add("col-dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", "col:" + lfDraggingCol);
}
function onLfColDragOver(e) {
  if (!lfDraggingCol) return;
  if (e.currentTarget.dataset.col === lfDraggingCol) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  const r = e.currentTarget.getBoundingClientRect();
  const isLeftHalf = (e.clientX - r.left) < r.width / 2;
  e.currentTarget.classList.toggle("col-drop-before", isLeftHalf);
  e.currentTarget.classList.toggle("col-drop-after",  !isLeftHalf);
}
function onLfColDragLeave(e) {
  e.currentTarget.classList.remove("col-drop-before", "col-drop-after");
}
function onLfColDrop(e) {
  e.preventDefault();
  const th = e.currentTarget;
  const before = th.classList.contains("col-drop-before");
  th.classList.remove("col-drop-before", "col-drop-after");
  if (!lfDraggingCol) return;
  const target = th.dataset.col;
  const source = lfDraggingCol;
  lfDraggingCol = null;
  if (target === source) return;

  const order = state.leadColOrder.slice();
  const fromIdx = order.indexOf(source);
  if (fromIdx < 0) return;
  order.splice(fromIdx, 1);
  let toIdx = order.indexOf(target);
  if (toIdx < 0) return;
  if (!before) toIdx += 1; // drop after the target
  order.splice(toIdx, 0, source);
  state.leadColOrder = order;
  saveLeadColOrder(order);
  renderLeadFunnel();
}
function onLfColDragEnd(e) {
  e.currentTarget.classList.remove("col-dragging");
  document.querySelectorAll(".lf-sheet thead th.col-drop-before, .lf-sheet thead th.col-drop-after")
    .forEach((th) => th.classList.remove("col-drop-before", "col-drop-after"));
  // Guard so the subsequent click event from the drag operation doesn't
  // accidentally trigger a sort.
  lfColDragJustEnded = true;
  setTimeout(() => { lfColDragJustEnded = false; }, 150);
}

function renderLeadFunnel() {
  const wrap = document.getElementById("leadfunnel-wrap");
  if (!wrap) return;

  // Default filter: anything still in play (raw / contacted / MQL).
  if (!state.leadStageFilter) state.leadStageFilter = "active";
  if (state.heatFilter === undefined) state.heatFilter = "";        // "" means all heats
  if (state.categoryFilter === undefined) state.categoryFilter = ""; // "" means all categories
  if (!state.leadPage) state.leadPage = 1;
  if (!state.leadPageSize) state.leadPageSize = 100;
  const cols = getOrderedLeadCols();

  // Counts per stage + heat for the filter pills/dropdowns.
  const counts = { new: 0, contacted: 0, marketing_qualified: 0, sales_qualified: 0, disqualified: 0, active: 0 };
  const heatCounts = { HOT: 0, WARM: 0, COOL: 0, COLD: 0, DEAD: 0, "(none)": 0 };
  const categorySet = new Map(); // category -> count
  state.data.leads.forEach((l) => {
    const s = l.lead_stage || "new";
    if (counts[s] !== undefined) counts[s] += 1;
    if (!["sales_qualified","disqualified"].includes(s)) counts.active += 1;
    const h = (l.heat || "").toString().toUpperCase();
    if (heatCounts[h] !== undefined) heatCounts[h] += 1;
    else if (h) heatCounts[h] = (heatCounts[h] || 0) + 1;
    else heatCounts["(none)"] += 1;
    const cat = (l.category || "").toString().trim();
    if (cat) categorySet.set(cat, (categorySet.get(cat) || 0) + 1);
  });

  // Filter rows.
  const f = state.leadStageFilter;
  let rows = state.data.leads;
  if (f === "active") rows = rows.filter((l) =>
    !["sales_qualified","disqualified"].includes(l.lead_stage || "new") &&
    !state.lookups.dealsByLead.has(l.id)
  );
  else if (f !== "all") rows = rows.filter((l) => (l.lead_stage || "new") === f);
  if (state.heatFilter) {
    const hf = state.heatFilter;
    if (hf === "(none)") rows = rows.filter((l) => !(l.heat || "").toString().trim());
    else rows = rows.filter((l) => (l.heat || "").toString().toUpperCase() === hf);
  }
  if (state.categoryFilter) {
    rows = rows.filter((l) => (l.category || "").toString().trim() === state.categoryFilter);
  }

  // Search.
  if (state.search) {
    const q = state.search.toLowerCase();
    rows = rows.filter((l) => cols.some((c) => {
      const v = l[c.key];
      return v != null && String(v).toLowerCase().includes(q);
    }));
  }

  // Sort.
  if (state.sort.col) {
    const dir = state.sort.dir === "asc" ? 1 : -1;
    rows = rows.slice().sort((a, b) => {
      let va = a[state.sort.col]; let vb = b[state.sort.col];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  // Paginate.
  const total = rows.length;
  const ps = state.leadPageSize;
  const pages = Math.max(1, Math.ceil(total / ps));
  if (state.leadPage > pages) state.leadPage = pages;
  const offset = (state.leadPage - 1) * ps;
  const pageRows = rows.slice(offset, offset + ps);

  // Filter pills.
  const pills = [
    { id: "active", label: "Active", n: counts.active },
    { id: "new", label: "New", n: counts.new },
    { id: "contacted", label: "Contacted", n: counts.contacted },
    { id: "marketing_qualified", label: "MQL", n: counts.marketing_qualified },
    { id: "sales_qualified", label: "SQL", n: counts.sales_qualified },
    { id: "disqualified", label: "Disqualified", n: counts.disqualified },
    { id: "all", label: "All", n: state.data.leads.length },
  ];
  const pillsHtml = '<div class="lf-pills">' +
    pills.map((p) => '<button class="lf-pill' + (p.id === f ? " active" : "") + '" data-stage="' + p.id + '">' + escHtml(p.label) + ' <span class="n">' + p.n + '</span></button>').join("") +
    "</div>";

  // Heat filter row + category dropdown. Reuses the .lf-pill style for heat.
  const heatPills = [
    { id: "", label: "Any heat" },
    { id: "HOT",  label: "HOT",  n: heatCounts.HOT },
    { id: "DEAD", label: "DEAD", n: heatCounts.DEAD },
    { id: "WARM", label: "WARM", n: heatCounts.WARM },
    { id: "COOL", label: "COOL", n: heatCounts.COOL },
    { id: "COLD", label: "COLD", n: heatCounts.COLD },
    { id: "(none)", label: "(none)", n: heatCounts["(none)"] },
  ];
  const heatPillsHtml = '<div class="lf-pills lf-pills-secondary">' +
    heatPills.map((p) => {
      const cnt = typeof p.n === "number" ? ' <span class="n">' + p.n + '</span>' : "";
      return '<button class="lf-pill' + (p.id === state.heatFilter ? " active" : "") + '" data-heat="' + escHtml(p.id) + '">' + escHtml(p.label) + cnt + "</button>";
    }).join("") +
    '<span style="flex:1"></span>' +
    '<label style="font-size:0.75rem;color:var(--ink-soft);margin-right:0.4rem;letter-spacing:0.05em;">Category</label>' +
    '<select class="lf-category">' +
      '<option value="">All categories</option>' +
      Array.from(categorySet.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([cat, n]) => '<option value="' + escHtml(cat) + '"' + (cat === state.categoryFilter ? " selected" : "") + ">" + escHtml(cat) + " (" + n + ")</option>")
        .join("") +
    "</select>" +
    (state.heatFilter || state.categoryFilter ? '<button class="lf-pill" id="lf-clear-filters" style="margin-left:0.5rem">Clear filters</button>' : "") +
    "</div>";

  // Table.
  const head = "<thead><tr>" +
    cols.map((c) => {
      const arrow = state.sort.col === c.key ? (state.sort.dir === "asc" ? "▲" : "▼") : "";
      return '<th data-col="' + c.key + '" draggable="true" title="Drag to reorder. Click to sort.">' +
        '<span class="grip">⋮⋮</span>' + escHtml(c.label) + ' <span class="sortarrow">' + arrow + "</span></th>";
    }).join("") +
    '<th style="width:160px">Actions</th></tr></thead>';

  const body = "<tbody>" +
    (pageRows.length
      ? pageRows.map((r) => renderLeadFunnelRow(r, cols)).join("")
      : '<tr><td class="empty" colspan="' + (cols.length + 1) + '">No leads in this view.</td></tr>') +
    "</tbody>";

  const foot = '<div class="lf-foot">' +
    "<span>Showing " + (total ? (offset + 1) : 0) + "–" + Math.min(offset + ps, total) + " of " + total + "</span>" +
    "<span>·</span>" +
    '<button class="prev"' + (state.leadPage <= 1 ? " disabled" : "") + ">← Prev</button>" +
    "<span>Page " + state.leadPage + " / " + pages + "</span>" +
    '<button class="next"' + (state.leadPage >= pages ? " disabled" : "") + ">Next →</button>" +
    "<span>·</span>" +
    '<span>Page size:</span>' +
    '<select class="ps">' + [50,100,200,500,1000].map((n) => '<option value="' + n + '"' + (n===ps?" selected":"") + ">" + n + "</option>").join("") + "</select>" +
    "</div>";

  wrap.innerHTML = pillsHtml + heatPillsHtml + '<table class="sheet lf-sheet">' + head + body + "</table>" + foot;

  // Wire handlers. Stage pills are on the first row, heat pills on the second.
  wrap.querySelectorAll(".lf-pills:not(.lf-pills-secondary) .lf-pill").forEach((p) => {
    p.onclick = () => { state.leadStageFilter = p.dataset.stage; state.leadPage = 1; renderLeadFunnel(); document.querySelector("nav.tabs").outerHTML = renderTabs(); bindTabHandlers(); };
  });
  wrap.querySelectorAll(".lf-pills-secondary .lf-pill[data-heat]").forEach((p) => {
    p.onclick = () => { state.heatFilter = p.dataset.heat; state.leadPage = 1; renderLeadFunnel(); };
  });
  const catSel = wrap.querySelector(".lf-category");
  if (catSel) catSel.onchange = (e) => { state.categoryFilter = e.target.value; state.leadPage = 1; renderLeadFunnel(); };
  const clearBtn = document.getElementById("lf-clear-filters");
  if (clearBtn) clearBtn.onclick = () => { state.heatFilter = ""; state.categoryFilter = ""; state.leadPage = 1; renderLeadFunnel(); };
  wrap.querySelectorAll("thead th[data-col]").forEach((th) => {
    th.onclick = () => {
      if (lfColDragJustEnded) return;
      const col = th.dataset.col;
      if (state.sort.col === col) state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
      else { state.sort.col = col; state.sort.dir = "asc"; }
      renderLeadFunnel();
    };
    th.addEventListener("dragstart", onLfColDragStart);
    th.addEventListener("dragover", onLfColDragOver);
    th.addEventListener("dragleave", onLfColDragLeave);
    th.addEventListener("drop", onLfColDrop);
    th.addEventListener("dragend", onLfColDragEnd);
  });
  wrap.querySelectorAll("td[data-id]").forEach((td) => td.addEventListener("click", onLeadFunnelCellClick));
  renderLeadBulkBar();
  wrap.querySelectorAll(".actions button[data-act]").forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const act = b.dataset.act;
      const id = b.dataset.id;
      if (act === "contact")    markContactedOnly(id);
      else if (act === "call")  quickLogTouch(id, "call");
      else if (act === "wa")    quickLogTouch(id, "whatsapp");
      else if (act === "email") quickLogTouch(id, "email");
      else if (act === "open")  openCard("lead", id);
      else if (act === "promote") promoteToSQL(id);
      else if (act === "delete") deleteLead(id);
    };
  });
  const ps_el = wrap.querySelector(".ps");
  if (ps_el) ps_el.onchange = (e) => { state.leadPageSize = parseInt(e.target.value, 10) || 100; state.leadPage = 1; renderLeadFunnel(); };
  const prev = wrap.querySelector(".prev"); if (prev) prev.onclick = () => { state.leadPage = Math.max(1, state.leadPage - 1); renderLeadFunnel(); };
  const next = wrap.querySelector(".next"); if (next) next.onclick = () => { state.leadPage = Math.min(pages, state.leadPage + 1); renderLeadFunnel(); };
}

function renderLeadFunnelRow(r, cols) {
  cols = cols || getOrderedLeadCols();
  const isSel = state.selected.has(selKey("lead", r.id));
  const isNew = !r.lead_stage || r.lead_stage === "new";
  const cells = cols.map((c) => {
    const v = r[c.key];
    const display = formatLeadFunnelCell(c, v);
    const editable = c.readonly ? "" : ' data-editable="1"';
    return '<td data-id="' + r.id + '" data-col="' + c.key + '"' + editable + '><div class="cell">' + display + "</div></td>";
  }).join("");
  const actions = '<td class="actions">' +
    (isNew ? '<button data-act="contact" data-id="' + r.id + '" title="Mark as contacted">Contacted</button>' : "") +
    '<button data-act="call" data-id="' + r.id + '" title="Log a call">☎</button>' +
    '<button data-act="wa" data-id="' + r.id + '" title="Log WhatsApp touch">📱</button>' +
    '<button data-act="email" data-id="' + r.id + '" title="Log an email">✉</button>' +
    '<button data-act="open" data-id="' + r.id + '" title="Open full record">↗</button>' +
    '<button data-act="promote" data-id="' + r.id + '" title="Add to prospect funnel (creates deal at Qualifying)">⇪</button>' +
    '<button data-act="delete" data-id="' + r.id + '" title="Delete this lead">🗑</button>' +
    "</td>";
  const trCls = [isSel ? "lf-selected" : "", isNew ? "lf-uncontacted" : ""].filter(Boolean).join(" ");
  return "<tr" + (trCls ? ' class="' + trCls + '"' : "") + " data-row-id='" + escHtml(r.id) + "'>" + cells + actions + "</tr>";
}

function formatLeadFunnelCell(c, v) {
  if (v === null || v === undefined || v === "") return '<span style="color:var(--ink-soft)">·</span>';
  if (c.pill) return c.pill(v);
  if (c.type === "date") return escHtml(fmtDate(v));
  if (c.type === "int") return escHtml(String(v));
  if (c.type === "link") {
    // Make the URL clickable. Show only the host so the cell stays tidy.
    let href = String(v).trim();
    if (!/^https?:\\/\\//i.test(href)) href = "https://" + href;
    let display = href;
    try { display = new URL(href).host.replace(/^www\\./, ""); } catch {}
    return '<a class="link" href="' + escHtml(href) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">' + escHtml(display) + ' ↗</a>';
  }
  return escHtml(String(v));
}

// Inline cell editing tailored to the lead funnel. Same edit-in-place pattern
// as the existing onCellClick but reads LEAD_FUNNEL_COLS and writes leads/.
function onLeadFunnelCellClick(e) {
  const td = e.currentTarget;
  const id = td.dataset.id;
  // Cmd/Ctrl/Shift + click toggles row selection (multi-select), instead of
  // entering inline-edit mode. Plain click still edits.
  if (e.metaKey || e.ctrlKey || e.shiftKey) {
    e.preventDefault();
    const k = selKey("lead", id);
    if (state.selected.has(k)) state.selected.delete(k);
    else state.selected.add(k);
    renderLeadFunnel();
    return;
  }
  if (!td.dataset.editable) return;
  // If the cell already has an edit input (e.g. user clicked the open select to
  // pick an option), don't tear it down and recreate it · let the native widget
  // handle the click. This is what was preventing Stage / Heat dropdowns from
  // opening: the bubbled click re-entered this handler and rebuilt the select.
  if (td.querySelector(".edit")) return;
  const col = td.dataset.col;
  const colDef = LEAD_FUNNEL_COLS.find((c) => c.key === col);
  const row = state.data.leads.find((r) => r.id === id);
  if (!colDef || !row) return;

  const cur = row[col];
  let input;
  if (colDef.type === "select") {
    input = document.createElement("select");
    input.className = "edit";
    colDef.options.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt; o.textContent = opt === "" ? "·" : ((colDef.optionLabels && colDef.optionLabels[opt]) || opt);
      if (String(cur || "") === opt) o.selected = true;
      input.appendChild(o);
    });
  } else if (colDef.type === "date") {
    input = document.createElement("input");
    input.type = "date"; input.className = "edit"; input.value = dateInputValue(cur);
  } else if (colDef.type === "int") {
    input = document.createElement("input");
    input.type = "number"; input.className = "edit"; input.value = (cur ?? "");
  } else {
    input = document.createElement("input");
    input.type = "text"; input.className = "edit"; input.value = cur || "";
  }
  const cell = td.querySelector(".cell");
  cell.innerHTML = ""; cell.appendChild(input); input.focus();
  if (input.select) try { input.select(); } catch {}

  let done = false;
  function commit() {
    if (done) return; done = true;
    saveLeadCell(id, col, input.value);
  }
  function cancel() { if (done) return; done = true; renderLeadFunnel(); }
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e2) => {
    if (e2.key === "Enter") { e2.preventDefault(); commit(); }
    else if (e2.key === "Escape") { e2.preventDefault(); cancel(); }
  });
}

async function saveLeadCell(id, col, val) {
  // Special case: setting lead_stage to sales_qualified promotes to a deal.
  if (col === "lead_stage" && val === "sales_qualified") {
    await promoteToSQL(id);
    return;
  }
  // Mirror lead_stage changes onto legacy status for back-compat.
  const body = {};
  body[col] = val;
  if (col === "lead_stage") {
    if (val === "contacted") body.status = "contacted";
    else if (val === "disqualified") body.status = "dismissed";
    else if (val === "new" || val === "marketing_qualified") body.status = "new";
  }
  try {
    const res = await api("/api/admin/crm/leads/" + id, { method: "PATCH", body: JSON.stringify(body) });
    replaceRow("leads", id, res.row);
    renderLeadFunnel();
    document.querySelector("nav.tabs").outerHTML = renderTabs();
    bindTabHandlers();
    toast("Saved");
  } catch (e) { toast(e.message, true); renderLeadFunnel(); }
}

// Quick-log: creates an activity tied to the lead and bumps touches_count +
// last_touched_*. If the lead is still "new", advances it to "contacted".
async function quickLogTouch(leadId, kind) {
  const subj = prompt(kind === "call" ? "Call notes (subject):" :
                      kind === "whatsapp" ? "WhatsApp message subject:" :
                      "Email subject:");
  if (subj === null) return; // cancelled
  const lead = state.data.leads.find((r) => r.id === leadId);
  if (!lead) { toast("Lead not found", true); return; }

  try {
    // 1. Create the activity.
    const actPayload = {
      kind, subject: subj || ("(" + kind + ")"),
      lead_id: leadId,
      owner: "santi",
      occurred_at: Date.now(),
    };
    const actRes = await api("/api/admin/crm/activities", { method: "POST", body: JSON.stringify(actPayload) });
    state.data.activities.unshift(actRes.row);
    state.counts.activities = (state.counts.activities || 0) + 1;

    // 2. Update the lead's touch counters (and advance stage from raw -> contacted).
    const leadPatch = {
      last_touched_at: Date.now(),
      last_touched_kind: kind,
      touches_count: (Number(lead.touches_count) || 0) + 1,
    };
    if ((lead.lead_stage || "new") === "new") {
      leadPatch.lead_stage = "contacted";
      leadPatch.status = "contacted";
    }
    const leadRes = await api("/api/admin/crm/leads/" + leadId, { method: "PATCH", body: JSON.stringify(leadPatch) });
    replaceRow("leads", leadId, leadRes.row);

    renderLeadFunnel();
    document.querySelector("nav.tabs").outerHTML = renderTabs();
    bindTabHandlers();
    toast("Logged " + kind);
  } catch (e) { toast(e.message, true); }
}

// One-click "Mark contacted": flips lead_stage from new -> contacted without
// requiring a subject prompt. No activity is logged; use ☎/📱/✉ to log a touch
// with notes. The green "Contacted" button disappears from the row after save.
async function markContactedOnly(leadId) {
  const lead = state.data.leads.find((r) => r.id === leadId);
  if (!lead) { toast("Lead not found", true); return; }
  if ((lead.lead_stage || "new") !== "new") return; // already past new, no-op
  try {
    const res = await api("/api/admin/crm/leads/" + leadId, {
      method: "PATCH",
      body: JSON.stringify({ lead_stage: "contacted", status: "contacted", last_touched_at: Date.now(), last_touched_kind: "note" }),
    });
    replaceRow("leads", leadId, res.row);
    renderLeadFunnel();
    document.querySelector("nav.tabs").outerHTML = renderTabs();
    bindTabHandlers();
    toast("Marked as contacted");
  } catch (e) { toast(e.message, true); }
}

// Mark a lead Sales Qualified · creates a matching deal at qualifying and
// flips legacy status='converted'. Lead disappears from the active lead-funnel
// view and shows up as a deal card in the prospect kanban.
// Delete a lead row directly from the grid. Confirms first. Same DELETE
// endpoint the contact-card modal uses.
async function deleteLead(leadId) {
  const lead = state.data.leads.find((r) => r.id === leadId);
  if (!lead) { toast("Lead not found", true); return; }
  const label = lead.business_name || lead.name || lead.email || leadId;
  if (!confirm("Delete '" + label + "'? This cannot be undone.")) return;
  try {
    await api("/api/admin/crm/leads/" + leadId, { method: "DELETE" });
    state.data.leads = state.data.leads.filter((r) => r.id !== leadId);
    state.counts.leads = Math.max(0, (state.counts.leads || 1) - 1);
    rebuildLookups();
    renderLeadFunnel();
    document.querySelector("nav.tabs").outerHTML = renderTabs();
    bindTabHandlers();
    toast("Deleted");
  } catch (e) { toast(e.message, true); }
}

async function promoteToSQL(leadId) {
  const lead = state.data.leads.find((r) => r.id === leadId);
  if (!lead) { toast("Lead not found", true); return; }
  if (state.lookups.dealsByLead.has(leadId)) { toast("Already in the prospect funnel", true); return; }
  if (!confirm("Add '" + (lead.business_name || lead.name || lead.email) + "' to the prospect funnel? A deal will be created at Qualifying.")) return;
  try {
    // Mark status=converted so the lead exits the active funnel view, but keep
    // lead_stage at its current value (MQL). The lead auto-advances to SQL when
    // the deal is dragged to Proposal.
    const leadRes = await api("/api/admin/crm/leads/" + leadId, {
      method: "PATCH",
      body: JSON.stringify({ status: "converted" }),
    });
    replaceRow("leads", leadId, leadRes.row);

    const lr = leadRes.row;
    const dealPayload = {
      title: lr.business_name || lr.name || lr.email || "Untitled deal",
      lead_id: lr.id,
      stage: "qualifying",
      plan: lr.plan || null,
      owner: "santi",
    };
    const dealRes = await api("/api/admin/crm/deals", { method: "POST", body: JSON.stringify(dealPayload) });
    state.data.deals.unshift(dealRes.row);
    state.counts.deals = (state.counts.deals || 0) + 1;

    rebuildLookups();
    renderLeadFunnel();
    document.querySelector("nav.tabs").outerHTML = renderTabs();
    bindTabHandlers();
    toast("Promoted to prospect funnel");
  } catch (e) { toast(e.message, true); }
}

// ===========================================================================
// Contact card modal · opens from kanban cards. Auto-built from COLS for the
// matching entity type. Editable form + related activities.
// ===========================================================================

const PLURAL = { lead: "leads", deal: "deals", client: "clients" };

function openCard(type, id) {
  closeCard(); // ensure single instance
  const table = PLURAL[type];
  if (!table) return;
  const row = state.data[table].find((r) => r.id === id);
  if (!row) { toast("Record not found", true); return; }
  document.body.appendChild(buildCardModal(type, row));
  document.addEventListener("keydown", onCardEsc);
}

function closeCard() {
  const m = document.getElementById("card-modal");
  if (m) m.remove();
  document.removeEventListener("keydown", onCardEsc);
}

function onCardEsc(e) { if (e.key === "Escape") closeCard(); }

// Pre-built WhatsApp opener / follow-up messages. Variables in {braces} are
// substituted from the lead row at click time. The first three target specific
// scenarios from the cold-research import (HOT, DEAD site, hospitality).
const WA_TEMPLATES = [
  {
    id: "cold-hot",
    label: "Cold outreach (HOT lead)",
    template: "Hola {name}, soy Santi de PymeWebPro. Vimos {business} en {city} y creemos que tiene mucho potencial para crecer con un sitio web propio. Tenemos planes desde $390.000 COP con entrega en 48 horas. ¿Te interesa que hablemos 5 minutos?",
  },
  {
    id: "cold-dead",
    label: "Cold outreach (DEAD site)",
    template: "Hola {name}, soy Santi de PymeWebPro. Vimos que {business} tenia un sitio web ({site}) que ya no esta disponible. Tus clientes lo encuentran y piensan que cerraste. Podemos armarte uno nuevo profesional en 48 horas desde $390.000 COP. ¿Hablamos?",
  },
  {
    id: "cold-hotel",
    label: "Cold outreach (Hotel)",
    template: "Hola {name}, soy Santi de PymeWebPro. Sin sitio web propio, {business} esta dejando reservas directas y pagando comisiones a Booking. Armamos sitios de hotel desde $690.000 COP con galeria, reservas y pasarela de pago. Entrega en 48 horas. ¿Te interesa?",
  },
  {
    id: "cold-restaurant",
    label: "Cold outreach (Restaurante)",
    template: "Hola {name}, soy Santi de PymeWebPro. Si dependes solo de Rappi e Instagram para tus pedidos, estas pagando hasta 35% en comisiones. Te armamos un sitio propio con menu, fotos y pedidos directos por WhatsApp en 48 horas, desde $390.000 COP. ¿Te llamo?",
  },
  {
    id: "after-quote",
    label: "After quote sent",
    template: "Hola {name}, te envie la cotizacion de PymeWebPro para {business}. Avisame si llego bien y resolvemos cualquier duda. Recuerda: entrega en 48 horas y pago 30/70.",
  },
  {
    id: "followup-3day",
    label: "Follow-up (3 days)",
    template: "Hola {name}, te escribo de nuevo por si tienes alguna duda sobre la propuesta de PymeWebPro para {business}. Sin presion, solo aviso que sigo disponible.",
  },
  {
    id: "followup-week",
    label: "Follow-up (1 week)",
    template: "Hola {name}, ¿como vamos? ¿Tiene sentido seguir conversando sobre el sitio para {business} o prefieres dejarlo por ahora? Solo dime y respeto tu decision.",
  },
  {
    id: "final-touch",
    label: "Final touch (last try)",
    template: "Hola {name}, te marco una ultima vez. Si {business} sigue interesado en tener su sitio web propio, aqui estamos. Si no, no hay problema · te deseo lo mejor.",
  },
];

function fillWaTemplate(tpl, row) {
  const ctx = row || {};
  const name = (ctx.name || ctx.business_name || "").toString().trim();
  return tpl
    .replace(/\{name\}/g,     name || "")
    .replace(/\{business\}/g, ctx.business_name || "tu negocio")
    .replace(/\{city\}/g,     ctx.city || "tu ciudad")
    .replace(/\{site\}/g,     ctx.current_site || "tu sitio anterior")
    .replace(/\{category\}/g, ctx.category || "tu sector")
    .trim();
}

// Header summary strip · pills showing heat/stage/owner/location at a glance.
function renderCardSummary(type, row) {
  const bits = [];
  if (type === "lead") {
    if (row.heat) bits.push(heatPill(row.heat));
    if (row.lead_stage) bits.push(leadStagePill(row.lead_stage));
    if (row.motion) bits.push(motionPill(row.motion));
    if (row.city) bits.push('<span>' + escHtml(row.city) + '</span>');
    if (row.category) bits.push('<span>' + escHtml(row.category) + '</span>');
    if (row.touches_count) bits.push('<span>' + row.touches_count + ' touches</span>');
  } else if (type === "deal") {
    if (row.stage) bits.push(stagePill(row.stage));
    if (row.value_cop_cents) bits.push('<span><b>' + escHtml(fmtMoney(row.value_cop_cents, "COP")) + '</b></span>');
    if (row.owner) bits.push('<span>Owner: ' + escHtml(row.owner) + '</span>');
    const lead = row.lead_id ? state.lookups.leadById.get(row.lead_id) : null;
    if (lead && lead.city) bits.push('<span>' + escHtml(lead.city) + '</span>');
  } else if (type === "client") {
    if (row.status) bits.push(clientStatusPill(row.status));
    if (row.plan) bits.push(planPill(row.plan));
    if (row.language) bits.push('<span>' + escHtml(row.language) + '</span>');
  }
  return bits.join('<span class="dot">·</span>');
}

// Quick-action bar · one-tap calls, WhatsApp, email, site visit. Renders only
// the buttons whose target field has a value, but always shows the "Log
// activity" button on the right.
function renderQuickActionsBar(type, row) {
  // For deal cards, pull contact info from the linked lead when available.
  const contact = type === "deal" && row.lead_id ? state.lookups.leadById.get(row.lead_id) : row;
  if (!contact) return "";

  const phoneRaw = (contact.phone || "").toString().trim();
  const waRaw    = (contact.whatsapp || contact.phone || "").toString().trim();
  const email    = (contact.email || "").toString().trim();
  const site     = (contact.current_site || "").toString().trim();

  const cleanPhone = (s) => s.replace(/[^\\d+]/g, "");
  const cleanWa    = (s) => s.replace(/[^\\d]/g, "");

  const wa    = waRaw    ? "https://wa.me/" + cleanWa(waRaw) : null;
  const tel   = phoneRaw ? "tel:" + cleanPhone(phoneRaw) : null;
  const mail  = email    ? "mailto:" + encodeURIComponent(email) : null;
  let url     = null;
  if (site) {
    url = /^https?:\\/\\//i.test(site) ? site : "https://" + site;
  }

  const buttons = [];
  // WhatsApp button is now a split control: the main button opens WA with a
  // blank greeting; the ▾ next to it opens a template picker.
  if (wa) {
    buttons.push(
      '<div class="wa-split">' +
        '<a class="wa" href="' + escHtml(wa) + '?text=' + encodeURIComponent("Hola, soy Santi de PymeWebPro. ") + '" target="_blank" rel="noopener">📱 WhatsApp</a>' +
        '<button class="wa wa-templates" type="button" data-act="wa-templates" data-wa="' + escHtml(wa) + '" title="Pick a message template">▾</button>' +
      '</div>'
    );
  } else {
    buttons.push('<a class="wa disabled" title="No phone on record">📱 WhatsApp</a>');
  }
  buttons.push(tel
    ? '<a class="tel" href="' + escHtml(tel) + '" target="_blank" rel="noopener">☎ Call</a>'
    : '<a class="tel disabled" title="No phone on record">☎ Call</a>');
  buttons.push(mail
    ? '<a href="' + escHtml(mail) + '">✉ Email</a>'
    : '<a class="disabled" title="No email on record">✉ Email</a>');
  buttons.push(url
    ? '<a href="' + escHtml(url) + '" target="_blank" rel="noopener">🌐 Site</a>'
    : '<a class="disabled" title="No website on record">🌐 Site</a>');
  buttons.push('<button data-act="add-activity" type="button" style="margin-left:auto">+ Log activity</button>');

  return '<div class="modal-actions">' + buttons.join("") + '</div>';
}

function buildCardModal(type, row) {
  const bg = document.createElement("div");
  bg.id = "card-modal";
  bg.className = "modal-bg";
  bg.addEventListener("click", (e) => { if (e.target === bg) closeCard(); });

  const title =
    type === "lead"   ? (row.business_name || row.name || row.email || "Lead") :
    type === "deal"   ? (row.title || "Deal") :
                        (row.business_name || row.email || "Client");

  bg.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' +
    '<div class="modal-head t-' + type + '">' +
      '<div class="title-wrap">' +
        '<div class="title-line">' +
          '<span class="type-pill">' + type.toUpperCase() + '</span>' +
          '<h2>' + escHtml(title) + '</h2>' +
        '</div>' +
        '<div class="summary">' + renderCardSummary(type, row) + '</div>' +
      '</div>' +
      '<button class="close" data-act="close" title="Close (Esc)">×</button>' +
    '</div>' +
    renderQuickActionsBar(type, row) +
    '<div class="modal-body">' +
      renderCardFields(type, row) +
    '</div>' +
    '<div class="modal-foot">' +
      '<div class="left">' +
        '<button class="danger" data-act="delete">Delete</button>' +
      '</div>' +
      '<div class="right">' +
        '<button class="ghost" data-act="close">Cancel</button>' +
        '<button class="primary" data-act="save">Save</button>' +
      '</div>' +
    '</div>' +
    '<div class="modal-activities">' +
      renderRelatedActivities(type, row.id) +
    '</div>' +
  '</div>';

  // Wire footer buttons.
  bg.querySelectorAll('button[data-act="close"]').forEach((b) => b.onclick = closeCard);
  bg.querySelector('button[data-act="save"]').onclick   = () => saveCard(type, row.id, bg);
  bg.querySelector('button[data-act="delete"]').onclick = () => deleteCard(type, row.id);
  const addAct = bg.querySelector('button[data-act="add-activity"]');
  if (addAct) addAct.onclick = () => addActivityFor(type, row.id);
  // Generate-proposal button on deal cards.
  const genBtn = bg.querySelector("#btn-gen-proposal");
  if (genBtn) genBtn.onclick = () => generateProposalFor(genBtn.dataset.dealId, { fromButton: true });
  // WhatsApp template picker. The contact row used for {substitutions} is the
  // linked lead for deals, otherwise the row itself.
  const tplBtn = bg.querySelector('button[data-act="wa-templates"]');
  if (tplBtn) {
    const contactRow = type === "deal" && row.lead_id
      ? state.lookups.leadById.get(row.lead_id)
      : row;
    tplBtn.onclick = (e) => {
      e.stopPropagation();
      // Re-read live form values so a freshly-typed phone is what we use.
      const liveContact = { ...(contactRow || {}), ...readModalContactInputs(bg) };
      openWaTemplatePicker(tplBtn, buildWaUrlForContact(liveContact), liveContact, type, row.id);
    };
  }

  // Re-render the quick-action bar whenever the user edits phone/whatsapp/
  // email/current_site/instagram in the modal · so the Call / WhatsApp / Email
  // buttons always point at the latest values without needing a save+reopen.
  const refreshActionsBar = () => {
    const liveRow = { ...row, ...readModalContactInputs(bg) };
    const newBarHtml = renderQuickActionsBar(type, liveRow);
    const oldBar = bg.querySelector(".modal-actions");
    if (!oldBar) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = newBarHtml;
    const newBar = wrap.firstElementChild;
    if (!newBar) return;
    oldBar.replaceWith(newBar);
    // Re-bind template picker on the new bar.
    const newTpl = newBar.querySelector('button[data-act="wa-templates"]');
    if (newTpl) {
      newTpl.onclick = (e) => {
        e.stopPropagation();
        const liveContact = { ...row, ...readModalContactInputs(bg) };
        openWaTemplatePicker(newTpl, buildWaUrlForContact(liveContact), liveContact, type, row.id);
      };
    }
    // Re-bind add-activity on the new bar.
    const newAdd = newBar.querySelector('button[data-act="add-activity"]');
    if (newAdd) newAdd.onclick = () => addActivityFor(type, row.id);
  };

  ["phone", "whatsapp", "email", "current_site", "instagram"].forEach((k) => {
    const inp = bg.querySelector('.modal-body [data-key="' + k + '"]');
    if (inp) {
      inp.addEventListener("input", refreshActionsBar);
      inp.addEventListener("change", refreshActionsBar);
    }
  });

  return bg;
}

// Read the current values of contact-channel fields from the modal form.
// Used so the quick-action bar reflects what the user just typed before they
// hit Save.
function readModalContactInputs(modalEl) {
  const out = {};
  ["phone", "whatsapp", "email", "current_site", "instagram"].forEach((k) => {
    const el = modalEl.querySelector('.modal-body [data-key="' + k + '"]');
    if (el && typeof el.value === "string") out[k] = el.value;
  });
  return out;
}

function buildWaUrlForContact(contact) {
  const wa = (contact.whatsapp || contact.phone || "").toString().trim();
  if (!wa) return "";
  return "https://wa.me/" + wa.replace(/[^\\d]/g, "");
}

// Floating popover that lets Santi pick a WhatsApp template, substitutes the
// lead's name/business/city/site, and opens WA with the message pre-filled.
// Logs an activity (kind='whatsapp') automatically when picked.
function openWaTemplatePicker(anchor, waUrl, contact, type, recordId) {
  // Toggle off if already open.
  const existing = document.getElementById("wa-tpl-popover");
  if (existing) { existing.remove(); document.removeEventListener("click", waTplOutside); return; }

  const rect = anchor.getBoundingClientRect();
  const popover = document.createElement("div");
  popover.id = "wa-tpl-popover";
  popover.style.position = "fixed";
  popover.style.top = (rect.bottom + 4) + "px";
  popover.style.left = Math.max(12, rect.right - 360) + "px";

  popover.innerHTML =
    '<div class="wa-tpl-head">Pick a WhatsApp template</div>' +
    WA_TEMPLATES.map((t) => {
      const preview = fillWaTemplate(t.template, contact);
      const short = preview.length > 90 ? preview.slice(0, 87) + "..." : preview;
      return '<button class="wa-tpl-item" data-id="' + t.id + '"><b>' + escHtml(t.label) + '</b><span>' + escHtml(short) + '</span></button>';
    }).join("") +
    '<div class="wa-tpl-foot">Tip: pick one to open WhatsApp with the message ready. We also log it as a touch.</div>';

  document.body.appendChild(popover);
  setTimeout(() => document.addEventListener("click", waTplOutside), 0);

  popover.querySelectorAll(".wa-tpl-item").forEach((btn) => {
    btn.onclick = async (ev) => {
      ev.stopPropagation();
      const tpl = WA_TEMPLATES.find((t) => t.id === btn.dataset.id);
      if (!tpl) return;
      const msg = fillWaTemplate(tpl.template, contact);
      const url = waUrl + "?text=" + encodeURIComponent(msg);
      window.open(url, "_blank", "noopener");
      popover.remove();
      document.removeEventListener("click", waTplOutside);
      // Auto-log a whatsapp activity tied to the lead so we have a record.
      const leadId = type === "lead" ? recordId : (contact && contact.id);
      if (leadId) await logWaTemplateTouch(leadId, tpl, msg);
    };
  });
}

function waTplOutside(e) {
  const pop = document.getElementById("wa-tpl-popover");
  if (!pop) { document.removeEventListener("click", waTplOutside); return; }
  if (pop.contains(e.target)) return;
  pop.remove();
  document.removeEventListener("click", waTplOutside);
}

// Logs a WhatsApp activity + bumps touches_count on the lead. Same pattern as
// quickLogTouch but doesn't prompt for a subject (uses the template label).
async function logWaTemplateTouch(leadId, tpl, fullMessage) {
  try {
    const lead = state.data.leads.find((r) => r.id === leadId);
    if (!lead) return;
    const actPayload = {
      kind: "whatsapp",
      subject: tpl.label,
      body: fullMessage,
      lead_id: leadId,
      owner: "santi",
      occurred_at: Date.now(),
    };
    const actRes = await api("/api/admin/crm/activities", { method: "POST", body: JSON.stringify(actPayload) });
    state.data.activities.unshift(actRes.row);
    state.counts.activities = (state.counts.activities || 0) + 1;

    const leadPatch = {
      last_touched_at: Date.now(),
      last_touched_kind: "whatsapp",
      touches_count: (Number(lead.touches_count) || 0) + 1,
    };
    if ((lead.lead_stage || "new") === "new") {
      leadPatch.lead_stage = "contacted";
      leadPatch.status = "contacted";
    }
    const leadRes = await api("/api/admin/crm/leads/" + leadId, { method: "PATCH", body: JSON.stringify(leadPatch) });
    replaceRow("leads", leadId, leadRes.row);

    // Refresh the modal's activity list so the new touch shows immediately.
    const modal = document.getElementById("card-modal");
    if (modal) {
      const acts = modal.querySelector(".modal-activities");
      if (acts) acts.innerHTML = renderRelatedActivities("lead", leadId);
      const addBtn = modal.querySelector('button[data-act="add-activity"]');
      if (addBtn) addBtn.onclick = () => addActivityFor("lead", leadId);
    }
    if (state.active === "leadfunnel") renderLeadFunnel();
    toast("WhatsApp opened · touch logged");
  } catch (e) { toast(e.message, true); }
}

// Renders the editable fields for an entity. Uses the same COLS definitions
// the spreadsheet view uses, so changes there propagate automatically.
function renderCardFields(type, row) {
  // Deal cards get a focused layout: only the fields needed at a glance.
  if (type === "deal") return renderDealCardFields(row);

  const table = PLURAL[type];
  const cols = COLS[table].filter((c) => !c.readonly);

  const html = [];
  // Meta line: id + created timestamp.
  html.push('<div class="meta-line">id: ' + escHtml(row.id) +
    (row.created_at ? '  ·  created ' + escHtml(fmtDate(row.created_at)) : "") +
    (row.updated_at ? '  ·  updated ' + escHtml(fmtDate(row.updated_at)) : "") +
    '</div>');

  cols.forEach((c) => {
    // Special: leads use a Lead-stage dropdown. Setting Sales Qualified
    // auto-promotes the lead to a deal at "qualifying" on save.
    if (type === "lead" && c.key === "lead_stage") {
      html.push(renderLeadFunnelStageField(row));
      return;
    }
    // Hide the legacy status column on the modal (it's still in COLS for the
    // raw spreadsheet view, but Lead stage replaces it conceptually).
    if (type === "lead" && c.key === "status") return;
    // Notes get a custom journal-style block below. Skip the default textarea.
    if (type === "lead" && c.key === "notes") return;
    const v = row[c.key];
    html.push(renderFieldInput(c, v));
  });

  // Lead-only Socials block. Editable URL fields for Instagram, Facebook,
  // X (Twitter), and TikTok. Used by the proposal generator to pull style /
  // wording / contact info when building a custom mockup.
  if (type === "lead") {
    html.push(renderSocialsBlock(row));
  }

  // Lead-only Notes journal. History above (read-only timeline), draft input
  // below. On save the draft gets timestamped and prepended to the history.
  if (type === "lead") {
    html.push(renderNotesJournal(row));
  }

  return html.join("");
}

// Renders a single text input that belongs to the linked LEAD, not the deal.
// The data-lead-field attribute tells saveCard to route this field to a
// separate PATCH on the lead record.
function renderLeadContactField(key, label, value) {
  const id = "fld-lead-" + key;
  return '<div class="field"><label for="' + id + '">' + escHtml(label) + "</label>" +
    '<input type="text" id="' + id + '" data-key="' + key + '" data-type="text" data-lead-field="1" value="' + escHtml(value || "") + '" /></div>';
}

// Focused deal card layout: only what Santi needs during a sales call.
// Order: Deal Name, Prospect Name (read-only), Stage, Owner, Notes,
// Contact info (phone/WA/web/social from linked lead), Proposal block.
function renderDealCardFields(deal) {
  const html = [];

  html.push('<div class="meta-line">id: ' + escHtml(deal.id) +
    (deal.created_at ? '  ·  created ' + escHtml(fmtDate(deal.created_at)) : "") +
    (deal.updated_at ? '  ·  updated ' + escHtml(fmtDate(deal.updated_at)) : "") +
    '</div>');

  // Deal Name
  const titleCol = COLS.deals.find((c) => c.key === "title") || { key: "title", label: "Deal Name", type: "text" };
  html.push(renderFieldInput({ ...titleCol, label: "Deal Name" }, deal.title || ""));

  // Prospect Name (read-only display from linked lead)
  const lead = deal.lead_id ? state.lookups.leadById.get(deal.lead_id) : null;
  const prospectName = lead
    ? (lead.business_name || lead.name || lead.email || "(unnamed)")
    : "(no linked lead)";
  html.push('<div class="field"><label>Prospect</label>' +
    '<div class="read-only-val">' + escHtml(prospectName) + '</div></div>');

  // Stage
  const stageCol = COLS.deals.find((c) => c.key === "stage");
  if (stageCol) html.push(renderFieldInput(stageCol, deal.stage || "qualifying"));

  // Owner
  const ownerCol = COLS.deals.find((c) => c.key === "owner");
  if (ownerCol) html.push(renderFieldInput(ownerCol, deal.owner || ""));

  // Plan (chosen during negotiation)
  html.push(renderFieldInput(
    { key: "plan", label: "Plan", type: "select", options: ["", "esencial", "pro", "custom"] },
    deal.plan || ""
  ));

  // Notes (in EDITABLE_COLUMNS for deals but not in the spreadsheet COLS)
  html.push(renderFieldInput({ key: "notes", label: "Notes", type: "textarea" }, deal.notes || ""));

  // Contact info from the linked lead. These fields patch the lead record on
  // save (not the deal), identified by data-lead-field="1".
  if (lead) {
    html.push('<div class="field-group"><h3 class="field-group-title">Contact info</h3>');
    html.push(renderLeadContactField("phone",        "Phone",     lead.phone));
    html.push(renderLeadContactField("whatsapp",     "WhatsApp",  lead.whatsapp));
    html.push(renderLeadContactField("current_site", "Website",   lead.current_site));
    html.push(renderLeadContactField("facebook_url", "Facebook",  lead.facebook_url));
    html.push(renderLeadContactField("instagram",    "Instagram", lead.instagram));
    html.push(renderLeadContactField("tiktok_url",   "TikTok",    lead.tiktok_url));
    html.push('</div>');
  }

  // Proposal block
  html.push(renderProposalBlock(deal));

  return html.join("");
}

// Stamps each new note entry. Local time, not ISO, so it reads naturally to
// whoever opened the card.
function formatNoteStamp(d) {
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
    " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

function renderNotesJournal(lead) {
  const history = lead.notes || "";
  const draftId = "fld-notes_draft";
  // History block: read-only timeline, scrolls when it grows. Pre-wrap so the
  // separator lines and timestamps the user pasted in stay aligned.
  const historyHtml = history
    ? '<div class="notes-history">' + escHtml(history) + "</div>"
    : '<div class="notes-history notes-empty">No notes yet. Add the first one below.</div>';
  const draftHtml = '<textarea id="' + draftId + '" class="ta" data-key="notes_draft" data-type="notes-draft" placeholder="Add a new note. On save it gets timestamped and pinned to the top of the history above."></textarea>';
  return '<div class="field-group">' +
    '<h3 class="field-group-title">Notes</h3>' +
    historyHtml +
    '<div class="field" style="margin-top:0.6rem"><label for="' + draftId + '">New note</label>' + draftHtml + "</div>" +
    "</div>";
}

function renderSocialsBlock(lead) {
  const fields = [
    { key: "current_site", label: "Website",     placeholder: "minegocio.com or https://minegocio.com" },
    { key: "instagram",    label: "Instagram",   placeholder: "@handle or https://instagram.com/..." },
    { key: "facebook_url", label: "Facebook",    placeholder: "Page URL or username" },
    { key: "x_url",        label: "X (Twitter)", placeholder: "@handle or https://x.com/..." },
    { key: "tiktok_url",   label: "TikTok",      placeholder: "@handle or https://tiktok.com/@..." },
  ];
  const items = fields.map((f) => {
    const id = "fld-" + f.key;
    const v = lead[f.key] || "";
    return '<div class="field"><label for="' + id + '">' + escHtml(f.label) + "</label>" +
      '<input type="text" id="' + id + '" data-key="' + f.key + '" data-type="text" value="' + escHtml(v) + '" placeholder="' + escHtml(f.placeholder) + '" />' +
      "</div>";
  }).join("");
  return '<div class="field-group"><h3 class="field-group-title">Web &amp; Socials</h3>' + items + "</div>";
}

function renderProposalBlock(deal) {
  const status = deal.proposal_status || "";
  const gen = deal.proposal_generated_at ? fmtDate(deal.proposal_generated_at) : null;
  let badge = "";
  if (status === "ready")       badge = '<span class="proposal-badge">Ready</span>';
  else if (status === "generating") badge = '<span class="proposal-badge gen">Generating...</span>';
  else if (status === "error")  badge = '<span class="proposal-badge err">Error</span>';
  else                          badge = '<span class="proposal-badge gen" style="background:#E5E7EB;color:#374151;border-color:#D1D5DB">Not generated</span>';

  const links = (status === "ready")
    ? '<a class="proposal-link" target="_blank" href="/admin/proposal/' + escHtml(deal.id) + '">Open proposal</a>' +
      ' &nbsp; <a class="proposal-link" target="_blank" href="/proposal-mockup/' + escHtml(deal.id) + '">Open mockup only</a>'
    : "";

  const btn = '<button type="button" class="ghost" id="btn-gen-proposal" data-deal-id="' + escHtml(deal.id) + '">' +
    (status === "ready" ? "Regenerate proposal" : "Generate proposal") + "</button>";

  return '<div class="field-group">' +
    '<h3 class="field-group-title">Proposal package</h3>' +
    '<div class="field"><label>Status</label><div>' + badge + (gen ? ' &nbsp; <span style="color:var(--ink-soft);font-size:0.8rem">last: ' + escHtml(gen) + "</span>" : "") + "</div></div>" +
    (links ? '<div class="field"><label>Links</label><div>' + links + "</div></div>" : "") +
    '<div class="field"><label>&nbsp;</label><div>' + btn + "</div></div>" +
    "</div>";
}

// Build a select for the Lead funnel stages (Raw .. SQL .. Disqualified). The
// modal for a lead drives lead_stage here; setting Sales Qualified triggers
// auto-promotion to a deal in saveCard.
function renderLeadFunnelStageField(lead) {
  const current = lead.lead_stage || "new";
  const id = "fld-lead_stage";
  const opts = LEAD_FUNNEL_STAGES.map((s) => {
    const sel = current === s.id ? " selected" : "";
    return '<option value="' + s.id + '"' + sel + '>' + escHtml(s.label) + "</option>";
  }).join("");
  return '<div class="field"><label for="' + id + '">Lead stage</label>' +
    '<select id="' + id + '" data-key="lead_stage" data-type="leadstage">' + opts + "</select>" +
    "</div>";
}

function renderFieldInput(c, v) {
  const id = "fld-" + c.key;
  let inner = "";
  if (c.type === "select") {
    inner = '<select id="' + id + '" data-key="' + c.key + '" data-type="' + c.type + '">' +
      c.options.map((opt) => {
        const sel = String(v || "") === opt ? " selected" : "";
        const lbl = opt === "" ? "·" : ((c.optionLabels && c.optionLabels[opt]) || opt);
        return '<option value="' + escHtml(opt) + '"' + sel + '>' + escHtml(lbl) + '</option>';
      }).join("") + "</select>";
  } else if (c.type === "fk") {
    const rows = state.data[c.fk] || [];
    inner = '<select id="' + id + '" data-key="' + c.key + '" data-type="fk">' +
      '<option value="">·</option>' +
      rows.map((r) => {
        const sel = v === r.id ? " selected" : "";
        const label = r.title || r.business_name || r.name || r.email || r.subject || r.id;
        return '<option value="' + escHtml(r.id) + '"' + sel + '>' + escHtml(label) + '</option>';
      }).join("") + "</select>";
  } else if (c.type === "date") {
    inner = '<input type="date" id="' + id + '" data-key="' + c.key + '" data-type="date" value="' + escHtml(dateInputValue(v)) + '" />';
  } else if (c.type === "money") {
    const dollars = (v || v === 0) ? (Number(v) / 100).toString() : "";
    inner = '<input type="number" step="0.01" id="' + id + '" data-key="' + c.key + '" data-type="money" value="' + escHtml(dollars) + '" placeholder="amount in dollars" />';
  } else if (c.type === "int") {
    inner = '<input type="number" step="1" id="' + id + '" data-key="' + c.key + '" data-type="int" value="' + escHtml(v == null ? "" : String(v)) + '" />';
  } else if (c.type === "checkbox") {
    inner = '<input type="checkbox" id="' + id + '" data-key="' + c.key + '" data-type="checkbox"' + (v ? " checked" : "") + " />";
  } else if (c.type === "textarea") {
    // Notes / message / suggested-pitch get a roomy editor so the user can
    // actually compose multi-line content without resizing every time.
    const bigCls = (c.key === "notes" || c.key === "message" || c.key === "suggested_pitch") ? " big" : "";
    inner = '<textarea id="' + id + '" class="ta' + bigCls + '" data-key="' + c.key + '" data-type="textarea">' + escHtml(v || "") + "</textarea>";
  } else {
    inner = '<input type="text" id="' + id + '" data-key="' + c.key + '" data-type="text" value="' + escHtml(v == null ? "" : String(v)) + '" />';
  }
  // The "big" class wraps the whole field too so the label can lean larger.
  const fieldCls = (c.type === "textarea" && (c.key === "notes" || c.key === "message" || c.key === "suggested_pitch")) ? "field field-big" : "field";
  return '<div class="' + fieldCls + '"><label for="' + id + '">' + escHtml(c.label) + "</label>" + inner + "</div>";
}

// Pulls form values back out and PATCHes the row.
async function saveCard(type, id, modalEl) {
  const table = PLURAL[type];
  const fields = modalEl.querySelectorAll("[data-key]");
  const body = {};
  fields.forEach((el) => {
    const key = el.dataset.key;
    const kind = el.dataset.type;
    let val;
    if (kind === "checkbox") val = el.checked ? 1 : 0;
    else val = el.value;
    if (kind === "money" && val !== "") val = Math.round(Number(val) * 100);
    body[key] = val;
  });

  // Notes journal: if the user typed a new note, timestamp it and prepend
  // to the existing notes blob, then drop notes_draft from the body.
  if ("notes_draft" in body) {
    const draft = String(body.notes_draft || "").trim();
    delete body.notes_draft;
    if (draft) {
      const existing = type === "lead"
        ? ((state.data.leads.find((r) => r.id === id) || {}).notes || "")
        : "";
      const stamp = formatNoteStamp(new Date());
      const entry = "[" + stamp + "]\\n" + draft;
      body.notes = existing ? (entry + "\\n\\n---\\n\\n" + existing) : entry;
    }
  }

  // Lead funnel promotion: setting lead_stage to "sales_qualified" creates a
  // matching deal at "qualifying" and also flips legacy status='converted' so
  // the existing portal plumbing recognizes the conversion.
  if (type === "lead" && "lead_stage" in body) {
    const newStage = body.lead_stage;
    const lead = state.data.leads.find((r) => r.id === id);
    const wasStage = lead && lead.lead_stage;

    if (newStage === "sales_qualified") body.status = "converted";
    else if (newStage === "disqualified") body.status = "dismissed";
    else if (newStage === "contacted") body.status = "contacted";

    try {
      const res = await api("/api/admin/crm/leads/" + id, { method: "PATCH", body: JSON.stringify(body) });
      replaceRow("leads", id, res.row);

      if (newStage === "sales_qualified" && wasStage !== "sales_qualified") {
        const lr = res.row;
        const dealPayload = {
          title: lr.business_name || lr.name || lr.email || "Untitled deal",
          lead_id: lr.id,
          stage: "qualifying",
          plan: lr.plan || null,
          owner: "santi",
        };
        const created = await api("/api/admin/crm/deals", { method: "POST", body: JSON.stringify(dealPayload) });
        state.data.deals.unshift(created.row);
        state.counts.deals = (state.counts.deals || 0) + 1;
      }

      rebuildLookups();
      if (state.active === "funnel") renderFunnel();
      else if (state.active === "leadfunnel") renderLeadFunnel();
      else renderGrid();
      closeCard();
      toast(newStage === "sales_qualified" && wasStage !== "sales_qualified" ? "Promoted to prospect funnel" : "Saved");
    } catch (e) { toast(e.message, true); }
    return;
  }

  // Deal stage moved to "proposal": auto-advance linked lead to SQL, and ask
  // whether to generate the proposal package.
  let shouldGenerateProposal = false;
  if (type === "deal" && "stage" in body && body.stage === "proposal") {
    const deal = state.data.deals.find((d) => d.id === id);
    const wasStage = deal && deal.stage;
    if (wasStage !== "proposal" && deal && deal.lead_id) {
      const linkedLead = state.lookups.leadById.get(deal.lead_id);
      if (linkedLead && linkedLead.lead_stage !== "sales_qualified") {
        try {
          const lr = await api("/api/admin/crm/leads/" + deal.lead_id, {
            method: "PATCH", body: JSON.stringify({ lead_stage: "sales_qualified", status: "converted" }),
          });
          replaceRow("leads", deal.lead_id, lr.row);
          rebuildLookups();
        } catch (_) {}
      }
    }
    if (wasStage !== "proposal") {
      shouldGenerateProposal = confirm(
        "This deal moved to Proposal stage.\\n\\nGenerate a custom mockup + proposal package now?\\n\\n(Uses the linked lead's social URLs and notes. Takes ~30 to 60 seconds. Click OK to generate, Cancel to skip.)"
      );
    }
  }

  // For deal cards: route any lead-tagged contact-info fields to the linked
  // lead record, and strip them from the deal body so the deal endpoint
  // doesn't receive columns it doesn't own.
  if (type === "deal") {
    const leadFieldEls = Array.from(modalEl.querySelectorAll("[data-key][data-lead-field]"));
    if (leadFieldEls.length > 0) {
      const deal = state.data.deals.find((d) => d.id === id);
      const leadId = deal && deal.lead_id;
      if (leadId) {
        const leadBody = {};
        leadFieldEls.forEach((el) => { leadBody[el.dataset.key] = el.value; });
        Object.keys(leadBody).forEach((k) => delete body[k]);
        try {
          const lr = await api("/api/admin/crm/leads/" + leadId, { method: "PATCH", body: JSON.stringify(leadBody) });
          replaceRow("leads", leadId, lr.row);
          rebuildLookups();
        } catch (_) { /* non-fatal: deal save still proceeds */ }
      }
    }
  }

  try {
    const res = await api("/api/admin/crm/" + table + "/" + id, { method: "PATCH", body: JSON.stringify(body) });
    replaceRow(table, id, res.row);
    rebuildLookups();
    if (state.active === "funnel") renderFunnel(); else renderGrid();
    closeCard();
    toast("Saved");
    if (shouldGenerateProposal) generateProposalFor(id, { fromButton: false });
  } catch (e) { toast(e.message, true); }
}

// Fires the proposal generator endpoint. Marks the deal as generating in
// local state so the UI reflects the in-flight status, then polls the
// returned row back into state when the call resolves.
async function generateProposalFor(dealId, opts) {
  opts = opts || {};
  // Local-state update so cards re-render with "Generating..." pill.
  const deal = state.data.deals.find((d) => d.id === dealId);
  if (deal) deal.proposal_status = "generating";
  if (state.active === "funnel") renderFunnel(); else renderGrid();
  toast(opts.fromButton ? "Generating proposal..." : "Stage saved · generating proposal");

  try {
    const res = await api("/api/admin/proposals/" + dealId + "/generate", { method: "POST", body: "{}" });
    if (res && res.deal) replaceRow("deals", dealId, res.deal);
    rebuildLookups();
    if (state.active === "funnel") renderFunnel(); else renderGrid();
    // Quick confirmation with a link the user can copy.
    toast("Proposal ready · /admin/proposal/" + dealId);
    try { window.open(pwpBase() + "/admin/proposal/" + dealId, "_blank", "noopener"); } catch (e) {}
  } catch (e) {
    if (deal) deal.proposal_status = "error";
    if (state.active === "funnel") renderFunnel(); else renderGrid();
    toast("Proposal failed: " + e.message, true);
  }
}

async function deleteCard(type, id) {
  if (!confirm("Delete this " + type + "? This cannot be undone.")) return;
  const table = PLURAL[type];
  try {
    await api("/api/admin/crm/" + table + "/" + id, { method: "DELETE" });
    state.data[table] = state.data[table].filter((r) => r.id !== id);
    state.counts[table] = Math.max(0, (state.counts[table] || 1) - 1);
    rebuildLookups();
    closeCard();
    if (state.active === "funnel") renderFunnel(); else renderGrid();
    toast("Deleted");
  } catch (e) { toast(e.message, true); }
}

// ---- Related activities -----------------------------------------------------

function renderRelatedActivities(type, id) {
  const key = type + "_id"; // lead_id | deal_id | client_id
  const rows = state.data.activities
    .filter((a) => a[key] === id)
    .sort((a, b) => (b.occurred_at || b.created_at || 0) - (a.occurred_at || a.created_at || 0))
    .slice(0, 8);

  const list = rows.length
    ? rows.map((a) => {
        const when = fmtDate(a.occurred_at || a.created_at);
        return '<div class="act">' +
          '<div class="when"><span>' + escHtml(when) + '</span><span class="type-pill" style="font-size:0.6rem">' + escHtml(a.kind || "") + "</span>" + (a.owner ? " · " + escHtml(a.owner) : "") + "</div>" +
          '<div class="body"><b>' + escHtml(a.subject || "") + "</b>" + (a.body ? "  " + escHtml(a.body) : "") + "</div>" +
        "</div>";
      }).join("")
    : '<div class="none">No activities yet.</div>';

  return '<h3>Recent activity <button data-act="add-activity">+ Add activity</button></h3>' + list;
}

async function addActivityFor(type, entityId) {
  const subject = prompt("What happened? (subject)");
  if (!subject) return;
  const kind = (prompt("Kind: call, whatsapp, email, meeting, note, task", "note") || "note").toLowerCase();
  const body = {
    kind, subject,
    owner: "santi",
    occurred_at: Date.now(),
  };
  body[type + "_id"] = entityId;
  try {
    const res = await api("/api/admin/crm/activities", { method: "POST", body: JSON.stringify(body) });
    state.data.activities.unshift(res.row);
    state.counts.activities = (state.counts.activities || 0) + 1;

    // Update last_touched_at on the linked lead so the Kanban contact status
    // reflects the activity. For deal-type activities, resolve the linked lead.
    const leadId = type === "lead" ? entityId
      : type === "deal" ? (state.data.deals.find((d) => d.id === entityId) || {}).lead_id
      : null;
    if (leadId) {
      const lead = state.lookups.leadById.get(leadId);
      const leadPatch = { last_touched_at: Date.now(), last_touched_kind: kind,
        touches_count: (Number(lead && lead.touches_count) || 0) + 1 };
      if (lead && (lead.lead_stage || "new") === "new") {
        leadPatch.lead_stage = "contacted";
        leadPatch.status = "contacted";
      }
      try {
        const lr = await api("/api/admin/crm/leads/" + leadId, { method: "PATCH", body: JSON.stringify(leadPatch) });
        replaceRow("leads", leadId, lr.row);
        rebuildLookups();
      } catch (_) {}
    }

    // Re-render the modal in place so the new activity appears.
    const modal = document.getElementById("card-modal");
    if (modal) {
      const acts = modal.querySelector(".modal-activities");
      if (acts) acts.innerHTML = renderRelatedActivities(type, entityId);
      const addBtn = modal.querySelector('button[data-act="add-activity"]');
      if (addBtn) addBtn.onclick = () => addActivityFor(type, entityId);
    }
    if (state.active === "funnel") renderFunnel();
    else if (state.active === "leadfunnel") renderLeadFunnel();
    toast("Activity added");
  } catch (e) { toast(e.message, true); }
}

function renderRow(table, cols, r) {
  const tds = cols.map((c) => {
    const v = r[c.key];
    const display = formatCell(c, v, table);
    const editable = c.readonly ? "" : ' data-editable="1"';
    return '<td data-id="' + r.id + '" data-col="' + c.key + '"' + editable + '><div class="cell">' + display + "</div></td>";
  }).join("");
  return "<tr>" + tds + '<td class="actions"><button data-del="' + r.id + '" title="Delete row">🗑️</button></td></tr>';
}

function formatCell(c, v, table) {
  if (v === null || v === undefined || v === "") return '<span style="color:var(--ink-soft)">·</span>';
  if (c.pill) return c.pill(v);
  if (c.type === "date") return escHtml(fmtDate(v));
  if (c.type === "money") return escHtml(fmtMoney(v, "CAD"));
  if (c.type === "checkbox") return v ? "✓" : "";
  if (c.type === "fk") {
    const map = c.fk === "leads" ? state.lookups.leadById : c.fk === "clients" ? state.lookups.clientById : state.lookups.dealById;
    const row = map.get(v);
    if (!row) return '<span class="row-id">' + escHtml(String(v).slice(0,8)) + "</span>";
    const label = row.title || row.business_name || row.name || row.email || row.subject || row.id;
    return escHtml(label);
  }
  if (c.type === "textarea") {
    const s = String(v);
    return escHtml(s.length > 80 ? s.slice(0,80) + "…" : s);
  }
  return escHtml(String(v));
}

// ----------- editing -----------
function onCellClick(e) {
  const td = e.currentTarget;
  if (!td.dataset.editable) return;
  if (td.querySelector(".edit")) return; // editor already open · let it handle clicks
  const id = td.dataset.id;
  const col = td.dataset.col;
  const colDef = COLS[state.active].find((c) => c.key === col);
  const row = state.data[state.active].find((r) => r.id === id);
  if (!colDef || !row) return;

  if (colDef.type === "checkbox") {
    save(state.active, id, col, row[col] ? 0 : 1);
    return;
  }

  const cur = row[col];
  let input;
  if (colDef.type === "select") {
    input = document.createElement("select");
    input.className = "edit";
    colDef.options.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt; o.textContent = opt === "" ? "·" : ((colDef.optionLabels && colDef.optionLabels[opt]) || opt);
      if (String(cur || "") === opt) o.selected = true;
      input.appendChild(o);
    });
  } else if (colDef.type === "fk") {
    input = document.createElement("select");
    input.className = "edit";
    const rows = state.data[colDef.fk] || [];
    const blank = document.createElement("option"); blank.value = ""; blank.textContent = "·"; input.appendChild(blank);
    rows.forEach((r) => {
      const o = document.createElement("option");
      o.value = r.id;
      o.textContent = (r.title || r.business_name || r.name || r.email || r.subject || r.id);
      if (cur === r.id) o.selected = true;
      input.appendChild(o);
    });
  } else if (colDef.type === "date") {
    input = document.createElement("input");
    input.type = "date"; input.className = "edit"; input.value = dateInputValue(cur);
  } else if (colDef.type === "textarea") {
    input = document.createElement("textarea");
    input.className = "edit"; input.value = cur || "";
  } else if (colDef.type === "money") {
    input = document.createElement("input");
    input.type = "number"; input.className = "edit"; input.placeholder = "amount in dollars";
    input.value = (cur || cur === 0) ? (Number(cur)/100).toString() : "";
  } else if (colDef.type === "int") {
    input = document.createElement("input");
    input.type = "number"; input.className = "edit"; input.value = (cur ?? "");
  } else {
    input = document.createElement("input");
    input.type = "text"; input.className = "edit"; input.value = cur || "";
  }

  const cell = td.querySelector(".cell");
  cell.innerHTML = "";
  cell.appendChild(input);
  input.focus();
  if (input.select) try { input.select(); } catch {}

  let done = false;
  function commit() {
    if (done) return; done = true;
    let val = input.value;
    if (colDef.type === "money" && val !== "") val = Math.round(Number(val) * 100);
    save(state.active, id, col, val);
  }
  function cancel() { if (done) return; done = true; renderGrid(); }

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && colDef.type !== "textarea") { e.preventDefault(); commit(); }
    else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
    else if (e.key === "Escape") { e.preventDefault(); cancel(); }
  });
}

async function save(table, id, col, val) {
  try {
    const body = {}; body[col] = val;
    const res = await api("/api/admin/crm/" + table + "/" + id, { method: "PATCH", body: JSON.stringify(body) });
    // splice updated row
    const idx = state.data[table].findIndex((r) => r.id === id);
    if (idx >= 0 && res.row) state.data[table][idx] = res.row;
    rebuildLookups();
    renderGrid();
    toast("Saved");
  } catch (e) { toast(e.message, true); renderGrid(); }
}

// ----------- add / delete -----------
async function addRow() {
  const t = state.active;
  // Lead funnel adds into the leads table.
  const targetTable = t === "leadfunnel" ? "leads" : t;
  const defaults = {
    leads: { source: "manual", status: "new", language: "en", lead_stage: "new", touches_count: 0 },
    clients: { email: "new-" + Date.now() + "@example.com", status: "invited", language: "en" },
    deals: { title: "Untitled deal", stage: "qualifying", owner: "santi" },
    activities: { kind: "note", subject: "(new)", owner: "santi", occurred_at: Date.now() },
  }[targetTable] || {};
  try {
    const res = await api("/api/admin/crm/" + targetTable, { method: "POST", body: JSON.stringify(defaults) });
    state.data[targetTable].unshift(res.row);
    state.counts[targetTable] = (state.counts[targetTable] || 0) + 1;
    rebuildLookups();
    render();
    toast("Created");
  } catch (e) { toast(e.message, true); }
}

async function deleteRow(table, id) {
  if (!confirm("Delete this row? This cannot be undone.")) return;
  try {
    await api("/api/admin/crm/" + table + "/" + id, { method: "DELETE" });
    state.data[table] = state.data[table].filter((r) => r.id !== id);
    state.counts[table] = (state.counts[table] || 1) - 1;
    rebuildLookups();
    render();
    toast("Deleted");
  } catch (e) { toast(e.message, true); }
}

// ----------- export -----------
function exportCsv() {
  const t = state.active;
  const cols = t === "leadfunnel" ? LEAD_FUNNEL_COLS : COLS[t];
  if (!cols) return;
  const sourceTable = t === "leadfunnel" ? "leads" : t;
  const data = state.data[sourceTable] || [];
  const header = cols.map((c) => c.label);
  const rows = data.map((r) => cols.map((c) => csvCell(r[c.key], c)));
  const csv = [header].concat(rows).map((r) => r.map(csvEscape).join(",")).join("\\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pymewebpro-" + t + "-" + new Date().toISOString().slice(0,10) + ".csv";
  a.click();
}
function csvCell(v, c) {
  if (v === null || v === undefined) return "";
  if (c.type === "date") return v ? new Date(Number(v)).toISOString() : "";
  if (c.type === "money") return v ? (Number(v)/100).toFixed(2) : "";
  return String(v);
}
function csvEscape(s) {
  s = String(s);
  if (s.includes('"') || s.includes(",") || s.includes("\\n")) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// ----------- boot -----------
window.addEventListener("hashchange", () => {
  const h = location.hash.replace("#","");
  if (TABLES.includes(h)) { state.active = h; render(); }
});

// Esc clears any kanban selection (but only if the modal isn't open · the
// modal has its own Esc handler that takes precedence).
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (document.getElementById("card-modal")) return;
  if (state.selected.size > 0) clearSelection();
});

if (state.authed) loadAll(); else render();
</script>
</body>
</html>`;
}
