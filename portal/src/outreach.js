// Outreach drafter + cadence tracker.
//
// Pipeline:
//   1. draft       · Pulls a lead, calls Claude Haiku 4.5 once, returns a
//                    short WhatsApp or email draft in Santi's or Mike's voice.
//                    Writes an activities row (kind='note') so the funnel
//                    shows a draft was generated (NOT sent).
//   2. log-send    · Records that an outbound message was actually sent.
//                    Writes kind='whatsapp' or 'email' activity, bumps
//                    leads.last_touched_at, last_touched_kind, touches_count.
//   3. cadence     · Returns the current follow-up queue grouped by bucket
//                    (D+1, D+3, D+7, D+14_stale) for the SPA to render.
//
// Mounted by src/index.js at /api/admin/outreach/*.
// Requires:
//   env.ANTHROPIC_API_KEY (worker secret · used by 'draft')
//   env.DB                (D1 · reads leads, writes activities)

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 600;

const SYSTEM_PROMPT_SANTI =
  "Eres Santi de PymeWebPro escribiendo el PRIMER WhatsApp a un prospecto colombiano.\n" +
  "Reglas estrictas:\n" +
  "- 3 a 4 frases, máximo.\n" +
  "- Termina con UNA pregunta abierta sobre su negocio o su sitio actual.\n" +
  "- Sin saludos genéricos ('Hola, espero que estés bien'). Empieza por el nombre o el negocio.\n" +
  "- Sin em dashes nunca. Usa puntos, comas, dos puntos.\n" +
  "- Sin lenguaje de marketing ('lider', 'mundial', 'aprovechar', 'desbloquear').\n" +
  "- Sin precios en CAD/USD. Si mencionas precio, COP solamente.\n" +
  "- Si tienen sitio actual con WordPress/Wix/Squarespace, sugiere mejora.\n" +
  "- Si NO tienen sitio (cms='site_unreachable' o null), sugiere construirlo.\n" +
  "- Si tienen rating de Google alto (4.5+), menciónalo con naturalidad como prueba de que su negocio funciona.\n" +
  "- Tono: cercano, paisa, directo. NO formal.";

const SYSTEM_PROMPT_MIKE =
  "Eres Mike, fundador de PymeWebPro, canadiense radicado en Medellín, escribiendo en español neutro. Mismas reglas, pero tono ligeramente más formal.\n" +
  "Reglas estrictas:\n" +
  "- 3 a 4 frases, máximo.\n" +
  "- Termina con UNA pregunta abierta sobre su negocio o su sitio actual.\n" +
  "- Sin saludos genéricos ('Hola, espero que estés bien'). Empieza por el nombre o el negocio.\n" +
  "- Sin em dashes nunca. Usa puntos, comas, dos puntos.\n" +
  "- Sin lenguaje de marketing ('lider', 'mundial', 'aprovechar', 'desbloquear').\n" +
  "- Sin precios en CAD/USD. Si mencionas precio, COP solamente.\n" +
  "- Si tienen sitio actual con WordPress/Wix/Squarespace, sugiere mejora.\n" +
  "- Si NO tienen sitio (cms='site_unreachable' o null), sugiere construirlo.\n" +
  "- Si tienen rating de Google alto (4.5+), menciónalo con naturalidad como prueba de que su negocio funciona.";

