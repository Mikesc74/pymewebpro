-- pymewebpro-agent-db · initial schema
-- Stores Valentina's conversation state. Leads + payments still live in
-- pymewebpro-portal D1 so the existing webhook+conversion flow handles
-- Wompi approvals identically for both surfaces.

CREATE TABLE IF NOT EXISTS conversations (
  id              TEXT PRIMARY KEY,
  session_id      TEXT UNIQUE,
  channel         TEXT NOT NULL,                -- 'web' | 'whatsapp'
  contact_name    TEXT,
  contact_phone   TEXT,
  contact_email   TEXT,
  business_name   TEXT,
  language        TEXT DEFAULT 'es',
  portal_lead_id  TEXT,                          -- foreign id into pymewebpro-portal.leads
  status          TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'paid' | 'escalated' | 'closed'
  last_message_at INTEGER,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conv_session    ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conv_phone      ON conversations(contact_phone);
CREATE INDEX IF NOT EXISTS idx_conv_status     ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conv_updated_at ON conversations(updated_at);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role            TEXT NOT NULL,                 -- 'user' | 'assistant' | 'tool'
  content         TEXT NOT NULL,
  tool_name       TEXT,
  tool_input      TEXT,
  tool_output     TEXT,
  created_at      INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_msg_conv       ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_msg_created_at ON messages(created_at);

-- Track deposit links Valentina has handed out, even before the prospect pays.
-- Useful for analytics and for resending a link mid-conversation.
CREATE TABLE IF NOT EXISTS deposit_intents (
  id                TEXT PRIMARY KEY,
  conversation_id   TEXT NOT NULL,
  portal_lead_id    TEXT NOT NULL,
  portal_payment_id TEXT NOT NULL,
  plan              TEXT NOT NULL,               -- 'esencial' | 'pro'
  amount_cop        INTEGER NOT NULL,            -- 30% of plan price, in COP (not cents)
  reference         TEXT NOT NULL UNIQUE,
  checkout_url      TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  created_at        INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_dep_conv   ON deposit_intents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dep_status ON deposit_intents(status);
