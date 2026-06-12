import { HttpError, normalizeId, requireBinding } from "./runtime.js";
import { verifySessionToken } from "./session.js";

export async function authenticate(context) {
  const db = requireBinding(context.env, "DB");
  const secret = context.env.SESSION_SECRET || context.env.OUTLOOK_CLIENT_SECRET || "fallback_secret";

  // 1. Try Strong Session Proof (JWT-like)
  const authHeader = context.request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const session = await verifySessionToken(token, secret);
    if (session) {
      return {
        id: String(session.id),
        role: String(session.role),
        department: normalizeId(session.dept, "admin"),
        name: String(session.id), // Fallback name
      };
    }
  }

  // 2. Try Legacy Session Proof
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

  // 3. Fallback to Cloudflare Access (but still verify against DB)
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
