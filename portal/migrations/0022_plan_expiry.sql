-- 0022_plan_expiry.sql
-- The optional $150.000 COP/mes plan is billed via a recurring Wompi link sent
-- on WhatsApp (no deposit, no tokenized auto-debit). Each approved plan payment
-- (reference pwp-plan-<leadId>-<ts>) extends plan_expires_at by 30 days. The
-- full setup payment seeds plan_expires_at = paid_at + 30 days (the included
-- first month), so the first monthly link is only needed once that runs out.
ALTER TABLE leads ADD COLUMN plan_expires_at INTEGER;
