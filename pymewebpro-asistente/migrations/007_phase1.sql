-- asistente-db schema v7 · Phase 1 (production correctness)
--  - WhatsApp 24h window: track last customer inbound + per-message delivery status
--  - Inbound media: store media url/type on messages
--  - Rate limiting + per-client monthly cap
-- Safe to re-run except the ALTERs (duplicate column errors are fine).

-- 24h window + delivery
ALTER TABLE conversations ADD COLUMN last_inbound_at TEXT;   -- last time the CUSTOMER messaged
ALTER TABLE messages ADD COLUMN delivery TEXT;               -- null | sent | blocked_24h | failed
ALTER TABLE messages ADD COLUMN media_url TEXT;              -- Twilio media URL (auth-gated)
ALTER TABLE messages ADD COLUMN media_type TEXT;            -- MIME, e.g. image/jpeg, audio/ogg

-- per-client monthly message cap (null/0 = use DEFAULT_MONTHLY_CAP var)
ALTER TABLE clients ADD COLUMN monthly_msg_cap INTEGER;

-- per-IP web-chat rate limiting (hashed ip + minute bucket)
CREATE TABLE IF NOT EXISTS rate_hits (
  bucket TEXT PRIMARY KEY,
  n      INTEGER NOT NULL DEFAULT 0,
  ts     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- per-client monthly usage counter (bot replies)
CREATE TABLE IF NOT EXISTS usage_counters (
  client_id TEXT NOT NULL,
  month     TEXT NOT NULL,      -- 'YYYY-MM' (UTC)
  replies   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (client_id, month)
);
