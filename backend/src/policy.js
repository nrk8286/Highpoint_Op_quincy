import { HttpError, normalizeId } from "./runtime.js";

const DEPARTMENT_RESOURCES = {
  maintenance: ["dashboard", "maintenance", "inventory", "pm_checks", "work_orders", "documents", "training", "messages"],
  nursing: ["dashboard", "nursing", "incidents", "documents", "training", "messages"],
  housekeeping: ["dashboard", "housekeeping", "cleaning", "documents", "training", "messages"],
  culinary: ["dashboard", "culinary", "meal_notes", "inventory", "documents", "training", "messages"],
  activities: ["dashboard", "activities", "activity_events", "documents", "training", "messages"],
  compliance: ["dashboard", "compliance", "pm_checks", "incidents", "documents", "reports", "training", "messages"],
  inventory: ["dashboard", "inventory", "documents", "training", "messages"],
  scheduling: ["dashboard", "scheduling", "attendance", "documents", "training", "messages"],
  admin: ["*"],
  executive: ["*"],
};

export function hasAllAccess(user) {
  return ["Admin", "Executive"].includes(user.role) || ["admin", "executive"].includes(user.department);
}

export function resourcesFor(user) {
  if (hasAllAccess(user)) return ["*"];
  const base = DEPARTMENT_RESOURCES[user.department] || ["dashboard", "documents", "training", "messages"];
  if (["Director", "Supervisor"].includes(user.role)) {
    return [...new Set([...base, "reports", "scheduling", "attendance"])];
  }
  return base.filter((item) => !["reports", "scheduling", "attendance"].includes(item));
}

export function assertCan(user, action, resource, department = user.department) {
  if (hasAllAccess(user)) return;
  const normalizedDepartment = normalizeId(department, user.department);
  if (normalizedDepartment !== user.department) throw new HttpError(403, "Forbidden department");

  const allowed = resourcesFor(user);
  if (!allowed.includes(resource)) throw new HttpError(403, "Forbidden resource");

  if (action === "approve" && !["Director", "Supervisor"].includes(user.role)) {
    throw new HttpError(403, "Approval requires supervisor access");
  }
}

export function visibleProfile(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    department: user.department,
    resources: resourcesFor(user),
    allAccess: hasAllAccess(user),
  };
}
