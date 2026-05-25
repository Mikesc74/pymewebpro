// src/backups.js
// ============================================================================
// Managed client backups for PymeWebPro.
// ----------------------------------------------------------------------------
// A backup is one .zip per client containing:
//   /site/...        every published file of the client's live site (the R2
//                    objects under live_sites.r2_prefix, i.e. live/<clientId>/)
//   /uploads/<cat>/  the original assets the client sent us (the `files` table)
//   manifest.json    slug, business, date, per-file size + SHA-256
//   RESTORE.md       plain-language restore notes (Spanish)
//
// Zips are stored in the BACKUPS R2 bucket (`pymewebpro-backups`) and indexed
// in the `backups` D1 table (migration 0012). The studio admin lists + downloads
// them from the client detail page so Mike/Santi can hand any client their file.
//
// Triggers: weekly cron (Sundays), monthly (1st), snapshot-on-publish, and a
// manual "Backup now" button. Retention is per client per kind (see KEEP).
//
// No external deps. The .zip is built in-worker with a tiny PKZIP writer that
// uses the platform CompressionStream('deflate-raw') for compression and a
// hand-rolled CRC-32. Falls back to STORE (no compression) if a chunk does not
// shrink or CompressionStream is unavailable.
// ============================================================================

// Per-client, per-kind retention. Older copies beyond these counts are pruned.
const KEEP = { weekly: 12, monthly: 6, publish: 12, manual: 20 };

// ─── HTTP handler ───────────────────────────────────────────────────────────
// Routes (path already stripped of the /portal/pymewebpro master-portal mount):
//   GET    /api/admin/backups                  · list (optional ?client_id=)
//   POST   /api/admin/backups/:clientId        · create a backup now
//   GET    /api/admin/backups/:id/download      · stream the .zip (accepts
//                                                 ?admin_token= for <a> links)
//   DELETE /api/admin/backups/:id               · delete one backup
export async function handleBackups(request, env, ctx, helpers) {
  const { json, isAdmin } = helpers;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Admin gate. Header bearer / Access identity, OR ?admin_token= for browser
  // <a href> downloads (same pattern as /api/files/:id).
  let admin = isAdmin(request, env);
  if (!admin && env.ADMIN_TOKEN && url.searchParams.get("admin_token") === env.ADMIN_TOKEN) admin = true;
  if (!admin) return json({ error: "Admin authentication required" }, 401);

  if (!env.BACKUPS) {
    return json({ error: "Backups bucket not configured. Create the pymewebpro-backups R2 bucket and bind it as BACKUPS." }, 503);
  }

  if (path === "/api/admin/backups" && method === "GET") {
    return await listBackups(env, url, json);
  }

  let m;
  if ((m = path.match(/^\/api\/admin\/backups\/([^/]+)\/download$/)) && method === "GET") {
    return await downloadBackup(env, m[1]);
  }
  if ((m = path.match(/^\/api\/admin\/backups\/([^/]+)$/)) && method === "POST") {
    try {
      const row = await createBackup(env, m[1], "manual");
      return json({ backup: row });
    } catch (e) {
      return json({ error: (e && e.message) || "backup_failed" }, 400);
    }
  }
  if ((m = path.match(/^\/api\/admin\/backups\/([^/]+)$/)) && method === "DELETE") {
    return await deleteBackup(env, m[1], json);
  }

  return json({ error: "Not found" }, 404);
}

async function listBackups(env, url, json) {
  const clientId = url.searchParams.get("client_id");
  let rows;
  if (clientId) {
    rows = await env.DB.prepare(
      "SELECT * FROM backups WHERE client_id = ? ORDER BY created_at DESC LIMIT 200"
    ).bind(clientId).all();
  } else {
    rows = await env.DB.prepare(
      "SELECT b.*, c.business_name FROM backups b LEFT JOIN clients c ON c.id = b.client_id ORDER BY b.created_at DESC LIMIT 500"
    ).all();
  }
  return json({ backups: rows.results || [] });
}

