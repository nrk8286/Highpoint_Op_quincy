import { jsonResponse, readJson } from "./runtime.js";
import { visibleProfile } from "./policy.js";
import { health } from "./modules/health.js";
import { azureServices } from "./modules/azure.js";
import { getFlow, postEvent } from "./modules/flow.js";
import { getSecurityCameras, openSecurityCameras } from "./modules/security-cameras.js";
import { completeOutlookAuth, disconnectOutlook, getOutlookStatus, startOutlookAuth, syncOutlookInbox, sendOutlookEmail } from "./modules/outlook.js";
import { approveReview, batchApproveReview, listReviewQueue } from "./modules/documents.js";
import { graphEntity, graphFailures, graphHealth, graphQuery, graphRetry, graphSearch } from "./modules/graph.js";
import { listShellEvents, postShellEvent } from "./modules/shell.js";
import { workspaceBrief } from "./modules/workspace.js";

export function registerRoutes(router) {
  router.add("GET", "/api/v2/health", { auth: false, resource: "health", audit: "health_check" }, health);
  router.add("GET", "/api/v2/azure/services", { auth: false, resource: "azure", audit: "azure_services" }, azureServices);
  router.add("GET", "/api/azure/services", { auth: false, resource: "azure", audit: "azure_services_legacy" }, azureServices);

  const me = async (context) => {
    return jsonResponse({ user: visibleProfile(context.user), requestId: context.requestId });
  };
  router.add("GET", "/api/v2/me", { resource: "profile", audit: "profile_read" }, me);
  router.add("GET", "/api/me/access", { resource: "profile", audit: "profile_read_legacy" }, me);

  router.add("GET", "/api/v2/flow", { resource: "flow", audit: "flow_read" }, getFlow);
  router.add("POST", "/api/v2/workspace/brief", { resource: "dashboard", audit: "workspace_brief" }, async (context) => {
    context.body = await readJson(context.request);
    return workspaceBrief(context);
  });

  router.add("POST", "/api/v2/events", { resource: "flow", audit: "flow_event" }, async (context) => {
    context.body = await readJson(context.request);
    return postEvent(context);
  });
  router.add("GET", "/api/v2/shell/events", { resource: "shell", audit: "shell_events_read" }, listShellEvents);
  router.add("POST", "/api/v2/shell/events", { resource: "shell", audit: "shell_event" }, postShellEvent);

  router.add("GET", "/api/v2/security/cameras", { resource: "security_cameras", audit: "security_camera_read" }, getSecurityCameras);
  router.add("GET", "/api/v2/security/camera", { resource: "security_cameras", audit: "security_camera_read_singular" }, getSecurityCameras);
  router.add("GET", "/api/security/cameras", { resource: "security_cameras", audit: "security_camera_read_legacy" }, getSecurityCameras);
  router.add("GET", "/api/security/camera", { resource: "security_cameras", audit: "security_camera_read_legacy_singular" }, getSecurityCameras);
  router.add("GET", "/api/v2/security/cameras/open", { auth: false, resource: "security_cameras", audit: "security_camera_open" }, openSecurityCameras);
  router.add("GET", "/api/v2/security/cameras/feed", { auth: false, resource: "security_cameras", audit: "security_camera_feed" }, openSecurityCameras);
  router.add("GET", "/api/security/cameras/open", { auth: false, resource: "security_cameras", audit: "security_camera_open_legacy" }, openSecurityCameras);
  router.add("GET", "/api/security/cameras/feed", { auth: false, resource: "security_cameras", audit: "security_camera_feed_legacy" }, openSecurityCameras);

  const outlookStart = async (context) => {
    context.body = await readJson(context.request);
    return startOutlookAuth(context);
  };
  router.add("POST", "/api/v2/outlook/auth/start", { resource: "outlook", audit: "outlook_auth_start" }, outlookStart);
  router.add("POST", "/api/outlook/auth/start", { resource: "outlook", audit: "outlook_auth_start_legacy" }, outlookStart);

  const outlookComplete = async (context) => {
    context.body = await readJson(context.request);
    return completeOutlookAuth(context);
  };
  router.add("POST", "/api/v2/outlook/auth/complete", { resource: "outlook", audit: "outlook_auth_complete" }, outlookComplete);
  router.add("POST", "/api/outlook/auth/complete", { resource: "outlook", audit: "outlook_auth_complete_legacy" }, outlookComplete);
  router.add("GET", "/api/v2/outlook/status", { resource: "outlook", audit: "outlook_status" }, getOutlookStatus);
  router.add("GET", "/api/outlook/status", { resource: "outlook", audit: "outlook_status_legacy" }, getOutlookStatus);

  const outlookDisconnect = async (context) => {
    return disconnectOutlook(context);
  };
  router.add("POST", "/api/v2/outlook/disconnect", { resource: "outlook", audit: "outlook_disconnect" }, outlookDisconnect);
  router.add("POST", "/api/outlook/disconnect", { resource: "outlook", audit: "outlook_disconnect_legacy" }, outlookDisconnect);

  router.add("GET", "/api/v2/outlook/sync", { resource: "outlook", audit: "outlook_sync" }, syncOutlookInbox);
  router.add("POST", "/api/v2/outlook/send", { resource: "outlook", audit: "outlook_send" }, sendOutlookEmail);

  router.add("GET", "/api/v2/documents/review", { resource: "documents", audit: "review_queue_read" }, listReviewQueue);
  router.add("GET", "/api/documents/review", { resource: "documents", audit: "review_queue_read_legacy" }, listReviewQueue);

  const reviewDecision = async (context) => {
    context.body = await readJson(context.request);
    return approveReview(context);
  };
  router.add("POST", "/api/v2/documents/review/:id/decision", { resource: "documents", audit: "review_decision" }, reviewDecision);
  router.add("POST", "/api/documents/review/:id", { resource: "documents", audit: "review_decision_legacy" }, reviewDecision);

  const batchReview = async (context) => {
    return batchApproveReview(context);
  };
  router.add("POST", "/api/v2/documents/review/batch", { resource: "documents", audit: "review_batch_decision" }, batchReview);

  router.add("GET", "/api/v2/graph/health", { resource: "graph", audit: "graph_health" }, graphHealth);
  router.add("POST", "/api/v2/graph/query", { resource: "graph", audit: "graph_query" }, graphQuery);
  router.add("GET", "/api/v2/graph/entity/:type/:id", { resource: "graph", audit: "graph_entity" }, graphEntity);
  router.add("GET", "/api/v2/graph/search", { resource: "graph", audit: "graph_search" }, graphSearch);
  router.add("POST", "/api/v2/graph/sync/retry", { resource: "graph", audit: "graph_sync_retry" }, graphRetry);
  router.add("GET", "/api/v2/graph/sync/failures", { resource: "graph", audit: "graph_sync_failures" }, graphFailures);
}
