export async function auditEvent(context, event) {
  if (!context.env.DB) return;
  const user = context.user || {};
  const metadata = JSON.stringify(event.metadata || {});
  await context.env.DB.prepare(
    "INSERT INTO hp_audit_events (id, request_id, actor_id, actor_role, actor_department, action, resource, resource_id, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    crypto.randomUUID(),
    context.requestId,
    user.id || null,
    user.role || null,
    user.department || null,
    event.action,
    event.resource,
    event.resourceId || null,
    metadata
  ).run().catch((error) => {
    console.log(JSON.stringify({ level: "warn", message: "audit_event_failed", error: error.message, requestId: context.requestId }));
  });
}
