-- 0006_cos_notes.sql · persistent memory store for the Chief of Staff agent.
--
-- The agent reads notes on every turn (the 20 most recent are injected into
-- the system prompt) and can write/search/edit/delete via tools. Gives the
-- CoS cross-session continuity that the in-browser chat history alone
-- cannot provide.
--
-- Apply with:
--   cd ~/code/pymewebpro/portal
--   wrangler d1 execute pymewebpro-portal --remote --file=migrations/0006_cos_notes.sql

CREATE TABLE IF NOT EXISTS cos_notes (
  id          TEXT PRIMARY KEY,                 -- ulid()
  body        TEXT NOT NULL,                    -- the note itself, markdown OK
  tags        TEXT,                             -- comma-separated tags for quick filter
  author      TEXT,                             -- 'mike' | 'santi' | 'cos' | NULL
  context     TEXT,                             -- 'pymewebpro' | 'colguides' | 'personal' | NULL
  member_id   TEXT,                             -- optional reference to a Catalina member id or PWP client id
  pinned      INTEGER DEFAULT 0,                -- 1 = always include in the system prompt
  created_at  INTEGER NOT NULL,                 -- unix ms
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cos_notes_created   ON cos_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cos_notes_context   ON cos_notes(context, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cos_notes_pinned    ON cos_notes(pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cos_notes_member_id ON cos_notes(member_id);
