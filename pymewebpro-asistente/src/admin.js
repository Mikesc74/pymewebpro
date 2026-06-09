// admin.js — PymeWebPro master console over all Angela clients.
// Gated by ADMIN_TOKEN (separate from per-client portal_token logins).
// Routes (under /portal/admin):
//   GET  /portal/admin                 dashboard (client list)
//   POST /portal/admin/login           sign in with ADMIN_TOKEN
//   GET  /portal/admin/logout
//   GET  /portal/admin/new             new-client form
//   POST /portal/admin/new             create client
//   GET  /portal/admin/client/:id      edit-client form
//   POST /portal/admin/client/:id      update client (regen=1 rotates token)
//   GET  /portal/admin/open/:id        open that client's portal (impersonate)

import { checkIpRate } from './rate.js';

// CSS + escHtml are injected by portal.js to avoid a circular import.
let CSS = '';
let escHtml = (s) => String(s == null ? '' : s);

const ADMIN_TTL = 60 * 60 * 8; // 8h

export async function handleAdmin(request, env, deps) {
  if (deps) { CSS = deps.CSS; escHtml = deps.escHtml; }
  const url = new URL(request.url);
  const sub = url.pathname.replace(/^\/portal\/admin\/?/, '') || '';

  if (sub === 'login' && request.method === 'POST') return adminLogin(request, env);
  if (sub === 'logout') return adminLogout();

  if (!(await isAdmin(request, env))) return adminLoginPage();

  if (sub === '' || sub === 'dashboard') return adminDashboard(env);
  if (sub === 'new') return request.method === 'POST' ? adminCreate(request, env) : adminClientForm(env, null);
  if (sub.startsWith('open/'))   return adminOpen(sub.slice('open/'.length), env);
  if (sub.startsWith('client/')) {
    const id = sub.slice('client/'.length);
    return request.method === 'POST' ? adminUpdate(id, request, env) : adminClientForm(env, id);
  }
  return new Response('Not found', { status: 404 });
}

/* ---- auth (stateless: signed cookie, no DB row so no FK on the sessions table) ---- */

function enc(s) { return new TextEncoder().encode(String(s)); }
function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
async function signExp(env, exp) {
  const key = await crypto.subtle.importKey('raw', enc(env.ADMIN_TOKEN), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc(exp));
  return b64url(mac);
}

async function isAdmin(request, env) {
  const c = request.headers.get('Cookie') || '';
  const m = c.match(/pwp_admin=([^;]+)/);
  if (!m || !env.ADMIN_TOKEN) return false;
  const [expStr, sig] = decodeURIComponent(m[1]).split('.');
  const exp = parseInt(expStr, 10);
  if (!exp || Date.now() > exp) return false;
  const expected = await signExp(env, expStr);
  return timingSafeEqual(expected, sig || '');
}

async function adminLogin(request, env) {
  // Brute-force protection: a handful of attempts per IP per minute.
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!(await checkIpRate(env, 'admin:' + ip, 5))) {
    return adminLoginPage('Too many attempts. Please wait a minute.');
  }
  const form = await request.formData().catch(() => null);
  const token = form?.get('token')?.trim();
  if (!token || !env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return adminLoginPage('Invalid token.');
  }
  const exp = Date.now() + ADMIN_TTL * 1000;
  const val = exp + '.' + await signExp(env, String(exp));
  return redirect('/portal/admin', `pwp_admin=${val}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${ADMIN_TTL}`);
}

function adminLogout() {
  return redirect('/portal/admin', 'pwp_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
}

async function adminOpen(id, env) {
  const client = await env.DB.prepare('SELECT id FROM clients WHERE id = ?').bind(id).first();
  if (!client) return new Response('Not found', { status: 404 });
  const st = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT OR REPLACE INTO sessions (token, client_id, expires_at) VALUES (?, ?, datetime("now", "+8 hours"))'
  ).bind(st, id).run();
  // Sets the client session; the admin cookie stays, so /portal/admin is one hop back.
  return redirect('/portal/dashboard', `pwp_session=${st}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${ADMIN_TTL}`);
}

/* ---- create / update ---- */

