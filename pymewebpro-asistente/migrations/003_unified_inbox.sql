-- asistente-db schema v3 · unified inbox (web + WhatsApp) + human takeover
-- Safe to re-run: CREATE ... IF NOT EXISTS is idempotent; ALTERs may error on
-- re-run if the column already exists, which is fine (ignore "duplicate column").

-- ---- conversations: channel + contact + takeover state ----
ALTER TABLE conversations ADD COLUMN channel       TEXT NOT NULL DEFAULT 'web';   -- 'web' | 'whatsapp'
ALTER TABLE conversations ADD COLUMN contact_name  TEXT;                           -- visitor name (WA profile name, or captured)
ALTER TABLE conversations ADD COLUMN contact_phone TEXT;                           -- E.164, set for WhatsApp convos
ALTER TABLE conversations ADD COLUMN needs_human   INTEGER NOT NULL DEFAULT 0;     -- 1 = bot asked the owner to step in
ALTER TABLE conversations ADD COLUMN bot_paused    INTEGER NOT NULL DEFAULT 0;     -- 1 = owner took over, bot stays quiet
ALTER TABLE conversations ADD COLUMN unread        INTEGER NOT NULL DEFAULT 0;     -- 1 = new inbound since owner last opened

-- Fast lookup of a live WhatsApp conversation by client + phone
CREATE INDEX IF NOT EXISTS idx_conv_client_channel ON conversations(client_id, channel);
CREATE INDEX IF NOT EXISTS idx_conv_phone ON conversations(client_id, contact_phone);

-- ---- messages: allow a 'human' role (the owner replying from the portal) ----
-- role is free-text TEXT already, so no schema change needed; values now:
--   'user' | 'assistant' | 'human'
ALTER TABLE messages ADD COLUMN channel TEXT;  -- optional per-message channel tag

-- ---- clients: per-tenant WhatsApp Cloud API + owner notification ----
-- All client WhatsApp numbers live under the NorteSur WABA, so ONE shared
-- WA_ACCESS_TOKEN (worker secret) sends for every client; we route by phone_number_id.
ALTER TABLE clients ADD COLUMN wa_phone_number_id TEXT;  -- Meta phone-number-id for this client's WA line
ALTER TABLE clients ADD COLUMN notify_wa          TEXT;  -- owner's personal WA (E.164) to ping on takeover
ALTER TABLE clients ADD COLUMN notify_email       TEXT;  -- optional email fallback for notifications

CREATE INDEX IF NOT EXISTS idx_clients_wa_pnid ON clients(wa_phone_number_id);

-- ---- Shopify (and future) per-client integrations · used by the order-status tool ----
CREATE TABLE IF NOT EXISTS integrations (
  client_id   TEXT NOT NULL REFERENCES clients(id),
  kind        TEXT NOT NULL,           -- 'shopify'
  shop_domain TEXT,                    -- 'mystore.myshopify.com'
  api_token   TEXT,                    -- Admin API access token (read_orders, read_fulfillments)
  config      TEXT,                    -- JSON for anything else
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (client_id, kind)
);
