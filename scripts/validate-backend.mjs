import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRouter } from "../backend/src/router.js";
import { registerRoutes } from "../backend/src/routes.js";
import { staticResponseFor } from "../backend/src/static.js";
import { isNextAppAsset, patchNextAuthBundle } from "../backend/src/next-app.js";

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
  "src/next-app.js",
  "src/modules/workspace.js",
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
assertIncludes(worker, "shouldProxyPublicPage", "Worker must proxy public pages to the Azure origin.");
assertIncludes(worker, "proxyPublicPage", "Worker must define a public page proxy helper.");
assertIncludes(allSource, "crypto.randomUUID", "Worker must generate IDs with Web Crypto.");
assertIncludes(migration, "hp_audit_events", "Migration must include audit events table.");
assertIncludes(migration, "hp_outlook_connections", "Migration must include Outlook connection table.");
assertIncludes(migration, "hp_graph_sync_outbox", "Migration must include graph sync outbox table.");
assertIncludes(graphOutboxMigration, "hp_graph_sync_outbox", "Additive graph outbox migration must exist for already-applied D1 databases.");
assertIncludes(shellEventsMigration, "hp_shell_events", "Additive shell event migration must exist.");
assertIncludes(allSource, "/api/v2/shell/events", "Routes must include recovery shell event intake endpoint.");
assertIncludes(allSource, "shell_events_read", "Routes must include secured shell event listing endpoint.");
assertIncludes(allSource, "shell_event", "Shell captures must be scheduled for graph sync.");
assertIncludes(allSource, "workspaceBrief", "Routes must include the workspace brief handler.");
assertIncludes(allSource, "workspaceFlow", "Flow handler must expose workspace flow helpers.");
assertIncludes(allSource, "/api/v2/workspace/brief", "Routes must include the workspace brief endpoint.");
assertIncludes(allSource, "/api/v2/documents/review/batch", "Routes must include the batch review endpoint.");
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
assertIncludes(config, "highpoints.work/app.bundle.js", "Wrangler config must route retired app bundle requests through the Worker.");
assertIncludes(config, "highpoints.work/app*", "Wrangler config must route app-entry query strings through the Worker.");
assertIncludes(config, "highpoints.work/vendor/*", "Wrangler config must route retired vendor requests through the Worker.");
assertIncludes(config, "highpoints.work/_next/*", "Wrangler config must route Next app assets through the Worker auth compatibility fix.");
for (const route of [
  '"pattern": "highpoints.work/"',
  "highpoints.work/robots.txt",
  "highpoints.work/sitemap.xml",
  "highpoints.work/.well-known/*",
  "highpoints.work/healthz",
  "highpoints.work/features",
  "highpoints.work/privacy",
  "highpoints.work/support",
  "highpoints.work/operations-status",
  "highpoints.work/search",
  "highpoints.work/pricing",
  "highpoints.work/executive-command-center",
  "highpoints.work/ai-operations",
  "highpoints.work/workflow-automation",
  "highpoints.work/readiness-assessment",
  "highpoints.work/azure-services",
  "highpoints.work/integrations",
  "highpoints.work/senior-living-operations",
  "highpoints.work/facility-maintenance-software",
  "highpoints.work/survey-readiness",
  "highpoints.work/housekeeping-management",
]) {
  assertIncludes(config, route, `Wrangler config must route ${route} through the Worker.`);
}

assertIncludes(allSource, "const fallbackId = email ? email.split(\"@\")", "Auth fallback must only use trusted Cloudflare Access email.");
assertExcludes(allSource, "const fallbackId = userId ||", "Auth fallback must not trust x-highpoints-user-id without a valid session proof.");
assertIncludes(allSource, "Number(error?.status) !== 403", "Workspace brief must only hide review queue authorization failures.");
assertIncludes(allSource, "Retired HighPoints app loader asset", "Static routes must reject retired loader assets instead of returning HTML as JavaScript.");

for (const [path, status] of [
  ["/app", 307],
  ["/signup", 307],
  ["/app/", 308],
]) {
  const response = staticResponseFor(new URL(`https://highpoints.work${path}`));
  if (!response) throw new Error(`Static app entry smoke check failed for ${path}`);
  if (response.status !== status) throw new Error(`Static app entry ${path} status ${response.status}, expected ${status}`);
  if (response.headers.get("location") !== "https://highpoints.work/login") {
    throw new Error(`Static app entry ${path} redirects to ${response.headers.get("location")}`);
  }
}

const callbackRedirect = staticResponseFor(new URL("https://highpoints.work/app?code=abc&state=xyz"));
if (callbackRedirect.headers.get("location") !== "https://highpoints.work/login?code=abc&state=xyz") {
  throw new Error(`Static app entry must preserve callback query strings, got ${callbackRedirect.headers.get("location")}`);
}

