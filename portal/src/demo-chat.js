// demo-chat.js · 2026-05-27 · mockup v2
//
// Per-lead chatbot endpoint that powers the floating "Asistente [Business]"
// widget on every mockup page. Reads the lead's mockup_data (scrape + AI
// copy + image bank) to ground responses in the prospect's REAL facts:
// services, hours, address, WhatsApp, IG.
//
// House rules:
// - Speaks in the BUSINESS'S voice to a customer, NOT in PymeWebPro's voice.
// - Honest, specific. NEVER invents facts not in the brief.
// - When a question goes outside the brief (booking, pricing, complex
//   medical questions, etc.) the assistant offers to hand off to a human
//   via WhatsApp.
// - No em-dashes. Spanish default; mirrors the user if they switch to EN.
//
// Conversation is stateless on the server · the client posts the full
// `messages` array each turn (cheap and dodges KV/D1 round trips). Cap on
// turns + tokens prevents runaway use on a public page.
//
// Public endpoint: POST /api/demo-chat/:lead_id  Body: {messages:[...]}

const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MAX_TURNS = 16;           // cap conversation length sent to the model
const MAX_INPUT_CHARS = 8000;   // belt-and-suspenders cap on the user prompt
const MAX_OUTPUT_TOKENS = 400;

export async function handleDemoChat(env, leadId, request) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ ok: false, error: "chatbot not configured" }, 500);
  }
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const incoming = Array.isArray(body.messages) ? body.messages : [];
  if (!incoming.length) return json({ ok: false, error: "no messages" }, 400);
  // Strip any role that isn't user/assistant and any non-string content.
  const messages = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    .slice(-MAX_TURNS);
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return json({ ok: false, error: "last message must be from user" }, 400);
  }
  // Total char cap across the conversation, defensive.
  const total = messages.reduce((n, m) => n + m.content.length, 0);
  if (total > MAX_INPUT_CHARS) {
    return json({ ok: false, error: "conversation too long" }, 413);
  }

  const lead = await env.DB.prepare(
    "SELECT id, business_name, name, city, category, demo_lang, whatsapp, phone, mockup_data " +
    "  FROM leads WHERE id = ?"
  ).bind(leadId).first();
  if (!lead) return json({ ok: false, error: "lead not found" }, 404);

  let mockup = null;
  try { mockup = lead.mockup_data ? JSON.parse(lead.mockup_data) : null; } catch {}
  // Even without mockup_data we can answer minimally · just facts from the
  // lead row. Better to be polite than 404 the chat.
  const lang = (mockup && mockup.target_lang === "en") || lead.demo_lang === "en" ? "en" : "es";
  const system = buildSystemPrompt({ lead, mockup, lang });

  const r = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system,
      messages,
    }),
  });
  if (!r.ok) {
    const errText = await r.text();
    return json({ ok: false, error: "model error " + r.status + ": " + errText.slice(0, 200) }, 502);
  }
  const data = await r.json();
  let reply = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  // Defense in depth · strip em-dashes from any model output.
  reply = stripEmDashes(reply);

  return json({
    ok: true,
    reply,
    usage: data.usage || null,
  });
}

// ---- system prompt -----------------------------------------------------

