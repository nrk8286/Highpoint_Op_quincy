// Drop-in Cloudflare Worker routes for Highpoints department RBAC and AI document intake.
// Expected bindings:
//   DB: Cloudflare D1 database
//   DOCUMENTS: optional R2 bucket for uploaded originals
//   DOCUMENT_AI_ENDPOINT, DOCUMENT_AI_API_KEY, DOCUMENT_AI_MODEL: AI extraction provider settings

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

const DESTINATION_TABLES = new Set([
  "work_orders",
  "incidents",
  "inventory_items",
  "staff_credentials",
  "pm_checks",
  "meal_notes",
  "activity_events",
]);

const DOC_SCHEMA = {
  department: "maintenance|nursing|housekeeping|culinary|activities|compliance|inventory|scheduling|admin",
  destination_resource: "work_orders|incidents|inventory_items|staff_credentials|pm_checks|meal_notes|activity_events",
  confidence: "0.0-1.0",
  title: "short human-readable summary",
  fields: "object with table-specific fields",
  warnings: ["missing or uncertain facts"],
};

export async function routeHighpointsApi(request, env) {
  try {
    const url = new URL(request.url);
    if (url.pathname === "/api/me/access" && request.method === "GET") {
      return json(await getAccessProfile(request, env));
    }
    if (url.pathname === "/api/documents/extract" && request.method === "POST") {
      return handleDocumentExtract(request, env);
    }
    if (url.pathname === "/api/documents/review" && request.method === "GET") {
      return handleReviewQueue(request, env);
    }
    if (url.pathname.startsWith("/api/documents/review/") && request.method === "POST") {
      return handleReviewDecision(request, env, url.pathname.split("/").pop());
    }
    return null;
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error("Highpoints API error", error);
    return json({ error: "Internal server error" }, 500);
  }
}

async function getAccessProfile(request, env) {
  const user = await requireAuth(request, env);
  const allowed = resourcesFor(user);
  return {
    user: {
      id: user.id,
      username: user.username,
      name: user.display_name,
      role: user.role,
      department: user.department_id,
    },
    resources: allowed,
    allAccess: allowed.includes("*"),
  };
}

