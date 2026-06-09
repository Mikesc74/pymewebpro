-- 0017_intake_assets.sql
-- Adds intake_assets column to track which client-submitted assets have been received.
-- Stored as JSON: { "logo": true, "photos": false, ... }

ALTER TABLE clients ADD COLUMN intake_assets TEXT;
