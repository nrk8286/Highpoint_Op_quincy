-- Highpoints backend v2 additive tables.

CREATE TABLE IF NOT EXISTS hp_audit_events (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  actor_id TEXT,
  actor_role TEXT,
  actor_department TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hp_audit_actor_created ON hp_audit_events(actor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_hp_audit_resource_created ON hp_audit_events(resource, created_at);

CREATE TABLE IF NOT EXISTS hp_outlook_connections (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL,
  account_email TEXT,
  scopes TEXT NOT NULL,
  token_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','revoked','failed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id)
);

CREATE TABLE IF NOT EXISTS hp_flow_snapshots (
  id TEXT PRIMARY KEY,
  staff_id TEXT,
  role TEXT,
  department_id TEXT,
  network_state TEXT,
  app_state TEXT,
  recovery_state TEXT,
  queue_count INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hp_flow_staff_created ON hp_flow_snapshots(staff_id, created_at);