const SYSTEM_PROMPT_SANTI_EMAIL =
  "Eres Santi de PymeWebPro escribiendo el PRIMER correo a un prospecto colombiano.\n" +
  "Reglas estrictas:\n" +
  "- 4 a 6 frases en el cuerpo, máximo.\n" +
  "- Devuelve un objeto JSON con dos campos: subject (línea de asunto, máximo 60 caracteres) y body (cuerpo del correo, sin saludo ni despedida porque el sistema los agrega).\n" +
  "- Termina el cuerpo con UNA pregunta abierta sobre su negocio o su sitio actual.\n" +
  "- Sin em dashes nunca. Usa puntos, comas, dos puntos.\n" +
  "- Sin lenguaje de marketing ('lider', 'mundial', 'aprovechar', 'desbloquear').\n" +
  "- Sin precios en CAD/USD. Si mencionas precio, COP solamente.\n" +
  "- Si tienen sitio actual con WordPress/Wix/Squarespace, sugiere mejora.\n" +
  "- Si NO tienen sitio, sugiere construirlo.\n" +
  "- Si tienen rating de Google alto (4.5+), menciónalo con naturalidad.\n" +
  "- Tono: cercano, paisa, directo. NO formal.\n" +
  "- Responde SOLO con el objeto JSON. Nada de prosa alrededor.";

const SYSTEM_PROMPT_MIKE_EMAIL =
  "Eres Mike, fundador de PymeWebPro, canadiense radicado en Medellín, escribiendo en español neutro el PRIMER correo a un prospecto. Mismas reglas, tono ligeramente más formal.\n" +
  "Reglas estrictas:\n" +
  "- 4 a 6 frases en el cuerpo, máximo.\n" +
  "- Devuelve un objeto JSON con dos campos: subject (línea de asunto, máximo 60 caracteres) y body (cuerpo del correo, sin saludo ni despedida porque el sistema los agrega).\n" +
  "- Termina el cuerpo con UNA pregunta abierta sobre su negocio o su sitio actual.\n" +
  "- Sin em dashes nunca.\n" +
  "- Sin lenguaje de marketing.\n" +
  "- Sin precios en CAD/USD. Si mencionas precio, COP solamente.\n" +
  "- Responde SOLO con el objeto JSON. Nada de prosa alrededor.";

export async function handleOutreach(request, env, ctx, helpers) {
  const { json, isAdmin } = helpers;
  if (!isAdmin(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);

  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    if (path === "/api/admin/outreach/draft" && method === "POST") {
      return await draft(request, env, json);
    }
    if (path === "/api/admin/outreach/log-send" && method === "POST") {
      return await logSend(request, env, json);
    }
    if (path === "/api/admin/outreach/cadence" && method === "GET") {
      return await cadence(env, json);
    }
    return json({ ok: false, error: "Not found" }, 404);
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e) }, 500);
  }
}

// ---- Draft ---------------------------------------------------------------

async function draft(request, env, json) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ ok: false, error: "ANTHROPIC_API_KEY not set on worker" }, 500);
  }

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

  const leadId = body && body.lead_id;
  if (!leadId) return json({ ok: false, error: "Missing lead_id" }, 400);

  const channel = body.channel === "email" ? "email" : "whatsapp";
  const tone = body.tone === "mike" ? "mike" : "santi";
  const instruct = typeof body.instruct === "string" ? body.instruct.slice(0, 1000) : "";

  const lead = await env.DB.prepare(
    "SELECT id, name, business_name, category, city, current_site, cms, motion, " +
    "       suggested_pitch, rating, review_count, language " +
    "  FROM leads WHERE id = ?"
  ).bind(leadId).first();
  if (!lead) return json({ ok: false, error: "Lead not found" }, 404);

  const systemPrompt =
    channel === "email"
      ? (tone === "mike" ? SYSTEM_PROMPT_MIKE_EMAIL : SYSTEM_PROMPT_SANTI_EMAIL)
      : (tone === "mike" ? SYSTEM_PROMPT_MIKE : SYSTEM_PROMPT_SANTI);

  const userPrompt = buildUserPrompt(lead, channel, instruct);

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    return json(
      { ok: false, error: "Anthropic " + resp.status + ": " + errText.slice(0, 300) },
      502,
    );
  }
  const data = await resp.json();
  const usage = data.usage || {};
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  let draftValue;       // string for WA, {subject, body} for email
  let activityBody;     // what we store in activities.body
  if (channel === "email") {
    const parsed = parseEmailDraft(text);
    const signOff = tone === "mike" ? "Mike · PymeWebPro" : "Santi · PymeWebPro";
    const greeting =
      lead.name ? "Hola " + lead.name + ","
        : lead.business_name ? "Hola equipo de " + lead.business_name + ","
        : "Hola,";
    const fullBody = greeting + "\n\n" + parsed.body + "\n\n" + signOff;
    draftValue = { subject: parsed.subject, body: fullBody };
    activityBody = "Subject: " + parsed.subject + "\n\n" + fullBody;
  } else {
    draftValue = stripEmDashes(text);
    activityBody = draftValue;
  }

  // Log a 'note' activity so the funnel shows a draft was created (not sent).
  const actId = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO activities (id, kind, subject, body, lead_id, owner, occurred_at, created_at, updated_at, done) " +
    "VALUES (?, 'note', ?, ?, ?, ?, ?, ?, ?, 0)"
  ).bind(
    actId,
    "Draft generated: " + channel,
    activityBody,
    leadId,
    tone,
    now, now, now,
  ).run();

  return json({
    ok: true,
    draft: draftValue,
    model: MODEL,
    input_tokens: usage.input_tokens || null,
    output_tokens: usage.output_tokens || null,
    activity_id: actId,
  });
}

