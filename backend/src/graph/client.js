import { HttpError } from "../runtime.js";
import { GraphError, isRetryableStatus } from "./errors.js";

export function graphConfig(env) {
  const endpoint = String(env.NEO4J_QUERY_ENDPOINT || "").trim();
  const database = String(env.NEO4J_DATABASE || "neo4j").trim();
  const username = String(env.NEO4J_USERNAME || "").trim();
  const password = String(env.NEO4J_PASSWORD || "");
  return {
    endpoint,
    database,
    username,
    password,
    protocol: endpoint.includes("/tx/commit") ? "transaction" : "query",
    configured: Boolean(endpoint && database && username && password),
  };
}

export function requireGraphConfig(env) {
  const config = graphConfig(env);
  const missing = [];
  if (!config.endpoint) missing.push("NEO4J_QUERY_ENDPOINT");
  if (!config.database) missing.push("NEO4J_DATABASE");
  if (!config.username) missing.push("NEO4J_USERNAME");
  if (!config.password) missing.push("NEO4J_PASSWORD");
  if (missing.length) throw new HttpError(503, "Neo4j graph is not configured", { missing });
  return config;
}

export function createNeo4jClient(env, fetchImpl = fetch) {
  const config = requireGraphConfig(env);
  return {
    async query(statement, parameters = {}, metadata = {}) {
      return queryNeo4j(config, fetchImpl, statement, parameters, metadata);
    },
  };
}

export function buildQueryPayload(statement, parameters = {}, metadata = {}) {
  const audit = {
    requestId: metadata.requestId || "",
    actorId: metadata.actorId || "",
    actorRole: metadata.actorRole || "",
    actorDepartment: metadata.actorDepartment || "",
    at: metadata.at || new Date().toISOString(),
  };
  return {
    statement: String(statement || "").replace(/\s+/g, " ").trim(),
    parameters: {
      ...parameters,
      audit,
    },
    txMetadata: audit,
  };
}

export function buildTransactionPayload(statement, parameters = {}, metadata = {}) {
  const audit = {
    requestId: metadata.requestId || "",
    actorId: metadata.actorId || "",
    actorRole: metadata.actorRole || "",
    actorDepartment: metadata.actorDepartment || "",
    at: metadata.at || new Date().toISOString(),
  };
  return {
    statements: [{
      statement: String(statement || "").replace(/\s+/g, " ").trim(),
      parameters: {
        ...parameters,
        audit,
      },
    }],
  };
}

async function queryNeo4j(config, fetchImpl, statement, parameters, metadata) {
  const response = await fetchImpl(config.endpoint, {
    method: "POST",
    headers: {
      "authorization": `Basic ${btoa(`${config.username}:${config.password}`)}`,
      "content-type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify(
      config.protocol === "transaction"
        ? buildTransactionPayload(statement, parameters, metadata)
        : buildQueryPayload(statement, parameters, metadata)
    ),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new GraphError("Neo4j Query API request failed", {
      status: response.status,
      code: "neo4j_http_error",
      retryable: isRetryableStatus(response.status),
      detail: payload,
    });
  }
  if (Array.isArray(payload.errors) && payload.errors.length) {
    const first = payload.errors[0] || {};
    throw new GraphError(first.message || "Neo4j query failed", {
      status: response.status,
      code: first.code || "neo4j_query_error",
      retryable: isRetryableStatus(response.status) || String(first.code || "").includes("TransientError"),
      detail: payload.errors,
    });
  }
  return payload;
}
