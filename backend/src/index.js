import { createRequestContext, errorResponse, headResponse, jsonResponse, optionsResponse } from "./runtime.js";
import { createRouter } from "./router.js";
import { authenticate } from "./auth.js";
import { auditEvent } from "./events.js";
import { registerRoutes } from "./routes.js";
import { staffContextOperation } from "./graph/operations.js";
import { scheduleGraphWrite } from "./graph/sync.js";
import { staticResponseFor } from "./static.js";

const router = createRouter();
registerRoutes(router);

export default {
  async fetch(request, env, ctx) {
    const requestContext = createRequestContext(request, env, ctx);
    try {
      const staticResponse = staticResponseFor(requestContext.url);
      if (staticResponse) {
        if (requestContext.method === "HEAD") return headResponse(staticResponse);
        return staticResponse;
      }

      if (requestContext.method === "OPTIONS") {
        return optionsResponse();
      }

      const routeMethod = requestContext.method === "HEAD" ? "GET" : requestContext.method;
      const match = router.match(routeMethod, requestContext.url.pathname);
      if (!match) {
        return jsonResponse({ error: "Not found", requestId: requestContext.requestId }, 404);
      }

      requestContext.params = match.params;
      requestContext.route = match.route;

      if (match.route.auth !== false) {
        requestContext.user = await authenticate(requestContext);
        scheduleGraphWrite(requestContext, staffContextOperation(requestContext.user));
      }

      const response = await match.route.handler(requestContext);
      ctx.waitUntil(auditEvent(requestContext, {
        action: match.route.audit || `${requestContext.method} ${match.route.path}`,
        resource: match.route.resource || "api",
        resourceId: requestContext.params.id || "",
        metadata: { status: response.status },
      }));
      if (requestContext.method === "HEAD") {
        return headResponse(response);
      }
      return response;
    } catch (error) {
      ctx.waitUntil(auditEvent(requestContext, {
        action: "request_failed",
        resource: requestContext.route?.resource || "api",
        metadata: { message: error.message, status: error.status || 500 },
      }));
      return errorResponse(error, requestContext.requestId);
    }
  },
};
