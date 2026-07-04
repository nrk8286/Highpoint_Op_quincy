import { HttpError, normalizeId } from "../runtime.js";

export const GRAPH_LABELS = {
  staff: "Staff",
  department: "Department",
  document: "Document",
  review: "Review",
  work_order: "WorkOrder",
  incident: "Incident",
  inventory_item: "InventoryItem",
  policy: "Policy",
  training: "Training",
  vendor: "Vendor",
  location: "Location",
  resident: "Resident",
  audit_event: "AuditEvent",
  role: "Role",
  permission: "Permission",
  relationship_type: "RelationshipType",
};

export const GRAPH_QUERY_TEMPLATES = {
  overview: {
    label: "Graph Overview",
    statement: `
      CALL {
        MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count
      }
      RETURN label, count
      ORDER BY label
      LIMIT 50
    `,
    readOnly: true,
  },
  recent_reviews: {
    label: "Recent Review Decisions",
    statement: `
      MATCH (s:Staff)-[rel:REVIEWED|APPROVED]->(r:Review)
      OPTIONAL MATCH (r)-[:REVIEWS]->(d:Document)
      RETURN r.id AS reviewId, r.status AS status, s.name AS reviewer, d.fileName AS document, r.reviewedAt AS reviewedAt
      ORDER BY r.reviewedAt DESC
      LIMIT $limit
    `,
    defaults: { limit: 25 },
    readOnly: true,
  },
  department_risk: {
    label: "Department Activity",
    statement: `
      MATCH (d:Department)
      OPTIONAL MATCH (d)<-[:MEMBER_OF]-(s:Staff)
      OPTIONAL MATCH (d)<-[:BELONGS_TO]-(i:Incident)
      OPTIONAL MATCH (d)<-[:BELONGS_TO]-(w:WorkOrder)
      RETURN d.id AS department, d.name AS name, count(DISTINCT s) AS staff, count(DISTINCT i) AS incidents, count(DISTINCT w) AS workOrders
      ORDER BY department
      LIMIT $limit
    `,
    defaults: { limit: 25 },
    readOnly: true,
  },
  audit_trail: {
    label: "Audit Trail",
    statement: `
      MATCH (a:AuditEvent)
      OPTIONAL MATCH (a)-[:ACTOR]->(s:Staff)
      RETURN a.id AS id, a.action AS action, a.resource AS resource, a.resourceId AS resourceId, s.name AS actor, a.createdAt AS createdAt
      ORDER BY a.createdAt DESC
      LIMIT $limit
    `,
    defaults: { limit: 25 },
    readOnly: true,
  },
  role_permissions: {
    label: "Role Permissions",
    statement: `
      MATCH (r:Role)
      OPTIONAL MATCH (r)-[:GRANTS]->(p:Permission)
      OPTIONAL MATCH (r)-[:INHERITS]->(parent:Role)
      RETURN r.id AS role,
        r.name AS name,
        r.level AS level,
        r.allAccess AS allAccess,
        collect(DISTINCT p.id) AS permissions,
        collect(DISTINCT parent.id) AS inherits
      ORDER BY r.level DESC, role
      LIMIT $limit
    `,
    defaults: { limit: 25 },
    readOnly: true,
  },
  relationship_catalog: {
    label: "Relationship Catalog",
    statement: `
      MATCH (rt:RelationshipType)
      RETURN rt.id AS relationship,
        rt.from AS from,
        rt.to AS to,
        rt.purpose AS purpose
      ORDER BY relationship
      LIMIT $limit
    `,
    defaults: { limit: 50 },
    readOnly: true,
  },
  staff_access: {
    label: "Staff Access",
    statement: `
      MATCH (s:Staff)
      OPTIONAL MATCH (s)-[:HAS_ROLE]->(r:Role)
      OPTIONAL MATCH (s)-[:MEMBER_OF]->(d:Department)
      OPTIONAL MATCH (r)-[:GRANTS]->(p:Permission)
      RETURN s.id AS staffId,
        s.name AS staff,
        d.id AS department,
        r.id AS role,
        collect(DISTINCT p.id) AS permissions
      ORDER BY department, role, staff
      LIMIT $limit
    `,
    defaults: { limit: 50 },
    readOnly: true,
  },
  department_permissions: {
    label: "Department Permissions",
    statement: `
      MATCH (d:Department)
      OPTIONAL MATCH (d)-[:ALLOWS]->(p:Permission)
      RETURN d.id AS department,
        d.name AS name,
        collect(DISTINCT p.id) AS permissions
      ORDER BY department
      LIMIT $limit
    `,
    defaults: { limit: 50 },
    readOnly: true,
  },
  recent_captures: {
    label: "Recent Shell Captures",
    statement: `
      MATCH (a:AuditEvent {resource: "shell_capture"})
      OPTIONAL MATCH (a)-[:CAPTURED_AS]->(target)
      OPTIONAL MATCH (target)-[:BELONGS_TO]->(d:Department)
      RETURN a.id AS id,
        a.captureType AS type,
        a.priority AS priority,
        a.location AS location,
        labels(target)[0] AS targetLabel,
        target.id AS targetId,
        d.id AS department,
        a.createdAt AS createdAt
      ORDER BY a.createdAt DESC
      LIMIT $limit
    `,
    defaults: { limit: 25 },
    readOnly: true,
  },
};

