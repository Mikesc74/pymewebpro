-- 0015_pipeline.sql
-- Adds production_stage to clients for the post-sale pipeline view.
-- Stages (in order): new_client → deposit_sent → deposit_paid → wizard_sent
--   → assets_received → site_generated → approval_sent → approved
--   → chatbot_configured → balance_sent → balance_paid → live

ALTER TABLE clients ADD COLUMN production_stage TEXT NOT NULL DEFAULT 'new_client';
ALTER TABLE clients ADD COLUMN deposit_link TEXT;
ALTER TABLE clients ADD COLUMN wizard_link TEXT;
ALTER TABLE clients ADD COLUMN preview_url TEXT;
ALTER TABLE clients ADD COLUMN domain TEXT;
ALTER TABLE clients ADD COLUMN wa_number TEXT;
ALTER TABLE clients ADD COLUMN stage_updated_at INTEGER;

-- Back-fill existing clients based on their current status
UPDATE clients SET production_stage = 'wizard_sent'    WHERE status = 'invited';
UPDATE clients SET production_stage = 'assets_received' WHERE status = 'in_progress';
UPDATE clients SET production_stage = 'assets_received' WHERE status = 'submitted';
UPDATE clients SET production_stage = 'live'            WHERE status = 'active';
