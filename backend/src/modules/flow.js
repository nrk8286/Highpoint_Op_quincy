import { jsonResponse } from "../runtime.js";
import { resourcesFor } from "../policy.js";
import { repositories } from "../repositories.js";

export async function getFlow(context) {
  const resources = resourcesFor(context.user);
  return jsonResponse({
    requestId: context.requestId,
    user: {
      id: context.user.id,
      role: context.user.role,
      department: context.user.department,
    },
    flow: {
      network: "client-reported",
      workspace: "available",
      recovery: "armed",
      resources,
      next: resources.includes("*") ? ["admin", "security_cameras", "reports"] : resources,
    },
  });
}

export async function postEvent(context) {
  const body = context.body || {};
  const repo = repositories(context);
  await repo.flow.save({
    staffId: context.user.id,
    role: context.user.role,
    department: context.user.department,
    networkState: body.networkState,
    appState: body.appState,
    recoveryState: body.recoveryState,
    queueCount: body.queueCount,
    metadata: body.metadata || {},
  });
  return jsonResponse({ ok: true, requestId: context.requestId }, 202);
}
