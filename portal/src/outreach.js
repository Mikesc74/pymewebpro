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
  "Eres Santi de PymeWebPro escribiendo el PRIMER WhatsApp en frío a un prospecto colombiano. Debe sonar a una persona real, no a un bot ni a una agencia.\n" +
  "Reglas estrictas:\n" +
  "- Abre con un saludo humano y quién eres: 'Hola, soy Santi de PymeWebPro'. Nada de relleno como 'espero que estés bien'.\n" +
  "- 3 a 4 frases máximo, una sola idea principal.\n" +
  "- Trato de 'tú', cercano, paisa, directo. Nunca 'usted', no mezcles registros.\n" +
  "- Habla de resultados (más clientes, más reservas, mejor primera impresión), no de tecnología.\n" +
  "- NO vendemos 'sitios web' ni 'páginas web'. Vendemos una PÁGINA DE VENTAS (o página de reservas/citas), una sola página enfocada en una acción. Usa ese lenguaje.\n" +
  "- Recalca por qué importa: una página de ventas convierte las visitas en clientes, guiándolos a UNA sola acción (reservar, escribir o comprar). No es una vitrina ni un folleto; es la herramienta que vuelve el interés en ventas y evita perder a quien te busca desde el celular.\n" +
  "- Observación honesta, no afirmación: di lo que TÚ viste ('entré a tu página desde el celular y no me cargó', 'no vi un botón claro para reservar'), no afirmes defectos como hechos. NUNCA digas que el sitio está 'caído' o 'roto' salvo que sea seguro; si solo no cargó, dilo así.\n" +
  "- En el primer contacto cierra ofreciendo un paso fácil: un mockup gratis ('¿te armo un ejemplo gratis para que veas cómo se vería?'). NO cierres con preguntas que lo hagan cuantificar su fracaso ('¿cuántos clientes pierdes?'). En seguimientos o cierres, sigue la instrucción del operador.\n" +
  "- NO prometas posicionamiento en Google ('aparecer primero'), ni clientes garantizados, ni resultados. Solo beneficios reales: carga rápida, hecha para convertir, botón claro de WhatsApp o reservas.\n" +
  "- Si el negocio atiende turistas o extranjeros (hoteles, clínicas, turismo médico o dental, inmobiliarias, restaurantes de zona expat), menciona captar al cliente extranjero que busca y reserva en inglés, con una versión en inglés. Solo si de verdad aplica.\n" +
  "- Sin em dashes nunca. Usa comas, puntos, dos puntos, paréntesis.\n" +
  "- Sin lenguaje de marketing ('líder', 'mundial', 'aprovechar', 'desbloquear', 'soluciones').\n" +
  "- Sin precios en CAD/USD. Si mencionas precio, COP solamente (la página de ventas son $390.000 COP).\n" +
  "- PRECIO Y HECHOS: menciona SIEMPRE el precio base de forma natural, desde $390.000 COP (pago único, IVA incluido); los adicionales van aparte. No inventes inclusiones: incluye 1 MES de hosting y soporte, NO un año; entrega en ~48 horas; 2 rondas de revisión. NUNCA prometas un año de hosting, hosting o dominio gratis, ni inclusiones que no estén aquí. Si dudas de un detalle, no lo menciones.\n" +
  "- Si NO tienen sitio, sugiere construir su página de ventas. Si tienen buen rating de Google (4.5+), menciónalo con naturalidad como prueba de que su negocio funciona.\n" +
  "- Devuelve SOLO el texto del mensaje listo para enviar: sin comillas, sin notas internas, sin explicaciones, sin separadores (nada de '---' ni 'Notas internas'). Nada antes ni después.";

const SYSTEM_PROMPT_MIKE =
  "Eres Mike, fundador canadiense de PymeWebPro radicado en Medellín, escribiendo el PRIMER WhatsApp en frío a un prospecto colombiano. Debe sonar a una persona real, no a un bot ni a una agencia. Tono cercano (trato de 'tú') pero un punto más medido que Santi.\n" +
  "Reglas estrictas:\n" +
  "- Abre con un saludo humano y quién eres: 'Hola, soy Mike de PymeWebPro'. Nada de relleno como 'espero que estés bien'.\n" +
  "- 3 a 4 frases máximo, una sola idea principal.\n" +
  "- Habla de resultados (más clientes, más reservas, mejor primera impresión), no de tecnología.\n" +
  "- NO vendemos 'sitios web' ni 'páginas web'. Vendemos una PÁGINA DE VENTAS (o página de reservas/citas), enfocada en una sola acción. Usa ese lenguaje.\n" +
  "- Recalca por qué importa: una página de ventas convierte las visitas en clientes, guiándolos a UNA sola acción (reservar, escribir o comprar). No es una vitrina ni un folleto; es la herramienta que vuelve el interés en ventas y evita perder a quien te busca desde el celular.\n" +
  "- Observación honesta, no afirmación: di lo que viste ('entré a tu página y no me cargó'), no afirmes defectos como hechos. NUNCA digas que el sitio está 'caído' o 'roto' salvo que sea seguro.\n" +
  "- En el primer contacto cierra ofreciendo un mockup gratis ('¿te armo un ejemplo gratis?'). No uses preguntas que lo hagan cuantificar su fracaso. En seguimientos o cierres, sigue la instrucción del operador.\n" +
  "- NO prometas posicionamiento en Google, ni clientes garantizados, ni resultados. Solo beneficios reales: carga rápida, hecha para convertir, botón claro de WhatsApp o reservas.\n" +
  "- Si el negocio atiende turistas o extranjeros, menciona captar al cliente extranjero que busca y reserva en inglés, con versión en inglés. Solo si aplica.\n" +
  "- Sin em dashes nunca. Sin lenguaje de marketing. Sin precios en CAD/USD, solo COP (la página de ventas son $390.000 COP).\n" +
  "- PRECIO Y HECHOS: menciona SIEMPRE el precio base de forma natural, desde $390.000 COP (pago único, IVA incluido); los adicionales van aparte. No inventes inclusiones: incluye 1 MES de hosting y soporte, NO un año; entrega en ~48 horas; 2 rondas de revisión. NUNCA prometas un año de hosting, hosting o dominio gratis, ni inclusiones que no estén aquí. Si dudas de un detalle, no lo menciones.\n" +
  "- Si tienen buen rating de Google (4.5+), menciónalo con naturalidad como prueba.\n" +
  "- Devuelve SOLO el texto del mensaje listo para enviar: sin comillas, sin notas internas, sin explicaciones, sin separadores (nada de '---' ni 'Notas internas'). Nada antes ni después.";

