import { HttpError } from "../runtime.js";

export class GraphError extends Error {
  constructor(message, { status = 500, code = "graph_error", retryable = false, detail = undefined } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.detail = detail;
  }
}

export function assertGraphAdmin(user) {
  if (["Admin", "Executive"].includes(user?.role) || ["admin", "executive"].includes(user?.department)) return;
  throw new HttpError(403, "Graph access requires Admin or Executive access");
}

export function normalizeGraphError(error) {
  if (error instanceof GraphError) return error;
  const message = error?.message || "Graph request failed";
  return new GraphError(message, {
    status: Number(error?.status || 500),
    code: error?.code || "graph_request_failed",
    retryable: isRetryableStatus(error?.status),
    detail: error?.detail,
  });
}

export function isRetryableStatus(status) {
  const value = Number(status || 0);
  return value === 408 || value === 409 || value === 425 || value === 429 || value >= 500;
}
