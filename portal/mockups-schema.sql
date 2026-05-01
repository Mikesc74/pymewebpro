-- Run once against pymewebpro-portal D1 (id 93fc7e21-713c-4479-bb55-69ae05c275dc)
-- Already applied via Cloudflare MCP on 2026-04-30. Keep for re-runs / local dev.

CREATE TABLE IF NOT EXISTS mockups (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  blueprint_key TEXT NOT NULL DEFAULT 'blueprint-1',
  html_r2_key TEXT NOT NULL,
  prompt TEXT,
  anthropic_model TEXT,
  status TEXT NOT NULL DEFAULT 'draft',          -- draft|shared|approved|shipped|archived
  shipped_at INTEGER,
  shipped_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_mockups_client ON mockups(client_id);
CREATE INDEX IF NOT EXISTS idx_mockups_status ON mockups(status);

CREATE TABLE IF NOT EXISTS mockup_shares (
  token TEXT PRIMARY KEY,
  mockup_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at INTEGER,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_mockup_shares_mockup ON mockup_shares(mockup_id);

CREATE TABLE IF NOT EXISTS mockup_comments (
  id TEXT PRIMARY KEY,
  mockup_id TEXT NOT NULL,
  share_token TEXT,
  section TEXT,
  body TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'client',         -- client|admin
  status TEXT NOT NULL DEFAULT 'open',           -- open|addressed
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_mockup_comments_mockup ON mockup_comments(mockup_id);
