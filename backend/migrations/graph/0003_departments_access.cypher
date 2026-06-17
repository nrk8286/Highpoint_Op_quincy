UNWIND [
  {id: "maintenance", name: "Maintenance", permissions: ["dashboard","maintenance","inventory","pm_checks","work_orders","documents","training","messages"]},
  {id: "nursing", name: "Nursing", permissions: ["dashboard","nursing","incidents","documents","training","messages"]},
  {id: "housekeeping", name: "Housekeeping", permissions: ["dashboard","housekeeping","cleaning","documents","training","messages"]},
  {id: "culinary", name: "Culinary", permissions: ["dashboard","culinary","meal_notes","inventory","documents","training","messages"]},
  {id: "activities", name: "Activities", permissions: ["dashboard","activities","activity_events","documents","training","messages"]},
  {id: "compliance", name: "Compliance", permissions: ["dashboard","compliance","pm_checks","incidents","documents","reports","training","messages"]},
  {id: "inventory", name: "Inventory", permissions: ["dashboard","inventory","documents","training","messages"]},
  {id: "scheduling", name: "Scheduling", permissions: ["dashboard","scheduling","attendance","documents","training","messages"]},
  {id: "admin", name: "Admin", permissions: ["*"]},
  {id: "executive", name: "Executive", permissions: ["*"]}
] AS department
MERGE (d:Department {id: department.id})
SET d.name = department.name,
    d.updatedAt = datetime()
WITH d, department
UNWIND department.permissions AS permissionId
MERGE (p:Permission {id: permissionId})
SET p.name = CASE permissionId WHEN "*" THEN "All Resources" ELSE coalesce(p.name, permissionId) END,
    p.updatedAt = datetime()
MERGE (d)-[:ALLOWS]->(p);

MERGE (rt:RelationshipType {id: "ALLOWS"})
SET rt.name = "ALLOWS",
    rt.from = "Department",
    rt.to = "Permission",
    rt.purpose = "Department grants resource visibility by default",
    rt.updatedAt = datetime();
