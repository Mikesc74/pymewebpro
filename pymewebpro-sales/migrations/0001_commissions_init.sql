-- pymewebpro-commissions-db · v1 schema
-- Tracks sales reps, their prospects, closed sales (20% one-time),
-- and monthly recurring charges (10% for 12 months from sale_date).
-- All amounts in COP, integer (no decimals). Dates ISO YYYY-MM-DD.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sellers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT NOT NULL UNIQUE,                   -- always lowercase, matches Cloudflare Access identity
  name            TEXT NOT NULL,
  whatsapp        TEXT,
  role            TEXT NOT NULL CHECK (role IN ('admin','seller')) DEFAULT 'seller',
  active          INTEGER NOT NULL DEFAULT 1,
  payout_method   TEXT,                                   -- free text, e.g. "Bancolombia ahorros 123-456789-01" or "Nequi 300xxx"
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prospects (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_seller_id   INTEGER NOT NULL REFERENCES sellers(id),
  name              TEXT NOT NULL,                        -- contact name
  company           TEXT,                                 -- business name
  email             TEXT,
  whatsapp          TEXT,
  city              TEXT,
  stage             TEXT NOT NULL CHECK (stage IN ('nuevo','contactado','calificado','propuesta','ganado','perdido')) DEFAULT 'nuevo',
  source            TEXT,                                 -- "WhatsApp", "referido", "Valentina", etc.
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_prospects_owner ON prospects(owner_seller_id);
CREATE INDEX IF NOT EXISTS idx_prospects_stage ON prospects(stage);

-- Initial $400.000 base sale. 20% commission held 31 days (MBG window).
CREATE TABLE IF NOT EXISTS sales (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  prospect_id              INTEGER NOT NULL REFERENCES prospects(id),
  owner_seller_id          INTEGER NOT NULL REFERENCES sellers(id),  -- locked at sale time; immutable for commission attribution
  sale_date                TEXT NOT NULL,                            -- YYYY-MM-DD
  base_amount_cop          INTEGER NOT NULL,                         -- usually 400000
  commission_rate_pct      INTEGER NOT NULL DEFAULT 20,              -- stored per-row so policy changes don't rewrite history
  commission_amount_cop    INTEGER NOT NULL,                         -- = floor(base_amount_cop * commission_rate_pct / 100)
  payout_due_date          TEXT NOT NULL,                            -- = date(sale_date, '+31 days')
  status                   TEXT NOT NULL CHECK (status IN ('pending','paid','refunded','voided')) DEFAULT 'pending',
  paid_at                  TEXT,                                     -- when the rep was paid out
  refunded_at              TEXT,                                     -- when the client got the MBG refund
  notes                    TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sales_owner   ON sales(owner_seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_status  ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_due     ON sales(payout_due_date);

-- One row per monthly plan charge (hosting $30k / presencia $50k / ventas $150k).
-- 10% commission, eligible immediately on charge date (no MBG on rendered service).
-- Only valid for charges where charge_date <= date(sales.sale_date, '+1 year').
CREATE TABLE IF NOT EXISTS recurring_charges (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id                  INTEGER NOT NULL REFERENCES sales(id),
  prospect_id              INTEGER NOT NULL REFERENCES prospects(id),
  owner_seller_id          INTEGER NOT NULL REFERENCES sellers(id),  -- denormalized from sales row
  plan                     TEXT NOT NULL CHECK (plan IN ('hosting','presencia','ventas')),
  charge_date              TEXT NOT NULL,
  amount_cop               INTEGER NOT NULL,                         -- 30000 / 50000 / 150000
  commission_rate_pct      INTEGER NOT NULL DEFAULT 10,
  commission_amount_cop    INTEGER NOT NULL,
  payout_due_date          TEXT NOT NULL,                            -- = charge_date by default
  status                   TEXT NOT NULL CHECK (status IN ('pending','paid','voided')) DEFAULT 'pending',
  paid_at                  TEXT,
  notes                    TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_recurring_owner ON recurring_charges(owner_seller_id);
CREATE INDEX IF NOT EXISTS idx_recurring_sale  ON recurring_charges(sale_id);
CREATE INDEX IF NOT EXISTS idx_recurring_due   ON recurring_charges(payout_due_date);

-- Audit log so admins can see who marked what paid / refunded.
CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor      TEXT NOT NULL,            -- email
  entity     TEXT NOT NULL,            -- 'sale' | 'recurring' | 'prospect' | 'seller'
  entity_id  INTEGER NOT NULL,
  action     TEXT NOT NULL,            -- 'create' | 'update' | 'mark_paid' | 'refund' | 'reassign' | ...
  detail     TEXT,                     -- json blob
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entity, entity_id);
