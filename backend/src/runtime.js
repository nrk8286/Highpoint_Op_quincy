export class HttpError extends Error {
  constructor(status, message, detail = undefined) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

export function createRequestContext(request, env, executionContext) {
  const url = new URL(request.url);
  return {
    request,
    env,
    ctx: executionContext,
    url,
    method: request.method.toUpperCase(),
    requestId: request.headers.get("cf-ray") || crypto.randomUUID(),
    params: {},
    route: null,
    user: null,
  };
}

export async function readJson(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {};
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export const apiHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, X-Highpoints-User-Id, X-Highpoints-Session",
  "referrer-policy": "same-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "x-xss-protection": "1; mode=block",
};

export function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      ...apiHeaders,
      "cache-control": "no-store",
    },
  });
}

export function headResponse(response) {
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...apiHeaders,
      "content-type": "application/json;charset=UTF-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export function errorResponse(error, requestId) {
  const status = Number(error.status || 500);
  return jsonResponse({
    error: status >= 500 ? "Internal server error" : error.message,
    detail: status >= 500 ? undefined : error.detail,
    requestId,
  }, status);
}

export function requireBinding(env, name) {
  if (!env[name]) throw new HttpError(500, `Missing binding: ${name}`);
  return env[name];
}

export function normalizeId(value, fallback = "") {
  return String(value || fallback).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
