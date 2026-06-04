-- 0015_lead_owner.sql · 2026-06-04
--
-- Adds an `owner` column to leads so each prospect can be assigned to a sales
-- handle (mike / santi / cristian / camila). Auto-claimed on first action by
-- the actor; only Mike (admin) may manually reassign.
--
-- NOTE: this column was already added out of band on the live DB, so re-running
-- this ALTER will error ("duplicate column name"). That is fine and expected,
-- same idempotency note as the other migrations.
ALTER TABLE leads ADD COLUMN owner TEXT;
