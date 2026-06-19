import { HttpError, normalizeId, requireBinding } from "./runtime.js";
import { verifySessionToken } from "./session.js";

export async function authenticate(context) {
  const db = requireBinding(context.env, "DB");
  const secret = context.env.SESSION_SECRET;
  let bearerConfigError = null;

  // 1. Try Strong Session Proof (JWT-like)
  const authHeader = context.request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token.includes(".")) {
      if (!secret) {
        bearerConfigError = new HttpError(500, "Missing SESSION_SECRET");
      } else {
        try {
          const session = await verifySessionToken(token, secret);
          if (session) {
            return {
              id: String(session.id),
              role: String(session.role),
              department: normalizeId(session.dept, "admin"),
              name: String(session.id), // Fallback name
            };
          }
        } catch (error) {
          if (!(error instanceof HttpError) || error.status >= 500) {
            throw error;
          }
        }
      }
    }
  }

  // 2. Try Legacy Session Proof
  const userId = context.request.headers.get("x-highpoints-user-id") || "";
  const session = context.request.headers.get("x-highpoints-session") || "";
  if (userId && session) {
    const appUser = await fetchRow(
      db,
      "SELECT id, username, name, role, dept, active, pin_hash FROM app_users WHERE id = ? AND active = 1 LIMIT 1",
      [userId],
      "app_users"
    );
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

  // 3. Optional Cloudflare Access fallback. Disabled by default because request
  // headers are client-controlled unless Access verification is enforced before
  // this Worker.
  const email = trustedAccessEmail(context);
  const fallbackId = userId || email.split("@")[0] || "";
  if (!fallbackId && !email) {
    if (bearerConfigError) throw bearerConfigError;
    throw new HttpError(401, "Staff session missing: provide a valid session token or Cloudflare Access identity");
  }

  const profile = await fetchRow(
    db,
    "SELECT id, username, display_name, role, department_id, active FROM staff_profiles WHERE active = 1 AND (username = ? OR id = ?) LIMIT 1",
    [email, fallbackId],
    "staff_profiles"
  );

  if (!profile) {
    if (bearerConfigError) throw bearerConfigError;
    throw new HttpError(401, "Staff account not found: the authenticated identity does not match an active staff profile");
  }
  return normalizeUser(profile);
}

function trustedAccessEmail(context) {
  if (context.env.TRUST_CF_ACCESS_HEADERS !== "1") return "";
  return context.request.headers.get("cf-access-authenticated-user-email") || "";
}

async function fetchRow(db, statement, params, tableName) {
  try {
    return await db.prepare(statement).bind(...params).first();
  } catch (error) {
    const message = String(error?.message || error || "");
    if (message.includes("no such table") || message.includes(tableName)) {
      throw new HttpError(503, `Missing D1 table: ${tableName}`);
    }
    throw error;
  }
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
