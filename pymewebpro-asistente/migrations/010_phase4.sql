-- asistente-db schema v10 · Phase 4
--  - Per-client widget brand colour.
-- Safe to re-run except the ALTER (duplicate column error is fine).

ALTER TABLE clients ADD COLUMN widget_color TEXT;  -- primary hex colour for the chat widget (default #1f1a14)