function buildSystemPrompt({ lead, mockup, lang }) {
  const facts = (mockup && mockup.facts) || {};
  const copy  = (mockup && mockup.copy)  || {};
  const businessName = facts.business_name || lead.business_name || (lang === "en" ? "this business" : "este negocio");
  const wa = digitsOnly(facts.whatsapp || lead.whatsapp || lead.phone);

  const lines = [];
  lines.push(lang === "en"
    ? `You are the assistant for ${businessName}. You answer customer questions on this business's website, in this business's voice, to a real customer who is considering visiting / buying / asking for service.`
    : `Eres el asistente de ${businessName}. Atiendes preguntas de clientes en la página del negocio, en la voz del negocio, a un cliente real que está considerando visitar, comprar o pedir un servicio.`);
  lines.push("");

  // Hard rules.
  if (lang === "en") {
    lines.push("Hard rules:");
    lines.push("1. Use ONLY the facts in the brief below. Never invent prices, services, hours, or product details.");
    lines.push("2. Short, warm, specific. 1-3 sentences per reply unless the user asks for detail.");
    lines.push("3. If the user asks something not in the brief (specific pricing, scheduling a real appointment, complex questions): say you'll connect them to a human and point them to WhatsApp.");
    lines.push("4. Speak in the BUSINESS'S voice to its customer. Never reference 'PymeWebPro', 'mockup', 'demo', or the fact that this is a sample page.");
    lines.push("5. Never use em-dashes (U+2014). Use commas, periods, colons, or ' · '.");
    lines.push("6. If asked who built the site, say a friendly Colombian web studio (without naming PymeWebPro) and pivot back to what you can help with.");
    lines.push("");
  } else {
    lines.push("Reglas duras:");
    lines.push("1. Usa SOLO los datos del brief abajo. Nunca inventes precios, servicios, horarios o detalles de producto.");
    lines.push("2. Respuestas cortas, cálidas, específicas. 1-3 oraciones a menos que el usuario pida detalle.");
    lines.push("3. Si el usuario pregunta algo fuera del brief (precios puntuales, agendar realmente, casos complejos): dile que lo conectas con un humano y apúntalo al WhatsApp.");
    lines.push("4. Habla en la voz del NEGOCIO al cliente. Nunca menciones 'PymeWebPro', 'mockup', 'demo' ni que esto es una muestra.");
    lines.push("5. Cero em-dashes. Usa comas, puntos, dos puntos o ' · '.");
    lines.push("6. Si preguntan quién hizo la página, di que un estudio web colombiano amigable (sin nombrar PymeWebPro) y vuelve a lo que sí puedes ayudar.");
    lines.push("");
  }

  // Brief · what the assistant knows.
  lines.push(lang === "en" ? "Brief · what you know about the business:" : "Brief · lo que sabes del negocio:");
  if (facts.business_name) lines.push("- " + (lang === "en" ? "Name" : "Nombre") + ": " + facts.business_name);
  if (facts.category)      lines.push("- " + (lang === "en" ? "Type" : "Tipo") + ": " + facts.category);
  if (facts.city)          lines.push("- " + (lang === "en" ? "City" : "Ciudad") + ": " + facts.city);
  if (facts.address)       lines.push("- " + (lang === "en" ? "Address" : "Dirección") + ": " + facts.address);
  if (Array.isArray(facts.hours) && facts.hours.length) {
    lines.push("- " + (lang === "en" ? "Hours" : "Horario") + ":");
    facts.hours.forEach((h) => lines.push("    " + h));
  }
  if (wa) lines.push("- WhatsApp: +" + wa);
  if (facts.instagram_handle) lines.push("- Instagram: @" + facts.instagram_handle);
  if (facts.email)            lines.push("- Email: " + facts.email);
  if (facts.rating)           lines.push("- Google rating: " + facts.rating + (facts.review_count ? " (" + facts.review_count + ")" : ""));

  // Services from the AI-written copy.
  if (Array.isArray(copy.services) && copy.services.length) {
    lines.push("");
    lines.push(lang === "en" ? "Services we offer:" : "Servicios que ofrecemos:");
    copy.services.forEach((s) => {
      if (s && s.name) lines.push("- " + s.name + (s.body ? ": " + s.body : ""));
    });
  }
  // Shopify e-commerce catalog · only present when the lead has a Shopify
  // store and the mockup_data.facts.shopify block was populated (manually
  // for the v0 demo or by a Shopify scraper in production). Lets the bot
  // quote real prices, sizes, stock and policies in customer chat.
  if (facts.shopify && typeof facts.shopify === "object") {
    const s = facts.shopify;
    lines.push("");
    lines.push(lang === "en" ? "Live product catalog (Shopify):" : "Catálogo en vivo (Shopify):");
    if (Array.isArray(s.categories) && s.categories.length) {
      s.categories.forEach((cat) => {
        if (!cat || !Array.isArray(cat.products) || !cat.products.length) return;
        lines.push("");
        lines.push("  " + (cat.label || "Productos") + " (" + cat.products.length + "):");
        cat.products.forEach((p) => {
          if (!p || !p.title) return;
          const price = p.price_cop ? "$" + Number(p.price_cop).toLocaleString("es-CO") : "";
          const sizes = Array.isArray(p.sizes_in_stock) && p.sizes_in_stock.length ? ", tallas " + p.sizes_in_stock.join("/") : "";
          const oos   = Array.isArray(p.sizes_out_of_stock) && p.sizes_out_of_stock.length ? ", AGOTADO en " + p.sizes_out_of_stock.join("/") : "";
          const colors = Array.isArray(p.colors) && p.colors.length ? ", colores " + p.colors.join("/") : "";
          const url = p.url ? " · " + p.url : "";
          lines.push("    - " + p.title + (price ? " · " + price : "") + sizes + oos + colors + url);
        });
      });
    }
    if (s.policies && typeof s.policies === "object") {
      lines.push("");
      lines.push(lang === "en" ? "Store policies (quote these directly when asked):" : "Políticas de la tienda (cítalas tal cual cuando pregunten):");
      if (s.policies.returns)  lines.push("  Cambios y devoluciones: " + s.policies.returns);
      if (s.policies.shipping) lines.push("  Envíos: " + s.policies.shipping);
      if (s.policies.contact)  lines.push("  Contacto: " + s.policies.contact);
      if (s.policies.payment)  lines.push("  Pagos: " + s.policies.payment);
    }
    if (s.brand_voice) {
      lines.push("");
      lines.push(lang === "en" ? "Brand voice cues (mirror this tone, not generic Spanish):" : "Voz de marca (espeja este tono, no español genérico):");
      lines.push("  " + s.brand_voice);
    }
    lines.push("");
    lines.push(lang === "en"
      ? "When recommending a product: give name, price, sizes in stock, and the product URL. Never invent a SKU or claim something is in stock if it isn't in the catalog above."
      : "Cuando recomiendes un producto: nombre, precio, tallas disponibles y el URL. Nunca inventes una referencia ni digas que algo está disponible si no está en el catálogo arriba.");
  }
  if (copy.featured_service && copy.featured_service.title) {
    const f = copy.featured_service;
    lines.push("");
    lines.push((lang === "en" ? "Featured service · " : "Servicio destacado · ") + f.title);
    if (f.body) lines.push(f.body);
    if (Array.isArray(f.checklist) && f.checklist.length) {
      lines.push(lang === "en" ? "  Bring with you:" : "  Qué traer:");
      f.checklist.forEach((c) => lines.push("  - " + c));
    }
  }
  if (copy.delivery && copy.delivery.title) {
    lines.push("");
    lines.push((lang === "en" ? "Delivery / domicilios · " : "Domicilios · ") + copy.delivery.title);
    if (copy.delivery.body) lines.push(copy.delivery.body);
  }

  // Escalation block · explicit instruction so the model knows exactly how
  // to hand off when it should.
  lines.push("");
  if (lang === "en") {
    lines.push("Escalation: when the user needs a real human (book a slot, confirm a price, ask about a specific case), reply with something like:");
    lines.push('  "Let me hand you to my colleague who can confirm that for you. Tap the WhatsApp button at the bottom of the page and I\'ll have them write you right away."');
    lines.push("Never give out a fake price or fake availability to keep the chat going.");
  } else {
    lines.push("Escalación: cuando el usuario necesita un humano real (agendar, confirmar precio, caso específico), responde algo como:");
    lines.push('  "Déjame pasarte con mi compañero/a que te confirma eso. Toca el botón de WhatsApp abajo y te escribimos al toque."');
    lines.push("Nunca des un precio inventado ni disponibilidad inventada para mantener la conversación.");
  }

  return lines.join("\n");
}

// ---- helpers -----------------------------------------------------------

function digitsOnly(s) { return String(s || "").replace(/\D/g, ""); }
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// House rule: no em-dashes anywhere. The literal U+2014 is referenced via
// fromCharCode so a literal grep stays clean.
const __EM_DASH_RE = new RegExp(String.fromCharCode(0x2014), "g");
const __EN_DASH_RE = new RegExp(String.fromCharCode(0x2013), "g");
function stripEmDashes(s) {
  if (!s) return s;
  return String(s).replace(__EM_DASH_RE, ", ").replace(__EN_DASH_RE, "-");
}
