import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const backend = join(root, "backend");
const required = [
  "README.md",
  "wrangler.jsonc.example",
  "migrations/0001_backend_v2.sql",
  "src/index.js",
  "src/router.js",
  "src/runtime.js",
  "src/auth.js",
  "src/policy.js",
  "src/events.js",
  "src/repositories.js",
  "src/routes.js",
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
const config = readFileSync(join(backend, "wrangler.jsonc.example"), "utf8");

assertIncludes(worker, "ctx.waitUntil", "Worker must use ctx.waitUntil for post-response audit work.");
assertIncludes(allSource, "crypto.randomUUID", "Worker must generate IDs with Web Crypto.");
assertIncludes(migration, "hp_audit_events", "Migration must include audit events table.");
assertIncludes(migration, "hp_outlook_connections", "Migration must include Outlook connection table.");
assertIncludes(config, "\"nodejs_compat\"", "Wrangler example must enable nodejs_compat.");
assertIncludes(config, "\"observability\"", "Wrangler example must enable observability.");

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
