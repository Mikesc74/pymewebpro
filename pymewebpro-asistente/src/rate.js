// rate.js — abuse + cost protection.
//  - checkIpRate: per-IP per-minute limit on the public web chat.
//  - overClientCap / bumpClientUsage: per-client monthly bot-reply cap.

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s)));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Returns true if allowed, false if over the per-minute limit.
export async function checkIpRate(env, ip, limitPerMin = 20) {
  try {
    const minute = Math.floor(Date.now() / 60000);
    const bucket = (await sha(ip || 'unknown')) + ':' + minute;
    await env.DB.prepare(
      'INSERT INTO rate_hits (bucket, n, ts) VALUES (?, 1, datetime("now")) ON CONFLICT(bucket) DO UPDATE SET n = n + 1'
    ).bind(bucket).run();
    const row = await env.DB.prepare('SELECT n FROM rate_hits WHERE bucket = ?').bind(bucket).first();
    // Opportunistic cleanup of old buckets.
    if (Math.random() < 0.02) {
      env.DB.prepare("DELETE FROM rate_hits WHERE ts < datetime('now','-1 hour')").run().catch(() => {});
    }
    return (row?.n || 0) <= limitPerMin;
  } catch (e) {
    console.error('rate check error', e);
    return true; // fail open: never block real users on a counter error
  }
}

export function monthKey() {
  const d = new Date();
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}

// True if the client has hit its monthly bot-reply cap. cap<0 means unlimited.
export async function overClientCap(env, client) {
  try {
    const def = parseInt(env.DEFAULT_MONTHLY_CAP || '3000', 10);
    const cap = (client.monthly_msg_cap && client.monthly_msg_cap > 0) ? client.monthly_msg_cap : def;
    if (cap < 0) return false;
    const row = await env.DB.prepare('SELECT replies FROM usage_counters WHERE client_id = ? AND month = ?')
      .bind(client.id, monthKey()).first();
    return (row?.replies || 0) >= cap;
  } catch (e) {
    console.error('cap check error', e);
    return false;
  }
}

export async function bumpClientUsage(env, clientId) {
  try {
    await env.DB.prepare(
      'INSERT INTO usage_counters (client_id, month, replies) VALUES (?, ?, 1) ON CONFLICT(client_id, month) DO UPDATE SET replies = replies + 1'
    ).bind(clientId, monthKey()).run();
  } catch (e) { console.error('usage bump error', e); }
}
