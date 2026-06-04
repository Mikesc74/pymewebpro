-- 0020_salespeople.sql · 2026-06-04
--
-- Repo-parity migration for the salespeople roster. This table was already
-- created and seeded out of band on the live pymewebpro-portal D1, so this file
-- exists only to keep the migrations/ folder in sync with reality.
--
-- IDEMPOTENT: CREATE TABLE IF NOT EXISTS + INSERT OR IGNORE mean re-running this
-- on the live DB is a no-op (no errors, no duplicate rows). Do NOT expect it to
-- overwrite existing rows: editing emails / role / active is done through the
-- admin UI (PATCH /api/admin/crm/salespeople/:handle), not by re-seeding.
--
-- handle is the stable PRIMARY KEY stored on leads.owner; never change it.
-- emails is a comma-separated list of lowercase Cloudflare Access login emails
-- (may be NULL until the person's real Access login is known).

CREATE TABLE IF NOT EXISTS salespeople (
  handle      TEXT PRIMARY KEY,
  full_name   TEXT NOT NULL,
  first_name  TEXT,
  emails      TEXT,
  role        TEXT NOT NULL DEFAULT 'seller',
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL
);

INSERT OR IGNORE INTO salespeople (handle, full_name, first_name, emails, role, active, created_at)
VALUES ('mike', 'Mike Chartrand', 'Mike', 'mike@colguides.com,mike@mikec.pro', 'admin', 1, 1748995200000);

INSERT OR IGNORE INTO salespeople (handle, full_name, first_name, emails, role, active, created_at)
VALUES ('santi', 'Santiago Santos', 'Santiago', 'santiago@colguides.com,santi@colguides.com', 'seller', 1, 1748995200000);

INSERT OR IGNORE INTO salespeople (handle, full_name, first_name, emails, role, active, created_at)
VALUES ('cristian', 'Cristian Ariza', 'Cristian', NULL, 'seller', 1, 1748995200000);

INSERT OR IGNORE INTO salespeople (handle, full_name, first_name, emails, role, active, created_at)
VALUES ('camila', 'María Camila Ramírez', 'Camila', NULL, 'seller', 1, 1748995200000);
