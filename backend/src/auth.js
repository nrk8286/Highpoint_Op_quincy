import { HttpError, normalizeId, requireBinding } from "./runtime.js";

export async function authenticate(context) {
  const db = requireBinding(context.env, "DB");
  const userId = context.request.headers.get("x-highpoints-user-id") || "";
  const session = context.request.headers.get("x-highpoints-session") || "";
  if (userId && session) {
    const appUser = await db.prepare(
      "SELECT id, username, name, role, dept, active, pin_hash FROM app_users WHERE id = ? AND active = 1 LIMIT 1"
    ).bind(userId).first().catch(() => null);
    if (appUser && session === btoa(`${appUser.id}:${appUser.pin_hash}`)) {
      return normalizeUser({
        id: appUser.id,
        username: appUser.username,
        display_name: appUser.name,
        role: appUser.role,
        department_id: appUser.dept,
      });
    }
  }

  const email = context.request.headers.get("cf-access-authenticated-user-email") ||
    context.request.headers.get("x-highpoints-user") || "";
  const fallbackId = userId || email.split("@")[0] || "";
  if (!fallbackId && !email) throw new HttpError(401, "Unauthorized staff account");

  const profile = await db.prepare(
    "SELECT id, username, display_name, role, department_id, active FROM staff_profiles WHERE active = 1 AND (username = ? OR id = ?) LIMIT 1"
  ).bind(email, fallbackId).first().catch(() => null);

  if (!profile) throw new HttpError(401, "Unauthorized staff account");
  return normalizeUser(profile);
}

function normalizeUser(user) {
  return {
    id: String(user.id),
    username: String(user.username || ""),
    name: String(user.display_name || user.name || user.username || user.id),
    role: String(user.role || "Staff"),
    department: normalizeId(user.department_id || user.dept, "admin"),
  };
}