async function handleDocumentExtract(request, env) {
  const user = await requireAuth(request, env);
  assertDepartmentAccess(user, "documents", user.department_id);

  const form = await request.formData();
  const file = form.get("file");
  const declaredDepartment = normalizeDepartment(form.get("department") || user.department_id);
  const documentTypeHint = String(form.get("documentType") || "");
  if (!file || typeof file === "string") return json({ error: "file is required" }, 400);

  assertDepartmentAccess(user, "documents", declaredDepartment);

  const uploadId = id("upl");
  const storageKey = "documents/" + uploadId + "/" + sanitizeFileName(file.name || "upload.bin");
  const fileBuffer = await file.arrayBuffer();

  if (env.DOCUMENTS) {
    await env.DOCUMENTS.put(storageKey, fileBuffer, {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
      customMetadata: { uploadedBy: user.id, department: declaredDepartment },
    });
  }

  await env.DB.prepare(
    "INSERT INTO document_uploads (id, uploaded_by, source_department_id, file_name, file_type, file_size, storage_key, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'extracting')"
  ).bind(uploadId, user.id, declaredDepartment, file.name || "upload", file.type || "application/octet-stream", file.size || fileBuffer.byteLength, storageKey).run();

  try {
    const extraction = await extractDocumentWithAi(env, {
      fileName: file.name || "upload",
      fileType: file.type || "application/octet-stream",
      documentTypeHint,
      departmentHint: declaredDepartment,
      bytes: fileBuffer,
    });

    const normalized = normalizeExtraction(extraction, declaredDepartment);
    assertDepartmentAccess(user, normalized.destination_resource, normalized.department);

    const extractionId = id("ext");
    await env.DB.prepare(
      "INSERT INTO document_extractions (id, upload_id, classified_department_id, destination_resource, confidence, extracted_json, warnings_json, ai_provider, ai_model) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      extractionId,
      uploadId,
      normalized.department,
      normalized.destination_resource,
      normalized.confidence,
      JSON.stringify(normalized.fields),
      JSON.stringify(normalized.warnings),
      "configured-provider",
      env.DOCUMENT_AI_MODEL || "default"
    ).run();

    const draftRecordId = await insertDraftRecord(env, normalized, uploadId, user.id);
    await env.DB.prepare(
      "INSERT INTO document_review_queue (id, upload_id, extraction_id, assigned_department_id, destination_resource, destination_record_id, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')"
    ).bind(id("rev"), uploadId, extractionId, normalized.department, normalized.destination_resource, draftRecordId).run();

    await env.DB.prepare("UPDATE document_uploads SET status = 'needs_review', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(uploadId).run();

    return json({ uploadId, extractionId, draftRecordId, ...normalized });
  } catch (error) {
    await env.DB.prepare("UPDATE document_uploads SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(error.message || "Document extraction failed", uploadId).run();
    return json({ error: "Document extraction failed", detail: error.message }, 500);
  }
}

async function handleReviewQueue(request, env) {
  const user = await requireAuth(request, env);
  const allAccess = hasAllAccess(user);
  const rows = await env.DB.prepare(
    "SELECT q.*, u.file_name, u.created_at AS uploaded_at, e.confidence, e.extracted_json, e.warnings_json FROM document_review_queue q JOIN document_uploads u ON u.id = q.upload_id JOIN document_extractions e ON e.id = q.extraction_id WHERE q.status = 'pending' AND (? = 1 OR q.assigned_department_id = ?) ORDER BY q.created_at DESC LIMIT 100"
  ).bind(allAccess ? 1 : 0, user.department_id).all();
  return json({ items: rows.results || [] });
}

async function handleReviewDecision(request, env, reviewId) {
  const user = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const decision = body.decision === "approved" ? "approved" : body.decision === "rejected" ? "rejected" : "needs_correction";
  const review = await env.DB.prepare("SELECT * FROM document_review_queue WHERE id = ?").bind(reviewId).first();
  if (!review) return json({ error: "review item not found" }, 404);
  assertDepartmentAccess(user, review.destination_resource, review.assigned_department_id, "can_approve");

  await env.DB.prepare(
    "UPDATE document_review_queue SET status = ?, reviewer_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(decision, body.notes || "", user.id, reviewId).run();

  if (review.destination_record_id && decision === "approved") {
    await markDraftApproved(env, review.destination_resource, review.destination_record_id);
    await env.DB.prepare("UPDATE document_uploads SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(review.upload_id).run();
  }

  return json({ ok: true, decision });
}

async function requireAuth(request, env) {
  const sessionUserId = request.headers.get("x-highpoints-user-id") || "";
  const sessionToken = request.headers.get("x-highpoints-session") || "";
  if (sessionUserId && sessionToken) {
    const appUser = await env.DB.prepare(
      "SELECT id, username, name, role, dept, active, pin_hash FROM app_users WHERE id = ? AND active = 1 LIMIT 1"
    ).bind(sessionUserId).first().catch(() => null);
    if (appUser && sessionToken === btoa(appUser.id + ":" + appUser.pin_hash)) {
      return {
        id: appUser.id,
        username: appUser.username,
        display_name: appUser.name,
        role: appUser.role,
        department_id: normalizeDepartment(appUser.dept),
        active: appUser.active,
      };
    }
  }

  const username = request.headers.get("x-highpoints-user") || request.headers.get("cf-access-authenticated-user-email") || "";
  const fallbackUser = sessionUserId || username.split("@")[0] || "admin";
  const user = await env.DB.prepare(
    "SELECT id, username, display_name, role, department_id, active FROM staff_profiles WHERE active = 1 AND (username = ? OR id = ?) LIMIT 1"
  ).bind(username, fallbackUser).first().catch(() => null);
  if (!user) throw new HttpError(401, "Unauthorized staff account");
  return user;
}

function resourcesFor(user) {
  if (hasAllAccess(user)) return ["*"];
  const base = DEPARTMENT_RESOURCES[user.department_id] || ["dashboard", "documents", "training", "messages"];
  if (["Director", "Supervisor"].includes(user.role)) return [...new Set([...base, "reports", "scheduling", "attendance"])];
  return base.filter((item) => !["reports", "scheduling", "attendance"].includes(item));
}

function hasAllAccess(user) {
  return ["Admin", "Executive"].includes(user.role) || ["admin", "executive"].includes(user.department_id);
}

function assertDepartmentAccess(user, resource, departmentId, action = "can_read") {
  if (hasAllAccess(user)) return;
  const allowed = resourcesFor(user);
  if (departmentId !== user.department_id) throw new HttpError(403, "Forbidden department");
  if (!allowed.includes(resource)) throw new HttpError(403, "Forbidden resource");
  if (action === "can_approve" && !["Director", "Supervisor"].includes(user.role)) throw new HttpError(403, "Approval requires supervisor access");
}

async function extractDocumentWithAi(env, doc) {
  if (!env.DOCUMENT_AI_ENDPOINT || !env.DOCUMENT_AI_API_KEY) {
    throw new Error("DOCUMENT_AI_ENDPOINT and DOCUMENT_AI_API_KEY are required");
  }
  const base64 = arrayBufferToBase64(doc.bytes);
  const prompt = [
    "You extract operational information for High Point Ops.",
    "Classify the document into a department and destination table.",
    "Return only valid JSON matching this schema:",
    JSON.stringify(DOC_SCHEMA),
    "Department hint: " + doc.departmentHint,
    "Document type hint: " + doc.documentTypeHint,
    "File name: " + doc.fileName,
    "File MIME type: " + doc.fileType,
  ].join("\n");

  const response = await fetch(env.DOCUMENT_AI_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + env.DOCUMENT_AI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.DOCUMENT_AI_MODEL,
      input: [
        { role: "system", content: "Return concise JSON only. Do not invent missing facts." },
        { role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_base64: base64, mime_type: doc.fileType }] },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) throw new Error("AI provider returned " + response.status);
  const payload = await response.json();
  const text = payload.output_text || payload.text || payload.choices?.[0]?.message?.content || JSON.stringify(payload);
  return typeof text === "string" ? JSON.parse(text) : text;
}

function normalizeExtraction(raw, fallbackDepartment) {
  const department = normalizeDepartment(raw.department || fallbackDepartment);
  const destination = String(raw.destination_resource || "").trim();
  if (!DESTINATION_TABLES.has(destination)) throw new Error("Unsupported destination_resource: " + destination);
  return {
    department,
    destination_resource: destination,
    confidence: Math.max(0, Math.min(1, Number(raw.confidence || 0))),
    title: String(raw.title || "Document extraction").slice(0, 160),
    fields: raw.fields && typeof raw.fields === "object" ? raw.fields : {},
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
  };
}

async function insertDraftRecord(env, extraction, uploadId, userId) {
  const idValue = id("rec");
  const f = extraction.fields;
  const bind = (...args) => args.map((v) => v == null ? null : v);
  if (extraction.destination_resource === "work_orders") {
    await env.DB.prepare("INSERT INTO work_orders (id, source_upload_id, title, location, priority, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?, 'Draft', ?)")
      .bind(...bind(idValue, uploadId, f.title || extraction.title, f.location, f.priority || "Medium", f.description || f.notes, userId)).run();
  } else if (extraction.destination_resource === "incidents") {
    await env.DB.prepare("INSERT INTO incidents (id, source_upload_id, incident_type, resident_name, location, occurred_at, description, action_taken, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?)")
      .bind(...bind(idValue, uploadId, f.incident_type, f.resident_name, f.location, f.occurred_at, f.description, f.action_taken, userId)).run();
  } else if (extraction.destination_resource === "inventory_items") {
    await env.DB.prepare("INSERT INTO inventory_items (id, department_id, source_upload_id, item_name, sku, quantity, unit, vendor, reorder_level, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?)")
      .bind(...bind(idValue, extraction.department, uploadId, f.item_name || extraction.title, f.sku, f.quantity, f.unit, f.vendor, f.reorder_level, userId)).run();
  } else if (extraction.destination_resource === "staff_credentials") {
    await env.DB.prepare("INSERT INTO staff_credentials (id, department_id, source_upload_id, staff_name, credential_type, license_number, expires_at, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft', ?)")
      .bind(...bind(idValue, extraction.department, uploadId, f.staff_name || extraction.title, f.credential_type, f.license_number, f.expires_at, userId)).run();
  } else if (extraction.destination_resource === "pm_checks") {
    await env.DB.prepare("INSERT INTO pm_checks (id, source_upload_id, asset_name, check_type, completed_at, next_due_at, notes, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft', ?)")
      .bind(...bind(idValue, uploadId, f.asset_name || extraction.title, f.check_type, f.completed_at, f.next_due_at, f.notes, userId)).run();
  } else if (extraction.destination_resource === "meal_notes") {
    await env.DB.prepare("INSERT INTO meal_notes (id, source_upload_id, meal_date, meal_type, resident_name, diet_type, notes, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft', ?)")
      .bind(...bind(idValue, uploadId, f.meal_date, f.meal_type, f.resident_name, f.diet_type, f.notes, userId)).run();
  } else if (extraction.destination_resource === "activity_events") {
    await env.DB.prepare("INSERT INTO activity_events (id, source_upload_id, title, event_date, location, notes, status, created_by) VALUES (?, ?, ?, ?, ?, ?, 'Draft', ?)")
      .bind(...bind(idValue, uploadId, f.title || extraction.title, f.event_date, f.location, f.notes, userId)).run();
  }
  return idValue;
}

async function markDraftApproved(env, resource, recordId) {
  if (!DESTINATION_TABLES.has(resource)) throw new Error("Unsupported resource");
  const statusSql = "UPDATE " + resource + " SET status = 'Approved' WHERE id = ?";
  await env.DB.prepare(statusSql).bind(recordId).run();
}

function normalizeDepartment(value) {
  return String(value || "admin").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sanitizeFileName(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

function id(prefix) {
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json;charset=UTF-8" },
  });
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
