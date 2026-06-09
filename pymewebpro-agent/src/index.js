// index.js · pymewebpro-agent Worker entrypoint.
// Routes: /, /widget.js, /chat, /whatsapp/webhook.

import { chatTurn } from "./agent.js";
import { getOrCreateWebConversation, getOrCreateWhatsAppConversation } from "./db.js";
import { verifyWebhook, parseInboundMessage, sendWhatsAppText } from "./whatsapp.js";
import { WIDGET_JS, WIDGET_CSS } from "./widget.js";
import { serveWizard, handleWizardSubmit } from "./wizard.js";

const ALLOWED_ORIGINS = new Set([
  "https://pymewebpro.com",
  "https://www.pymewebpro.com",
  "https://mockups.pymewebpro.com",
  "https://santi.pymewebpro.com",
  // dev origins
  "http://localhost:8787",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
]);

function corsHeaders(origin) {
  const h = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  else h["Access-Control-Allow-Origin"] = "https://pymewebpro.com";
  return h;
}

function json(data, status = 200, origin = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // -- health --
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("Valentina · PymeWebPro agent · ok", {
        headers: { "content-type": "text/plain" },
      });
    }

    // -- widget loader (JS) --
    if (url.pathname === "/widget.js") {
      return new Response(WIDGET_JS, {
        headers: {
          "content-type": "application/javascript; charset=utf-8",
          "cache-control": "public, max-age=300",
          "access-control-allow-origin": "*",
        },
      });
    }

    // -- widget loader (CSS) --
    if (url.pathname === "/widget.css") {
      return new Response(WIDGET_CSS, {
        headers: {
          "content-type": "text/css; charset=utf-8",
          "cache-control": "public, max-age=300",
          "access-control-allow-origin": "*",
        },
      });
    }

    // -- web chat --
    if (url.pathname === "/chat" && request.method === "POST") {
      let body;
      try { body = await request.json(); }
      catch { return json({ error: "Invalid JSON" }, 400, origin); }

      const session = String(body.session || "").slice(0, 80);
      const message = String(body.message || "").slice(0, 4000).trim();
      if (!session || !message) return json({ error: "session and message required" }, 400, origin);

      try {
        const conv = await getOrCreateWebConversation(env.AGENT_DB, session);
        const { reply, language } = await chatTurn({
          env,
          conversationId: conv.id,
          userMessage: message,
          language: conv.language || "es",
          conversation: conv,
        });
        return json({ ok: true, reply, language, conversation_id: conv.id }, 200, origin);
      } catch (e) {
        console.error("chat error:", e);
        return json({ error: "Chat failed", detail: String(e?.message || e) }, 500, origin);
      }
    }

    // -- WhatsApp webhook --
    if (url.pathname === "/whatsapp/webhook" && request.method === "GET") {
      return verifyWebhook(request.url, env);
    }
    if (url.pathname === "/whatsapp/webhook" && request.method === "POST") {
      // Read the body BEFORE returning the response. In Workers the request
      // stream closes once the Response is sent, so parsing inside the
      // backgrounded waitUntil task races against that close and intermittently
      // throws "Can't read from request stream after response has been sent".
      // That was the "she goes quiet on some messages" bug (fixed 2026-05-21):
      // buffered payloads parsed in time, larger ones got dropped.
      let payload = null;
      try { payload = await request.json(); }
      catch (e) { console.error("WA webhook bad JSON:", e); return new Response("ok", { status: 200 }); }
      ctx.waitUntil(handleInboundWhatsApp(payload, env));
      // Always 200 fast so Meta doesn't retry.
      return new Response("ok", { status: 200 });
    }

    // -- preview lead capture (from the "free example" tablet modal on the site) --
    if (url.pathname === "/lead" && request.method === "POST") {
      let body;
      try { body = await request.json(); }
      catch { return json({ error: "Invalid JSON" }, 400, origin); }
      const name = String(body.name || "").slice(0, 120).trim();
      const phone = String(body.phone || "").slice(0, 40).trim();
      const business = String(body.business || "").slice(0, 160).trim();
      const industry = String(body.industry || "").slice(0, 80).trim();
      const offer = String(body.offer || "").slice(0, 400).trim();
      const language = String(body.language || "es").slice(0, 5);
      if (!name && !phone) return json({ ok: true, skipped: true }, 200, origin);
      try {
        const metadata = JSON.stringify({ source: "preview-tablet", industry, offer, color: String(body.color || "").slice(0, 16) });
        const now = Date.now();
        await env.PORTAL_DB.prepare(
          `INSERT INTO leads (id, source, name, email, phone, business_name, message, language, status, plan, hosting, metadata, created_at, updated_at)
           VALUES (?, 'preview-tablet', ?, ?, ?, ?, ?, ?, 'new', 'esencial', 'none', ?, ?, ?)`
        ).bind(
          crypto.randomUUID(),
          name || null,
          null,
          phone || null,
          business || null,
          `Free-example preview requested. Industry: ${industry || "n/a"}. Offer: ${offer || "n/a"}.`,
          language,
          metadata,
          now, now,
        ).run();
      } catch (e) {
        console.error("preview lead insert failed:", e); // never break the visitor flow
      }
      return json({ ok: true }, 200, origin);
    }

    // -- Spanish intake wizard (public, token-gated). GET serves the form,
    //    POST saves answers + uploads. Token is the only secret. --
    const mWizard = url.pathname.match(/^\/w\/([A-Za-z0-9]{8,})$/);
    if (mWizard && request.method === "GET") {
      return serveWizard(env, mWizard[1]);
    }
    const mWizardApi = url.pathname.match(/^\/api\/w\/([A-Za-z0-9]{8,})$/);
    if (mWizardApi && request.method === "POST") {
      return handleWizardSubmit(request, env, mWizardApi[1]);
    }

    return new Response("not found", { status: 404 });
  },
};

async function handleInboundWhatsApp(payload, env) {
  const msg = parseInboundMessage(payload);
  if (!msg) return;                    // not a message event (could be a status update)
  if (msg.type !== "text" || !msg.text) {
    // Future: handle audio / image. For v1, politely ask for text.
    await sendWhatsAppText(env, msg.from, "Hola · soy Valentina de PymeWebPro. Por ahora respondo solo mensajes de texto. ¿En qué te puedo ayudar?");
    return;
  }

  try {
    const conv = await getOrCreateWhatsAppConversation(env.AGENT_DB, msg.from, msg.contact_name);
    const { reply } = await chatTurn({
      env,
      conversationId: conv.id,
      userMessage: msg.text,
      language: conv.language || "es",
      conversation: conv,
    });
    await sendWhatsAppText(env, msg.from, reply);
  } catch (e) {
    console.error("WA chat failed:", e);
    await sendWhatsAppText(env, msg.from, "Disculpa, tuve un problema técnico. Vuelve a escribirme en un minuto, por favor.");
  }
}
