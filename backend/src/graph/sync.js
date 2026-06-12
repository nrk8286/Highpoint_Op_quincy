import { requireBinding } from "../runtime.js";
import { createNeo4jClient, graphConfig } from "./client.js";
import { CYPHER, graphMetadata } from "./cypher.js";
import { normalizeGraphError } from "./errors.js";

const STATEMENTS = {
  staff_context: CYPHER.upsertStaffContext,
  flow_snapshot: CYPHER.upsertFlowSnapshot,
  review_decision: CYPHER.upsertReviewDecision,
  audit_event: CYPHER.upsertAuditEvent,
  shell_event: CYPHER.upsertShellEvent,
};

export function scheduleGraphWrite(context, operation) {
  const task = writeGraphOrOutbox(context, operation);
  if (context.ctx?.waitUntil) context.ctx.waitUntil(task);
  return task;
}

export async function writeGraphOrOutbox(context, operation) {
  const config = graphConfig(context.env);
  if (!config.configured) {
    await enqueueGraphOperation(context, operation, "Neo4j graph is not configured");
    return { queued: true };
  }

  try {
    await executeGraphOperation(context, operation);
    return { ok: true };
  } catch (error) {
    const graphError = normalizeGraphError(error);
    await enqueueGraphOperation(context, operation, graphError.message);
    return { queued: true, error: graphError.message };
  }
}

export async function executeGraphOperation(context, operation) {
  const statement = STATEMENTS[operation.type];
  if (!statement) throw new Error(`Unsupported graph operation: ${operation.type}`);
  const client = createNeo4jClient(context.env);
  return client.query(statement, operation.parameters || {}, graphMetadata(context));
}

export async function enqueueGraphOperation(context, operation, message = "") {
  const db = requireBinding(context.env, "DB");
  const payload = JSON.stringify(operation);
  const id = outboxId(operation);
  await db.prepare(
    "INSERT INTO hp_graph_sync_outbox (id, operation, entity_type, entity_id, payload_json, request_id, actor_id, status, attempts, last_error) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?) ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json, request_id = excluded.request_id, actor_id = excluded.actor_id, status = 'pending', last_error = excluded.last_error, updated_at = CURRENT_TIMESTAMP"
  ).bind(
    id,
    operation.type,
    operation.entityType || "",
    operation.entityId || "",
    payload,
    context.requestId || "",
    context.user?.id || "",
    String(message || "").slice(0, 1000)
  ).run().catch((error) => {
    console.log(JSON.stringify({ level: "warn", message: "graph_outbox_enqueue_failed", error: error.message, requestId: context.requestId }));
  });
}

function outboxId(operation) {
  if (["staff_context", "review_decision"].includes(operation.type) && operation.entityId) {
    return `${operation.type}:${operation.entityId}`;
  }
  return crypto.randomUUID();
}

export async function retryGraphOutbox(context, limit = 25) {
  const db = requireBinding(context.env, "DB");
  const rows = await db.prepare(
    "SELECT * FROM hp_graph_sync_outbox WHERE status IN ('pending','failed') AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP) ORDER BY created_at ASC LIMIT ?"
  ).bind(Math.min(Math.max(Number(limit) || 25, 1), 100)).all();
  const results = [];

  for (const row of rows.results || []) {
    let operation;
    try {
      operation = JSON.parse(row.payload_json);
      await executeGraphOperation(context, operation);
      await db.prepare(
        "UPDATE hp_graph_sync_outbox SET status = 'succeeded', attempts = attempts + 1, last_error = '', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(row.id).run();
      results.push({ id: row.id, ok: true });
    } catch (error) {
      const graphError = normalizeGraphError(error);
      await db.prepare(
        "UPDATE hp_graph_sync_outbox SET status = 'failed', attempts = attempts + 1, last_error = ?, next_retry_at = datetime('now', '+' || min(attempts + 1, 30) || ' minutes'), updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(graphError.message.slice(0, 1000), row.id).run();
      results.push({ id: row.id, ok: false, error: graphError.message });
    }
  }

  return results;
}

export async function listGraphFailures(context, limit = 20) {
  const db = requireBinding(context.env, "DB");
  const rows = await db.prepare(
    "SELECT id, operation, entity_type, entity_id, attempts, status, last_error, next_retry_at, created_at, updated_at FROM hp_graph_sync_outbox WHERE status IN ('pending','failed') ORDER BY created_at DESC LIMIT ?"
  ).bind(Math.min(Math.max(Number(limit) || 20, 1), 100)).all();
  return rows.results || [];
}
