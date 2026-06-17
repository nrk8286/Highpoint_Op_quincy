import { access, readFile } from "node:fs/promises";
import ts from "typescript";

const html = await readFile(new URL("../www/index.html", import.meta.url), "utf8");
const manifestText = await readFile(new URL("../www/manifest.json", import.meta.url), "utf8");
const serviceWorker = await readFile(new URL("../www/sw.js", import.meta.url), "utf8");
const robots = await readFile(new URL("../www/robots.txt", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../www/sitemap.xml", import.meta.url), "utf8");

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
for (const script of scripts) {
  new Function(script);
}
assertShellFunctions(scripts);
new Function(serviceWorker);

const manifest = JSON.parse(manifestText);
const requiredManifestFields = ["name", "short_name", "start_url", "display", "theme_color", "background_color", "icons"];
const missingManifestFields = requiredManifestFields.filter((field) => !manifest[field]);
const missingIconFiles = [];
for (const icon of manifest.icons || []) {
  try {
    await access(new URL(`../www/${icon.src}`, import.meta.url));
  } catch {
    missingIconFiles.push(icon.src);
  }
  if (icon.src.endsWith(".webp") && icon.type !== "image/webp") {
    missingIconFiles.push(`${icon.src} has type ${icon.type}`);
  }
}

const requiredElementIds = [
  "launch",
  "refresh",
  "incident",
  "captureType",
  "captureDepartment",
  "capturePriority",
  "captureLocation",
  "captureNote",
  "captureFile",
  "saveCapture",
  "syncQueue",
  "roleMode",
  "privacyMode",
  "quickGrid",
  "contactGrid",
  "queueList",
  "shareReport",
  "exportQueue",
  "importQueue",
  "clearQueue",
  "purgeLocal",
  "report",
  "timeline",
  "graphTemplate",
  "graphRun",
  "graphRetry",
  "graphSearch",
  "graphSearchRun",
  "graphResult",
  "graphStatus",
  "backendHealth",
  "reviewQueue",
  "captureQueue",
  "systemStatus",
];
const missingElementIds = requiredElementIds.filter((id) => !html.includes(`id="${id}"`));
const requiredShellFeatures = [
  "recent_captures",
  "/api/v2/shell/events",
];
const missingShellFeatures = requiredShellFeatures.filter((feature) => !html.includes(feature));

const requiredStorageKeys = [
  "hp:offlineQueue:v1",
  "hp:lastHealth:v1",
  "hp:lastReport:v1",
  "hp:roleMode:v1",
  "hp:eventTimeline:v1",
  "hp:privacyMode:v1",
];
const missingStorageKeys = requiredStorageKeys.filter((key) => !html.includes(key));
const serviceWorkerChecks = [
  ["CACHE_NAME", serviceWorker.includes("CACHE_NAME")],
  ["install listener", serviceWorker.includes("addEventListener(\"install\"")],
  ["fetch listener", serviceWorker.includes("addEventListener(\"fetch\"")],
  ["service worker registration", html.includes("serviceWorker.register")],
];
const seoChecks = [
  ["canonical URL", html.includes("rel=\"canonical\" href=\"https://highpoints.work/\"")],
  ["Open Graph title", html.includes("property=\"og:title\"")],
  ["Twitter card", html.includes("name=\"twitter:card\"")],
  ["JSON-LD schema", html.includes("application/ld+json")],
  ["robots sitemap", robots.includes("Sitemap: https://highpoints.work/sitemap.xml")],
  ["sitemap root", sitemap.includes("<loc>https://highpoints.work/</loc>")],
  ["sitemap features", sitemap.includes("<loc>https://highpoints.work/features</loc>")],
  ["sitemap survey readiness", sitemap.includes("<loc>https://highpoints.work/survey-readiness</loc>")],
  ["sitemap command center", sitemap.includes("<loc>https://highpoints.work/executive-command-center</loc>")],
  ["sitemap AI operations", sitemap.includes("<loc>https://highpoints.work/ai-operations</loc>")],
  ["sitemap readiness assessment", sitemap.includes("<loc>https://highpoints.work/readiness-assessment</loc>")],
];

const failures = [
  ...missingManifestFields.map((field) => `manifest missing ${field}`),
  ...missingIconFiles.map((icon) => `manifest icon problem: ${icon}`),
  ...missingElementIds.map((id) => `shell missing #${id}`),
  ...missingShellFeatures.map((feature) => `shell missing feature ${feature}`),
  ...missingStorageKeys.map((key) => `shell missing storage key ${key}`),
  ...serviceWorkerChecks.filter(([, ok]) => !ok).map(([name]) => `service worker missing ${name}`),
  ...seoChecks.filter(([, ok]) => !ok).map(([name]) => "seo missing " + name),
];

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`validated shell: ${scripts.length} inline script(s), ${manifest.icons.length} icon(s)`);

function assertShellFunctions(inlineScripts) {
  const requiredFunctions = [
    "retryGraphSync",
    "checkBackendHealth",
    "loadReviewQueue",
    "loadCaptureQueue",
    "saveCapture",
    "syncOfflineQueue",
  ];
  const directFunctions = new Set();
  for (const script of inlineScripts) {
    const source = ts.createSourceFile("shell-inline.js", script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    for (const statement of source.statements) {
      const expression = statement.expression;
      if (!expression || !ts.isCallExpression(expression)) continue;
      const callee = ts.isParenthesizedExpression(expression.expression) ? expression.expression.expression : expression.expression;
      if (!ts.isArrowFunction(callee) || !ts.isBlock(callee.body)) continue;
      for (const child of callee.body.statements) {
        if (ts.isFunctionDeclaration(child) && child.name) {
          directFunctions.add(child.name.text);
        }
      }
    }
  }
  const missing = requiredFunctions.filter((name) => !directFunctions.has(name));
  if (missing.length) throw new Error(`shell functions must be top-level in app initializer: ${missing.join(", ")}`);
}
