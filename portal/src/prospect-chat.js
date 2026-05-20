// prospect-chat.js · generic chat agent for every mockup at mockups.pymewebpro.com.
//
// Endpoint:
//   POST mockups.pymewebpro.com/api/chat/<slug>
//   Body: { messages: [{role, content}] }
//   Response: { reply: string, wa_link?: string, mode: "answer"|"order" }
//
// How it works:
//   1. Reads the mockup_prospects row by slug.
//   2. Builds a system prompt:
//      - if chatbot_system_prompt column is set, uses it as-is (Mike's override).
//      - otherwise auto-synthesizes from business_name, style_brief, owner_name,
//        owner_whatsapp, cal_link. This means a freshly-created prospect gets
//        a working chatbot the moment it has a brief + WhatsApp.
//   3. Runs Claude Haiku 4.5 with the system prompt + sanitized history.
//   4. Detects `[ORDER: items=...; address=...; phone=...]` in the reply,
//      converts it to a wa.me link with a prefilled message in Spanish,
//      strips the marker from the user-visible text. Frontend renders a
//      "Confirmar por WhatsApp" button when wa_link is present.
//
// Uses env.ANTHROPIC_API_KEY (already set on the worker for espacio-dental).

import { checkChatRateLimit } from "./chat-ratelimit.js";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

// ─── Public entry · returns null if path doesn't match ────────────────────

export async function handleProspectChat(req, env) {
  const url = new URL(req.url);
  const m = url.pathname.match(/^\/api\/chat\/([a-z0-9-]+)\/?$/);
  if (!m) return null;
  const slug = m[1];

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== "POST") {
    return json({ error: "POST only" }, 405);
  }
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "Chat unavailable · ANTHROPIC_API_KEY not set" }, 503);
  }

  // Look up the brand profile.
  const profile = await env.DB.prepare(
    "SELECT * FROM mockup_prospects WHERE slug = ? AND status != 'archived'"
  ).bind(slug).first();
  if (!profile) {
    return json({ error: "Unknown brand", slug }, 404);
  }
  if (!profile.owner_whatsapp) {
    return json({ error: "Brand has no owner_whatsapp set · cannot route handoff" }, 503);
  }

  let body;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) return json({ error: "messages required" }, 400);

  const clean = messages
    .filter((mm) => mm && typeof mm.role === "string" && typeof mm.content === "string")
    .filter((mm) => mm.role === "user" || mm.role === "assistant")
    .slice(-30)
    .map((mm) => ({ role: mm.role, content: String(mm.content).slice(0, 4096) }));
  if (clean.length === 0) return json({ error: "No valid messages" }, 400);

  // Rate limit BEFORE calling Anthropic (public endpoint, anonymous internet).
  const rl = await checkChatRateLimit(req, env);
  if (!rl.ok) {
    const headers = rl.retryAfter ? { "retry-after": String(rl.retryAfter) } : {};
    return new Response(JSON.stringify({ error: rl.error }), {
      status: rl.status,
      headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders(), ...headers },
    });
  }

  const systemPrompt = (profile.chatbot_system_prompt && profile.chatbot_system_prompt.trim())
    || buildSystemPrompt(profile);

  try {
    const resp = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: systemPrompt,
        messages: clean,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return json({
        error: "Upstream error",
        detail: errText.slice(0, 300),
      }, 502);
    }

    const data = await resp.json();
    const textBlocks = (data.content || []).filter((b) => b.type === "text");
    let text = textBlocks.map((b) => b.text).join("\n").trim();

    // Detect ORDER marker. Format:
    //   [ORDER: items=<list>; address=<addr>; phone=<phone>]
    // All three fields optional · missing ones default to "?".
    let wa_link = null;
    let mode = "answer";
    const markerRe = /\[ORDER:\s*([^\]]*)\]/i;
    const mm = text.match(markerRe);
    if (mm) {
      const fields = parseMarkerFields(mm[1]);
      const items   = fields.items   || "?";
      const address = fields.address || "?";
      const phone   = fields.phone   || "?";
      const bizName = profile.business_name || profile.slug;
      const waMessage =
        "Hola " + bizName + ", quiero hacer un pedido:" +
        "\nProductos: " + items +
        "\nDirección: " + address +
        "\nTeléfono: " + phone;
      wa_link = "https://wa.me/" + profile.owner_whatsapp + "?text=" + encodeURIComponent(waMessage);
      text = text.replace(markerRe, "").trim();
      mode = "order";
    }

    // Detect HANDOFF marker (simpler than ORDER · just hand to human).
    // Format: [HANDOFF: reason=<short text>]
    if (!wa_link) {
      const handoffRe = /\[HANDOFF:\s*([^\]]*)\]/i;
      const hh = text.match(handoffRe);
      if (hh) {
        const fields = parseMarkerFields(hh[1]);
        const reason = fields.reason || "consulta";
        const bizName = profile.business_name || profile.slug;
        const waMessage = "Hola " + bizName + ", " + reason;
        wa_link = "https://wa.me/" + profile.owner_whatsapp + "?text=" + encodeURIComponent(waMessage);
        text = text.replace(handoffRe, "").trim();
        mode = "handoff";
      }
    }

    return json({ reply: text, wa_link, mode }, 200);
  } catch (err) {
    return json({
      error: "Chat error",
      detail: String(err && err.message || err).slice(0, 300),
    }, 500);
  }
}

