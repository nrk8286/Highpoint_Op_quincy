import { jsonResponse } from "../runtime.js";
import { hasAllAccess, visibleProfile } from "../policy.js";
import { repositories } from "../repositories.js";
import { graphConfig } from "../graph/client.js";
import { listGraphFailures } from "../graph/sync.js";
import { azureSummary } from "./azure.js";
import { workspaceFlow } from "./flow.js";

export async function workspaceBrief(context) {
  const body = context.body || {};
  const queueCount = boundedCount(body.queueCount);
  const roleMode = cleanText(body.roleMode, 32) || "staff";
  const repo = repositories(context);
  const allAccess = hasAllAccess(context.user);
  const flow = workspaceFlow(context.user);
  let reviewRows = [];
  let reviewAccess = true;

  try {
    reviewRows = await repo.reviewQueue.listPending({
      allAccess,
      department: context.user.department,
    });
  } catch (error) {
    reviewRows = [];
    reviewAccess = false;
  }

  const [outlookConnection, shellRows, graphFailures] = await Promise.all([
    repo.outlook.getConnection(context.user.id),
    allAccess ? repo.shellEvents.listRecent(5) : Promise.resolve([]),
    allAccess ? listGraphFailures(context, 5) : Promise.resolve([]),
  ]);

  const reviewItems = reviewRows.map(normalizeReviewRow);
  const shellItems = shellRows.map(normalizeShellRow);
  const graph = graphConfig(context.env);
  const azure = azureSummary(context.env);
  const brief = buildBrief({
    user: context.user,
    flow,
    queueCount,
    roleMode,
    reviewItems,
    reviewAccess,
    outlookConnection,
    shellItems,
    graph,
    azure,
    graphFailures,
    allAccess,
  });

  return jsonResponse({
    requestId: context.requestId,
    user: visibleProfile(context.user),
    flow,
    local: {
      roleMode,
      queueCount,
    },
    health: {
      db: Boolean(context.env.DB),
      documents: Boolean(context.env.DOCUMENTS),
      azure,
      graphConfigured: graph.configured,
      graphDatabase: graph.database,
    },
    outlook: normalizeOutlook(outlookConnection),
    review: {
      count: reviewItems.length,
      lowConfidenceCount: brief.lowConfidenceCount,
      warningCount: brief.warningCount,
      items: reviewItems.slice(0, 4),
      access: reviewAccess,
    },
    graph: {
      configured: graph.configured,
      database: graph.database,
      count: graphFailures.length,
      failures: graphFailures.map(normalizeGraphFailure),
    },
    shell: {
      count: shellItems.length,
      items: shellItems,
    },
    summary: brief.summary,
    highlights: brief.highlights,
    actions: brief.actions,
    briefText: brief.briefText,
    generatedAt: new Date().toISOString(),
  });
}

function buildBrief({ user, flow, queueCount, roleMode, reviewItems, reviewAccess, outlookConnection, shellItems, graph, azure, graphFailures, allAccess }) {
  const lowConfidenceCount = reviewItems.filter((item) => item.confidence < 0.7).length;
  const warningCount = reviewItems.reduce((total, item) => total + item.warnings.length, 0);
  const outlook = normalizeOutlook(outlookConnection);
  const graphFailureCount = graphFailures.length;
  const resources = Array.isArray(flow.resources) && flow.resources.length ? flow.resources : ["dashboard"];
  const nextAction = buildActions({
    queueCount,
    reviewCount: reviewItems.length,
    lowConfidenceCount,
    outlook,
    graphFailureCount,
    shellCount: shellItems.length,
    allAccess,
    graph,
  })[0];

  const summaryParts = [];
  if (queueCount > 0) summaryParts.push(`${queueCount} local capture${plural(queueCount)} queued`);
  if (reviewItems.length > 0) summaryParts.push(`${reviewItems.length} review item${plural(reviewItems.length)} pending`);
  if (!reviewAccess) summaryParts.push("document review access is limited for this account");
  if (allAccess && graphFailureCount > 0) summaryParts.push(`${graphFailureCount} graph sync failure${plural(graphFailureCount)}`);
  if (!outlook.connected) summaryParts.push("Outlook is disconnected");

  const summary = summaryParts.length
    ? `Attention needed: ${summaryParts.join(", ")}.`
    : "Workspace is clear. No immediate handoff items.";

  const highlights = [
    `Signed in as ${user.name || user.username || user.id} (${user.role}, ${user.department})`,
    `Workspace mode: ${roleMode}`,
    `Resources: ${resources.includes("*") ? "all access" : resources.join(", ")}`,
    `Queue: ${queueCount} local capture${plural(queueCount)}`,
    `Reviews: ${reviewItems.length} pending document review${plural(reviewItems.length)}`,
    outlook.connected
      ? `Outlook: connected${outlook.accountEmail ? ` to ${outlook.accountEmail}` : ""}`
      : "Outlook: disconnected",
    allAccess
      ? `Graph outbox: ${graphFailureCount} pending`
      : `Graph outbox: ${graph.configured ? "available for admin access" : "not configured"}`,
    shellItems.length
      ? `Recent shell captures: ${shellItems.length}`
      : "Recent shell captures: none",
    `Azure catalog: ${azure.services} services`,
  ];

  const actions = buildActions({
    queueCount,
    reviewCount: reviewItems.length,
    lowConfidenceCount,
    outlook,
    graphFailureCount,
    shellCount: shellItems.length,
    allAccess,
    graph,
  });

  const briefLines = [
    `Operations brief for ${user.name || user.username || user.id}`,
    `Role: ${user.role} · Department: ${user.department}`,
    `Mode: ${roleMode}`,
    `Queue: ${queueCount} local capture${plural(queueCount)}`,
    `Review queue: ${reviewAccess ? `${reviewItems.length} pending item${plural(reviewItems.length)}${lowConfidenceCount ? `, ${lowConfidenceCount} low confidence` : ""}${warningCount ? `, ${warningCount} warning${plural(warningCount)}` : ""}` : "not available for this account"}`,
    `Outlook: ${outlook.connected ? `connected${outlook.accountEmail ? ` to ${outlook.accountEmail}` : ""}` : "disconnected"}`,
    `Graph: ${allAccess ? `${graphFailureCount} pending outbox item${plural(graphFailureCount)}` : graph.configured ? "available for admin access" : "not configured"}`,
    `Next step: ${nextAction?.label || "No immediate action"}`,
  ];

  if (shellItems.length) {
    briefLines.push(`Recent capture: ${shellItems[0].type || "capture"} · ${shellItems[0].location || "no location"}`);
  }

  if (reviewItems.length) {
    const review = reviewItems[0];
    briefLines.push(`Top review: ${review.fileName || review.id} · ${review.destinationResource || "documents"} · ${Math.round(review.confidence * 100)}% confidence`);
  } else if (!reviewAccess) {
    briefLines.push("Review access: not available for this account");
  }

  return {
    lowConfidenceCount,
    warningCount,
    summary,
    highlights,
    actions,
    briefText: briefLines.join("\n"),
  };
}

