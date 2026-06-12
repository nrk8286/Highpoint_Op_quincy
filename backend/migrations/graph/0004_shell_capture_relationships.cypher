UNWIND [
  {id: "LOCATED_AT", from: "AuditEvent|Incident|WorkOrder", to: "Location", purpose: "Captured event or work item location"},
  {id: "CAPTURED_AS", from: "AuditEvent", to: "Incident|WorkOrder|Document|InventoryItem", purpose: "Mobile shell capture materialized as an operational entity"}
] AS rel
MERGE (rt:RelationshipType {id: rel.id})
SET rt.name = rel.id,
    rt.from = rel.from,
    rt.to = rel.to,
    rt.purpose = rel.purpose,
    rt.updatedAt = datetime();
