-- CRM extension for pymewebpro-portal D1
-- ----------------------------------------
-- Adds: deals (pipeline), activities (touchpoint log)
-- Reuses: existing `leads` and `clients` tables.
-- Idempotent: safe to re-run.
--
-- Apply with:
--   wrangler d1 execute pymewebpro-portal --remote --file=migrations/0001_crm.sql

CREATE TABLE IF NOT EXISTS deals (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  lead_id           TEXT,                                 -- FK -> leads.id (nullable)
  client_id         TEXT,                                 -- FK -> clients.id (nullable)
  stage             TEXT NOT NULL DEFAULT 'qualifying',   -- qualifying|proposal|negotiation|won|lost
  plan              TEXT,                                 -- esencial|pro|custom|NULL
  value_cad_cents   INTEGER,                              -- price in CAD cents (e.g. CAD $500 -> 50000)
  value_cop_cents   INTEGER,                              -- price in COP cents
  probability       INTEGER NOT NULL DEFAULT 25,          -- 0..100
  expected_close    INTEGER,                              -- unix ms
  owner             TEXT NOT NULL DEFAULT 'mike',         -- mike|santi
  source            TEXT,                                 -- where the deal came from (referral, ads, etc.)
  next_action       TEXT,                                 -- short string of next step
  next_action_due   INTEGER,                              -- unix ms
  notes             TEXT,
  created_at        INTEGER NOT NULL DEFAULT (unixepoch()*1000),
  updated_at        INTEGER NOT NULL DEFAULT (unixepoch()*1000),
  closed_at         INTEGER                                -- set when stage=won|lost
);
CREATE INDEX IF NOT EXISTS idx_deals_stage      ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_owner      ON deals(owner);
CREATE INDEX IF NOT EXISTS idx_deals_lead       ON deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_client     ON deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_close_date ON deals(expected_close);

CREATE TABLE IF NOT EXISTS activities (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL,                          -- call|whatsapp|email|meeting|note|task
  subject       TEXT NOT NULL,
  body          TEXT,
  lead_id       TEXT,
  client_id     TEXT,
  deal_id       TEXT,
  owner         TEXT NOT NULL DEFAULT 'mike',
  outcome       TEXT,                                   -- positive|neutral|negative|no_response|NULL
  occurred_at   INTEGER NOT NULL DEFAULT (unixepoch()*1000),
  due_at        INTEGER,                                -- for tasks (kind='task')
  done          INTEGER NOT NULL DEFAULT 0,             -- 0|1 for tasks
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()*1000),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch()*1000)
);
CREATE INDEX IF NOT EXISTS idx_activities_lead      ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_client    ON activities(client_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal      ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_occurred  ON activities(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_due       ON activities(due_at);
CREATE INDEX IF NOT EXISTS idx_activities_kind      ON activities(kind);
