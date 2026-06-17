import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRouter } from "../backend/src/router.js";
import { registerRoutes } from "../backend/src/routes.js";

const root = process.cwd();
const backend = join(root, "backend");
const required = [
  "README.md",
  "wrangler.jsonc.example",
  "migrations/0001_backend_v2.sql",
  "migrations/0002_graph_outbox.sql",
  "migrations/0003_shell_events.sql",
  "migrations/0004_legacy_staff_auth.sql",
  "src/index.js",
  "src/router.js",
  "src/runtime.js",
  "src/auth.js",
  "src/policy.js",
  "src/events.js",
  "src/repositories.js",
  "src/routes.js",
  "src/graph/client.js",
  "src/graph/cypher.js",
  "src/graph/errors.js",
  "src/graph/operations.js",
  "src/graph/sync.js",
  "src/modules/graph.js",
  "src/modules/shell.js",
  "scripts/apply-graph-migrations.mjs",
  "scripts/check-graph.mjs",
  "migrations/graph/0001_neo4j_schema.cypher",
  "migrations/graph/0002_relationship_types_roles.cypher",
  "migrations/graph/0003_departments_access.cypher",
  "migrations/graph/0004_shell_capture_relationships.cypher",
];

for (const file of required) {
  statSync(join(backend, file));
}

const sourceFiles = walk(join(backend, "src")).filter((file) => file.endsWith(".js"));
for (const file of sourceFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

const worker = readFileSync(join(backend, "src/index.js"), "utf8");
const allSource = sourceFiles.map((file) => readFileSync(file, "utf8")).join("\n");
const migration = readFileSync(join(backend, "migrations/0001_backend_v2.sql"), "utf8");
const graphOutboxMigration = readFileSync(join(backend, "migrations/0002_graph_outbox.sql"), "utf8");
const shellEventsMigration = readFileSync(join(backend, "migrations/0003_shell_events.sql"), "utf8");
const graphSchema = readFileSync(join(backend, "migrations/graph/0001_neo4j_schema.cypher"), "utf8");
const graphAccessSchema = readFileSync(join(backend, "migrations/graph/0002_relationship_types_roles.cypher"), "utf8");
const graphDepartmentSchema = readFileSync(join(backend, "migrations/graph/0003_departments_access.cypher"), "utf8");
const graphShellCaptureSchema = readFileSync(join(backend, "migrations/graph/0004_shell_capture_relationships.cypher"), "utf8");
const config = readFileSync(join(backend, "wrangler.jsonc.example"), "utf8");

assertIncludes(worker, "ctx.waitUntil", "Worker must use ctx.waitUntil for post-response audit work.");
assertIncludes(allSource, "crypto.randomUUID", "Worker must generate IDs with Web Crypto.");
assertIncludes(migration, "hp_audit_events", "Migration must include audit events table.");
assertIncludes(migration, "hp_outlook_connections", "Migration must include Outlook connection table.");
assertIncludes(migration, "hp_graph_sync_outbox", "Migration must include graph sync outbox table.");
assertIncludes(graphOutboxMigration, "hp_graph_sync_outbox", "Additive graph outbox migration must exist for already-applied D1 databases.");
assertIncludes(shellEventsMigration, "hp_shell_events", "Additive shell event migration must exist.");
assertIncludes(allSource, "/api/v2/shell/events", "Routes must include recovery shell event intake endpoint.");
assertIncludes(allSource, "shell_events_read", "Routes must include secured shell event listing endpoint.");
assertIncludes(allSource, "shell_event", "Shell captures must be scheduled for graph sync.");
assertIncludes(allSource, "NEO4J_QUERY_ENDPOINT", "Graph client must validate Neo4j endpoint configuration.");
assertIncludes(allSource, "hp_graph_sync_outbox", "Graph sync must persist failed writes in D1.");
assertIncludes(allSource, "ON CONFLICT(id) DO UPDATE", "Graph outbox must deduplicate idempotent entity sync writes.");
assertIncludes(allSource, "/api/v2/graph/query", "Routes must include graph admin query endpoint.");
assertIncludes(allSource, "role_permissions", "Graph query templates must expose role permissions.");
assertIncludes(allSource, "relationship_catalog", "Graph query templates must expose relationship catalog.");
assertIncludes(allSource, "department_permissions", "Graph query templates must expose department permissions.");
assertIncludes(allSource, "recent_captures", "Graph query templates must expose shell captures.");
assertIncludes(allSource, "function graphRows", "Graph module must normalize Neo4j responses into named rows.");
assertIncludes(allSource, "relationshipTypes", "Graph health must report relationship type catalog counts.");
assertIncludes(graphSchema, "CREATE CONSTRAINT staff_id", "Graph schema must include Staff id constraint.");
assertIncludes(graphSchema, "CREATE CONSTRAINT audit_event_id", "Graph schema must include AuditEvent id constraint.");
assertIncludes(graphAccessSchema, "CREATE CONSTRAINT role_id", "Graph access schema must include Role id constraint.");
assertIncludes(graphAccessSchema, "RelationshipType", "Graph access schema must include relationship type catalog nodes.");
assertIncludes(graphAccessSchema, "HAS_ROLE", "Graph access schema must include Staff-to-Role relationships.");
assertIncludes(graphDepartmentSchema, "ALLOWS", "Graph department schema must include Department-to-Permission relationships.");
assertIncludes(graphShellCaptureSchema, "CAPTURED_AS", "Graph shell schema must include captured entity relationships.");
assertIncludes(config, "NEO4J_QUERY_ENDPOINT", "Wrangler example must include Neo4j Query API endpoint placeholder.");
assertIncludes(config, "NEO4J_DATABASE", "Wrangler example must include Neo4j database placeholder.");
assertIncludes(config, "\"nodejs_compat\"", "Wrangler example must enable nodejs_compat.");
assertIncludes(config, "\"observability\"", "Wrangler example must enable observability.");

const router = createRouter();
registerRoutes(router);
for (const [method, path] of [
  ["GET", "/api/v2/health"],
  ["GET", "/api/v2/outlook/status"],
  ["POST", "/api/v2/outlook/disconnect"],
  ["GET", "/api/v2/shell/events"],
  ["POST", "/api/v2/shell/events"],
  ["GET", "/api/v2/graph/health"],
  ["GET", "/api/v2/graph/entity/Staff/staff-1"],
]) {
  if (!router.match(method, path)) throw new Error(`Route smoke check failed for ${method} ${path}`);
}

console.log(`validated backend: ${sourceFiles.length} source file(s), ${required.length} required artifact(s)`);

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function assertIncludes(text, needle, message) {
  if (!text.includes(needle)) throw new Error(message);
}
