import { requireBinding } from "./runtime.js";

export function repositories(context) {
  const db = requireBinding(context.env, "DB");
  return {
    reviewQueue: {
      async listPending({ allAccess, department }) {
        const rows = await db.prepare(
          "SELECT q.*, u.file_name, u.created_at AS uploaded_at, e.confidence, e.extracted_json, e.warnings_json FROM document_review_queue q JOIN document_uploads u ON u.id = q.upload_id JOIN document_extractions e ON e.id = q.extraction_id WHERE q.status = 'pending' AND (? = 1 OR q.assigned_department_id = ?) ORDER BY q.created_at DESC LIMIT 100"
        ).bind(allAccess ? 1 : 0, department).all();
        return rows.results || [];
      },
      async get(id) {
        return db.prepare("SELECT * FROM document_review_queue WHERE id = ? LIMIT 1").bind(id).first();
      },
      async decide({ id, decision, notes, reviewerId }) {
        await db.prepare(
          "UPDATE document_review_queue SET status = ?, reviewer_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).bind(decision, notes || "", reviewerId, id).run();
      },
    },
    outlook: {
      async saveConnection({ staffId, accountEmail, scopes, tokenPayload }) {
        await db.prepare(
          "INSERT INTO hp_outlook_connections (id, staff_id, account_email, scopes, token_json, status) VALUES (?, ?, ?, ?, ?, 'active') ON CONFLICT(staff_id) DO UPDATE SET account_email = excluded.account_email, scopes = excluded.scopes, token_json = excluded.token_json, status = 'active', updated_at = CURRENT_TIMESTAMP"
        ).bind(crypto.randomUUID(), staffId, accountEmail || "", scopes, JSON.stringify(tokenPayload)).run();
      },
    },
    flow: {
      async save(snapshot) {
        await db.prepare(
          "INSERT INTO hp_flow_snapshots (id, staff_id, role, department_id, network_state, app_state, recovery_state, queue_count, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
          crypto.randomUUID(),
          snapshot.staffId || null,
          snapshot.role || null,
          snapshot.department || null,
          snapshot.networkState || null,
          snapshot.appState || null,
          snapshot.recoveryState || null,
          Number(snapshot.queueCount || 0),
          JSON.stringify(snapshot.metadata || {})
        ).run();
      },
    },
  };
}
