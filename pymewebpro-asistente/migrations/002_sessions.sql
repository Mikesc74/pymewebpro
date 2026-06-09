-- Session store for portal auth
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  client_id  TEXT NOT NULL REFERENCES clients(id),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_client ON sessions(client_id);