// ─── Marker parsing ────────────────────────────────────────────────────────
function parseMarkerFields(raw) {
  // Parses "key=value; key=value; ..." into an object. Tolerant of quoting and whitespace.
  const out = {};
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim().toLowerCase();
    const v = part.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (k) out[k] = v;
  }
  return out;
}

// ─── System prompt synthesis ───────────────────────────────────────────────
// Builds a generic, brand-aware prompt from the brief. Mike can override per-
// prospect by setting chatbot_system_prompt directly in the studio admin.
function buildSystemPrompt(p) {
  const name = p.business_name || p.slug;
  const owner = p.owner_name || "el dueño";
  const wa = p.owner_whatsapp || "";
  const cal = p.cal_link || "";
  const brief = p.style_brief || "";

  const ownerLine = wa
    ? "El dueño se llama " + owner + " y su WhatsApp es +" + wa + "."
    : "El dueño se llama " + owner + ".";

  return [
    "Eres el asistente virtual de " + name + ", un negocio en Medellín, Colombia.",
    ownerLine,
    "",
    brief ? "Sobre el negocio:\n" + brief : "",
    "",
    "Tu trabajo es:",
    "1. Responder preguntas sobre el negocio, productos, servicios, horarios, ubicación.",
    "2. Tomar pedidos cuando un cliente quiera comprar o pedir algo.",
    "3. Pasar el caso por WhatsApp cuando sea más rápido o cuando el cliente lo pida.",
    "",
    "Cómo tomar un pedido:",
    "Cuando un cliente quiera hacer un pedido o reservar un servicio, recoge la información en mensajes cortos y naturales:",
    "  · Qué productos o servicio quiere (lista clara).",
    "  · Dirección de entrega si aplica.",
    "  · Su número de celular o WhatsApp para confirmar.",
    "Una vez tengas las tres cosas, termina tu mensaje con esta línea EXACTAMENTE en su propia línea:",
    "[ORDER: items=<lista>; address=<dirección o N/A>; phone=<celular>]",
    "",
    "IMPORTANTE · cómo confirmar el pedido al cliente:",
    "El pedido NO está hecho hasta que el cliente toca el botón verde de WhatsApp que aparece después del marcador. Capy no envía nada por sí solo · solo prepara el mensaje.",
    "Cuando emitas el marcador, di algo como: \"Listo, te armé el pedido. Toca el botón verde abajo para enviarlo a " + name + " por WhatsApp · ahí te confirman disponibilidad y tiempo de entrega.\"",
    "NUNCA digas \"tu pedido está en camino\", \"llega en X minutos\", o \"está en la cocina\" · no es verdad hasta que el cliente confirma y " + name + " lo recibe.",
    "El frontend detecta esa línea y le muestra al cliente un botón \"Confirmar por WhatsApp\" con el pedido prellenado para enviar al dueño.",
    "Si el cliente sólo quiere preguntar y no pedir, NO uses el marcador.",
    "",
    "Cómo pasar a un humano:",
    "Si el cliente pide hablar con una persona, pregunta algo que tú no sabes, o el tema requiere al dueño (precios específicos, casos médicos, quejas), termina con:",
    "[HANDOFF: reason=<razón corta>]",
    "El frontend genera un link de WhatsApp directo con esa razón prellenada.",
    "",
    "Tono y reglas:",
    "· Responde SIEMPRE en español colombiano, tú informal (tú, no usted), cálido y profesional.",
    "· Sé conciso: 2 a 4 frases por mensaje, no párrafos largos.",
    "· Honestidad: si no sabes un precio exacto, un horario específico, o un detalle médico, dilo y ofrece pasar la consulta al dueño con [HANDOFF: ...].",
    "· No inventes información que no esté en este prompt.",
    "· No uses guiones largos. Usa coma, punto, dos puntos, o el separador \" · \".",
    "· No prometas resultados clínicos o garantías médicas. Eso lo maneja el profesional, no tú.",
    "· IDIOMA · REGLA CRÍTICA: detecta el idioma del último mensaje del cliente y responde EN ESE MISMO IDIOMA. Si te escribieron en inglés, responde 100% en inglés (no mezcles palabras en español). Si te escribieron en español, responde 100% en español. Espejá su idioma siempre, mensaje por mensaje · el cliente puede cambiar de idioma a la mitad de la conversación y vos cambiás con él.",
    "· NUNCA agradezcas al cliente por \"confiar en ti\" o por \"confiar en Capy / el asistente\". Siempre agradécele por confiar en " + name + " · tú eres parte del equipo, no la marca.",
    "",
    cal ? "Si el cliente quiere agendar una cita, comparte este link: " + cal : "",
    "",
    "Nunca digas que eres una IA o ChatGPT. Eres el asistente de " + name + ".",
  ].filter(Boolean).join("\n");
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────
function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "600",
  };
}
