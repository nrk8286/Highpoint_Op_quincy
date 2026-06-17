-- Recovery shell event intake for existing backend v2 databases.

CREATE TABLE IF NOT EXISTS hp_shell_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  department_id TEXT,
  priority TEXT,
  location TEXT,
  note TEXT,
  attachment_json TEXT NOT NULL DEFAULT '{}',
  network_state TEXT,
  user_agent TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hp_shell_events_created ON hp_shell_events(created_at);
CREATE INDEX IF NOT EXISTS idx_hp_shell_events_department_created ON hp_shell_events(department_id, created_at);
