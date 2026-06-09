// alerts.js — owner alerts: ping the business owner when a customer writes in
// (web or WhatsApp) and nobody has replied yet.
//
// Rules:
//  - Fire on a new inbound customer message when the conversation has no human
//    (owner) reply yet.
//  - At most once per COOLDOWN_MIN per conversation. Opening the conversation in
//    the dashboard resets the cooldown (see portal.js /read), so genuinely new
//    later activity can alert again.
//  - Never on the assistant's own messages; never once the owner has replied.
//  - Respect the per-client on/off toggle and quiet hours (Bogota time).
//  - Channels: email via Resend, WhatsApp via Twilio (owner's own number).

import { sendWhatsAppText } from './wa-send.js';

const COOLDOWN_MIN = 30; // minutes of quiet per conversation after an alert

// Current hour in America/Bogota (UTC-5, no DST).
function bogotaHour() {
  return (new Date().getUTCHours() + 24 - 5) % 24;
}

function inQuietHours(start, end) {
  if (start == null || end == null || start === end) return false;
  const h = bogotaHour();
  return start < end ? (h >= start && h < end) : (h >= start || h < end);
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Returns { sent: boolean }. The decision is made synchronously (so the caller
// can avoid double-pinging); the actual email/WhatsApp send runs in the background.
export async function maybeAlertOwner({ env, client, conv, userText, channel, contactName, contactPhone, ctx }) {
  try {
    if (client.alerts_enabled === 0) return { sent: false };

    const email = client.notify_email;
    const wa    = client.notify_wa;
    if (!email && !wa) return { sent: false };

    if (inQuietHours(client.quiet_start, client.quiet_end)) return { sent: false };

    // Owner already replied? They are handling it; stop alerting.
    const human = await env.DB.prepare(
      "SELECT 1 FROM messages WHERE conversation_id = ? AND role = 'human' LIMIT 1"
    ).bind(conv.id).first();
    if (human) return { sent: false };

    // Cooldown.
    if (conv.last_alert_at) {
      const last = Date.parse(conv.last_alert_at.replace(' ', 'T') + 'Z');
      if (!isNaN(last) && (Date.now() - last) < COOLDOWN_MIN * 60000) return { sent: false };
    }

    // Stamp the alert time first so a burst of inbound messages can't double-send.
    await env.DB.prepare("UPDATE conversations SET last_alert_at = datetime('now') WHERE id = ?")
      .bind(conv.id).run();

    const who     = contactName || contactPhone || 'Cliente anonimo';
    const chLabel = channel === 'whatsapp' ? 'WhatsApp' : 'Web';
    const snippet = String(userText || '').slice(0, 300);
    const link    = (env.PORTAL_BASE_URL || 'https://asistente.pymewebpro.com') + '/portal/conversations/' + conv.id;

    const send = (async () => {
      if (email) await sendEmail(env, email, client, chLabel, who, snippet, link);
      if (wa && client.wa_sender) {
        await sendWhatsAppText(env, client.wa_sender, wa, waText(client, chLabel, who, snippet, link));
      }
    })();
    if (ctx) ctx.waitUntil(send); else await send;

    return { sent: true };
  } catch (e) {
    console.error('owner alert error:', e);
    return { sent: false };
  }
}

function waText(client, chLabel, who, snippet, link) {
  return `${client.name}: un cliente escribio por ${chLabel} y aun nadie ha respondido.\n\n${who}: "${snippet}"\n\nAbrir: ${link}`;
}

async function sendEmail(env, to, client, chLabel, who, snippet, link) {
  if (!env.RESEND_API_KEY) return;
  const from = env.ALERT_EMAIL_FROM || 'Angela <hola@pymewebpro.com>';
  const text = `Un cliente escribio y aun nadie ha respondido.\n\nNegocio: ${client.name}\nCanal: ${chLabel}\nCliente: ${who}\nMensaje: "${snippet}"\n\nAbrir la conversacion: ${link}`;
  const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6;max-width:480px">
    <p style="margin:0 0 14px">Un cliente escribio y aun nadie ha respondido.</p>
    <p style="margin:0 0 14px"><b>Negocio:</b> ${esc(client.name)}<br><b>Canal:</b> ${esc(chLabel)}<br><b>Cliente:</b> ${esc(who)}</p>
    <p style="background:#f4f4f4;border-radius:8px;padding:12px;margin:0 0 16px">"${esc(snippet)}"</p>
    <p style="margin:0"><a href="${esc(link)}" style="background:#2e3440;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Abrir la conversacion</a></p>
  </div>`;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [to],
        subject: `Nuevo mensaje de un cliente · ${client.name}`,
        text, html,
      }),
    });
  } catch (e) {
    console.error('resend send error:', e);
  }
}
