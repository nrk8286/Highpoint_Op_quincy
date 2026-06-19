import { access, readFile } from "node:fs/promises";

const html = await readFile(new URL("../www/index.html", import.meta.url), "utf8");
const manifestText = await readFile(new URL("../www/manifest.json", import.meta.url), "utf8");
const serviceWorker = await readFile(new URL("../www/sw.js", import.meta.url), "utf8");
const robots = await readFile(new URL("../www/robots.txt", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../www/sitemap.xml", import.meta.url), "utf8");

const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1].trim()).filter(Boolean);
if (inlineScripts.length !== 0) {
  throw new Error(`app entry should not include inline scripts: ${inlineScripts.length}`);
}

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

const entryChecks = [
  ["title", html.includes("<title>High Point Ops</title>")],
  ["app entry", html.includes("https://highpoints.work/next/login")],
  ["fallback copy", html.includes("Launching HighPoint Operations")],
  ["meta refresh", html.includes('http-equiv="refresh"')],
  ["fonts", html.includes("Playfair+Display") && html.includes("DM+Sans") && html.includes("JetBrains+Mono")],
];
const forbiddenShellFragments = [
  "/vendor/react.production.min.js",
  "/vendor/react-dom.production.min.js",
  "/app.bundle.js",
  "API_PROBE",
  "/api/v2/shell/events",
  "refreshOperationsBrief",
  "reviewQueue",
  "captureQueue",
  "serviceWorker.register",
];
const missingEntryChecks = entryChecks.filter(([, ok]) => !ok).map(([name]) => `app entry missing ${name}`);
const shellFragmentsPresent = forbiddenShellFragments.filter((fragment) => html.includes(fragment)).map((fragment) => `app entry still contains shell fragment ${fragment}`);
const serviceWorkerChecks = [
  ["CACHE_NAME", serviceWorker.includes("CACHE_NAME")],
  ["install listener", serviceWorker.includes('addEventListener("install"')],
  ["fetch listener", serviceWorker.includes('addEventListener("fetch"')],
];
const missingServiceWorkerChecks = serviceWorkerChecks.filter(([, ok]) => !ok).map(([name]) => `service worker missing ${name}`);

const seoChecks = [
  ["robots sitemap", robots.includes("Sitemap: https://highpoints.work/sitemap.xml")],
  ["sitemap root", sitemap.includes("<loc>https://highpoints.work/</loc>")],
  ["sitemap features", sitemap.includes("<loc>https://highpoints.work/features</loc>")],
  ["sitemap survey readiness", sitemap.includes("<loc>https://highpoints.work/survey-readiness</loc>")],
  ["sitemap command center", sitemap.includes("<loc>https://highpoints.work/executive-command-center</loc>")],
  ["sitemap AI operations", sitemap.includes("<loc>https://highpoints.work/ai-operations</loc>")],
  ["sitemap readiness assessment", sitemap.includes("<loc>https://highpoints.work/readiness-assessment</loc>")],
];
const missingSeoChecks = seoChecks.filter(([, ok]) => !ok).map(([name]) => `site asset missing ${name}`);

const failures = [
  ...missingManifestFields.map((field) => `manifest missing ${field}`),
  ...missingIconFiles.map((icon) => `manifest icon problem: ${icon}`),
  ...missingEntryChecks,
  ...shellFragmentsPresent,
  ...missingServiceWorkerChecks,
  ...missingSeoChecks,
];

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`validated app entry: ${inlineScripts.length} inline script(s), ${manifest.icons.length} icon(s)`);
