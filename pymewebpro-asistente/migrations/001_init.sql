-- asistente-db schema v1
-- One row per Plan de ventas client

CREATE TABLE IF NOT EXISTS clients (
  id           TEXT PRIMARY KEY,          -- slug: "floraypez", "panaderia-luna"
  name         TEXT NOT NULL,             -- "Flora y Pez"
  domain       TEXT,                      -- "floraypez.shop"
  wa_number    TEXT,                      -- "+573001234567"
  booking_url  TEXT,                      -- Cal.com or Calendly link
  knowledge    TEXT,                      -- free-text system prompt / FAQ
  portal_token TEXT NOT NULL,             -- secret token for portal login
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per visitor chat session
CREATE TABLE IF NOT EXISTS conversations (
  id              TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL REFERENCES clients(id),
  visitor_id      TEXT,                   -- anonymous fingerprint from widget
  started_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_message_at TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
  -- active | closed | routed_wa | routed_booking
);

-- Individual messages within a conversation
CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  role            TEXT NOT NULL,          -- 'user' | 'assistant'
  content         TEXT NOT NULL,
  ts              TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Leads captured when bot routes visitor to WA or booking
CREATE TABLE IF NOT EXISTS leads (
  id              TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL REFERENCES clients(id),
  conversation_id TEXT REFERENCES conversations(id),
  visitor_name    TEXT,
  intent          TEXT,                   -- last user message before routing
  routed_to       TEXT,                   -- 'whatsapp' | 'booking'
  ts              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_leads_client ON leads(client_id);
