// turn.js — one assistant turn, shared by web chat (chat.js) and WhatsApp (whatsapp.js).
// Stores the inbound user message, decides whether the bot should answer (it stays
// quiet when a human has taken the conversation over), calls Claude, stores the
// reply, and flags the conversation for human attention when the bot can't help.

import { notifyOwner } from './wa-send.js';
import { getShopifyIntegration, lookupOrder, ORDER_TOOL } from './shopify.js';
import { maybeAlertOwner } from './alerts.js';
import { overClientCap, bumpClientUsage } from './rate.js';
import { decryptToken } from './cryptoutil.js';

const CAP_REPLY = 'Estamos atendiendo a muchas personas ahora. Permiteme conectarte con alguien del equipo.';

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const MAX_HISTORY  = 12; // messages of context

// Signal phrases the model emits at the very end of a reply.
const SIG_WHATSAPP = '[IR_A_WHATSAPP]';
const SIG_CITA     = '[IR_A_CITA]';
const SIG_HUMANO   = '[ESPERAR_HUMANO]'; // "please hold while I check" -> ping the owner

export function buildSystemPrompt(client, hasShopify) {
  const base = `Eres ${client.bot_name || 'Angela'}, el asistente virtual de ${client.name}. Respondes preguntas sobre sus productos y servicios de forma amable, cercana y concisa, en el mismo idioma que use la persona (espanol o ingles).

Reglas:
- Responde solo con lo que sabes del negocio. Nunca inventes precios, fechas, inventario ni politicas.
- Respuestas cortas: maximo 3 oraciones por turno. No uses listas largas.
- Si la persona quiere comprar, cotizar o tiene una consulta urgente, ofrece continuar por WhatsApp${client.wa_number ? ` (${client.wa_number})` : ''} y agrega exactamente ${SIG_WHATSAPP} al final.
- Si la persona quiere agendar una cita, reunion o llamada, dile que puede hacerlo aqui mismo y agrega exactamente ${SIG_CITA} al final.
- Si te preguntan algo que NO esta en la informacion del negocio, o que requiere a una persona real (un dato que no tienes, una decision), responde brevemente: "Permiteme un momento, lo confirmo y te respondo." y agrega exactamente ${SIG_HUMANO} al final. No inventes la respuesta.
- Pon la senal (${SIG_WHATSAPP}, ${SIG_CITA} o ${SIG_HUMANO}) solo al final y solo una por mensaje. No pongas ninguna senal cuando consultes un pedido.`;

  const order = hasShopify ? `\n- Si preguntan por el estado de un pedido, pide el numero de pedido y el correo de compra, luego usa la herramienta lookup_order. Traduce el estado a lenguaje claro: pago confirmado, en preparacion, enviado (con la guia si existe) o entregado. Si el correo no coincide, no des datos del pedido y pide que verifiquen. El seguimiento "en camino"/"entregado" depende de la transportadora.` : '';

  const knowledge = client.knowledge ? `\n\nINFORMACION DEL NEGOCIO:\n${client.knowledge}` : '';
  return base + order + knowledge;
}

// Call Claude, running a tool-use loop when tools are provided. Returns final text.
async function callClaude({ env, system, messages, tools, integration }) {
  let convo = messages.slice();
  for (let i = 0; i < 4; i++) {
    const body = { model: CLAUDE_MODEL, max_tokens: 500, system, messages: convo };
    if (tools && tools.length) body.tools = tools;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) { console.error('Claude error:', await resp.text()); throw new Error('AI unavailable'); }
    const data = await resp.json();

    if (data.stop_reason === 'tool_use') {
      convo.push({ role: 'assistant', content: data.content });
      const results = [];
      for (const block of (data.content || [])) {
        if (block.type !== 'tool_use') continue;
        let result = { error: 'unknown_tool' };
        if (block.name === 'lookup_order') result = await lookupOrder(integration, block.input || {});
        results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
      }
      convo.push({ role: 'user', content: results });
      continue; // let the model read the tool result and reply
    }

    return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
  }
  return ''; // tool loop exhausted
}

