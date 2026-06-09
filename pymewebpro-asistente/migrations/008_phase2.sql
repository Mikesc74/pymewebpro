-- asistente-db schema v8 · Phase 2 (conversation lifecycle)
-- status already supports 'closed'; add closed_at for record + sorting.
-- Safe to re-run except the ALTER (duplicate column error is fine).

ALTER TABLE conversations ADD COLUMN closed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_conv_status ON conversations(client_id, status);
