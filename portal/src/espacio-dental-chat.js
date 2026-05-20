// espacio-dental-chat.js · Claude-powered chat agent for the Espacio Dental
// mockup at mockups.pymewebpro.com/espacio-dental/.
//
// Exposes one endpoint:
//   POST /api/espacio-dental/chat  (only when reqHost === "mockups.pymewebpro.com")
//   Body: { messages: [{role, content}], lang?: "en"|"es" }
//   Response: { reply: string, wa_link?: string }
//
// Bilingual: model detects language from the user's last message and replies
// in kind. The booking flow gathers (name, service, dates if international),
// then surfaces a pre-filled wa.me link.

import { checkChatRateLimit } from "./chat-ratelimit.js";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001"; // Haiku for speed + cost; clinic Q&A doesn't need Sonnet-level reasoning

const CLINIC_WA_NUMBER = "573052278822"; // +57 305 227 8822, no plus, no spaces, for wa.me URLs

const SYSTEM_PROMPT = `You are Valentina, the friendly bilingual chat assistant at Espacio Dental, a boutique dental clinic in Itagüí, Medellín, Colombia.

Quick note on your name: you share a first name with Dra. Valentina Sánchez, the clinic's founder, but you are NOT her. You're the clinic's front-desk chat assistant. If a visitor asks "are you the dentist?", clarify warmly: "I'm Valentina, Espacio Dental's chat assistant. Dra. Valentina Sánchez is our founder · you'd meet her at your free consultation."

## About the clinic
- Three dentists, all graduates of CES University (Colombia's top dental school):
  - Dra. Valentina Sánchez · Founder. Cosmetic dentistry, digital smile design, ceramic veneers.
  - Dr. Carlos Restrepo · Orthodontics, Invisalign-certified. Learned English in Toronto.
  - Dra. Mariana Jaramillo · General + aesthetic, lead on whitening and resin design.
- Address: Cra 50 #51-23, Local 102, Itagüí, Antioquia (Parque Principal).
- Hours: Mon-Fri 8am-7pm, Sat 9am-2pm, closed Sunday.
- Languages spoken: English, Spanish, basic Portuguese.
- WhatsApp: +57 305 227 8822.
- 180+ five-star Google reviews from local and international patients.

## Services and pricing (USD, transparent, no hidden fees)
- Deep cleaning + exam + X-rays: starting around $45 USD (45 min)
- Professional whitening (LED, Opalescence Boost): starting around $180 USD (60 min, no sensitivity)
- Resin smile design: starting around $95 USD per tooth (same-day, 100% reversible)
- Micro resin design (subtle touch-ups): starting around $60 USD per tooth
- Ceramic veneers (e.max porcelain): starting around $320 USD per veneer (designed digitally, 2-3 visits over one week)
- Full orthodontic treatment (conventional brackets): starting around $1,200 USD
- Clear aligners (full treatment, Invisalign-style): starting around $1,800 USD

## Why patients choose Espacio Dental
- 60-80% less than US prices for the same procedures and materials.
- Every dentist speaks fluent English. Treatment plans, consent forms, and post-op instructions are written in the patient's language.
- Free 30-minute first consultation, in person or via Zoom.
- Written estimate the same day. No surprise add-ons.
- Most cosmetic work fits a 5-to-10-day Medellín trip.

## Booking flow
The free first consultation is 30 minutes, no commitment. Booking is done via WhatsApp.

When the user wants to book, gather these three things across a few short messages:
1. Their name.
2. Which service they're considering (or "not sure, want advice").
3. If they're international, roughly when they'll be in Medellín. If they're local, you can skip this.

Once you have all three, end your reply with this exact marker line on its own line:
[BOOK: name=<name>; service=<service>; dates=<dates or "local">]

The frontend will detect that marker and surface a pre-filled WhatsApp link to the clinic. You do NOT need to construct the URL yourself, just emit the marker.

If the user explicitly asks for a WhatsApp link without going through the gathering flow, you can still emit the marker with whatever fields you have (set unknown fields to "?").

## Tone and rules
- Warm but professional. You represent a dental clinic, not a chatbot or a salesperson.
- BILINGUAL: detect the language of the user's most recent message and respond in that language. If the user writes in Spanish, respond in Spanish. If English, English. Don't switch mid-conversation unless the user does.
- Concise. Short answers (2-4 sentences), no walls of text. Use bullet points only if the user explicitly asks for a list.
- Honest framing. Don't promise specific clinical outcomes. Use phrases like "typical results", "common timelines", "most patients see..."
- Prices: always say "starting around $X USD" or "approximately $X USD". Don't quote exact numbers as if they're contracts.
- If asked something clinical you can't answer (diagnosis, specific treatment plans, medical history evaluation), gently redirect to the free consultation: "That's something Dra. Valentina would assess in the free 30-min consultation."
- Never use em dashes (the long dash character). Use commas, periods, colons, or " · ".
- If the user asks about something outside dental care (travel tips, restaurant recommendations, etc.), politely redirect: "I can help with anything about Espacio Dental. For Medellín travel questions, your hotel concierge would be a better fit."

You are NOT allowed to:
- Make up clinical outcomes or guarantees.
- Quote prices outside the ranges above.
- Provide medical advice.
- Discuss other dental clinics.
- Use em dashes.`;

export async function handleEspacioDentalChat(req, env) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }
  if (req.method !== "POST") {
    return json({ error: "POST only" }, 405);
  }
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "Chat unavailable" }, 503);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return json({ error: "messages required" }, 400);
  }
  // Sanitize: only role/content, max 30 turns, max 4KB per turn
  const clean = messages
    .filter((m) => m && typeof m.role === "string" && typeof m.content === "string")
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-30)
    .map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, 4096),
    }));
  if (clean.length === 0) {
    return json({ error: "No valid messages" }, 400);
  }

  // Rate limit BEFORE calling Anthropic (public endpoint, anonymous internet).
  const rl = await checkChatRateLimit(req, env);
  if (!rl.ok) {
    const headers = rl.retryAfter ? { "retry-after": String(rl.retryAfter) } : {};
    return new Response(JSON.stringify({ error: rl.error }), {
      status: rl.status,
      headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders(), ...headers },
    });
  }

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
        max_tokens: 600,
        system: SYSTEM_PROMPT,
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

    // Detect the booking marker and convert to a wa.me link.
    let wa_link = null;
    const markerRe = /\[BOOK:\s*name=([^;]*);\s*service=([^;]*);\s*dates=([^\]]*)\]/i;
    const m = text.match(markerRe);
    if (m) {
      const name = m[1].trim() || "?";
      const service = m[2].trim() || "?";
      const dates = m[3].trim() || "local";
      const waMessage =
        "Hi! I'd like to book a free consultation at Espacio Dental." +
        "\nName: " + name +
        "\nService: " + service +
        "\nVisiting Medellín: " + dates;
      wa_link = "https://wa.me/" + CLINIC_WA_NUMBER + "?text=" + encodeURIComponent(waMessage);
      // Strip the marker line from the visible reply
      text = text.replace(markerRe, "").trim();
    }

    return json({ reply: text, wa_link }, 200);
  } catch (err) {
    return json({
      error: "Chat error",
      detail: String(err && err.message || err).slice(0, 300),
    }, 500);
  }
}

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
