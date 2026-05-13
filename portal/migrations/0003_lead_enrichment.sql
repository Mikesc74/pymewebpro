-- Lead funnel enrichment: cold-outreach columns + stage rename.
-- Idempotent (where possible). ALTERs error on re-run; ignore.
--
-- Apply with:
--   wrangler d1 execute pymewebpro-portal --remote --file=migrations/0003_lead_enrichment.sql

-- 1. Rename the initial funnel stage from internal 'raw' to user-facing 'new'.
UPDATE leads SET lead_stage = 'new'
 WHERE lead_stage = 'raw' OR lead_stage IS NULL;

-- 2. New columns for cold-outreach research data (heat scoring, business
-- enrichment, motion = build/upgrade play). Stash extras in metadata JSON.
ALTER TABLE leads ADD COLUMN heat            TEXT;     -- HOT|WARM|COLD|DEAD
ALTER TABLE leads ADD COLUMN score           REAL;     -- 0..100 outreach score
ALTER TABLE leads ADD COLUMN category        TEXT;     -- Hotel, Café, Restaurante, ...
ALTER TABLE leads ADD COLUMN city            TEXT;
ALTER TABLE leads ADD COLUMN instagram       TEXT;
ALTER TABLE leads ADD COLUMN whatsapp        TEXT;
ALTER TABLE leads ADD COLUMN current_site    TEXT;
ALTER TABLE leads ADD COLUMN cms             TEXT;
ALTER TABLE leads ADD COLUMN motion          TEXT;     -- new_build | upgrade
ALTER TABLE leads ADD COLUMN address         TEXT;
ALTER TABLE leads ADD COLUMN suggested_pitch TEXT;
ALTER TABLE leads ADD COLUMN followers       INTEGER;
ALTER TABLE leads ADD COLUMN on_today_list   INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_leads_heat   ON leads(heat);
CREATE INDEX IF NOT EXISTS idx_leads_city   ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_motion ON leads(motion);
CREATE INDEX IF NOT EXISTS idx_leads_today  ON leads(on_today_list);