function buildUserPrompt(lead, channel, instruct) {
  const lines = [];
  lines.push("Genera un " + (channel === "email" ? "correo" : "WhatsApp") + " de primer contacto para este prospecto:");
  lines.push("");
  lines.push("- Nombre del contacto: " + (lead.name || "(desconocido)"));
  lines.push("- Negocio: " + (lead.business_name || "(sin nombre)"));
  lines.push("- Categoría: " + (lead.category || "(no clasificado)"));
  lines.push("- Ciudad: " + (lead.city || "(desconocida)"));
  lines.push("- Sitio actual: " + (lead.current_site || "(ninguno)"));
  lines.push("- CMS detectado: " + (lead.cms || "(desconocido)"));
  lines.push("- Motion sugerido: " + (lead.motion || "(no definido)"));
  lines.push("- Idioma del prospecto: " + (lead.language || "es"));
  if (lead.rating != null) {
    lines.push("- Rating Google: " + lead.rating + (lead.review_count != null ? " (" + lead.review_count + " reseñas)" : ""));
  }
  if (lead.suggested_pitch) {
    lines.push("- Pitch sugerido previo: " + lead.suggested_pitch);
  }
  if (instruct) {
    lines.push("");
    lines.push("Instrucciones adicionales del operador: " + instruct);
  }
  return lines.join("\n");
}

function parseEmailDraft(text) {
  // The model is asked to return strict JSON. Try to recover even if it adds prose.
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const parsed = JSON.parse(m[0]);
      const subject = String(parsed.subject || "").trim();
      const bodyStr = String(parsed.body || "").trim();
      if (subject && bodyStr) {
        return {
          subject: stripEmDashes(subject).slice(0, 120),
          body: stripEmDashes(bodyStr),
        };
      }
    } catch {}
  }
  // Fallback: treat first non-empty line as subject, rest as body.
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const subject = stripEmDashes(lines[0] || "PymeWebPro: una idea para su sitio").slice(0, 120);
  const bodyStr = stripEmDashes(lines.slice(1).join("\n").trim() || text);
  return { subject, body: bodyStr };
}

// Defensive belt-and-suspenders: strip em dashes (U+2014) and en dashes
// (U+2013) the model may have leaked. House style bans em dashes in any
// user-facing string. The codepoints are referenced via \u escapes so this
// source file stays em-dash-free under a literal grep.
const EM_DASH_RE = new RegExp(String.fromCharCode(0x2014), "g");
const EN_DASH_RE = new RegExp(String.fromCharCode(0x2013), "g");
function stripEmDashes(s) {
  if (!s) return s;
  return String(s).replace(EM_DASH_RE, ", ").replace(EN_DASH_RE, "-");
}