function detectSignals(text, client) {
  const out = { route: null, needsHuman: false };
  if (text.includes(SIG_HUMANO)) out.needsHuman = true;
  if (text.includes(SIG_WHATSAPP) && client.wa_number) {
    out.route = { type: 'whatsapp', url: `https://wa.me/${String(client.wa_number).replace(/\D/g, '')}` };
  } else if (text.includes(SIG_CITA)) {
    out.route = { type: 'cita', url: client.booking_url || null };
  }
  return out;
}

export function stripSignals(text) {
  return String(text || '')
    .replace(SIG_WHATSAPP, '')
    .replace(SIG_CITA, '')
    .replace(SIG_HUMANO, '')
    .trim();
}

// Anthropic requires alternating user/assistant turns. 'human' (owner) messages
// are shown to the model as assistant turns; we then merge any consecutive
// same-role messages so the payload always alternates.
function toClaudeMessages(rows) {
  const mapped = rows.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: String(m.content || ''),
  }));
  const merged = [];
  for (const msg of mapped) {
    const last = merged[merged.length - 1];
    if (last && last.role === msg.role) last.content += '\n' + msg.content;
    else merged.push({ ...msg });
  }
  // Anthropic requires the first message to be 'user'.
  while (merged.length && merged[0].role !== 'user') merged.shift();
  return merged;
}

