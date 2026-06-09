-- 0021_lead_wizard_pay.sql
-- PymeWebPro port of the ChatClick mockup-first funnel. Adds the wizard +
-- payment + launch columns to the LEADS table (the intake_assets/deposit cols
-- from 0016/0017 are on `clients`, not leads). Mirrors chatclick-crm-db.
--   wizard_token / wizard_submitted_at / intake_data  · the Spanish intake
--       wizard (valentina.pymewebpro.com/w/<token>) writes vision + assets here.
--   pay_token / agreement_accepted_at / paid_at       · the Wompi full-payment
--       agreement page (no deposit) sets these.
--   launch_steps (JSON)                               · the post-payment launch
--       checklist (domain / Ficha de Google / asistente / live / review).
ALTER TABLE leads ADD COLUMN wizard_token TEXT;
ALTER TABLE leads ADD COLUMN wizard_submitted_at INTEGER;
ALTER TABLE leads ADD COLUMN intake_data TEXT;
ALTER TABLE leads ADD COLUMN pay_token TEXT;
ALTER TABLE leads ADD COLUMN agreement_accepted_at INTEGER;
ALTER TABLE leads ADD COLUMN paid_at INTEGER;
ALTER TABLE leads ADD COLUMN launch_steps TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_wizard_token ON leads(wizard_token);
CREATE INDEX IF NOT EXISTS idx_leads_pay_token ON leads(pay_token);
