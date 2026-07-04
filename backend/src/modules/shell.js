import { HttpError, jsonResponse, readJson, normalizeId } from "../runtime.js";
import { hasAllAccess } from "../policy.js";
import { repositories } from "../repositories.js";
import { shellEventOperation } from "../graph/operations.js";
import { scheduleGraphWrite } from "../graph/sync.js";

const ALLOWED_TYPES = new Set(["incident", "work_order", "document_note", "supply_request"]);
const ALLOWED_PRIORITIES = new Set(["routine", "urgent", "critical"]);

export async function listShellEvents(context) {
  if (!hasAllAccess(context.user)) throw new HttpError(403, "Admin or Executive access required");
  const limit = context.url.searchParams.get("limit") || 25;
  const items = await repositories(context).shellEvents.listRecent(limit);
  return jsonResponse({ items: items.map(normalizeShellEventRow), requestId: context.requestId });
}

export async function postShellEvent(context) {
  const body = await readJson(context.request);
  const record = body.offlineRecord || body.record || body;
  const type = normalizeType(record.type);
  if (!type) throw new HttpError(400, "Unsupported shell event type");

  const event = {
    type,
    department: normalizeId(record.department || body.department || "unknown", "unknown"),
    priority: ALLOWED_PRIORITIES.has(record.priority) ? record.priority : "routine",
    location: cleanText(record.location, 160),
    note: cleanText(record.note, 1000),
    attachment: normalizeAttachment(record.attachment),
    network: cleanText(record.network || body.networkState, 40),
    userAgent: cleanText(record.userAgent, 300),
    metadata: {
      source: "mobile_shell",
      clientId: cleanText(record.id, 80),
      appState: cleanText(body.appState, 80),
      recoveryState: cleanText(body.recoveryState, 80),
      queueCount: Number(body.queueCount || 0),
      receivedAt: new Date().toISOString(),
    },
  };
  const id = await repositories(context).shellEvents.create(event);
  scheduleGraphWrite(context, shellEventOperation({ id, event, context }));

  return jsonResponse({ ok: true, id, requestId: context.requestId }, 202);
}

function normalizeType(value) {
  const raw = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (ALLOWED_TYPES.has(raw)) return raw;
  if (raw === "offline_incident") return "incident";
  return "";
}

function cleanText(value, limit) {
  return String(value || "").trim().slice(0, limit);
}

function normalizeAttachment(attachment) {
  if (!attachment || typeof attachment !== "object") return {};
  return {
    name: cleanText(attachment.name, 180),
    type: cleanText(attachment.type, 120),
    size: Number(attachment.size || 0),
  };
}

function normalizeShellEventRow(row) {
  return {
    id: row.id,
    type: row.event_type,
    department: row.department_id,
    priority: row.priority,
    location: row.location,
    note: row.note,
    attachment: parseJson(row.attachment_json, {}),
    network: row.network_state,
    createdAt: row.created_at,
  };
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
