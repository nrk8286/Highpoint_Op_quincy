-- Neo4j graph sync outbox for existing backend v2 databases.

CREATE TABLE IF NOT EXISTS hp_graph_sync_outbox (
  id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  request_id TEXT,
  actor_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','failed','succeeded')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_retry_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hp_graph_outbox_status_retry ON hp_graph_sync_outbox(status, next_retry_at, created_at);
CREATE INDEX IF NOT EXISTS idx_hp_graph_outbox_entity ON hp_graph_sync_outbox(entity_type, entity_id, created_at);
