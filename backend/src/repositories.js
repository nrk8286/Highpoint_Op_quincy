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
        return db.prepare(
          "SELECT q.*, u.file_name, u.created_at AS uploaded_at FROM document_review_queue q JOIN document_uploads u ON u.id = q.upload_id WHERE q.id = ? LIMIT 1"
        ).bind(id).first();
      },
      async decide({ id, decision, notes, reviewerId }) {
        await db.prepare(
          "UPDATE document_review_queue SET status = ?, reviewer_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).bind(decision, notes || "", reviewerId, id).run();
      },
    },
    outlook: {
      async saveConnection({ staffId, accountEmail, scopes, tokenPayload, status = "active" }) {
        await db.prepare(
          "INSERT INTO hp_outlook_connections (id, staff_id, account_email, scopes, token_json, status) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(staff_id) DO UPDATE SET account_email = excluded.account_email, scopes = excluded.scopes, token_json = excluded.token_json, status = excluded.status, updated_at = CURRENT_TIMESTAMP"
        ).bind(crypto.randomUUID(), staffId, accountEmail || "", scopes, JSON.stringify(tokenPayload), status).run();
      },
      async getConnection(staffId) {
        return db.prepare(
          "SELECT staff_id, account_email, scopes, token_json, status, created_at, updated_at FROM hp_outlook_connections WHERE staff_id = ? LIMIT 1"
        ).bind(staffId).first();
      },
      async revokeConnection(staffId) {
        await db.prepare(
          "UPDATE hp_outlook_connections SET status = 'revoked', token_json = '{}', updated_at = CURRENT_TIMESTAMP WHERE staff_id = ?"
        ).bind(staffId).run();
      },
    },
    flow: {
      async save(snapshot) {
        const id = crypto.randomUUID();
        await db.prepare(
          "INSERT INTO hp_flow_snapshots (id, staff_id, role, department_id, network_state, app_state, recovery_state, queue_count, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
          id,
          snapshot.staffId || null,
          snapshot.role || null,
          snapshot.department || null,
          snapshot.networkState || null,
          snapshot.appState || null,
          snapshot.recoveryState || null,
          Number(snapshot.queueCount || 0),
          JSON.stringify(snapshot.metadata || {})
        ).run();
        return id;
      },
    },
    shellEvents: {
      async listRecent(limit = 25) {
        const rows = await db.prepare(
          "SELECT id, event_type, department_id, priority, location, note, attachment_json, network_state, created_at FROM hp_shell_events ORDER BY created_at DESC LIMIT ?"
        ).bind(Math.min(Math.max(Number(limit) || 25, 1), 100)).all();
        return rows.results || [];
      },
      async create(event) {
        const id = crypto.randomUUID();
        await db.prepare(
          "INSERT INTO hp_shell_events (id, event_type, department_id, priority, location, note, attachment_json, network_state, user_agent, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
          id,
          event.type || "capture",
          event.department || null,
          event.priority || null,
          event.location || null,
          event.note || null,
          JSON.stringify(event.attachment || {}),
          event.network || null,
          event.userAgent || null,
          JSON.stringify(event.metadata || {})
        ).run();
        return id;
      },
    },
  };
}
