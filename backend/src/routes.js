import { jsonResponse, readJson } from "./runtime.js";
import { visibleProfile } from "./policy.js";
import { health } from "./modules/health.js";
import { getFlow, postEvent } from "./modules/flow.js";
import { getSecurityCameras } from "./modules/security-cameras.js";
import { startOutlookAuth, completeOutlookAuth } from "./modules/outlook.js";
import { approveReview, listReviewQueue } from "./modules/documents.js";

export function registerRoutes(router) {
  router.add("GET", "/api/v2/health", { auth: false, resource: "health", audit: "health_check" }, health);

  const me = async (context) => {
    return jsonResponse({ user: visibleProfile(context.user), requestId: context.requestId });
  };
  router.add("GET", "/api/v2/me", { resource: "profile", audit: "profile_read" }, me);
  router.add("GET", "/api/me/access", { resource: "profile", audit: "profile_read_legacy" }, me);

  router.add("GET", "/api/v2/flow", { resource: "flow", audit: "flow_read" }, getFlow);

  router.add("POST", "/api/v2/events", { resource: "flow", audit: "flow_event" }, async (context) => {
    context.body = await readJson(context.request);
    return postEvent(context);
  });

  router.add("GET", "/api/v2/security/cameras", { resource: "security_cameras", audit: "security_camera_read" }, getSecurityCameras);
  router.add("GET", "/api/security/cameras", { resource: "security_cameras", audit: "security_camera_read_legacy" }, getSecurityCameras);

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

  router.add("GET", "/api/v2/documents/review", { resource: "documents", audit: "review_queue_read" }, listReviewQueue);
  router.add("GET", "/api/documents/review", { resource: "documents", audit: "review_queue_read_legacy" }, listReviewQueue);

  const reviewDecision = async (context) => {
    context.body = await readJson(context.request);
    return approveReview(context);
  };
  router.add("POST", "/api/v2/documents/review/:id/decision", { resource: "documents", audit: "review_decision" }, reviewDecision);
  router.add("POST", "/api/documents/review/:id", { resource: "documents", audit: "review_decision_legacy" }, reviewDecision);
}
