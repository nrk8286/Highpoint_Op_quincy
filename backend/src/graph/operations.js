import { normalizeId } from "../runtime.js";

export function staffContextOperation(user) {
  return {
    type: "staff_context",
    entityType: "staff",
    entityId: user.id,
    parameters: {
      staff: graphStaff(user),
      department: graphDepartment(user.department),
    },
  };
}

export function flowSnapshotOperation({ id, snapshot, user }) {
  return {
    type: "flow_snapshot",
    entityType: "audit_event",
    entityId: id,
    parameters: {
      staff: graphStaff(user),
      department: graphDepartment(snapshot.department || user.department),
      snapshot: {
        id,
        networkState: snapshot.networkState || "",
        appState: snapshot.appState || "",
        recoveryState: snapshot.recoveryState || "",
        queueCount: Number(snapshot.queueCount || 0),
        metadata: JSON.stringify(snapshot.metadata || {}),
      },
    },
  };
}

export function reviewDecisionOperation({ review, decision, notes, user }) {
  const departmentId = normalizeId(review.assigned_department_id || user.department, user.department);
  return {
    type: "review_decision",
    entityType: "review",
    entityId: review.id,
    parameters: {
      review: {
        id: String(review.id),
        decision,
        notes: notes || "",
        destinationResource: normalizeId(review.destination_resource || "documents", "documents"),
        destinationRecordId: String(review.destination_record_id || ""),
      },
      document: {
        id: String(review.upload_id || review.id),
        fileName: String(review.file_name || review.upload_id || "Document"),
        uploadedAt: String(review.uploaded_at || ""),
      },
      staff: graphStaff(user),
      department: graphDepartment(departmentId),
    },
  };
}

export function auditEventOperation({ eventId, context, event, createdAt }) {
  const user = context.user || {};
  return {
    type: "audit_event",
    entityType: "audit_event",
    entityId: eventId,
    parameters: {
      event: {
        id: eventId,
        requestId: context.requestId || "",
        action: event.action || "",
        resource: event.resource || "",
        resourceId: event.resourceId || "",
        status: Number(event.metadata?.status || 0),
        metadata: JSON.stringify(event.metadata || {}),
        createdAt,
      },
      staff: user.id ? graphStaff(user) : { id: null },
    },
  };
}

export function shellEventOperation({ id, event, context }) {
  const type = normalizeId(event.type, "incident");
  const departmentId = normalizeId(event.department, "unknown");
  const location = String(event.location || "").trim();
  const title = [type.replace(/_/g, " "), location].filter(Boolean).join(" - ");
  return {
    type: "shell_event",
    entityType: type,
    entityId: id,
    parameters: {
      event: {
        id,
        auditId: `shell:${id}`,
        type,
        title: title.replace(/\b\w/g, (char) => char.toUpperCase()),
        priority: String(event.priority || "routine"),
        location,
        locationId: location ? normalizeId(location, "location") : "",
        note: String(event.note || ""),
        attachmentName: String(event.attachment?.name || ""),
        attachmentType: String(event.attachment?.type || ""),
        attachmentSize: Number(event.attachment?.size || 0),
        networkState: String(event.network || ""),
        userAgent: String(event.userAgent || ""),
        metadata: JSON.stringify(event.metadata || {}),
        requestId: context.requestId || "",
        createdAt: new Date().toISOString(),
      },
      department: graphDepartment(departmentId),
    },
  };
}

function graphStaff(user) {
  return {
    id: String(user.id),
    username: String(user.username || ""),
    name: String(user.name || user.username || user.id),
    role: String(user.role || "Staff"),
    department: normalizeId(user.department, "admin"),
  };
}

function graphDepartment(id) {
  const normalized = normalizeId(id, "admin");
  return {
    id: normalized,
    name: normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
  };
}