async function adminCreate(request, env) {
  const form = await request.formData();
  const id = slug(form.get('id'));
  const name = (form.get('name') || '').toString().trim();
  if (!id || !name) return adminClientForm(env, null, 'Id and name are required.');

  const exists = await env.DB.prepare('SELECT 1 FROM clients WHERE id = ?').bind(id).first();
  if (exists) return adminClientForm(env, null, 'That id already exists.');

  const token = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO clients (id, name, domain, wa_number, wa_sender, notify_email, notify_wa, bot_name, portal_token, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`
  ).bind(
    id, name,
    str(form.get('domain')), str(form.get('wa_number')), str(form.get('wa_sender')),
    str(form.get('notify_email')), str(form.get('notify_wa')), str(form.get('bot_name')) || 'Angela',
    token
  ).run();
  return redirect('/portal/admin/client/' + id, null);
}

async function adminUpdate(id, request, env) {
  const form = await request.formData();
  const client = await env.DB.prepare('SELECT id FROM clients WHERE id = ?').bind(id).first();
  if (!client) return new Response('Not found', { status: 404 });

  await env.DB.prepare(
    `UPDATE clients SET name = ?, domain = ?, wa_number = ?, wa_sender = ?, notify_email = ?, notify_wa = ?, bot_name = ?, active = ? WHERE id = ?`
  ).bind(
    (form.get('name') || '').toString().trim() || id,
    str(form.get('domain')), str(form.get('wa_number')), str(form.get('wa_sender')),
    str(form.get('notify_email')), str(form.get('notify_wa')), str(form.get('bot_name')) || 'Angela',
    form.get('active') ? 1 : 0, id
  ).run();

  if (form.get('regen')) {
    await env.DB.prepare('UPDATE clients SET portal_token = ? WHERE id = ?').bind(crypto.randomUUID(), id).run();
  }
  return redirect('/portal/admin/client/' + id, null);
}

/* ---- pages ---- */

async function adminDashboard(env) {
  const rows = await env.DB.prepare(
    `SELECT c.id, c.name, c.domain, c.active, c.wa_sender, c.alerts_enabled,
            (SELECT COUNT(*) FROM conversations v WHERE v.client_id = c.id) AS convs,
            (SELECT COUNT(*) FROM conversations v WHERE v.client_id = c.id AND v.unread = 1) AS waiting,
            (SELECT COUNT(*) FROM integrations i WHERE i.client_id = c.id AND i.kind = 'shopify' AND i.active = 1) AS shopify
     FROM clients c ORDER BY c.created_at DESC`
  ).all();

  const tr = (c) => `
    <tr>
      <td>
        <div class="cname">${escHtml(c.name)}</div>
        <div class="muted">${escHtml(c.id)}${c.domain ? ' · ' + escHtml(c.domain) : ''}</div>
      </td>
      <td>
        <span class="tag">Web</span>
        <span class="tag ${c.wa_sender ? 'tag-on' : 'tag-off'}">WhatsApp</span>
      </td>
      <td>${c.convs || 0}</td>
      <td>${c.waiting ? `<span class="tag tag-amber">${c.waiting}</span>` : '<span class="muted">0</span>'}</td>
      <td><span class="tag ${c.alerts_enabled ? 'tag-on' : 'tag-off'}">${c.alerts_enabled ? 'On' : 'Off'}</span></td>
      <td><span class="tag ${c.shopify ? 'tag-on' : 'tag-off'}">${c.shopify ? 'Yes' : 'No'}</span></td>
      <td><span class="tag ${c.active ? 'tag-on' : 'tag-off'}">${c.active ? 'Active' : 'Inactive'}</span></td>
      <td style="white-space:nowrap">
        <a class="btn btn-ghost btn-sm" href="/portal/admin/open/${escHtml(c.id)}" target="_blank" rel="noopener">Open portal</a>
        <a class="btn btn-ghost btn-sm" href="/portal/admin/client/${escHtml(c.id)}">Edit</a>
      </td>
    </tr>`;

  const body = `
    <div class="admin-bar">
      <div class="admin-title">Angela clients</div>
      <div>
        <a class="btn" href="/portal/admin/new">+ New client</a>
        <a class="btn btn-ghost btn-sm" href="/portal/admin/logout" style="margin-left:8px">Sign out</a>
      </div>
    </div>
    <div class="card"><div class="card-body" style="padding:6px 6px">
      <table class="atable">
        <thead><tr>
          <th>Client</th><th>Channels</th><th>Conversations</th><th>Unanswered</th><th>Alerts</th><th>Shopify</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>${(rows.results || []).map(tr).join('') || '<tr><td colspan="8" class="muted" style="padding:24px;text-align:center">No clients yet</td></tr>'}</tbody>
      </table>
    </div></div>`;
  return adminShell('Admin · Angela', body);
}

async function adminClientForm(env, id, error) {
  const c = id ? await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first() : null;
  if (id && !c) return new Response('Not found', { status: 404 });
  const isNew = !c;

  const f = (label, name, value, ph = '', type = 'text') => `
    <div class="form-group">
      <label class="form-label">${label}</label>
      <input class="form-input" name="${name}" type="${type}" value="${escHtml(value || '')}" placeholder="${escHtml(ph)}">
    </div>`;

  const tokenBox = isNew ? '' : `
    <div class="divider"></div>
    <div class="form-group">
      <label class="form-label">Client token (for them to log in)</label>
      <div class="token-box">${escHtml(c.portal_token)}</div>
      <label class="form-hint" style="display:flex;align-items:center;gap:7px;margin-top:8px;cursor:pointer">
        <input type="checkbox" name="regen" value="1"> Generate a new token (invalidates the old one)
      </label>
    </div>`;

  const body = `
    <div class="admin-bar">
      <div class="admin-title">${isNew ? 'New client' : 'Edit · ' + escHtml(c.name)}</div>
      <a class="btn btn-ghost btn-sm" href="/portal/admin">&#8592; Back</a>
    </div>
    ${error ? `<div class="alert alert-error" style="max-width:560px">${escHtml(error)}</div>` : ''}
    <div class="card" style="max-width:560px"><div class="card-body">
      <form method="POST" action="${isNew ? '/portal/admin/new' : '/portal/admin/client/' + escHtml(c.id)}">
        ${isNew
          ? f('Id (slug, no spaces)', 'id', '', 'flora-y-pez')
          : `<div class="form-group"><label class="form-label">Id</label><div class="token-box">${escHtml(c.id)}</div></div>`}
        ${f('Business name', 'name', c?.name, 'Flora y Pez')}
        ${f('Domain', 'domain', c?.domain, 'floraypez.co')}
        ${f('Assistant name', 'bot_name', c?.bot_name || (isNew ? 'Angela' : ''), 'Angela')}
        <div class="divider"></div>
        ${f('Business WhatsApp (public)', 'wa_number', c?.wa_number, '+573001234567')}
        ${f('Twilio WhatsApp sender (wa_sender)', 'wa_sender', c?.wa_sender, '+14155238886')}
        <div class="form-hint" style="margin-top:-10px;margin-bottom:14px">The Twilio number this client's WhatsApp messages go in and out through.</div>
        <div class="divider"></div>
        ${f('Alert email', 'notify_email', c?.notify_email, 'owner@business.co', 'email')}
        ${f('Alert WhatsApp (private)', 'notify_wa', c?.notify_wa, '+573001234567')}
        ${isNew ? '' : `
        <div class="divider"></div>
        <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" name="active" value="1" ${c.active ? 'checked' : ''}> Client active
        </label>`}
        ${tokenBox}
        <div style="margin-top:18px">
          <button class="btn" type="submit">${isNew ? 'Create client' : 'Save changes'}</button>
        </div>
      </form>
    </div></div>
    ${isNew ? onboardSection() : ''}`;
  return adminShell(isNew ? 'New client' : 'Edit client', body);
}

const ONBOARD_PROMPT = `Help me onboard a new Angela client. Angela is the pymewebpro-asistente Cloudflare Worker at asistente.pymewebpro.com (D1 database asistente-db; WhatsApp runs through Twilio). Walk me through every step in order, do what you can yourself, and ask me for any value you need. Keep every command as a copy-pasteable code block. House rules: Colombia only, prices in COP only, no em dashes.

Client: <BUSINESS NAME> (id: <slug>)

1. Confirm the client row already exists in asistente-db (I just created it in /portal/admin/new). If it does not, create it.

2. WhatsApp via Twilio. Ask me whether this client uses the Twilio sandbox (for a quick test) or a real production WhatsApp sender (for a live, paying client), then give me the exact steps for whichever I pick.
   2a. Sandbox: in the Twilio Console go to Messaging, then Try it out, then Send a WhatsApp message. Have me join the sandbox from my phone with the "join <code>" message. Under Sandbox settings set "When a message comes in" to https://asistente.pymewebpro.com/wa/webhook (HTTP POST). The wa_sender is the shared sandbox number in +E.164.
   2b. Real production sender (this is the important one for paying clients, it is NOT the sandbox): the sandbox is a shared test number that requires a join code and is not branded, so a real customer will not use it. To go live, register the client's own WhatsApp sender. In the Twilio Console go to Messaging, then Senders, then WhatsApp senders, then "Create new sender". Either buy a Twilio number or bring the client's existing number, then submit the WhatsApp sender registration with the business display name and profile. Twilio sends it to Meta for approval (usually a day or two). Once approved the sender is live: customers message it directly with no join code, and it shows the business name. Then point that sender's inbound webhook (on the sender, or on the Messaging Service it belongs to) at https://asistente.pymewebpro.com/wa/webhook (HTTP POST). Note the per-number and per-message Twilio fees. The wa_sender is that approved number in +E.164.
   For either path, tell me how to find the sender number in +E.164 format.

3. Set wa_sender on the client. Give me the one-line command:
   wrangler d1 execute asistente-db --remote --command "UPDATE clients SET wa_sender='+<number>' WHERE id='<slug>';"

4. Client login. Give me the client's portal URL (https://asistente.pymewebpro.com/portal) and read their portal_token from the database so I can send it to them.

5. Widget. Give me the exact script snippet to embed on their website (https://asistente.pymewebpro.com/widget.js?c=<slug>) and where to paste it.

6. Knowledge. Remind me to paste the business information (products, prices in COP, delivery areas, hours, FAQs) into the portal Knowledge page so the assistant can answer.

7. Alerts. Confirm notify_email, notify_wa, alerts on, and quiet hours are set for this client in the portal Settings.

8. Shopify (optional). If this client sells on Shopify, give me the steps to create a read-only custom app (scopes read_orders and read_fulfillments) and where to paste the token in the portal Settings.

9. Test end to end. Have me send one web-widget message and one WhatsApp message, then confirm both land in the portal inbox and that an owner alert fires.`;

function onboardSection() {
  return `
    <div class="section-label" style="margin-top:6px;max-width:560px">Onboarding prompt</div>
    <div class="card" style="max-width:560px"><div class="card-body">
      <p class="card-desc">After you create the client above, copy this prompt and paste it to your AI assistant (Cowork) to get the full step-by-step and wire everything up. Replace the name and slug with this client's.</p>
      <div class="code-block" style="white-space:pre-wrap;word-break:normal;max-height:320px;overflow:auto">${escHtml(ONBOARD_PROMPT)}</div>
      <div style="margin-top:12px;display:flex;align-items:center;gap:12px">
        <button class="btn btn-ghost" onclick="copyPrompt()">Copy prompt</button>
        <span id="copy-status" class="save-status"></span>
      </div>
    </div></div>
    <script>
      function copyPrompt(){
        navigator.clipboard.writeText(${JSON.stringify(ONBOARD_PROMPT)}).then(function(){
          document.getElementById('copy-status').textContent = 'Copied to clipboard.';
          setTimeout(function(){ document.getElementById('copy-status').textContent = ''; }, 2500);
        });
      }
    </script>`;
}

function adminLoginPage(error) {
  return new Response(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Angela · Admin</title><style>${CSS}</style>
  </head><body>
    <div class="login-bg">
      <div class="login-card">
        <div class="login-title">Angela · Admin</div>
        <div class="login-sub">PymeWebPro console. Team access only.</div>
        ${error ? `<div class="alert alert-error">${escHtml(error)}</div>` : ''}
        <form method="POST" action="/portal/admin/login">
          <div class="form-group">
            <label class="form-label">Admin token</label>
            <input class="form-input" name="token" type="password" placeholder="••••••••••••" autofocus required>
          </div>
          <button class="btn" type="submit" style="width:100%;justify-content:center">Sign in</button>
        </form>
      </div>
    </div>
  </body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function adminShell(title, body) {
  return new Response(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escHtml(title)}</title><style>${CSS}</style>
  </head><body style="background:#e8e8e8">
    <div class="admin-wrap">${body}</div>
  </body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/* ---- helpers ---- */

function redirect(location, setCookie) {
  const headers = { Location: location };
  if (setCookie) headers['Set-Cookie'] = setCookie;
  return new Response('', { status: 302, headers });
}

function str(v) { return v == null ? null : (String(v).trim() || null); }
function slug(v) { return String(v || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''); }
