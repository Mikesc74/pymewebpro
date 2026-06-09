// chat.js — POST /api/chat (web widget) + GET /api/poll (widget receives human/agent replies)
// Thin wrappers around the shared turn engine in turn.js.

import { runAssistantTurn } from './turn.js';
import { checkIpRate } from './rate.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: CORS });

export async function handleChat(request, env, ctx) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { client_id, conversation_id, message } = body;
  if (!client_id || !message) return json({ error: 'client_id and message required' }, 400);

  // Per-IP rate limit (abuse + cost protection).
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!(await checkIpRate(env, ip, 20))) {
    return json({ conversation_id: conversation_id || null, reply: 'Estas enviando mensajes muy rapido. Espera un momento e intenta de nuevo.', route: null, paused: false }, 429);
  }

  const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ? AND active = 1').bind(client_id).first();
  if (!client) return json({ error: 'Client not found' }, 404);

  // Get or create the web conversation.
  let convId = conversation_id;
  if (!convId) {
    convId = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO conversations (id, client_id, channel, started_at, last_message_at, status, unread) VALUES (?, ?, "web", datetime("now"), datetime("now"), "active", 1)'
    ).bind(convId, client_id).run();
  } else {
    const conv = await env.DB.prepare('SELECT id FROM conversations WHERE id = ? AND client_id = ?').bind(convId, client_id).first();
    if (!conv) return json({ error: 'Conversation not found' }, 404);
  }

  let result;
  try {
    result = await runAssistantTurn({
      env, client, convId, userText: message, channel: 'web', ctx,
    });
  } catch {
    return json({ error: 'AI unavailable', conversation_id: convId }, 502);
  }

  // When a human has taken over, there is no bot reply; the widget will poll.
  const nowRow = await env.DB.prepare("SELECT datetime('now') as now").first();
  return json({
    conversation_id: convId,
    reply: result.paused ? null : result.displayReply,
    route: result.route,
    paused: !!result.paused,
    server_ts: nowRow?.now || '',
  });
}

// GET /api/poll?conversation=ID&after=ISO  ·  returns new assistant/human messages.
// Lets the widget surface replies typed by the owner from the portal (takeover).
export async function handlePoll(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const url   = new URL(request.url);
  const convId = url.searchParams.get('conversation');
  const after  = url.searchParams.get('after') || '1970-01-01';
  if (!convId) return json({ error: 'conversation required' }, 400);

  const rows = await env.DB.prepare(
    "SELECT role, content, ts FROM messages WHERE conversation_id = ? AND role IN ('assistant','human') AND ts > ? ORDER BY ts ASC"
  ).bind(convId, after).all();

  const nowRow = await env.DB.prepare("SELECT datetime('now') as now").first();
  return json({ messages: rows.results || [], server_ts: nowRow?.now || '' });
}
