-- 0014_client_replied.sql · real "Responded" signal for the Team stats board
-- ---------------------------------------------------------------------------
-- Adds an explicit, intentional reply marker on a lead. Set when a rep taps
-- "Mark client replied" on the lead card (the prospect actually wrote back).
-- This replaces the old heat/stage proxy used by teamResponded() on
-- ventas-midia.html, which over-counted because heat (HOT/WARM) is a manual
-- tag a rep can set without any reply happening.
--
-- Idempotent CREATE/ALTER: the ALTER errors with "duplicate column" on re-run,
-- which is safe to ignore.
--
-- Apply with:
--   wrangler d1 execute pymewebpro-portal --remote --file=migrations/0014_client_replied.sql

ALTER TABLE leads ADD COLUMN client_replied_at INTEGER;  -- unix ms of the first inbound reply, NULL = no reply yet

CREATE INDEX IF NOT EXISTS idx_leads_client_replied ON leads(client_replied_at);
