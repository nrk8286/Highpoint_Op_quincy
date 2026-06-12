import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createNeo4jClient } from "../src/graph/client.js";

const backendRoot = new URL("..", import.meta.url);
const envPath = new URL(".dev.vars", backendRoot);
const graphDir = fileURLToPath(new URL("migrations/graph", backendRoot));

const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .trim()
    .split(/\n+/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(/=(.*)/s).slice(0, 2))
);

if (!env.NEO4J_QUERY_ENDPOINT?.includes("/db/neo4j/")) {
  throw new Error("Refusing to run graph migrations outside the neo4j database endpoint.");
}

const client = createNeo4jClient(env);
const files = readdirSync(graphDir).filter((file) => file.endsWith(".cypher")).sort();

for (const file of files) {
  const statements = readFileSync(join(graphDir, file), "utf8")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    const result = await client.query(statement, {}, { requestId: `graph-migration-${file}` });
    if (result.errors?.length) throw new Error(`${file}: ${JSON.stringify(result.errors)}`);
  }
  console.log(`applied ${file}: ${statements.length} statement(s)`);
}

const checks = await client.query(`
  MATCH (r:Role) WITH count(r) AS roles
  MATCH (p:Permission) WITH roles, count(p) AS permissions
  MATCH (rt:RelationshipType) WITH roles, permissions, count(rt) AS relationshipTypes
  RETURN roles, permissions, relationshipTypes
`, {}, { requestId: "graph-migration-seed-check" });

const row = checks.results?.[0]?.data?.[0]?.row || checks.data?.values?.[0] || [];
console.log(`seed check: roles=${row[0] || 0}, permissions=${row[1] || 0}, relationshipTypes=${row[2] || 0}`);