function buildActions({ queueCount, reviewCount, lowConfidenceCount, outlook, graphFailureCount, shellCount, allAccess, graph }) {
  const actions = [];
  if (queueCount > 0) {
    actions.push({
      id: "sync_queue",
      label: `Sync ${queueCount} queue item${plural(queueCount)}`,
      detail: "Dispatch the local capture queue now.",
    });
  }
  if (reviewCount > 0) {
    actions.push({
      id: "review_queue",
      label: `Review ${reviewCount} document item${plural(reviewCount)}`,
      detail: lowConfidenceCount > 0
        ? `${lowConfidenceCount} item${plural(lowConfidenceCount)} are low confidence.`
        : "Pending documents are waiting for review.",
    });
  }
  if (allAccess && graphFailureCount > 0) {
    actions.push({
      id: "retry_graph",
      label: `Retry ${graphFailureCount} graph sync item${plural(graphFailureCount)}`,
      detail: "Neo4j outbox has pending work.",
    });
  }
  if (!outlook.connected) {
    actions.push({
      id: "open_outlook",
      label: "Reconnect Outlook",
      detail: "Mail and calendar sync is not active.",
    });
  }
  if (allAccess && shellCount > 0) {
    actions.push({
      id: "capture_queue",
      label: `Review ${shellCount} recent shell capture${plural(shellCount)}`,
      detail: "Audit the latest recovery signals.",
    });
  }
  if (!actions.length) {
    actions.push({
      id: "steady",
      label: "Workspace clear",
      detail: graph.configured ? "No immediate handoff items." : "Neo4j graph is not configured yet.",
    });
  }
  return actions;
}

function normalizeReviewRow(row) {
  return {
    id: row.id,
    fileName: row.file_name,
    status: row.status,
    assignedDepartmentId: row.assigned_department_id,
    destinationResource: row.destination_resource,
    destinationRecordId: row.destination_record_id,
    confidence: Number(row.confidence || 0),
    extracted: parseJson(row.extracted_json, {}),
    warnings: parseJson(row.warnings_json, []),
    uploadedAt: row.uploaded_at,
    createdAt: row.created_at,
    reviewerNotes: row.reviewer_notes || "",
    reviewedBy: row.reviewed_by || "",
    reviewedAt: row.reviewed_at || "",
  };
}

function normalizeShellRow(row) {
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

function normalizeGraphFailure(row) {
  return {
    id: row.id,
    operation: row.operation,
    entityType: row.entity_type,
    entityId: row.entity_id,
    attempts: row.attempts,
    status: row.status,
    lastError: row.last_error,
    nextRetryAt: row.next_retry_at,
    createdAt: row.created_at,
  };
}

function normalizeOutlook(connection) {
  return {
    connected: Boolean(connection && connection.status === "active"),
    accountEmail: connection?.account_email || "",
    status: connection?.status || "missing",
    updatedAt: connection?.updated_at || "",
  };
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function boundedCount(value) {
  return Math.max(0, Math.min(1000, Number(value) || 0));
}

function cleanText(value, limit) {
  return String(value || "").trim().slice(0, limit);
}

function plural(value) {
  return Number(value) === 1 ? "" : "s";
}