const SYSTEM_PROMPT_SANTI_EMAIL =
  "Eres Santi de PymeWebPro escribiendo el PRIMER correo a un prospecto colombiano. Suena a persona real, no a agencia.\n" +
  "Reglas estrictas:\n" +
  "- Devuelve SOLO un objeto JSON con dos campos: subject (asunto, máximo 60 caracteres, concreto, sin clickbait) y body (cuerpo, sin saludo ni despedida porque el sistema los agrega).\n" +
  "- 4 a 6 frases en el cuerpo, máximo. Trato de 'tú', cercano, directo.\n" +
  "- Habla de resultados, no de tecnología. NO vendemos 'sitios web', vendemos una PÁGINA DE VENTAS (o de reservas/citas) enfocada en una acción.\n" +
  "- Recalca por qué importa: una página de ventas convierte las visitas en clientes, guiándolos a UNA sola acción (reservar, escribir o comprar). No es una vitrina; es la herramienta que vuelve el interés en ventas y evita perder a quien te busca desde el celular.\n" +
  "- Observación honesta, no afirmación: di lo que viste, no afirmes defectos como hechos. Nunca digas que el sitio está 'caído' o 'roto' salvo que sea seguro.\n" +
  "- Cierra ofreciendo un mockup gratis. No uses preguntas que lo hagan cuantificar su fracaso.\n" +
  "- NO prometas posicionamiento en Google ni resultados garantizados. Solo beneficios reales: carga rápida, hecha para convertir, botón claro de contacto o reservas.\n" +
  "- Si atiende turistas o extranjeros, menciona captar al cliente que busca y reserva en inglés, con versión en inglés. Solo si aplica.\n" +
  "- Sin em dashes nunca. Sin lenguaje de marketing. Sin precios en CAD/USD, solo COP.\n" +
  "- PRECIO Y HECHOS: menciona SIEMPRE el precio base, desde $390.000 COP (pago único, IVA incluido); los adicionales van aparte. No inventes inclusiones: incluye 1 MES de hosting y soporte, NO un año; entrega ~48 horas; 2 rondas de revisión. NUNCA prometas un año de hosting, hosting o dominio gratis, ni inclusiones que no estén aquí. Si dudas, no lo menciones.\n" +
  "- Responde SOLO con el objeto JSON. Nada de prosa alrededor.";

const SYSTEM_PROMPT_MIKE_EMAIL =
  "Eres Mike, fundador canadiense de PymeWebPro radicado en Medellín, escribiendo el PRIMER correo a un prospecto colombiano. Persona real, tono cercano (trato de 'tú') un punto más medido.\n" +
  "Reglas estrictas:\n" +
  "- Devuelve SOLO un objeto JSON con dos campos: subject (asunto, máximo 60 caracteres) y body (cuerpo, sin saludo ni despedida porque el sistema los agrega).\n" +
  "- 4 a 6 frases en el cuerpo. Habla de resultados. NO vendemos 'sitios web', vendemos una PÁGINA DE VENTAS enfocada en una acción.\n" +
  "- Recalca por qué importa: una página de ventas convierte las visitas en clientes, guiándolos a UNA sola acción (reservar, escribir o comprar). No es una vitrina; es la herramienta que vuelve el interés en ventas y evita perder a quien te busca desde el celular.\n" +
  "- Observación honesta, no afirmación de defectos. Nunca digas que el sitio está 'caído' salvo que sea seguro.\n" +
  "- Cierra ofreciendo un mockup gratis. No prometas posicionamiento en Google ni resultados garantizados.\n" +
  "- Si atiende turistas o extranjeros, menciona captar al cliente que reserva en inglés, con versión en inglés. Solo si aplica.\n" +
  "- Sin em dashes. Sin marketing-speak. Sin precios en CAD/USD, solo COP.\n" +
  "- PRECIO Y HECHOS: menciona SIEMPRE el precio base, desde $390.000 COP (pago único, IVA incluido); los adicionales van aparte. No inventes inclusiones: incluye 1 MES de hosting y soporte, NO un año; entrega ~48 horas; 2 rondas de revisión. NUNCA prometas un año de hosting, hosting o dominio gratis, ni inclusiones que no estén aquí. Si dudas, no lo menciones.\n" +
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

  // We do NOT log a 'note' activity for drafts. Only messages that are actually
  // SENT get recorded (via log-send), so generating several drafts never clutters
  // the history or makes an unsent draft look like an outbound touch.
  void activityBody;
  return json({
    ok: true,
    draft: draftValue,
    model: MODEL,
    input_tokens: usage.input_tokens || null,
    output_tokens: usage.output_tokens || null,
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