export function labelFor(type) {
  const label = GRAPH_LABELS[normalizeId(type)];
  if (!label) throw new HttpError(400, "Unsupported graph entity type", { allowed: Object.keys(GRAPH_LABELS) });
  return label;
}

export function queryTemplate(name) {
  const template = GRAPH_QUERY_TEMPLATES[normalizeId(name)];
  if (!template) throw new HttpError(400, "Unsupported graph query template", { allowed: Object.keys(GRAPH_QUERY_TEMPLATES) });
  return template;
}

export const CYPHER = {
  bootstrap: `
    CREATE CONSTRAINT staff_id IF NOT EXISTS FOR (n:Staff) REQUIRE n.id IS UNIQUE;
    CREATE CONSTRAINT department_id IF NOT EXISTS FOR (n:Department) REQUIRE n.id IS UNIQUE;
    CREATE CONSTRAINT document_id IF NOT EXISTS FOR (n:Document) REQUIRE n.id IS UNIQUE;
    CREATE CONSTRAINT review_id IF NOT EXISTS FOR (n:Review) REQUIRE n.id IS UNIQUE;
    CREATE CONSTRAINT work_order_id IF NOT EXISTS FOR (n:WorkOrder) REQUIRE n.id IS UNIQUE;
    CREATE CONSTRAINT incident_id IF NOT EXISTS FOR (n:Incident) REQUIRE n.id IS UNIQUE;
    CREATE CONSTRAINT inventory_item_id IF NOT EXISTS FOR (n:InventoryItem) REQUIRE n.id IS UNIQUE;
    CREATE CONSTRAINT policy_id IF NOT EXISTS FOR (n:Policy) REQUIRE n.id IS UNIQUE;
    CREATE CONSTRAINT training_id IF NOT EXISTS FOR (n:Training) REQUIRE n.id IS UNIQUE;
    CREATE CONSTRAINT vendor_id IF NOT EXISTS FOR (n:Vendor) REQUIRE n.id IS UNIQUE;
    CREATE CONSTRAINT location_id IF NOT EXISTS FOR (n:Location) REQUIRE n.id IS UNIQUE;
    CREATE CONSTRAINT resident_id IF NOT EXISTS FOR (n:Resident) REQUIRE n.id IS UNIQUE;
    CREATE CONSTRAINT audit_event_id IF NOT EXISTS FOR (n:AuditEvent) REQUIRE n.id IS UNIQUE;
    CREATE TEXT INDEX staff_search IF NOT EXISTS FOR (n:Staff) ON (n.name);
    CREATE TEXT INDEX document_search IF NOT EXISTS FOR (n:Document) ON (n.fileName);
    CREATE TEXT INDEX policy_search IF NOT EXISTS FOR (n:Policy) ON (n.title);
  `,
  upsertStaffContext: `
    MERGE (s:Staff {id: $staff.id})
    SET s.name = $staff.name,
        s.username = $staff.username,
        s.role = $staff.role,
        s.department = $staff.department,
        s.updatedAt = datetime()
    MERGE (d:Department {id: $department.id})
    SET d.name = $department.name,
        d.updatedAt = datetime()
    MERGE (s)-[:MEMBER_OF]->(d)
    WITH s
    OPTIONAL MATCH (oldRole:Role)<-[oldRel:HAS_ROLE]-(s)
    DELETE oldRel
    WITH s
    MERGE (r:Role {id: toLower($staff.role)})
    SET r.name = $staff.role,
        r.updatedAt = datetime()
    MERGE (s)-[:HAS_ROLE]->(r)
  `,
  upsertFlowSnapshot: `
    MERGE (s:Staff {id: $staff.id})
    SET s.name = $staff.name,
        s.role = $staff.role,
        s.department = $staff.department,
        s.updatedAt = datetime()
    MERGE (d:Department {id: $department.id})
    SET d.name = $department.name,
        d.updatedAt = datetime()
    MERGE (s)-[:MEMBER_OF]->(d)
    MERGE (r:Role {id: toLower($staff.role)})
    SET r.name = $staff.role,
        r.updatedAt = datetime()
    MERGE (s)-[:HAS_ROLE]->(r)
    MERGE (a:AuditEvent {id: $snapshot.id})
    SET a.action = "flow_snapshot",
        a.resource = "flow",
        a.resourceId = $snapshot.id,
        a.networkState = $snapshot.networkState,
        a.appState = $snapshot.appState,
        a.recoveryState = $snapshot.recoveryState,
        a.queueCount = $snapshot.queueCount,
        a.metadata = $snapshot.metadata,
        a.requestId = $audit.requestId,
        a.createdAt = datetime()
    MERGE (a)-[:ACTOR]->(s)
    MERGE (a)-[:TARGET]->(d)
  `,
  upsertReviewDecision: `
    MERGE (review:Review {id: $review.id})
    SET review.status = $review.decision,
        review.destinationResource = $review.destinationResource,
        review.destinationRecordId = $review.destinationRecordId,
        review.notes = $review.notes,
        review.reviewedAt = datetime(),
        review.requestId = $audit.requestId
    MERGE (document:Document {id: $document.id})
    SET document.fileName = $document.fileName,
        document.uploadedAt = $document.uploadedAt,
        document.status = $review.decision,
        document.updatedAt = datetime()
    MERGE (department:Department {id: $department.id})
    SET department.name = $department.name,
        department.updatedAt = datetime()
    MERGE (staff:Staff {id: $staff.id})
    SET staff.name = $staff.name,
        staff.role = $staff.role,
        staff.department = $staff.department,
        staff.updatedAt = datetime()
    MERGE (staff)-[:MEMBER_OF]->(department)
    MERGE (role:Role {id: toLower($staff.role)})
    SET role.name = $staff.role,
        role.updatedAt = datetime()
    MERGE (staff)-[:HAS_ROLE]->(role)
    MERGE (review)-[:REVIEWS]->(document)
    MERGE (document)-[:REQUIRES_REVIEW]->(review)
    MERGE (review)-[:BELONGS_TO]->(department)
    MERGE (staff)-[:REVIEWED]->(review)
    FOREACH (_ IN CASE WHEN $review.decision = "approved" THEN [1] ELSE [] END |
      MERGE (staff)-[:APPROVED]->(document)
    )
  `,
  upsertAuditEvent: `
    MERGE (a:AuditEvent {id: $event.id})
    SET a.requestId = $event.requestId,
        a.action = $event.action,
        a.resource = $event.resource,
        a.resourceId = $event.resourceId,
        a.status = $event.status,
        a.metadata = $event.metadata,
        a.createdAt = $event.createdAt
    FOREACH (_ IN CASE WHEN $staff.id IS NULL THEN [] ELSE [1] END |
      MERGE (s:Staff {id: $staff.id})
      SET s.name = $staff.name,
          s.role = $staff.role,
          s.department = $staff.department,
          s.updatedAt = datetime()
      MERGE (r:Role {id: toLower($staff.role)})
      SET r.name = $staff.role,
          r.updatedAt = datetime()
      MERGE (s)-[:HAS_ROLE]->(r)
      MERGE (a)-[:ACTOR]->(s)
    )
  `,
  upsertShellEvent: `
    MERGE (department:Department {id: $department.id})
    SET department.name = $department.name,
        department.updatedAt = datetime()
    MERGE (a:AuditEvent {id: $event.auditId})
    SET a.requestId = $event.requestId,
        a.action = "shell_capture",
        a.resource = "shell_capture",
        a.resourceId = $event.id,
        a.captureType = $event.type,
        a.priority = $event.priority,
        a.location = $event.location,
        a.note = $event.note,
        a.attachmentName = $event.attachmentName,
        a.attachmentType = $event.attachmentType,
        a.attachmentSize = $event.attachmentSize,
        a.networkState = $event.networkState,
        a.userAgent = $event.userAgent,
        a.metadata = $event.metadata,
        a.createdAt = $event.createdAt
    MERGE (a)-[:TARGET]->(department)
    FOREACH (_ IN CASE WHEN $event.locationId = "" THEN [] ELSE [1] END |
      MERGE (location:Location {id: $event.locationId})
      SET location.name = $event.location,
          location.updatedAt = datetime()
      MERGE (a)-[:LOCATED_AT]->(location)
    )
    FOREACH (_ IN CASE WHEN $event.type = "incident" THEN [1] ELSE [] END |
      MERGE (incident:Incident {id: $event.id})
      SET incident.title = $event.title,
          incident.priority = $event.priority,
          incident.status = "captured",
          incident.location = $event.location,
          incident.note = $event.note,
          incident.source = "mobile_shell",
          incident.requestId = $event.requestId,
          incident.createdAt = $event.createdAt,
          incident.updatedAt = datetime()
      MERGE (incident)-[:BELONGS_TO]->(department)
      MERGE (a)-[:CAPTURED_AS]->(incident)
    )
    FOREACH (_ IN CASE WHEN $event.type = "work_order" THEN [1] ELSE [] END |
      MERGE (workOrder:WorkOrder {id: $event.id})
      SET workOrder.title = $event.title,
          workOrder.priority = $event.priority,
          workOrder.status = "captured",
          workOrder.location = $event.location,
          workOrder.note = $event.note,
          workOrder.source = "mobile_shell",
          workOrder.requestId = $event.requestId,
          workOrder.createdAt = $event.createdAt,
          workOrder.updatedAt = datetime()
      MERGE (workOrder)-[:BELONGS_TO]->(department)
      MERGE (a)-[:CAPTURED_AS]->(workOrder)
    )
    FOREACH (_ IN CASE WHEN $event.type = "document_note" THEN [1] ELSE [] END |
      MERGE (document:Document {id: $event.id})
      SET document.fileName = CASE WHEN $event.attachmentName = "" THEN $event.title ELSE $event.attachmentName END,
          document.status = "captured",
          document.location = $event.location,
          document.note = $event.note,
          document.source = "mobile_shell",
          document.requestId = $event.requestId,
          document.createdAt = $event.createdAt,
          document.updatedAt = datetime()
      MERGE (document)-[:REFERENCES]->(department)
      MERGE (a)-[:CAPTURED_AS]->(document)
    )
    FOREACH (_ IN CASE WHEN $event.type = "supply_request" THEN [1] ELSE [] END |
      MERGE (item:InventoryItem {id: $event.id})
      SET item.name = $event.title,
          item.status = "requested",
          item.priority = $event.priority,
          item.location = $event.location,
          item.note = $event.note,
          item.source = "mobile_shell",
          item.requestId = $event.requestId,
          item.createdAt = $event.createdAt,
          item.updatedAt = datetime()
      MERGE (a)-[:CAPTURED_AS]->(item)
    )
  `,
};

export function graphMetadata(context) {
  return {
    requestId: context.requestId,
    actorId: context.user?.id || "",
    actorRole: context.user?.role || "",
    actorDepartment: context.user?.department || "",
  };
}
