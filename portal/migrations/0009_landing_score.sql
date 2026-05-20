-- Landing-page-fit scoring lens + bulk prospecting job tracker.
--
-- Two independent additions:
--   1. A SECOND scoring lens on leads. The original computeFitScore rewards
--      businesses with no/weak site (a new-build play). computeLandingScore is
--      the inverse thesis: a digitally-mature business (real site, runs ads,
--      lots of reviews) is a PRIME landing-page customer. Both scores live
--      side by side · neither replaces the other.
--   2. A prospecting_jobs table so a server-side cron can chew through a large
--      bulk pull (e.g. 5,000 leads) across many short Worker invocations,
--      resuming from a cursor each time so no single run hits subrequest limits.
--
-- Idempotent (where possible). ALTERs error on re-run; that is fine, ignore.
--
-- Apply with:
--   wrangler d1 execute pymewebpro-portal --remote --file=migrations/0009_landing_score.sql

-- 1. Landing-page-fit lens on leads. landing_score is 0..100; landing_heat is
-- the bucket (HOT/WARM/COOL/COLD/DEAD), same thresholds as the fit-score heat.
ALTER TABLE leads ADD COLUMN landing_score REAL;   -- 0..100 landing-page-fit score
ALTER TABLE leads ADD COLUMN landing_heat  TEXT;   -- HOT|WARM|COOL|COLD|DEAD

CREATE INDEX IF NOT EXISTS idx_leads_landing_heat ON leads(landing_heat);

-- 2. Bulk prospecting jobs. A row arms a large pull; a cron (runBulkProspectBatch)
-- consumes ~60 Places calls per invocation and resumes from `cursor` so the
-- pull spans many runs without exceeding the Worker subrequest budget.
CREATE TABLE IF NOT EXISTS prospecting_jobs (
  id         TEXT PRIMARY KEY,
  status     TEXT NOT NULL DEFAULT 'running',   -- running | done | paused
  target     INTEGER NOT NULL,                  -- how many NEW leads to insert
  inserted   INTEGER NOT NULL DEFAULT 0,
  skipped    INTEGER NOT NULL DEFAULT 0,
  cursor     TEXT,                              -- JSON {vIndex, cIndex, pageToken} so the cron resumes where it left off
  cities     TEXT,                              -- JSON array of city slugs
  verticals  TEXT,                              -- JSON array of vertical slugs
  notes      TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prospecting_jobs_status ON prospecting_jobs(status);
