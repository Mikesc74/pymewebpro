-- Enrichment v2: Google Places + site detection + scoring.
-- Adds canonical Places fields (id, rating, review_count, hours) plus a
-- last_enriched_at timestamp so we can re-prioritize stale leads. The new
-- enrich.js writes these in 'places', 'site', and 'full' modes.
-- Idempotent (where possible). ALTERs error on re-run; ignore.
--
-- Apply with:
--   wrangler d1 execute pymewebpro-portal --remote --file=migrations/0007_enrich_v2.sql

-- 1. Google Places canonical fields. place_id is the dedup key for future
-- outbound loaders (so we don't double-import the same listing under a
-- slightly different business_name). rating is 1.0..5.0. hours is the
-- weekday_text array from Places, JSON-stringified.
ALTER TABLE leads ADD COLUMN place_id         TEXT;
ALTER TABLE leads ADD COLUMN rating           REAL;     -- 1.0..5.0
ALTER TABLE leads ADD COLUMN review_count     INTEGER;
ALTER TABLE leads ADD COLUMN hours            TEXT;     -- JSON-stringified weekday_text[]

-- 2. last_enriched_at is bumped on every enrichment ATTEMPT (success or
-- skip), so the priority picker can avoid re-trying a lead we just touched.
ALTER TABLE leads ADD COLUMN last_enriched_at INTEGER;  -- ms

-- 3. Index on place_id for the outbound prospecting loader's dedup check.
CREATE INDEX IF NOT EXISTS idx_leads_place_id ON leads(place_id);