async function downloadBackup(env, id) {
  const row = await env.DB.prepare("SELECT r2_key, filename FROM backups WHERE id = ?").bind(id).first();
  if (!row) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
  const obj = await env.BACKUPS.get(row.r2_key);
  if (!obj) return new Response("Backup file missing", { status: 410, headers: { "content-type": "text/plain" } });
  return new Response(obj.body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="' + (row.filename || "backup.zip").replace(/"/g, "") + '"',
      "Cache-Control": "no-store",
    },
  });
}

async function deleteBackup(env, id, json) {
  const row = await env.DB.prepare("SELECT r2_key FROM backups WHERE id = ?").bind(id).first();
  if (!row) return json({ error: "Not found" }, 404);
  try { await env.BACKUPS.delete(row.r2_key); } catch (e) {}
  await env.DB.prepare("DELETE FROM backups WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

// ─── Core: build one backup for a client ─────────────────────────────────────
export async function createBackup(env, clientId, kind = "manual") {
  if (!env.BACKUPS) throw new Error("backups_bucket_unbound");
  const client = await env.DB.prepare(
    "SELECT id, business_name, email FROM clients WHERE id = ?"
  ).bind(clientId).first();
  if (!client) throw new Error("client_not_found");

  const live = await env.DB.prepare(
    "SELECT slug, r2_prefix, custom_domain FROM live_sites WHERE client_id = ?"
  ).bind(clientId).first();

  const entries = [];
  const fileManifest = [];

  // 1) Live, published site files (HTML + assets) under live/<clientId>/.
  if (live && live.r2_prefix) {
    const keys = await listR2Prefix(env.ASSETS, live.r2_prefix);
    for (const key of keys) {
      const obj = await env.ASSETS.get(key);
      if (!obj) continue;
      const data = new Uint8Array(await obj.arrayBuffer());
      const rel = "site/" + key.slice(live.r2_prefix.length);
      entries.push({ name: rel, data });
      fileManifest.push({ path: rel, size: data.length, sha256: await sha256Hex(data) });
    }
  }

  // 2) Original assets the client uploaded (logo, photos, references).
  const upRows = await env.DB.prepare(
    "SELECT category, filename, r2_key FROM files WHERE client_id = ?"
  ).bind(clientId).all();
  const seen = new Set();
  for (const f of (upRows.results || [])) {
    if (!f.r2_key) continue;
    const obj = await env.ASSETS.get(f.r2_key);
    if (!obj) continue;
    const data = new Uint8Array(await obj.arrayBuffer());
    const base = (f.filename || f.r2_key.split("/").pop() || "file").replace(/[\\/]/g, "_");
    let rel = "uploads/" + (f.category || "other") + "/" + base;
    let n = 1;
    while (seen.has(rel)) { rel = "uploads/" + (f.category || "other") + "/" + n + "-" + base; n++; }
    seen.add(rel);
    entries.push({ name: rel, data });
    fileManifest.push({ path: rel, size: data.length, sha256: await sha256Hex(data) });
  }

  const createdAt = Date.now();
  const liveUrl = live
    ? (live.custom_domain ? "https://" + live.custom_domain + "/" : "https://" + live.slug + ".sites.pymewebpro.com/")
    : null;

  const manifest = {
    product: "PymeWebPro managed backup",
    business_name: client.business_name || null,
    client_id: clientId,
    slug: live ? live.slug : null,
    live_url: liveUrl,
    kind,
    created_at: new Date(createdAt).toISOString(),
    file_count: fileManifest.length,
    total_bytes: fileManifest.reduce((a, b) => a + b.size, 0),
    files: fileManifest,
  };
  const enc = new TextEncoder();
  entries.push({ name: "manifest.json", data: enc.encode(JSON.stringify(manifest, null, 2)) });
  entries.push({ name: "RESTORE.md", data: enc.encode(restoreDoc(env, client, liveUrl, createdAt)) });

  const zip = await buildZip(entries);
  const zipSha = await sha256Hex(zip);
  const slugPart = (live && live.slug) ? live.slug : ("client-" + clientId.slice(0, 8));
  const downloadName = slugPart + "-backup-" + ymd(createdAt) + ".zip";
  const r2Key = "clients/" + clientId + "/" + createdAt + "-" + kind + ".zip";

  await env.BACKUPS.put(r2Key, zip, {
    httpMetadata: { contentType: "application/zip" },
    customMetadata: { client_id: clientId, kind, sha256: zipSha },
  });

  const id = crypto.randomUUID();
  // "empty" = no real site/upload files captured (only manifest + restore note).
  const status = fileManifest.length > 0 ? "complete" : "empty";
  await env.DB.prepare(
    "INSERT INTO backups (id, client_id, slug, kind, r2_key, filename, size_bytes, file_count, sha256, status, created_at) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    id, clientId, live ? live.slug : null, kind, r2Key, downloadName,
    zip.length, fileManifest.length, zipSha, status, createdAt
  ).run();

  return {
    id, client_id: clientId, slug: live ? live.slug : null, kind, r2_key: r2Key,
    filename: downloadName, size_bytes: zip.length, file_count: fileManifest.length,
    sha256: zipSha, status, created_at: createdAt,
  };
}

// ─── Scheduled run (called from the worker cron) ─────────────────────────────
// The portal cron is daily at 14:00 UTC (09:00 Bogota). We back up weekly on
// Sundays and monthly on the 1st, then prune. Prune runs every day so retention
// stays tidy even on non-backup days.
export async function runScheduledBackups(env) {
  const result = { weekly: 0, monthly: 0, errors: 0, pruned: 0, ran: false };
  if (!env.BACKUPS) return result;

  // Bogota local date components (UTC-5, no DST).
  const local = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const dow = local.getUTCDay();   // 0 = Sunday
  const dom = local.getUTCDate();  // 1..31
  const doWeekly = dow === 0;
  const doMonthly = dom === 1;

  if (doWeekly || doMonthly) {
    result.ran = true;
    const sites = await env.DB.prepare(
      "SELECT client_id FROM live_sites WHERE r2_prefix IS NOT NULL AND r2_prefix != '' AND disabled_at IS NULL"
    ).all();
    for (const s of (sites.results || [])) {
      if (doWeekly) {
        try { await createBackup(env, s.client_id, "weekly"); result.weekly++; }
        catch (e) { result.errors++; console.error("weekly backup failed " + s.client_id + ": " + (e && e.message || e)); }
      }
      if (doMonthly) {
        try { await createBackup(env, s.client_id, "monthly"); result.monthly++; }
        catch (e) { result.errors++; console.error("monthly backup failed " + s.client_id + ": " + (e && e.message || e)); }
      }
    }
  }

  result.pruned = await pruneBackups(env);
  return result;
}

async function pruneBackups(env) {
  let deleted = 0;
  const clients = await env.DB.prepare("SELECT DISTINCT client_id FROM backups").all();
  for (const c of (clients.results || [])) {
    for (const kind of Object.keys(KEEP)) {
      const rows = await env.DB.prepare(
        "SELECT id, r2_key FROM backups WHERE client_id = ? AND kind = ? ORDER BY created_at DESC"
      ).bind(c.client_id, kind).all();
      const all = rows.results || [];
      for (const r of all.slice(KEEP[kind])) {
        try { await env.BACKUPS.delete(r.r2_key); } catch (e) {}
        await env.DB.prepare("DELETE FROM backups WHERE id = ?").bind(r.id).run();
        deleted++;
      }
    }
  }
  return deleted;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function listR2Prefix(bucket, prefix) {
  const out = [];
  let cursor;
  do {
    const res = await bucket.list({ prefix, cursor, limit: 1000 });
    for (const o of res.objects) out.push(o.key);
    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);
  return out;
}

async function sha256Hex(u8) {
  const h = await crypto.subtle.digest("SHA-256", u8);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function ymd(ms) {
  const d = new Date(ms - 5 * 60 * 60 * 1000); // Bogota date in the filename
  const p = (n) => String(n).padStart(2, "0");
  return d.getUTCFullYear() + "-" + p(d.getUTCMonth() + 1) + "-" + p(d.getUTCDate());
}

function restoreDoc(env, client, liveUrl, createdAt) {
  const wa = (env && env.WHATSAPP_NUMBER) ? env.WHATSAPP_NUMBER : "+573014047722";
  const fecha = new Date(createdAt).toISOString().slice(0, 10);
  return [
    "# Respaldo de tu sitio web · PymeWebPro",
    "",
    "Fecha del respaldo: " + fecha,
    "Negocio: " + (client.business_name || client.email || ""),
    liveUrl ? ("Sitio: " + liveUrl) : "",
    "",
    "Este archivo .zip es una copia completa de tu sitio web en la fecha indicada.",
    "",
    "## Contenido",
    "",
    "- /site : todos los archivos publicados de tu sitio (HTML, imagenes, recursos).",
    "- /uploads : los archivos originales que nos enviaste (logo, fotos, referencias).",
    "- manifest.json : lista de cada archivo con su tamano y firma SHA-256.",
    "",
    "## Como restaurar",
    "",
    "1. Escribenos y con gusto lo restauramos por ti, normalmente el mismo dia.",
    "2. Si prefieres hacerlo por tu cuenta, los archivos de la carpeta /site se pueden",
    "   publicar en cualquier hosting estatico (Cloudflare Pages, Netlify, etc.).",
    "   El archivo /site/index.html es la pagina principal.",
    "",
    "## Contacto",
    "",
    "WhatsApp: " + wa,
    "Web: pymewebpro.com",
    "",
  ].join("\n");
}

// ─── Minimal PKZIP writer (deflate-raw + STORE fallback) ─────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(u8) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

async function deflateRaw(u8) {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const cs = new CompressionStream("deflate-raw");
    const writer = cs.writable.getWriter();
    writer.write(u8);
    writer.close();
    const ab = await new Response(cs.readable).arrayBuffer();
    return new Uint8Array(ab);
  } catch (e) {
    return null;
  }
}

async function buildZip(entries) {
  const enc = new TextEncoder();
  const chunks = [];   // local headers + data, in order
  const central = [];  // central directory headers
  let offset = 0;

  const now = new Date();
  const dosTime = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | ((Math.floor(now.getSeconds() / 2)) & 0x1f);
  const dosDate = (((now.getFullYear() - 1980) & 0x7f) << 9) | (((now.getMonth() + 1) & 0xf) << 5) | (now.getDate() & 0x1f);

  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const data = e.data;
    const crc = crc32(data);

    let method = 0;
    let comp = data;
    const def = await deflateRaw(data);
    if (def && def.length < data.length) { method = 8; comp = def; }

    const lh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 filename
    lv.setUint16(8, method, true);
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, comp.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    lh.set(nameBytes, 30);
    chunks.push(lh, comp);

    const ch = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, method, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, comp.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);  // extra len
    cv.setUint16(32, 0, true);  // comment len
    cv.setUint16(34, 0, true);  // disk number start
    cv.setUint16(36, 0, true);  // internal attrs
    cv.setUint32(38, 0, true);  // external attrs
    cv.setUint32(42, offset, true); // local header offset
    ch.set(nameBytes, 46);
    central.push(ch);

    offset += lh.length + comp.length;
  }

  const cdStart = offset;
  let cdSize = 0;
  for (const c of central) { chunks.push(c); cdSize += c.length; }

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, central.length, true);
  ev.setUint16(10, central.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdStart, true);
  ev.setUint16(20, 0, true);
  chunks.push(eocd);

  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}