// ---- Log send ------------------------------------------------------------

async function logSend(request, env, json) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

  const leadId = body && body.lead_id;
  if (!leadId) return json({ ok: false, error: "Missing lead_id" }, 400);
  const channel = body.channel === "email" ? "email" : (body.channel === "whatsapp" ? "whatsapp" : null);
  if (!channel) return json({ ok: false, error: "channel must be 'whatsapp' or 'email'" }, 400);
  const messageBody = typeof body.body === "string" ? body.body : "";
  if (!messageBody.trim()) return json({ ok: false, error: "Missing body" }, 400);
  const subject = typeof body.subject === "string" && body.subject.trim() ? body.subject.trim() : "Sent";

  const lead = await env.DB.prepare("SELECT id FROM leads WHERE id = ?").bind(leadId).first();
  if (!lead) return json({ ok: false, error: "Lead not found" }, 404);

  const owner = "santi"; // TODO: derive from authenticated user once admin sessions exist.
  const actId = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(
    "INSERT INTO activities (id, kind, subject, body, lead_id, owner, occurred_at, created_at, updated_at, done) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)"
  ).bind(
    actId,
    channel,
    subject,
    messageBody,
    leadId,
    owner,
    now, now, now,
  ).run();

  await env.DB.prepare(
    "UPDATE leads SET last_touched_at = ?, last_touched_kind = ?, " +
    "       touches_count = COALESCE(touches_count, 0) + 1, updated_at = ? " +
    " WHERE id = ?"
  ).bind(now, channel, now, leadId).run();

  return json({ ok: true, activity_id: actId });
}

// ---- Cadence -------------------------------------------------------------

async function cadence(env, json) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const buckets = [
    { bucket: "D+1",        from: now - 2 * day,   to: now - 1 * day },
    { bucket: "D+3",        from: now - 6 * day,   to: now - 3 * day },
    { bucket: "D+7",        from: now - 13 * day,  to: now - 7 * day },
    { bucket: "D+14_stale", from: 0,               to: now - 14 * day },
  ];

  const out = [];
  for (const b of buckets) {
    const rows = await env.DB.prepare(
      "SELECT id, business_name, category, city, last_touched_at, last_touched_kind, score, heat, " +
      "       cms, current_site, motion " +
      "  FROM leads " +
      " WHERE lead_stage NOT IN ('converted','disqualified','sales_qualified') " +
      "   AND last_touched_at IS NOT NULL " +
      "   AND last_touched_at >= ? AND last_touched_at <= ? " +
      " ORDER BY COALESCE(score, 0) DESC " +
      " LIMIT 50"
    ).bind(b.from, b.to).all();

    out.push({
      bucket: b.bucket,
      leads: (rows.results || []).map((r) => {
        const days = Math.max(0, Math.floor((now - (r.last_touched_at || 0)) / day));
        return {
          id: r.id,
          business_name: r.business_name,
          category: r.category,
          city: r.city,
          last_touched_at: r.last_touched_at,
          last_touched_kind: r.last_touched_kind,
          days_since_touch: days,
          score: r.score,
          heat: r.heat,
          suggested_action: suggestAction(r, b.bucket),
        };
      }),
    });
  }

  return json({ ok: true, buckets: out });
}

function suggestAction(lead, bucket) {
  const noSite = !lead.cms || lead.cms === "site_unreachable" || !lead.current_site;
  if (bucket === "D+1") return "Saludo corto por WhatsApp, recordar el primer mensaje.";
  if (bucket === "D+3") return noSite ? "Enviar mockup de ejemplo por WhatsApp." : "Mandar auditoría rápida del sitio actual por WhatsApp.";
  if (bucket === "D+7") return "Probar correo con un caso parecido o un beneficio concreto.";
  return "Marcar como frío o pedir referido al contacto original.";
}
