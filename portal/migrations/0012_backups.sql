-- 0012_backups.sql · managed client backups
-- Each row indexes one .zip stored in the `pymewebpro-backups` R2 bucket.
-- A backup is a full, downloadable copy of a client's live site (the R2 files
-- under live_sites.r2_prefix) plus the client's uploaded source assets (the
-- `files` table) plus manifest.json + RESTORE.md. Idempotent.

CREATE TABLE IF NOT EXISTS backups (
  id          TEXT PRIMARY KEY,                 -- uuid
  client_id   TEXT NOT NULL,                    -- clients.id
  slug        TEXT,                             -- live_sites.slug at backup time (nullable)
  kind        TEXT NOT NULL DEFAULT 'manual',   -- 'manual' | 'weekly' | 'monthly' | 'publish'
  r2_key      TEXT NOT NULL,                    -- object key in the pymewebpro-backups bucket
  filename    TEXT,                             -- suggested download filename
  size_bytes  INTEGER,                          -- size of the .zip
  file_count  INTEGER,                          -- number of site/upload files captured
  sha256      TEXT,                             -- checksum of the .zip bytes
  status      TEXT NOT NULL DEFAULT 'complete', -- 'complete' | 'empty' | 'error'
  error       TEXT,                             -- detail when status = 'error'
  created_at  INTEGER NOT NULL                  -- epoch ms
);

CREATE INDEX IF NOT EXISTS idx_backups_client ON backups (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backups_kind   ON backups (kind, created_at DESC);
