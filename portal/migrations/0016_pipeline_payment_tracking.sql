-- 0016_pipeline_payment_tracking.sql
-- Add payment tracking columns so done pipeline stages show real stored data.
-- Also adds balance_link (separate from deposit_link) to avoid column reuse.

ALTER TABLE clients ADD COLUMN deposit_amount INTEGER;
ALTER TABLE clients ADD COLUMN deposit_paid_at INTEGER;
ALTER TABLE clients ADD COLUMN balance_link TEXT;
ALTER TABLE clients ADD COLUMN balance_amount INTEGER;
ALTER TABLE clients ADD COLUMN balance_paid_at INTEGER;
