-- Lead funnel: tracks the high-volume early-stage funnel separate from the
-- prospect/deal funnel. Stages: raw -> contacted -> marketing_qualified ->
-- sales_qualified (exits to prospect funnel) -> disqualified.
--
-- Apply with:
--   wrangler d1 execute pymewebpro-portal --remote --file=migrations/0002_lead_funnel.sql
--
-- ALTER TABLE statements WILL error on re-run (the columns already exist).
-- That's expected per portal convention. Use --no-fail-fast if running ad-hoc.

ALTER TABLE leads ADD COLUMN lead_stage TEXT DEFAULT 'raw';
ALTER TABLE leads ADD COLUMN last_touched_at INTEGER;
ALTER TABLE leads ADD COLUMN last_touched_kind TEXT;
ALTER TABLE leads ADD COLUMN touches_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN next_action TEXT;
ALTER TABLE leads ADD COLUMN next_action_due INTEGER;

CREATE INDEX IF NOT EXISTS idx_leads_lead_stage     ON leads(lead_stage);
CREATE INDEX IF NOT EXISTS idx_leads_last_touched   ON leads(last_touched_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_next_action_due ON leads(next_action_due);

-- Backfill from legacy `status`. Idempotent: only touches rows still at the
-- default 'raw' so re-runs don't clobber later edits.
UPDATE leads SET lead_stage = 'contacted'       WHERE status = 'contacted' AND (lead_stage IS NULL OR lead_stage = 'raw');
UPDATE leads SET lead_stage = 'sales_qualified' WHERE status = 'converted' AND (lead_stage IS NULL OR lead_stage = 'raw');
UPDATE leads SET lead_stage = 'disqualified'    WHERE status = 'dismissed' AND (lead_stage IS NULL OR lead_stage = 'raw');
