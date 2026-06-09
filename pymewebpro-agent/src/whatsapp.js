// whatsapp.js · Meta Cloud API helpers.
// Verify webhook, parse inbound payloads, send outbound text.

const META_GRAPH_BASE = "https://graph.facebook.com/v20.0";

export function verifyWebhook(url, env) {
  const u = new URL(url);
  const mode = u.searchParams.get("hub.mode");
  const token = u.searchParams.get("hub.verify_token");
  const challenge = u.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === env.WA_VERIFY_TOKEN) {
    return new Response(challenge || "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

/**
 * Extract the relevant fields from a Meta inbound webhook payload.
 * Returns null if the payload isn't an inbound text/audio message.
 */
export function parseInboundMessage(payload) {
  try {
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const msg = value?.messages?.[0];
    if (!msg) return null;
    const contact = value.contacts?.[0];
    return {
      from: msg.from,
      message_id: msg.id,
      timestamp: msg.timestamp,
      type: msg.type,
      text: msg.text?.body || null,
      contact_name: contact?.profile?.name || null,
      raw: msg,
    };
  } catch (e) {
    console.error("parseInboundMessage failed:", e);
    return null;
  }
}

export async function sendWhatsAppText(env, to, body) {
  if (!env.WA_PHONE_NUMBER_ID || !env.WA_ACCESS_TOKEN) {
    console.warn("WhatsApp not configured; skipping send to", to);
    return { ok: false, error: "WA not configured" };
  }
  const url = `${META_GRAPH_BASE}/${env.WA_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: String(to).replace(/[^0-9]/g, ""),
    type: "text",
    text: { body: String(body).slice(0, 4096) },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.WA_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("WhatsApp send failed:", res.status, JSON.stringify(json));
    return { ok: false, status: res.status, error: json };
  }
  return { ok: true, result: json };
}
