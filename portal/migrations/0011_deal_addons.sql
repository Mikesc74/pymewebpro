-- 0011_deal_addons.sql
-- Stores the add-on selection Santi picks in the Mi día "Propuesta" column, as a
-- JSON array of keys (e.g. ["gbp","bilingual"]). The proposal generator reads it
-- to build the priced line items. The deal's `notes` column holds the free-text
-- client requirements. Not idempotent: ALTER errors if the column already exists.
ALTER TABLE deals ADD COLUMN addons TEXT;
