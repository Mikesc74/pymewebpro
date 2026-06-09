// db.js · D1 helpers for Valentina's own state in AGENT_DB.
// Lead + payment rows go in PORTAL_DB; see payments.js for those writes.

function uuid() {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function getOrCreateWebConversation(db, sessionId) {
  let row = await db.prepare(
    `SELECT * FROM conversations WHERE session_id = ?`
  ).bind(sessionId).first();
  if (row) return row;
  const id = uuid();
  const now = Date.now();
  await db.prepare(
    `INSERT INTO conversations
       (id, session_id, channel, language, status, last_message_at, created_at, updated_at)
     VALUES (?, ?, 'web', 'es', 'open', ?, ?, ?)`
  ).bind(id, sessionId, now, now, now).run();
  return db.prepare(`SELECT * FROM conversations WHERE id = ?`).bind(id).first();
}

export async function getOrCreateWhatsAppConversation(db, phone, contactName = null) {
  let row = await db.prepare(
    `SELECT * FROM conversations
      WHERE channel = 'whatsapp' AND contact_phone = ? AND status != 'closed'
      ORDER BY updated_at DESC LIMIT 1`
  ).bind(phone).first();
  if (row) return row;
  const id = uuid();
  const now = Date.now();
  await db.prepare(
    `INSERT INTO conversations
       (id, session_id, channel, contact_phone, contact_name, language, status, last_message_at, created_at, updated_at)
     VALUES (?, ?, 'whatsapp', ?, ?, 'es', 'open', ?, ?, ?)`
  ).bind(id, `wa:${phone}:${now}`, phone, contactName, now, now, now).run();
  return db.prepare(`SELECT * FROM conversations WHERE id = ?`).bind(id).first();
}

export async function setConversationLanguage(db, conversationId, lang) {
  await db.prepare(
    `UPDATE conversations SET language = ?, updated_at = ? WHERE id = ?`
  ).bind(lang, Date.now(), conversationId).run();
}

export async function updateConversationContact(db, conversationId, fields) {
  const allowed = ["contact_name", "contact_phone", "contact_email", "business_name", "portal_lead_id", "status"];
  const sets = [];
  const vals = [];
  for (const k of allowed) {
    if (fields[k] !== undefined && fields[k] !== null) {
      sets.push(`${k} = ?`);
      vals.push(fields[k]);
    }
  }
  if (!sets.length) return;
  vals.push(Date.now(), conversationId);
  await db.prepare(
    `UPDATE conversations SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`
  ).bind(...vals).run();
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function appendMessage(db, conversationId, role, content, opts = {}) {
  const id = uuid();
  const now = Date.now();
  await db.prepare(
    `INSERT INTO messages
       (id, conversation_id, role, content, tool_name, tool_input, tool_output, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, conversationId, role, content,
    opts.toolName || null,
    opts.toolInput ? (typeof opts.toolInput === "string" ? opts.toolInput : JSON.stringify(opts.toolInput)) : null,
    opts.toolOutput || null,
    now,
  ).run();
  await db.prepare(
    `UPDATE conversations SET last_message_at = ?, updated_at = ? WHERE id = ?`
  ).bind(now, now, conversationId).run();
  return id;
}

export async function getRecentMessages(db, conversationId, limit = 30) {
  const { results } = await db.prepare(
    `SELECT id, role, content, tool_name, tool_input, tool_output, created_at
       FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
      LIMIT ?`
  ).bind(conversationId, limit).all();
  return results || [];
}
