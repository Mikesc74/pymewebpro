// wa-send.js — WhatsApp outbound via Twilio (shared by turn.js + whatsapp.js).
// Twilio brokers the WhatsApp Business API. We send with the client's Twilio
// WhatsApp sender number (clients.wa_sender) using the account's SID + Auth Token.

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01';

// Normalise to Twilio's "whatsapp:+<digits>" address format.
function waAddr(num) {
  return 'whatsapp:+' + String(num).replace(/[^\d]/g, '');
}

// Send a plain text WhatsApp message from a given Twilio sender number.
export async function sendWhatsAppText(env, fromSender, to, body) {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !fromSender || !to) {
    return { ok: false, error: 'missing twilio creds / sender / recipient' };
  }
  const url = `${TWILIO_BASE}/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const form = new URLSearchParams();
  form.set('From', waAddr(fromSender));
  form.set('To', waAddr(to));
  form.set('Body', String(body).slice(0, 1500));

  const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    if (!resp.ok) {
      console.error('Twilio send error:', await resp.text());
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error('Twilio send exception:', e);
    return { ok: false, error: String(e) };
  }
}

// Best-effort ping to the client owner's personal WhatsApp, sent from the
// client's own Twilio sender. Outside Twilio/Meta's 24h session window a
// free-form message is rejected unless an approved template is used; the portal
// "needs attention" badge is the reliable signal, this is just a nudge.
export async function notifyOwner(env, client, text) {
  if (!client?.notify_wa || !client?.wa_sender) return { ok: false, skipped: true };
  return sendWhatsAppText(env, client.wa_sender, client.notify_wa, text);
}
