// Lead enrichment via Claude Haiku 4.5 + the Anthropic web_search tool.
// For each lead with missing contact channels, the model searches the web for
// the business name + city and returns whatever it can verify · phone, WA,
// email, Instagram, Facebook URL, website. Findings are written to D1 and
// every successful enrichment logs an "enrichment" activity row.
//
// Mounted by src/index.js at /api/admin/enrich/*.
// Requires env.ANTHROPIC_API_KEY (worker secret) and env.TOKENS (KV namespace).

const MODEL = "claude-haiku-4-5-20251001";
const DAILY_CAP = 500;            // hard ceiling per UTC day
const MAX_LEADS_PER_REQUEST = 25; // soft limit so a single Worker invocation finishes within CPU time

export async function handleEnrich(request, env, ctx, helpers) {
  const { json, isAdmin } = helpers;
  if (!isAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY not set on worker" }, 500);

  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/admin/enrich/status" && request.method === "GET") {
    return await getStatus(env, json);
  }
  if (path === "/api/admin/enrich/preview" && request.method === "POST") {
    return await previewOne(request, env, json);
  }
  if (path === "/api/admin/enrich/run" && request.method === "POST") {
    return await runBatch(request, env, json);
  }
  if (path === "/api/admin/enrich/priority" && request.method === "POST") {
    return await runPriority(request, env, json);
  }
  return json({ error: "Not found" }, 404);
}

// ---- Status ---------------------------------------------------------------

async function getStatus(env, json) {
  const today = new Date().toISOString().slice(0, 10);
  const used = parseInt((await env.TOKENS.get("enrich:count:" + today)) || "0", 10);

  // How many leads still need enrichment (priority bucket: not SQL, not
  // disqualified, missing phone/WA/email/instagram).
  const totals = await env.DB.prepare(
    "SELECT UPPER(heat) AS heat, COUNT(*) AS n FROM leads " +
    "WHERE lead_stage NOT IN ('sales_qualified','disqualified') " +
    "  AND (phone IS NULL OR phone='') " +
    "  AND (whatsapp IS NULL OR whatsapp='') " +
    "  AND (email IS NULL OR email='') " +
    "  AND (instagram IS NULL OR instagram='') " +
    "GROUP BY heat ORDER BY n DESC"
  ).all();

  return json({
    ok: true,
    today,
    used_today: used,
    daily_cap: DAILY_CAP,
    remaining_today: Math.max(0, DAILY_CAP - used),
    needing_enrichment_by_heat: totals.results || [],
  });
}

// ---- Preview one (no write) ----------------------------------------------

async function previewOne(request, env, json) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const id = body.id;
  if (!id) return json({ error: "Missing id" }, 400);
  try {
    const r = await enrichLead(env, id, { dryRun: true });
    return json({ ok: true, result: r });
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e) }, 500);
  }
}

// ---- Batch run by explicit ID list ---------------------------------------

async function runBatch(request, env, json) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const ids = Array.isArray(body.ids) ? body.ids.slice(0, MAX_LEADS_PER_REQUEST) : [];
  if (!ids.length) return json({ error: "Send { ids: [...] }" }, 400);
  return await processIds(env, ids, json);
}

// ---- Auto-pick top priority leads ----------------------------------------

async function runPriority(request, env, json) {
  let body = {};
  try { body = await request.json(); } catch {}
  const limit = Math.min(parseInt(body.limit, 10) || MAX_LEADS_PER_REQUEST, MAX_LEADS_PER_REQUEST);

  const rows = await env.DB.prepare(
    "SELECT id FROM leads " +
    "WHERE lead_stage NOT IN ('sales_qualified','disqualified') " +
    "  AND (phone IS NULL OR phone='') " +
    "  AND (whatsapp IS NULL OR whatsapp='') " +
    "  AND (email IS NULL OR email='') " +
    "  AND (instagram IS NULL OR instagram='') " +
    "ORDER BY " +
    "  CASE UPPER(heat) WHEN 'HOT' THEN 1 WHEN 'DEAD' THEN 2 WHEN 'WARM' THEN 3 WHEN 'COOL' THEN 4 WHEN 'COLD' THEN 5 ELSE 6 END, " +
    "  on_today_list DESC, score DESC " +
    "LIMIT ?"
  ).bind(limit).all();

  const ids = (rows.results || []).map((r) => r.id);
  if (!ids.length) return json({ ok: true, message: "Nothing left to enrich · everyone has a contact channel.", count: 0 });
  return await processIds(env, ids, json);
}

// ---- Common processing loop ----------------------------------------------

async function processIds(env, ids, json) {
  const today = new Date().toISOString().slice(0, 10);
  const usedRaw = await env.TOKENS.get("enrich:count:" + today);
  let used = parseInt(usedRaw || "0", 10);
  if (used >= DAILY_CAP) {
    return json({ error: "Daily cap reached", used, cap: DAILY_CAP }, 429);
  }

  const results = [];
  for (const id of ids) {
    if (used + results.length >= DAILY_CAP) break;
    try {
      const r = await enrichLead(env, id);
      results.push({ id, ok: true, ...r });
    } catch (e) {
      results.push({ id, ok: false, error: String(e && e.message || e) });
    }
  }

  // Bump the daily counter. Two-day TTL so end-of-day overlaps don't leak.
  await env.TOKENS.put("enrich:count:" + today, String(used + results.length), { expirationTtl: 172800 });

  const summary = {
    total: results.length,
    filled: results.filter((r) => r.ok && r.filled && r.filled.length).length,
    skipped: results.filter((r) => r.ok && r.skipped).length,
    failed: results.filter((r) => !r.ok).length,
  };
  return json({ ok: true, used_today: used + results.length, daily_cap: DAILY_CAP, summary, results });
}

