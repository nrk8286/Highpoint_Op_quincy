CREATE CONSTRAINT role_id IF NOT EXISTS FOR (n:Role) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT permission_id IF NOT EXISTS FOR (n:Permission) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT relationship_type_id IF NOT EXISTS FOR (n:RelationshipType) REQUIRE n.id IS UNIQUE;

UNWIND [
  {id: "admin", name: "Admin", level: 100, allAccess: true},
  {id: "executive", name: "Executive", level: 95, allAccess: true},
  {id: "director", name: "Director", level: 80, allAccess: false},
  {id: "supervisor", name: "Supervisor", level: 70, allAccess: false},
  {id: "staff", name: "Staff", level: 40, allAccess: false}
] AS role
MERGE (r:Role {id: role.id})
SET r.name = role.name,
    r.level = role.level,
    r.allAccess = role.allAccess,
    r.updatedAt = datetime();

UNWIND [
  {id: "dashboard", name: "Dashboard"},
  {id: "maintenance", name: "Maintenance"},
  {id: "inventory", name: "Inventory"},
  {id: "pm_checks", name: "PM Checks"},
  {id: "work_orders", name: "Work Orders"},
  {id: "documents", name: "Documents"},
  {id: "training", name: "Training"},
  {id: "messages", name: "Messages"},
  {id: "nursing", name: "Nursing"},
  {id: "incidents", name: "Incidents"},
  {id: "housekeeping", name: "Housekeeping"},
  {id: "cleaning", name: "Cleaning"},
  {id: "culinary", name: "Culinary"},
  {id: "meal_notes", name: "Meal Notes"},
  {id: "activities", name: "Activities"},
  {id: "activity_events", name: "Activity Events"},
  {id: "compliance", name: "Compliance"},
  {id: "reports", name: "Reports"},
  {id: "scheduling", name: "Scheduling"},
  {id: "attendance", name: "Attendance"},
  {id: "security_cameras", name: "Security Cameras"},
  {id: "settings", name: "Settings"},
  {id: "graph", name: "Graph"}
] AS permission
MERGE (p:Permission {id: permission.id})
SET p.name = permission.name,
    p.updatedAt = datetime();

UNWIND [
  {role: "admin", permissions: ["*"]},
  {role: "executive", permissions: ["*"]},
  {role: "director", permissions: ["dashboard","reports","scheduling","inventory","compliance","documents","training","messages","graph"]},
  {role: "supervisor", permissions: ["dashboard","maintenance","nursing","housekeeping","culinary","documents","training","messages","reports","scheduling","attendance"]},
  {role: "staff", permissions: ["dashboard","documents","training","messages"]}
] AS grant
MATCH (r:Role {id: grant.role})
UNWIND grant.permissions AS permissionId
MERGE (p:Permission {id: permissionId})
SET p.name = CASE permissionId WHEN "*" THEN "All Resources" ELSE coalesce(p.name, permissionId) END,
    p.updatedAt = datetime()
MERGE (r)-[:GRANTS]->(p);

UNWIND [
  {id: "MEMBER_OF", from: "Staff", to: "Department", purpose: "Staff department membership"},
  {id: "UPLOADED", from: "Staff", to: "Document", purpose: "Staff uploaded a document"},
  {id: "REVIEWED", from: "Staff", to: "Review", purpose: "Staff reviewed a queued item"},
  {id: "APPROVED", from: "Staff", to: "Document", purpose: "Staff approved a document or record"},
  {id: "EXTRACTED_TO", from: "Document", to: "Review", purpose: "AI extraction created a review artifact"},
  {id: "REQUIRES_REVIEW", from: "Document", to: "Review", purpose: "Document needs human review"},
  {id: "REFERENCES", from: "Document", to: "Policy|Resident|Department", purpose: "Document references another operational entity"},
  {id: "REVIEWS", from: "Review", to: "Document", purpose: "Review is attached to a document"},
  {id: "ASSIGNED_TO", from: "WorkOrder", to: "Staff", purpose: "Work order assignment"},
  {id: "BELONGS_TO", from: "WorkOrder|Incident|Review", to: "Department", purpose: "Operational department ownership"},
  {id: "USES", from: "WorkOrder", to: "InventoryItem", purpose: "Work order uses inventory"},
  {id: "INVOLVES", from: "Incident", to: "Resident|Staff", purpose: "Incident involved person"},
  {id: "REPORTED_BY", from: "Incident", to: "Staff", purpose: "Incident reporter"},
  {id: "REQUIRED_FOR", from: "Training", to: "Department", purpose: "Training required for department"},
  {id: "COMPLETED_BY", from: "Training", to: "Staff", purpose: "Staff completed training"},
  {id: "ACTOR", from: "AuditEvent", to: "Staff", purpose: "Audit event actor"},
  {id: "TARGET", from: "AuditEvent", to: "Any", purpose: "Audit event target"},
  {id: "GRANTS", from: "Role", to: "Permission", purpose: "Role grants a permission"},
  {id: "HAS_ROLE", from: "Staff", to: "Role", purpose: "Staff access role"}
] AS rel
MERGE (rt:RelationshipType {id: rel.id})
SET rt.name = rel.id,
    rt.from = rel.from,
    rt.to = rel.to,
    rt.purpose = rel.purpose,
    rt.updatedAt = datetime();

MATCH (admin:Role {id: "admin"}), (executive:Role {id: "executive"})
MERGE (executive)-[:INHERITS]->(admin);
