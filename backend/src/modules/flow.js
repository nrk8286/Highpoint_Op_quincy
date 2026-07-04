import { jsonResponse } from "../runtime.js";
import { resourcesFor } from "../policy.js";
import { repositories } from "../repositories.js";
import { flowSnapshotOperation } from "../graph/operations.js";
import { scheduleGraphWrite } from "../graph/sync.js";

export function workspaceFlow(user) {
  const resources = resourcesFor(user);
  return {
    network: "client-reported",
    workspace: "available",
    recovery: "armed",
    resources,
    next: resources.includes("*") ? ["admin", "security_cameras", "reports"] : resources,
  };
}

export async function getFlow(context) {
  return jsonResponse({
    requestId: context.requestId,
    user: {
      id: context.user.id,
      role: context.user.role,
      department: context.user.department,
    },
    flow: workspaceFlow(context.user),
  });
}

export async function postEvent(context) {
  const body = context.body || {};
  const repo = repositories(context);
  const snapshot = {
    staffId: context.user.id,
    role: context.user.role,
    department: context.user.department,
    networkState: body.networkState,
    appState: body.appState,
    recoveryState: body.recoveryState,
    queueCount: body.queueCount,
    metadata: body.metadata || {},
  };
  const id = await repo.flow.save(snapshot);
  scheduleGraphWrite(context, flowSnapshotOperation({ id, snapshot, user: context.user }));
  return jsonResponse({ ok: true, requestId: context.requestId }, 202);
}
