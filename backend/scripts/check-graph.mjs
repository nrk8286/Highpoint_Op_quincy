import { readFileSync } from "node:fs";
import { createNeo4jClient } from "../src/graph/client.js";

const backendRoot = new URL("..", import.meta.url);
const env = Object.fromEntries(
  readFileSync(new URL(".dev.vars", backendRoot), "utf8")
    .trim()
    .split(/\n+/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(/=(.*)/s).slice(0, 2))
);

const client = createNeo4jClient(env);
const result = await client.query(`
  MATCH (r:Role) WITH count(r) AS roles
  MATCH (p:Permission) WITH roles, count(p) AS permissions
  MATCH (d:Department) WITH roles, permissions, count(d) AS departments
  MATCH (rt:RelationshipType) WITH roles, permissions, departments, count(rt) AS relationshipTypes
  OPTIONAL MATCH (:Role)-[grant:GRANTS]->(:Permission)
  WITH roles, permissions, departments, relationshipTypes, count(grant) AS grants
  OPTIONAL MATCH (:Department)-[allow:ALLOWS]->(:Permission)
  RETURN roles, permissions, departments, relationshipTypes, grants, count(allow) AS departmentAllows
`, {}, { requestId: "graph-check" });

const row = result.results?.[0]?.data?.[0]?.row || result.data?.values?.[0] || [];
const [roles, permissions, departments, relationshipTypes, grants, departmentAllows] = row.map(Number);
const failures = [];
if (roles < 5) failures.push(`roles=${roles}`);
if (permissions < 24) failures.push(`permissions=${permissions}`);
if (departments < 10) failures.push(`departments=${departments}`);
if (relationshipTypes < 22) failures.push(`relationshipTypes=${relationshipTypes}`);
if (grants < 1) failures.push(`grants=${grants}`);
if (departmentAllows < 1) failures.push(`departmentAllows=${departmentAllows}`);

const summary = { roles, permissions, departments, relationshipTypes, grants, departmentAllows };
if (failures.length) {
  console.error(`graph check failed: ${failures.join(", ")}`);
  console.error(JSON.stringify(summary));
  process.exit(1);
}

console.log(`graph check ok: ${JSON.stringify(summary)}`);