// Run one turn. Returns { convId, reply, displayReply, route, needsHuman, paused }.
// `reply` is raw (with any signal stripped); `displayReply` is what to show the
// end user. When the conversation is in human-takeover mode, the bot stays quiet
// and we return { paused: true, reply: null }.
export async function runAssistantTurn({ env, client, convId, userText, channel, contactName, contactPhone, ctx, mediaUrl = null, mediaType = null, forceEscalate = false, cannedReply = null }) {
  const conv = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(convId).first();
  if (!conv) throw new Error('conversation not found: ' + convId);

  // Store the inbound user message (with any media reference) + stamp the customer's
  // last-inbound time (drives the WhatsApp 24h send window).
  await env.DB.prepare(
    'INSERT INTO messages (id, conversation_id, role, content, channel, media_url, media_type, ts) VALUES (?, ?, "user", ?, ?, ?, ?, datetime("now"))'
  ).bind(crypto.randomUUID(), convId, userText, channel, mediaUrl, mediaType).run();
  await env.DB.prepare('UPDATE conversations SET last_inbound_at = datetime("now") WHERE id = ?').bind(convId).run();

  // Owner alert: customer wrote and nobody has replied yet (cooldown + quiet hours
  // handled inside). alertSent lets us avoid double-pinging below.
  const alert = await maybeAlertOwner({ env, client, conv, userText, channel, contactName, contactPhone, ctx });
  const alertSent = alert.sent;

  // If the owner has taken over, the bot does not answer. Mark unread + nudge owner.
  if (conv.bot_paused) {
    await env.DB.prepare('UPDATE conversations SET last_message_at = datetime("now"), unread = 1 WHERE id = ?')
      .bind(convId).run();
    if (!alertSent) {
      const nudge = `Nuevo mensaje de ${contactName || 'un visitante'} (tu llevas esta conversacion):\n\n"${String(userText).slice(0, 240)}"`;
      if (ctx) ctx.waitUntil(notifyOwner(env, client, nudge)); else await notifyOwner(env, client, nudge);
    }
    return { convId, reply: null, displayReply: null, route: null, needsHuman: false, paused: true };
  }

  // Escalate without calling Claude when: media we can't read, or the client hit
  // its monthly cap. Store a canned reply, flag for a human, and stop.
  if (forceEscalate || await overClientCap(env, client)) {
    const reply = cannedReply || CAP_REPLY;
    await env.DB.batch([
      env.DB.prepare('INSERT INTO messages (id, conversation_id, role, content, channel, delivery, ts) VALUES (?, ?, "assistant", ?, ?, "sent", datetime("now"))')
        .bind(crypto.randomUUID(), convId, reply, channel),
      env.DB.prepare('UPDATE conversations SET last_message_at = datetime("now"), status = "needs_human", needs_human = 1, unread = 1 WHERE id = ?')
        .bind(convId),
    ]);
    if (!alertSent) {
      const base = (env.PORTAL_BASE_URL || 'https://asistente.pymewebpro.com') + '/portal/conversations/' + convId;
      const nudge = `${client.name}: el asistente necesita tu ayuda con ${contactName || 'un visitante'}.\n\n"${String(userText).slice(0, 240)}"\n\nResponde aqui: ${base}`;
      if (ctx) ctx.waitUntil(notifyOwner(env, client, nudge)); else await notifyOwner(env, client, nudge);
    }
    return { convId, reply, displayReply: reply, route: null, needsHuman: true, paused: false };
  }

  // Load recent history (now includes the message we just stored).
  const history = await env.DB.prepare(
    'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY ts DESC LIMIT ?'
  ).bind(convId, MAX_HISTORY).all();
  const claudeMessages = toClaudeMessages((history.results || []).reverse());

  // Expose the Shopify order tool only to clients that have it connected.
  const integration = await getShopifyIntegration(env, client.id);
  if (integration) integration.api_token = await decryptToken(env, integration.api_token);
  const tools = (integration && integration.api_token) ? [ORDER_TOOL] : [];

  let assistantText = '';
  try {
    assistantText = await callClaude({
      env,
      system: buildSystemPrompt(client, !!integration),
      messages: claudeMessages,
      tools,
      integration,
    });
  } catch (e) {
    console.error('Claude call error:', e);
    throw e;
  }

  const { route, needsHuman } = detectSignals(assistantText, client);
  const clean = stripSignals(assistantText);

  // Persist assistant reply + new conversation state.
  const status = needsHuman ? 'needs_human' : (route ? `routed_${route.type}` : 'active');
  await env.DB.batch([
    env.DB.prepare('INSERT INTO messages (id, conversation_id, role, content, channel, delivery, ts) VALUES (?, ?, "assistant", ?, ?, "sent", datetime("now"))')
      .bind(crypto.randomUUID(), convId, clean, channel),
    env.DB.prepare('UPDATE conversations SET last_message_at = datetime("now"), status = ?, needs_human = ?, unread = 1 WHERE id = ?')
      .bind(status, needsHuman ? 1 : 0, convId),
  ]);

  // Count this bot reply toward the client's monthly usage.
  if (ctx) ctx.waitUntil(bumpClientUsage(env, client.id)); else await bumpClientUsage(env, client.id);

  // On WhatsApp there's no inline form, so append the booking link to the text.
  let displayReply = clean;
  if (channel === 'whatsapp' && route && route.type === 'cita' && route.url) {
    displayReply = clean + '\n\nAgenda aqui: ' + route.url;
  }

  // Lead capture when routed to WhatsApp / cita (mirrors prior behaviour).
  if (route) {
    await env.DB.prepare(
      'INSERT INTO leads (id, client_id, conversation_id, visitor_name, intent, routed_to, ts) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))'
    ).bind(crypto.randomUUID(), client.id, convId, contactName || null, String(userText).slice(0, 500), route.type).run();
  }

  // The bot couldn't answer: flag for the owner and nudge them (unless the owner
  // alert above already pinged them this turn).
  if (needsHuman && !alertSent) {
    const base = (env.PORTAL_BASE_URL || 'https://asistente.pymewebpro.com') + '/portal/conversations/' + convId;
    const nudge = `${client.name}: el asistente necesita tu ayuda con ${contactName || 'un visitante'}.\n\n"${String(userText).slice(0, 240)}"\n\nResponde aqui: ${base}`;
    if (ctx) ctx.waitUntil(notifyOwner(env, client, nudge)); else await notifyOwner(env, client, nudge);
  }

  return { convId, reply: clean, displayReply, route, needsHuman, paused: false };
}
