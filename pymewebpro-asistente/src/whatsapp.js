// whatsapp.js — inbound WhatsApp webhook for every client, via Twilio.
// Twilio POSTs application/x-www-form-urlencoded to /wa/webhook when a message
// arrives. We route by the business sender number (the Twilio "To") matched
// against clients.wa_sender, run the assistant turn (unless a human has taken
// over), and reply via Twilio's REST API.

import { runAssistantTurn } from './turn.js';
import { sendWhatsAppText } from './wa-send.js';
import { classifyMedia, mediaLabel, transcribeVoice } from './media.js';

// Empty TwiML acknowledgement (we send any reply asynchronously via REST).
function twiml() {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

// Normalise an inbound Twilio address ("whatsapp:+573...") to "+573...".
function fromTwilioAddr(addr) {
  const digits = String(addr || '').replace(/[^\d]/g, '');
  return digits ? '+' + digits : '';
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// Validate the X-Twilio-Signature header. Twilio computes
// base64( HMAC-SHA1( authToken, fullURL + concat(sortedParamKey+paramValue) ) ).
async function validTwilioSignature(request, env, form) {
  const sig = request.headers.get('X-Twilio-Signature');
  if (!sig || !env.TWILIO_AUTH_TOKEN) return false;

  const entries = [];
  for (const [k, v] of form.entries()) entries.push([k, String(v)]);
  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0)));

  let data = request.url;
  for (const [k, v] of entries) data += k + v;

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env.TWILIO_AUTH_TOKEN),
    { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return timingSafeEqual(expected, sig);
}

export async function handleWhatsApp(request, env, ctx) {
  // Twilio only POSTs; a GET is just a health probe.
  if (request.method !== 'POST') return new Response('OK', { status: 200 });

  let form;
  try { form = await request.formData(); } catch { return twiml(); }

  // Verify the request really came from Twilio (set TWILIO_VALIDATE="off" to bypass,
  // e.g. for local debugging). Forged requests are rejected with 403.
  if (env.TWILIO_VALIDATE !== 'off') {
    const ok = await validTwilioSignature(request, env, form);
    if (!ok) {
      console.warn('Rejected WhatsApp webhook: bad Twilio signature');
      return new Response('Forbidden', { status: 403 });
    }
  }

  // Defense in depth: the payload must also carry our Twilio Account SID.
  if (env.TWILIO_ACCOUNT_SID && form.get('AccountSid') !== env.TWILIO_ACCOUNT_SID) {
    return twiml();
  }

  const from = fromTwilioAddr(form.get('From')); // visitor  +57...
  const to   = fromTwilioAddr(form.get('To'));   // business sender +57...
  const text = (form.get('Body') || '').trim();
  const profileName = form.get('ProfileName') || null;
  const numMedia = parseInt(form.get('NumMedia') || '0', 10);
  const mediaUrl  = numMedia > 0 ? form.get('MediaUrl0') : null;
  const mediaType = numMedia > 0 ? form.get('MediaContentType0') : null;
  if (!from || !to || (!text && !mediaUrl)) return twiml();

  ctx.waitUntil(
    processInbound({ from, to, text, profileName, mediaUrl, mediaType }, env, ctx)
      .catch(e => console.error('WA inbound error:', e))
  );

  return twiml();
}

async function processInbound({ from, to, text, profileName, mediaUrl, mediaType }, env, ctx) {
  // Which client owns this Twilio sender number?
  const client = await env.DB.prepare(
    'SELECT * FROM clients WHERE wa_sender = ? AND active = 1'
  ).bind(to).first();
  if (!client) { console.warn('No client for Twilio sender', to); return; }

  const convId = await getOrCreateWaConversation(env, client.id, from, profileName);

  // Media: transcribe voice notes if we can, otherwise acknowledge + escalate so the
  // message is never silently dropped.
  let userText = text;
  let forceEscalate = false;
  let cannedReply = null;
  if (mediaUrl) {
    const kind = classifyMedia(mediaType);
    if (kind === 'audio') {
      const tr = await transcribeVoice(env, mediaUrl, mediaType);
      if (tr) {
        userText = text ? (text + '\n' + tr) : tr;
      } else {
        forceEscalate = true;
        userText = text || '[nota de voz]';
        cannedReply = 'Recibi tu nota de voz pero no pude escucharla bien. Permiteme conectarte con una persona.';
      }
    } else {
      forceEscalate = true;
      const label = mediaLabel(kind);
      userText = text ? (text + ' [adjunto: ' + label + ']') : ('[' + label + ']');
      cannedReply = 'He recibido tu ' + label + '. Permiteme un momento, te conecto con una persona.';
    }
  }
  if (!userText) userText = '[mensaje]';

  let result;
  try {
    result = await runAssistantTurn({
      env, client, convId, userText, channel: 'whatsapp',
      contactName: profileName, contactPhone: from, ctx,
      mediaUrl, mediaType, forceEscalate, cannedReply,
    });
  } catch (e) {
    console.error('turn error (whatsapp):', e);
    return;
  }

  // Deliver the bot reply unless a human has taken the conversation over.
  if (!result.paused && result.displayReply) {
    await sendWhatsAppText(env, client.wa_sender, from, result.displayReply);
  }
}

// One live WhatsApp conversation per (client, phone). Reuse the most recent open
// one; otherwise start a new conversation.
async function getOrCreateWaConversation(env, clientId, phone, profileName) {
  const existing = await env.DB.prepare(
    "SELECT id FROM conversations WHERE client_id = ? AND channel = 'whatsapp' AND contact_phone = ? AND status != 'closed' ORDER BY last_message_at DESC LIMIT 1"
  ).bind(clientId, phone).first();
  if (existing) return existing.id;

  const convId = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO conversations (id, client_id, channel, contact_name, contact_phone, started_at, last_message_at, status, unread) VALUES (?, ?, "whatsapp", ?, ?, datetime("now"), datetime("now"), "active", 1)'
  ).bind(convId, clientId, profileName, phone).run();
  return convId;
}
