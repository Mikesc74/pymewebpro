// reports.js — monthly per-client activity report, emailed via Resend.
// Triggered by the worker cron (1st of the month). Spanish (clients are Colombian).

const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function fmt(d) { return d.toISOString().slice(0, 19).replace('T', ' '); }

export async function runMonthlyReports(env) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startStr = fmt(start), endStr = fmt(end);
  const label = MONTHS_ES[start.getUTCMonth()] + ' ' + start.getUTCFullYear();

  const clients = await env.DB.prepare(
    "SELECT id, name, notify_email, bot_name FROM clients WHERE active = 1 AND notify_email IS NOT NULL AND notify_email != ''"
  ).all();

  for (const c of (clients.results || [])) {
    try {
      const s = await gather(env, c.id, startStr, endStr);
      if (s.conversations === 0) continue; // no activity, skip the email
      await sendReport(env, c, label, s);
    } catch (e) {
      console.error('monthly report error for', c.id, e);
    }
  }

  await purgeOld(env);
}

// Data retention (Habeas Data): optionally purge conversations older than
// DATA_RETENTION_MONTHS. Default 0 = keep everything (opt-in).
async function purgeOld(env) {
  const months = parseInt(env.DATA_RETENTION_MONTHS || '0', 10);
  if (!months || months <= 0) return;
  const mod = '-' + months + ' months';
  try {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE last_message_at < datetime('now', ?))").bind(mod),
      env.DB.prepare("DELETE FROM leads WHERE conversation_id IN (SELECT id FROM conversations WHERE last_message_at < datetime('now', ?))").bind(mod),
      env.DB.prepare("DELETE FROM conversations WHERE last_message_at < datetime('now', ?)").bind(mod),
    ]);
  } catch (e) {
    console.error('retention purge error', e);
  }
}

async function gather(env, clientId, start, end) {
  const one = async (sql, ...b) => (await env.DB.prepare(sql).bind(...b).first())?.n || 0;
  const [conversations, whatsapp, web, leads, attention] = await Promise.all([
    one("SELECT COUNT(*) n FROM conversations WHERE client_id = ? AND started_at >= ? AND started_at < ?", clientId, start, end),
    one("SELECT COUNT(*) n FROM conversations WHERE client_id = ? AND channel = 'whatsapp' AND started_at >= ? AND started_at < ?", clientId, start, end),
    one("SELECT COUNT(*) n FROM conversations WHERE client_id = ? AND channel = 'web' AND started_at >= ? AND started_at < ?", clientId, start, end),
    one("SELECT COUNT(*) n FROM leads WHERE client_id = ? AND ts >= ? AND ts < ?", clientId, start, end),
    one("SELECT COUNT(*) n FROM conversations WHERE client_id = ? AND needs_human = 1 AND started_at >= ? AND started_at < ?", clientId, start, end),
  ]);
  return { conversations, whatsapp, web, leads, attention };
}

async function sendReport(env, client, label, s) {
  if (!env.RESEND_API_KEY) return;
  const from = env.ALERT_EMAIL_FROM || 'Angela <hola@pymewebpro.com>';
  const name = client.bot_name || 'Angela';

  const text = `Reporte de ${label} · ${client.name}\n\n`
    + `Conversaciones: ${s.conversations}\n`
    + `  WhatsApp: ${s.whatsapp}\n`
    + `  Web: ${s.web}\n`
    + `Prospectos: ${s.leads}\n`
    + `Conversaciones que necesitaron tu atencion: ${s.attention}\n\n`
    + `Este es el resumen mensual de ${name}. Puedes ver el detalle en tu portal.`;

  const row = (k, v) => `<tr><td style="padding:6px 0;color:#555">${esc(k)}</td><td style="padding:6px 0;text-align:right;font-weight:600">${v}</td></tr>`;
  const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6;max-width:480px">
    <p style="margin:0 0 6px;font-weight:600">Reporte de ${esc(label)}</p>
    <p style="margin:0 0 16px;color:#666">${esc(client.name)}</p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee">
      ${row('Conversaciones', s.conversations)}
      ${row('· WhatsApp', s.whatsapp)}
      ${row('· Web', s.web)}
      ${row('Prospectos', s.leads)}
      ${row('Necesitaron tu atencion', s.attention)}
    </table>
    <p style="margin:18px 0 0;color:#888;font-size:12px">Resumen mensual de ${esc(name)}.</p>
  </div>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [client.notify_email], subject: `Reporte de ${label} · ${client.name}`, text, html }),
  });
}