for (const path of ["/next/login", "/api/v2/health"]) {
  if (staticResponseFor(new URL(`https://highpoints.work${path}`))) {
    throw new Error(`Static route must not intercept ${path}`);
  }
}

if (!isNextAppAsset(new URL("https://highpoints.work/_next/static/chunks/app/layout.js"))) {
  throw new Error("Next app assets must be recognized for Worker proxying.");
}
if (isNextAppAsset(new URL("https://highpoints.work/login"))) {
  throw new Error("Next app asset proxy must not intercept page routes.");
}

for (const source of [
  "return await (0,n.BN)(r,{lastLoginAt:(0,n.O5)()},{merge:!0}),{uid:e.uid}",
  "return await (0,i.BN)(t,{lastLoginAt:(0,i.O5)()},{merge:!0}),{uid:e.uid}",
]) {
  const patched = patchNextAuthBundle(source);
  if (patched.patches !== 1) throw new Error("Next auth bundle lastLoginAt write was not patched exactly once.");
  assertIncludes(patched.body, ".catch(error=>console.warn", "Next auth patch must make lastLoginAt best-effort.");
  assertIncludes(patched.body, "{uid:e.uid}", "Next auth patch must preserve the loaded profile.");
}

const unrelatedBundle = "console.log('unrelated Next chunk')";
const unpatched = patchNextAuthBundle(unrelatedBundle);
if (unpatched.patches !== 0 || unpatched.body !== unrelatedBundle) {
  throw new Error("Next auth patch must leave unrelated JavaScript unchanged.");
}

for (const path of ["/app.bundle.js", "/vendor/react.production.min.js"]) {
  const response = staticResponseFor(new URL(`https://highpoints.work${path}`));
  if (!response) throw new Error(`Retired app asset smoke check failed for ${path}`);
  if (response.status !== 410) throw new Error(`Retired app asset ${path} status ${response.status}, expected 410`);
  if (!response.headers.get("content-type")?.includes("text/plain")) {
    throw new Error(`Retired app asset ${path} content type ${response.headers.get("content-type")}`);
  }
}

const appleIcon = staticResponseFor(new URL("https://highpoints.work/apple-touch-icon.png"));
if (!appleIcon || appleIcon.status !== 302 || appleIcon.headers.get("location") !== "https://highpoints.work/icons/icon-192.webp") {
  throw new Error("Static route must redirect apple-touch-icon.png when app* catches it");
}

const router = createRouter();
registerRoutes(router);
for (const [method, path] of [
  ["GET", "/"],
  ["GET", "/robots.txt"],
  ["GET", "/sitemap.xml"],
  ["GET", "/.well-known/microsoft-identity-association.json"],
  ["GET", "/healthz"],
  ["GET", "/api/v2/health"],
  ["GET", "/api/v2/outlook/status"],
  ["GET", "/api/v2/documents/review"],
  ["POST", "/api/v2/workspace/brief"],
  ["POST", "/api/v2/outlook/disconnect"],
  ["GET", "/api/v2/shell/events"],
  ["POST", "/api/v2/shell/events"],
  ["POST", "/api/v2/documents/review/abc/decision"],
  ["POST", "/api/v2/documents/review/batch"],
  ["GET", "/api/v2/graph/health"],
  ["GET", "/api/v2/graph/entity/Staff/staff-1"],
]) {
  if (!router.match(method, path)) throw new Error(`Route smoke check failed for ${method} ${path}`);
}

for (const [path, contentType, marker] of [
  ["/", "text/html", "Run every facility workflow"],
  ["/features", "text/html", "HighPoints features"],
  ["/pricing", "text/html", "Pricing"],
  ["/robots.txt", "text/plain", "Sitemap: https://highpoints.work/sitemap.xml"],
  ["/sitemap.xml", "application/xml", "https://highpoints.work/features"],
  ["/.well-known/microsoft-identity-association.json", "application/json", "associatedApplications"],
  ["/healthz", "text/plain", "ok"],
]) {
  const match = router.match("GET", path);
  const response = await match.route.handler({});
  const body = await response.text();
  if (response.status !== 200) throw new Error(`Public route ${path} status ${response.status}, expected 200`);
  if (!response.headers.get("content-type")?.includes(contentType)) {
    throw new Error(`Public route ${path} content type ${response.headers.get("content-type")}`);
  }
  assertIncludes(body, marker, `Public route ${path} must include ${marker}.`);
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

function assertExcludes(text, needle, message) {
  if (text.includes(needle)) throw new Error(message);
}