// ---- The actual enrichment call ------------------------------------------

async function enrichLead(env, leadId, opts) {
  const dryRun = !!(opts && opts.dryRun);
  const lead = await env.DB.prepare(
    "SELECT id, business_name, city, category, current_site, email, phone, whatsapp, " +
    "       instagram, facebook_url, x_url, tiktok_url " +
    "  FROM leads WHERE id = ?"
  ).bind(leadId).first();
  if (!lead) throw new Error("Lead not found");
  if (!lead.business_name) throw new Error("Lead has no business_name");

  const where = [lead.city, "Colombia"].filter(Boolean).join(", ");
  const catLabel = lead.category ? " (" + lead.category + ")" : "";
  const prompt =
    "Find verifiable contact information for the small business named \"" + lead.business_name + "\" located in " + where + catLabel + ". " +
    "Search the web. Look at their own website, Instagram bio, Google Maps listing, and Facebook page. " +
    "I want: phone number, WhatsApp, email, Instagram handle, Facebook URL, and official website URL. " +
    "\n\nIMPORTANT: " +
    "Only return values you can verify from at least one source. Do NOT guess. " +
    "Phone and WhatsApp must be Colombian numbers (+57 followed by 10 digits). " +
    "Skip free-email providers (gmail / hotmail / outlook / yahoo). If their email IS gmail and that's all there is, still include it. " +
    "If multiple candidates exist (e.g. two same-named businesses in different cities), prefer the one in the city I gave. " +
    "If you can't find anything verifiable, return an empty object." +
    "\n\nRespond ONLY with a single JSON object like " +
    '{"phone":"+57XXXXXXXXXX","whatsapp":"+57XXXXXXXXXX","email":"info@example.com","instagram":"@handle","facebook_url":"https://facebook.com/...","current_site":"https://example.com"}' +
    ". Omit fields you can't fill. No prose around the JSON.";

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error("Anthropic " + resp.status + ": " + errText.slice(0, 300));
  }
  const data = await resp.json();

  // The model may emit multiple text blocks (including web_search results); we
  // collect every text block and pull out the JSON object.
  const textBlocks = (data.content || []).filter((b) => b.type === "text");
  const text = textBlocks.map((b) => b.text).join("\n");
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let found = {};
  if (jsonMatch) {
    try { found = JSON.parse(jsonMatch[0]); } catch {}
  }

  // Build patch · only fields the lead doesn't already have.
  const patch = {};
  const candidate = (cur, val) => (!cur || !String(cur).trim()) && val && String(val).trim();
  if (candidate(lead.phone, found.phone))         patch.phone        = normalizePhone(found.phone);
  if (candidate(lead.whatsapp, found.whatsapp))   patch.whatsapp     = normalizePhone(found.whatsapp);
  else if (candidate(lead.whatsapp, found.phone)) patch.whatsapp     = normalizePhone(found.phone);
  if (candidate(lead.email, found.email) && String(found.email).includes("@")) patch.email = String(found.email).toLowerCase().trim();
  if (candidate(lead.instagram, found.instagram))     patch.instagram    = cleanHandle(found.instagram);
  if (candidate(lead.facebook_url, found.facebook_url)) patch.facebook_url = found.facebook_url;
  if (candidate(lead.current_site, found.current_site)) patch.current_site = found.current_site;
  // Drop any fields that normalized to null/empty.
  Object.keys(patch).forEach((k) => { if (!patch[k]) delete patch[k]; });

  const filledKeys = Object.keys(patch);
  if (!filledKeys.length) {
    return { found, filled: [], skipped: true };
  }

  if (dryRun) return { found, would_fill: patch, dryRun: true };

  // Apply patch.
  patch.updated_at = Date.now();
  const cols = Object.keys(patch);
  const sets = cols.map((c) => c + " = ?").join(", ");
  const binds = [...cols.map((c) => patch[c]), leadId];
  await env.DB.prepare("UPDATE leads SET " + sets + " WHERE id = ?").bind(...binds).run();

  // Log an activity row so the enrichment is auditable.
  const actId = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO activities (id, kind, subject, body, lead_id, owner, occurred_at, created_at, updated_at) " +
    "VALUES (?, 'enrichment', ?, ?, ?, 'system', ?, ?, ?)"
  ).bind(
    actId,
    "Auto-enriched: " + filledKeys.join(", "),
    JSON.stringify(patch),
    leadId,
    now, now, now
  ).run();

  return { found, filled: filledKeys };
}

// Normalize Colombian phone to +57XXXXXXXXXX. Same logic as the CRM coerce().
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

function cleanHandle(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  // Strip URL prefixes if they came back as a link.
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  s = s.replace(/\/$/, "");
  if (!s.startsWith("@")) s = "@" + s;
  return s;
}
