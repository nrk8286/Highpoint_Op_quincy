import { createRequestContext, errorResponse, headResponse, jsonResponse, optionsResponse, withSecurityHeaders } from "./runtime.js";
import { createRouter } from "./router.js";
import { authenticate } from "./auth.js";
import { auditEvent } from "./events.js";
import { registerRoutes } from "./routes.js";
import { staffContextOperation } from "./graph/operations.js";
import { scheduleGraphWrite } from "./graph/sync.js";
import { staticResponseFor } from "./static.js";
import { isNextAppAsset, isNextAppLoginPage, proxyNextAppAsset, proxyNextAppLoginPage } from "./next-app.js";

const router = createRouter();
registerRoutes(router);

const PUBLIC_PAGE_PATHS = new Set([
  "/",
  "/features",
  "/privacy",
  "/support",
  "/operations-status",
  "/search",
  "/pricing",
  "/executive-command-center",
  "/ai-operations",
  "/workflow-automation",
  "/readiness-assessment",
  "/azure-services",
  "/integrations",
  "/senior-living-operations",
  "/facility-maintenance-software",
  "/survey-readiness",
  "/housekeeping-management",
]);

function shouldProxyPublicPage(requestContext) {
  if (requestContext.method !== "GET" && requestContext.method !== "HEAD") return false;
  const pathname = requestContext.url.pathname;
  if (PUBLIC_PAGE_PATHS.has(pathname)) return false;
  if (pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/next/")) return false;
  if (pathname === "/app" || pathname === "/app/" || pathname === "/signup") return false;
  if (pathname === "/app.bundle.js" || pathname.startsWith("/vendor/")) return false;
  if (pathname === "/apple-touch-icon.png" || pathname === "/sw.js" || pathname === "/manifest.json") return false;
  if (pathname.startsWith("/icons/") || pathname.startsWith("/.well-known/")) return false;
  return true;
}

async function proxyPublicPage(requestContext) {
  const targetUrl = new URL(requestContext.request.url);
  targetUrl.hostname = "server.highpoints.work";
  targetUrl.protocol = "https:";
  const proxiedRequest = new Request(targetUrl.toString(), {
    method: requestContext.request.method,
    redirect: "manual",
  });
  return fetch(proxiedRequest);
}

export function canonicalHostRedirect(request) {
  const url = new URL(request.url);
  if (url.hostname !== "www.highpoints.work") return null;
  url.hostname = "highpoints.work";
  url.protocol = "https:";
  return withSecurityHeaders(new Response(null, {
    status: 308,
    headers: {
      "cache-control": "public, max-age=3600",
      location: url.toString(),
    },
  }));
}

export default {
  async fetch(request, env, ctx) {
    const hostRedirect = canonicalHostRedirect(request);
    if (hostRedirect) return hostRedirect;
    const requestContext = createRequestContext(request, env, ctx);
    try {
      const staticResponse = staticResponseFor(requestContext.url);
      if (staticResponse) {
        if (requestContext.method === "HEAD") return withSecurityHeaders(headResponse(staticResponse));
        return withSecurityHeaders(staticResponse);
      }

      if (isNextAppAsset(requestContext.url)) {
        return withSecurityHeaders(await proxyNextAppAsset(requestContext));
      }

      if (
        (requestContext.method === "GET" || requestContext.method === "HEAD") &&
        isNextAppLoginPage(requestContext.url)
      ) {
        return withSecurityHeaders(await proxyNextAppLoginPage(requestContext));
      }

      if (requestContext.method === "OPTIONS") {
        return withSecurityHeaders(optionsResponse());
      }

      const routeMethod = requestContext.method === "HEAD" ? "GET" : requestContext.method;
      const match = router.match(routeMethod, requestContext.url.pathname);
      if (!match) {
        if (shouldProxyPublicPage(requestContext)) {
          const proxiedResponse = await proxyPublicPage(requestContext);
          if (requestContext.method === "HEAD") return withSecurityHeaders(headResponse(proxiedResponse));
          return withSecurityHeaders(proxiedResponse);
        }
        return withSecurityHeaders(jsonResponse({ error: "Not found", requestId: requestContext.requestId }, 404));
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
        return withSecurityHeaders(headResponse(response));
      }
      return withSecurityHeaders(response);
    } catch (error) {
      console.error(JSON.stringify({
        level: "error",
        message: "request_failed",
        error: error?.message || String(error),
        method: requestContext.method,
        path: requestContext.url.pathname,
        requestId: requestContext.requestId,
      }));
      ctx.waitUntil(auditEvent(requestContext, {
        action: "request_failed",
        resource: requestContext.route?.resource || "api",
        metadata: { message: error.message, status: error.status || 500 },
      }));
      return withSecurityHeaders(errorResponse(error, requestContext.requestId));
    }
  },
};
