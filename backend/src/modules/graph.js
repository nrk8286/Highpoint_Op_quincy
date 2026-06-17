import { createNeo4jClient, graphConfig, requireGraphConfig } from "../graph/client.js";
import { GRAPH_QUERY_TEMPLATES, labelFor, queryTemplate } from "../graph/cypher.js";
import { assertGraphAdmin, normalizeGraphError } from "../graph/errors.js";
import { listGraphFailures, retryGraphOutbox } from "../graph/sync.js";
import { HttpError, jsonResponse, readJson } from "../runtime.js";

export async function graphHealth(context) {
  assertGraphAdmin(context.user);
  const config = graphConfig(context.env);
  if (!config.configured) {
    return jsonResponse({
      ok: false,
      configured: false,
      database: config.database,
      missing: missingGraphConfig(context.env),
      failures: await listGraphFailures(context, 10),
      requestId: context.requestId,
    }, 503);
  }

  try {
    const client = createNeo4jClient(context.env);
    const result = await client.query(`
      CALL db.info() YIELD name
      WITH name
      MATCH (r:Role) WITH name, count(r) AS roles
      MATCH (p:Permission) WITH name, roles, count(p) AS permissions
      MATCH (d:Department) WITH name, roles, permissions, count(d) AS departments
      MATCH (rt:RelationshipType)
      RETURN name AS database, roles, permissions, departments, count(rt) AS relationshipTypes
    `, {}, graphMeta(context));
    const rows = graphRows(result);
    return jsonResponse({
      ok: true,
      configured: true,
      database: config.database,
      result: result.data || result,
      rows,
      catalog: rows[0] || {},
      failures: await listGraphFailures(context, 10),
      requestId: context.requestId,
    });
  } catch (error) {
    const graphError = normalizeGraphError(error);
    return jsonResponse({
      ok: false,
      configured: true,
      database: config.database,
      error: graphError.message,
      code: graphError.code,
      retryable: graphError.retryable,
      failures: await listGraphFailures(context, 10),
      requestId: context.requestId,
    }, graphError.retryable ? 503 : 502);
  }
}

export async function graphQuery(context) {
  assertGraphAdmin(context.user);
  context.body = await readJson(context.request);
  const template = queryTemplate(context.body.template || context.body.name || "overview");
  const limit = boundedLimit(context.body.limit || context.body.parameters?.limit || template.defaults?.limit || 25);
  const parameters = {
    ...(template.defaults || {}),
    ...(context.body.parameters || {}),
    limit,
  };
  const client = createNeo4jClient(context.env);
  const result = await client.query(template.statement, parameters, graphMeta(context));
  return jsonResponse({
    template: context.body.template || "overview",
    templates: publicTemplates(),
    result,
    rows: graphRows(result),
    requestId: context.requestId,
  });
}

export async function graphEntity(context) {
  assertGraphAdmin(context.user);
  const label = labelFor(context.params.type);
  const id = decodeURIComponent(context.params.id || "");
  if (!id) throw new HttpError(400, "entity id is required");

  const result = await createNeo4jClient(context.env).query(`
    MATCH (entity:${label} {id: $id})
    OPTIONAL MATCH (entity)-[outRel]->(outNode)
    OPTIONAL MATCH (inNode)-[inRel]->(entity)
    RETURN entity,
      collect(DISTINCT {direction: "out", type: type(outRel), node: outNode}) AS outgoing,
      collect(DISTINCT {direction: "in", type: type(inRel), node: inNode}) AS incoming
    LIMIT 1
  `, { id }, graphMeta(context));

  return jsonResponse({ entityType: context.params.type, id, result, rows: graphRows(result), requestId: context.requestId });
}

export async function graphSearch(context) {
  assertGraphAdmin(context.user);
  const q = String(context.url.searchParams.get("q") || "").trim().slice(0, 120);
  if (!q) return jsonResponse({ items: [], requestId: context.requestId });

  const result = await createNeo4jClient(context.env).query(`
    MATCH (n)
    WHERE any(value IN [n.id, n.name, n.title, n.fileName, n.username] WHERE value IS NOT NULL AND toLower(toString(value)) CONTAINS toLower($q))
    RETURN labels(n)[0] AS label, n.id AS id, coalesce(n.name, n.title, n.fileName, n.username, n.id) AS name, properties(n) AS properties
    ORDER BY label, name
    LIMIT $limit
  `, { q, limit: boundedLimit(context.url.searchParams.get("limit") || 25) }, graphMeta(context));
  return jsonResponse({ q, result, rows: graphRows(result), requestId: context.requestId });
}

export async function graphRetry(context) {
  assertGraphAdmin(context.user);
  context.body = await readJson(context.request);
  requireGraphConfig(context.env);
  const results = await retryGraphOutbox(context, context.body.limit || 25);
  return jsonResponse({ results, requestId: context.requestId });
}

export async function graphFailures(context) {
  assertGraphAdmin(context.user);
  const failures = await listGraphFailures(context, context.url.searchParams.get("limit") || 20);
  return jsonResponse({ failures, requestId: context.requestId });
}

function publicTemplates() {
  return Object.entries(GRAPH_QUERY_TEMPLATES).map(([id, template]) => ({
    id,
    label: template.label,
    readOnly: template.readOnly,
  }));
}

function boundedLimit(value) {
  return Math.min(Math.max(Number(value) || 25, 1), 100);
}

function missingGraphConfig(env) {
  return ["NEO4J_QUERY_ENDPOINT", "NEO4J_DATABASE", "NEO4J_USERNAME", "NEO4J_PASSWORD"].filter((key) => !env[key]);
}

function graphMeta(context) {
  return {
    requestId: context.requestId,
    actorId: context.user?.id,
    actorRole: context.user?.role,
    actorDepartment: context.user?.department,
  };
}

function graphRows(result) {
  const first = result?.results?.[0];
  if (first?.columns && Array.isArray(first.data)) {
    return first.data.map((item) => Object.fromEntries(first.columns.map((column, index) => [column, item.row?.[index]])));
  }
  if (result?.data?.fields && Array.isArray(result.data.values)) {
    return result.data.values.map((values) => Object.fromEntries(result.data.fields.map((field, index) => [field, values[index]])));
  }
  if (Array.isArray(result?.data)) return result.data;
  return [];
}
