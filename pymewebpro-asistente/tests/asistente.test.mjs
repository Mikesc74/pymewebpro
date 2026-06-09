// Automated tests for pymewebpro-asistente (Angela). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { encryptToken, decryptToken } from '../src/cryptoutil.js';
import { lookupOrder } from '../src/shopify.js';
import { checkIpRate, overClientCap, monthKey } from '../src/rate.js';
import { runAssistantTurn, stripSignals } from '../src/turn.js';
import { handlePrivacy } from '../src/privacy.js';
import { handlePortal } from '../src/portal.js';

// ---- tiny D1 shim: returns canned rows based on the SQL text ----
function shimDB(state = {}) {
  const handler = (sql) => ({
    bind: () => handler(sql),
    first: async () => {
      if (sql.includes("client_id = '__admin__'")) return state.adminSession || null;
      if (sql.includes('FROM sessions')) return state.session || { client_id: 'test' };
      if (sql.includes('FROM clients WHERE id')) return state.client || { id: 'test', name: 'Flora', bot_name: 'Flor' };
      if (sql.includes('integrations')) return state.integration || null;
      if (sql.includes("role = 'human'")) return null;
      if (sql.includes('usage_counters')) return state.usage || null;
      if (sql.includes('rate_hits')) return { n: state.rateN ?? 1 };
      if (sql.includes('FROM conversations WHERE id')) return state.conv || { id: 'c', bot_paused: 0, unread: 0, last_alert_at: null };
      return state.first ?? { n: 0 };
    },
    all: async () => ({ results: state.rows || [] }),
    run: async () => { state.writes = (state.writes || 0) + 1; return {}; },
  });
  return { prepare: (sql) => handler(sql), batch: async () => { state.writes = (state.writes || 0) + 1; return []; } };
}

test('cryptoutil: encrypt round-trips and protects the token', async () => {
  const env = { TOKEN_ENC_KEY: 'k' };
  const enc = await encryptToken(env, 'shpat_abc');
  assert.ok(enc.startsWith('enc:'));
  assert.ok(!enc.includes('shpat_abc'));
  assert.equal(await decryptToken(env, enc), 'shpat_abc');
  assert.equal(await decryptToken(env, 'plain'), 'plain');            // legacy passthrough
  assert.equal(await decryptToken({ TOKEN_ENC_KEY: 'other' }, enc), null); // wrong key
  assert.equal(await encryptToken({}, 'x'), 'x');                     // no key fallback
});

test('shopify: order lookup verifies email before revealing data', async () => {
  const order = { name: '#1001', email: 'ANA@m.com', financial_status: 'paid', fulfillment_status: 'fulfilled',
    fulfillments: [{ shipment_status: 'in_transit', tracking_number: 'T1', tracking_company: 'Servientrega' }] };
  global.fetch = async () => ({ ok: true, json: async () => ({ orders: [order] }) });
  const integ = { shop_domain: 'f.myshopify.com', api_token: 't' };
  let r = await lookupOrder(integ, { order_number: '1001', email: 'ana@m.com' });
  assert.equal(r.matched, true);
  assert.equal(r.order.stage, 'shipped');
  r = await lookupOrder(integ, { order_number: '1001', email: 'wrong@m.com' });
  assert.equal(r.matched, false);
  global.fetch = async () => ({ ok: true, json: async () => ({ orders: [] }) });
  r = await lookupOrder(integ, { order_number: '9', email: 'a@b.com' });
  assert.equal(r.found, false);
});

test('rate: per-IP limit + monthly cap boundaries', async () => {
  assert.equal(await checkIpRate({ DB: shimDB({ rateN: 5 }) }, '1.1.1.1', 20), true);
  assert.equal(await checkIpRate({ DB: shimDB({ rateN: 21 }) }, '1.1.1.1', 20), false);
  assert.equal(await overClientCap({ DB: shimDB({ usage: { replies: 3000 } }), DEFAULT_MONTHLY_CAP: '3000' }, { id: 'test' }), true);
  assert.equal(await overClientCap({ DB: shimDB({ usage: { replies: 10 } }), DEFAULT_MONTHLY_CAP: '3000' }, { id: 'test' }), false);
  assert.match(monthKey(), /^\d{4}-\d{2}$/);
});

test('turn: signals stripped', () => {
  assert.equal(stripSignals('Hola [IR_A_WHATSAPP]'), 'Hola');
  assert.equal(stripSignals('Un momento [ESPERAR_HUMANO]'), 'Un momento');
});

test('turn: media + cap escalate to a human without calling the model', async () => {
  global.fetch = async (u) => { throw new Error('model should not be called: ' + u); };
  // media escalate
  let st = { conv: { id: 'c', bot_paused: 0, unread: 0, last_alert_at: null } };
  let env = { DB: shimDB(st), DEFAULT_MONTHLY_CAP: '3000' };
  let r = await runAssistantTurn({ env, client: { id: 'test', name: 'F', alerts_enabled: 0 }, convId: 'c', userText: '[imagen]', channel: 'whatsapp', forceEscalate: true, cannedReply: 'Recibi tu imagen.' });
  assert.equal(r.needsHuman, true);
  assert.equal(r.displayReply, 'Recibi tu imagen.');
  // cap escalate
  st = { conv: { id: 'c', bot_paused: 0, unread: 0, last_alert_at: null }, usage: { replies: 3000 } };
  env = { DB: shimDB(st), DEFAULT_MONTHLY_CAP: '3000' };
  r = await runAssistantTurn({ env, client: { id: 'test', name: 'F', alerts_enabled: 0 }, convId: 'c', userText: 'hola', channel: 'web' });
  assert.equal(r.needsHuman, true);
  assert.match(r.displayReply, /muchas personas/);
});

test('privacy: ES + EN notices render with Ley 1581', async () => {
  const es = await (await handlePrivacy(new Request('https://a/privacidad'), {})).text();
  const en = await (await handlePrivacy(new Request('https://a/privacy'), {})).text();
  assert.match(es, /Ley 1581/);
  assert.match(en, /Law 1581/);
});

test('portal: dashboard renders bilingual', async () => {
  const env = { DB: shimDB({ session: { client_id: 'test' }, client: { id: 'test', name: 'Flora', bot_name: 'Flor' } }) };
  const es = await (await handlePortal(new Request('https://a/portal/dashboard', { headers: { Cookie: 'pwp_session=x' } }), env)).text();
  const en = await (await handlePortal(new Request('https://a/portal/dashboard', { headers: { Cookie: 'pwp_session=x; pwp_lang=en' } }), env)).text();
  assert.match(es, /Conversaciones recientes/);
  assert.match(en, /Recent conversations/);
});

test('admin: login gate shows without cookie', async () => {
  const env = { ADMIN_TOKEN: 's', DB: shimDB({ adminSession: null }) };
  const html = await (await handlePortal(new Request('https://a/portal/admin'), env)).text();
  assert.match(html, /Admin token/);
});
