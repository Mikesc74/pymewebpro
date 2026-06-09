-- asistente-db schema v6 · owner alerts ("a customer wrote and nobody has replied").
-- Safe to re-run except the ALTERs (error on duplicate column, which is fine).

-- Per-conversation alert state (drives the cooldown).
ALTER TABLE conversations ADD COLUMN last_alert_at TEXT;  -- datetime of the last owner alert sent

-- Per-client alert config (notify_email + notify_wa already exist from 003).
ALTER TABLE clients ADD COLUMN alerts_enabled INTEGER NOT NULL DEFAULT 1;  -- master on/off
ALTER TABLE clients ADD COLUMN quiet_start     INTEGER DEFAULT 21;          -- quiet-hours start, Bogota hour 0-23 (null/equal = none)
ALTER TABLE clients ADD COLUMN quiet_end       INTEGER DEFAULT 7;           -- quiet-hours end, Bogota hour 0-23
