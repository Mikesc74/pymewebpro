-- PymeWebPro engine schema (D1 / SQLite)

CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,                 -- uuid
  wompi_tx_id     TEXT UNIQUE,                      -- Wompi transaction id
  reference       TEXT UNIQUE NOT NULL,             -- our order reference sent to Wompi
  amount_cents    INTEGER NOT NULL,                 -- COP cents
  currency        TEXT NOT NULL DEFAULT 'COP',
  status          TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING|APPROVED|DECLINED|VOIDED|ERROR
  customer_email  TEXT,
  customer_name   TEXT,
  customer_phone  TEXT,
  kind            TEXT NOT NULL DEFAULT 'initial',  -- initial|upsell
  parent_order_id TEXT,                             -- for upsells
  raw_payload     TEXT,                             -- JSON of webhook event
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);

CREATE TABLE IF NOT EXISTS projects (
  id              TEXT PRIMARY KEY,                 -- uuid
  order_id        TEXT NOT NULL REFERENCES orders(id),
  intake_token    TEXT UNIQUE NOT NULL,             -- magic link for client intake
  status          TEXT NOT NULL DEFAULT 'awaiting_intake',
                  -- awaiting_intake|intake_done|mockup_ready|shared|revising|approved|delivered|refunded
  intake_json     TEXT,                             -- JSON blob of intake form
  blueprint_id    TEXT DEFAULT 'blueprint-1',
  current_mockup  TEXT,                             -- R2 key prefix for current mockup bundle
  pages_project   TEXT,                             -- Cloudflare Pages project name once deployed
  domain          TEXT,                             -- final attached domain
  notes           TEXT,                             -- admin notes
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_projects_order ON projects(order_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE TABLE IF NOT EXISTS assets (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id),
  kind         TEXT NOT NULL,                       -- logo|photo|reference|other
  filename     TEXT NOT NULL,
  r2_key       TEXT NOT NULL,
  mime         TEXT,
  size_bytes   INTEGER,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);

CREATE TABLE IF NOT EXISTS mockups (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id),
  version      INTEGER NOT NULL,                    -- 1, 2, 3 ...
  r2_prefix    TEXT NOT NULL,                       -- where bundle lives in R2
  prompt_used  TEXT,
  notes        TEXT,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_mockups_project ON mockups(project_id);

CREATE TABLE IF NOT EXISTS share_links (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id),
  token        TEXT UNIQUE NOT NULL,                -- random url-safe token
  expires_at   INTEGER NOT NULL,                    -- unix
  revoked      INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_share_project ON share_links(project_id);

CREATE TABLE IF NOT EXISTS revisions (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id),
  share_link_id TEXT REFERENCES share_links(id),
  section       TEXT,                               -- which section of the mockup
  comment       TEXT NOT NULL,
  author        TEXT NOT NULL DEFAULT 'client',     -- client|admin
  status        TEXT NOT NULL DEFAULT 'open',       -- open|addressed
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_revisions_project ON revisions(project_id);

CREATE TABLE IF NOT EXISTS upsells (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id),
  sku          TEXT NOT NULL,                       -- e.g. extra_page, blog, en_version, hosting_premium
  label        TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'proposed',    -- proposed|accepted|paid|removed
  order_id     TEXT REFERENCES orders(id),
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_upsells_project ON upsells(project_id);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id          TEXT PRIMARY KEY,                     -- random session token (cookie value)
  email       TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
