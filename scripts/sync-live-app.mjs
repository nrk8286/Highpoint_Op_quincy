#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const LIVE_APP_URL = process.env.HIGHPOINTS_APP_URL || "https://highpoints.work/app";
const ZENDESK_WIDGET_SNIPPET =
  '<script id="ze-snippet" src="https://static.zdassets.com/ekr/snippet.js?key=6af3af13-3204-4338-8786-9586f1eb2b92"></script>';
const ZENDESK_SUPPORT_BOOTSTRAP = String.raw`<script>(function(){
  var ROOT_ID = "hp-zendesk-support";
  var CATEGORY_KEY = "hp_support_issue_category";
  var ACTION_KEY = "hp_support_action";
  var USER_KEYS = ["hp_support_name", "hp_support_email", "hp_support_phone", "hp_role_mode", "hp_user_name", "hp_user_email", "hp_session_name", "hp_session_email"];
  var NATIVE_SCHEME = "highpointops";
  var NATIVE_HOST = "zendesk";
  var CATEGORIES = {
    bug: {
      label: "Report a bug",
      subject: "Bug report",
      tags: ["bug", "regression", "login", "session", "ui"],
      title: "Bug report",
      hint: "Describe what broke and what you expected to happen.",
    },
    access: {
      label: "Access issue",
      subject: "Access issue",
      tags: ["access", "permission", "role", "rbac"],
      title: "Access issue",
      hint: "Tell us which screen or action is blocked.",
    },
    data: {
      label: "Data issue",
      subject: "Data issue",
      tags: ["data", "sync", "records", "audit"],
      title: "Data issue",
      hint: "Describe the record, screen, or sync problem.",
    },
    question: {
      label: "General question",
      subject: "General question",
      tags: ["question", "how-to"],
      title: "General question",
      hint: "Ask anything about the current workflow.",
    }
  };

  function getStored(key) {
    try { return localStorage.getItem(key) || ""; } catch (error) { return ""; }
  }

  function setStored(key, value) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch (error) {}
  }

  function readUserValue(source) {
    if (!source) return { name: "", email: "", phone: "", role: "" };
    if (typeof source !== "object") return { name: "", email: "", phone: "", role: "" };
    var directName = source.name || source.displayName || source.fullName || source.username || "";
    var directEmail = source.email || source.mail || source.preferredEmail || "";
    var directPhone = source.phone || source.mobile || "";
    var directRole = source.role || source.type || source.access || "";
    return {
      name: String(directName || "").trim(),
      email: String(directEmail || "").trim(),
      phone: String(directPhone || "").trim(),
      role: String(directRole || "").trim(),
    };
  }

  function readSessionUser() {
    var candidates = [
      window.__HP_USER__,
      window.__HP_SESSION__ && window.__HP_SESSION__.user,
      window.__HIGHPOINTS_SESSION__ && window.__HIGHPOINTS_SESSION__.user,
      window.__NEXT_DATA__ && window.__NEXT_DATA__.props && window.__NEXT_DATA__.props.pageProps && window.__NEXT_DATA__.props.pageProps.session && window.__NEXT_DATA__.props.pageProps.session.user,
      window.__NEXT_DATA__ && window.__NEXT_DATA__.props && window.__NEXT_DATA__.props.pageProps && window.__NEXT_DATA__.props.pageProps.user,
      window.__NEXT_DATA__ && window.__NEXT_DATA__.props && window.__NEXT_DATA__.props.user,
      window.__HP_AUTH_USER__,
      window.__HP_PROFILE__
    ];
    for (var i = 0; i < candidates.length; i += 1) {
      var user = readUserValue(candidates[i]);
      if (user.name || user.email || user.phone || user.role) return user;
    }
    var stored = readUserValue({
      name: getStored("hp_support_name") || getStored("hp_user_name") || getStored("hp_user_display"),
      email: getStored("hp_support_email") || getStored("hp_user_email"),
      phone: getStored("hp_support_phone"),
      role: getStored("hp_role_mode"),
    });
    return stored;
  }

  function pickName() {
    var user = readSessionUser();
    var candidates = [user.name, getStored("hp_support_name"), getStored("hp_user_name"), getStored("hp_user_display"), document.querySelector('input[autocomplete="username"]')?.value || "", document.querySelector('input[type="email"]')?.value || ""];
    for (var i = 0; i < candidates.length; i += 1) {
      var value = String(candidates[i] || "").trim();
      if (value) return value;
    }
    return "";
  }

  function pickEmail() {
    var user = readSessionUser();
    var candidates = [user.email, getStored("hp_support_email"), getStored("hp_user_email"), document.querySelector('input[type="email"]')?.value || "", document.querySelector('input[autocomplete="username"]')?.value || ""];
    for (var i = 0; i < candidates.length; i += 1) {
      var value = String(candidates[i] || "").trim();
      if (value && value.indexOf("@") > -1) return value;
    }
    return "";
  }

  function pickRole() {
    var user = readSessionUser();
    return user.role || getStored("hp_role_mode") || "";
  }

  function syncIdentityFromInputs() {
    var username = document.querySelector('input[autocomplete="username"]');
    var email = document.querySelector('input[type="email"]');
    var value = String((email && email.value) || (username && username.value) || "").trim();
    if (email && value.indexOf("@") > -1) {
      setStored("hp_support_email", value);
    } else if (username && value) {
      setStored("hp_support_name", value);
    }
  }

  function syncIdentityFromSession() {
    var user = readSessionUser();
    if (user.name) setStored("hp_support_name", user.name);
    if (user.email) setStored("hp_support_email", user.email);
    if (user.phone) setStored("hp_support_phone", user.phone);
    if (user.role) setStored("hp_role_mode", user.role);
  }

  function categoryFor(key) {
    return CATEGORIES[key] || CATEGORIES.bug;
  }

  function isNativeZendeskShell() {
    try {
      return Boolean(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
    } catch (error) {
      return false;
    }
  }

  function buildNativeZendeskUrl(action, categoryKey) {
    var params = [];
    var name = pickName();
    var email = pickEmail();
    var role = pickRole();
    var category = categoryKey || getStored(CATEGORY_KEY) || "bug";

    params.push("action=" + encodeURIComponent(action || "support"));
    params.push("category=" + encodeURIComponent(category));
    params.push("title=" + encodeURIComponent(document.title || "HighPoints"));
    params.push("url=" + encodeURIComponent(location.href));
    params.push("path=" + encodeURIComponent(location.pathname + (location.search || "")));
    params.push("locale=" + encodeURIComponent(navigator.language || "en-US"));
    if (name) params.push("name=" + encodeURIComponent(name));
    if (email) params.push("email=" + encodeURIComponent(email));
    if (role) params.push("role=" + encodeURIComponent(role));

    return NATIVE_SCHEME + "://" + NATIVE_HOST + "/" + encodeURIComponent(action || "support") + "?" + params.join("&");
  }

  function openNativeZendesk(action, categoryKey) {
    var url = buildNativeZendeskUrl(action, categoryKey);
    setStored(ACTION_KEY, action || "support");
    window.location.href = url;
  }

  function buildIssueDescription(categoryKey) {
    var category = categoryFor(categoryKey);
    var user = readSessionUser();
    var tags = category.tags.slice(0).join(", ");
    var lines = [
      "Issue category: " + category.label,
      "Suggested tags: " + tags,
      "Page title: " + (document.title || "HighPoints"),
      "Page path: " + location.pathname + (location.search || ""),
      "Page URL: " + location.href,
      "User name: " + (user.name || pickName() || "unknown"),
      "User email: " + (user.email || pickEmail() || "unknown"),
      "User role: " + (pickRole() || "unknown"),
      "Launcher mode: " + (isNativeZendeskShell() ? "native" : "web"),
      "Browser: " + navigator.userAgent,
      "Time: " + new Date().toISOString(),
      "",
      category.hint
    ];
    return lines.join("\n");
  }

  function applyWidgetContext(categoryKey) {
    try {
      var locale = navigator.language || "en-US";
      var category = categoryFor(categoryKey || getStored(CATEGORY_KEY) || "bug");
      var title = document.title || "HighPoints";
      var url = location.href;
      var name = pickName();
      var email = pickEmail();
      if (!window.zE) return;

      window.zE("webWidget", "setLocale", locale);
      window.zE("webWidget", "updatePath", { title: title, url: url });
      window.zE("webWidget", "updateSettings", {
        webWidget: {
          contactForm: {
            title: { "*": category.title },
            subject: true,
            fields: [
              {
                id: "description",
                prefill: {
                  "*": buildIssueDescription(categoryKey || getStored(CATEGORY_KEY) || "bug"),
                },
              },
            ],
          },
          helpCenter: {
            title: { "*": "Search help" },
          },
          launcher: {
            labelVisible: true,
          },
        }
      });
      if (name || email) {
        var identify = {};
        var prefill = {};
        if (name) {
          identify.name = name;
          prefill.name = { value: name, readOnly: false };
        }
        if (email) {
          identify.email = email;
          prefill.email = { value: email, readOnly: false };
        }
        if (userHasIdentity()) {
          window.zE("webWidget", "identify", identify);
        }
        if (Object.keys(prefill).length) {
          window.zE("webWidget", "prefill", prefill);
        }
      }
    } catch (error) {
      console.warn("Zendesk bootstrap failed", error);
    }
  }

  function userHasIdentity() {
    var user = readSessionUser();
    return Boolean(user.name || user.email || user.phone || user.role);
  }

  function openZendesk(action, categoryKey) {
    var nextKey = categoryKey || "bug";
    setStored(CATEGORY_KEY, nextKey || "bug");
    setStored(ACTION_KEY, action || "support");
    if (isNativeZendeskShell()) {
      openNativeZendesk(action || "support", nextKey || "bug");
      return;
    }
    applyWidgetContext(nextKey || "bug");
    if (window.zE) {
      window.zE("webWidget", "show");
      window.zE("webWidget", "open");
    }
  }

  function openHelpCenter() {
    openZendesk("help-center", "question");
  }

  function openRequestList() {
    openZendesk("requests", getStored(CATEGORY_KEY) || "bug");
  }

  function createButton(text, action, accent, compact, categoryKey) {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.style.cssText = [
      "pointer-events:auto",
      "border:0",
      "border-radius:999px",
      "padding:" + (compact ? "9px 12px" : "12px 16px"),
      "background:" + accent,
      "color:#0b0a12",
      "font:" + (compact ? "800 12px/1.1 Inter,system-ui,sans-serif" : "800 14px/1.1 Inter,system-ui,sans-serif"),
      "box-shadow:0 14px 36px rgba(0,0,0,0.34),0 8px 0 #765719",
      "cursor:pointer"
    ].join(";");
    button.addEventListener("click", function () {
      openZendesk(action, categoryKey);
    });
    return button;
  }

  function createLauncher() {
    if (document.getElementById(ROOT_ID)) return;
    var host = document.createElement("div");
    host.id = ROOT_ID;
    host.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:10px;pointer-events:none;max-width:260px;";

    var label = document.createElement("div");
    label.textContent = "Need help?";
    label.style.cssText = "pointer-events:none;background:rgba(11,10,18,0.92);color:#f8f5eb;border:1px solid rgba(201,162,64,0.35);border-radius:999px;padding:8px 12px;font:600 12px/1.1 Inter,system-ui,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,0.32);backdrop-filter:blur(10px);";

    var stack = document.createElement("div");
    stack.style.cssText = "display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;pointer-events:none;";
    stack.appendChild(createButton("Support", "support", "linear-gradient(135deg,#e0c464,#c9a240)", false, "bug"));
    stack.appendChild(createButton("Tickets", "requests", "linear-gradient(135deg,#c4b5fd,#8b5cf6)", true, "bug"));
    stack.appendChild(createButton("Help", "help-center", "linear-gradient(135deg,#a7f3d0,#34d399)", true, "question"));
    stack.appendChild(createButton("Bug", "support", "linear-gradient(135deg,#fca5a5,#fb7185)", true, "bug"));
    stack.appendChild(createButton("Access", "support", "linear-gradient(135deg,#93c5fd,#60a5fa)", true, "access"));
    stack.appendChild(createButton("Data", "support", "linear-gradient(135deg,#86efac,#22c55e)", true, "data"));
    stack.appendChild(createButton("Question", "support", "linear-gradient(135deg,#fde68a,#f59e0b)", true, "question"));

    host.appendChild(label);
    host.appendChild(stack);
    document.body.appendChild(host);
  }

  function attachListeners() {
    syncIdentityFromInputs();
    var watched = document.querySelectorAll("input, textarea, select");
    for (var i = 0; i < watched.length; i += 1) {
      watched[i].addEventListener("input", syncIdentityFromInputs, { passive: true });
    }
    window.addEventListener("storage", function (event) {
      if (USER_KEYS.indexOf(event.key) >= 0 || event.key === CATEGORY_KEY) {
        syncIdentityFromSession();
        applyWidgetContext();
      }
    });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        syncIdentityFromSession();
        applyWidgetContext();
      }
    });
  }

  function boot() {
    createLauncher();
    attachListeners();
    syncIdentityFromSession();
    applyWidgetContext(getStored(CATEGORY_KEY) || "bug");
    setTimeout(function () { applyWidgetContext(getStored(CATEGORY_KEY) || "bug"); }, 500);
    setTimeout(function () { applyWidgetContext(getStored(CATEGORY_KEY) || "bug"); }, 2000);
    setInterval(function () {
      syncIdentityFromSession();
      applyWidgetContext(getStored(CATEGORY_KEY) || "bug");
    }, 10000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  if (window.zE) {
    window.zE(function () {
      applyWidgetContext(getStored(CATEGORY_KEY) || "bug");
    });
  }

  window.addEventListener("load", function () {
    syncIdentityFromSession();
    applyWidgetContext(getStored(CATEGORY_KEY) || "bug");
  });
})();</script>`;
const outputDir = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(process.cwd(), "synced-live-app/current");

const summary = [];

await mkdir(outputDir, { recursive: true });

const html = await fetchText(LIVE_APP_URL);
const legacyBundleMatch = html.match(/<script src="(\/app\.bundle\.js\?v=[^"]+)"><\/script>/);
const bundlePath = legacyBundleMatch ? legacyBundleMatch[1] : null;
const bundleUrl = bundlePath ? new URL(bundlePath, LIVE_APP_URL).toString() : null;
const serviceWorkerUrl = new URL("/service-worker.js", LIVE_APP_URL).toString();
const manifestUrl = new URL("/manifest.json", LIVE_APP_URL).toString();

const [bundle, serviceWorker, manifest] = await Promise.all([
  bundleUrl ? fetchTextOptional(bundleUrl) : Promise.resolve(null),
  fetchTextOptional(serviceWorkerUrl),
  fetchTextOptional(manifestUrl),
]);

let patchedBundle = bundle;
if (bundlePath && bundle) {
  patchedBundle = replaceFunctionByAnchor(patchedBundle, "const[form,setForm]=useState(false)", outlookPanelPatch());
  patchedBundle = replaceFunctionByAnchor(patchedBundle, "data.userTasks || []", userTasksPanelPatch());
  patchedBundle = insertBeforeFunction(patchedBundle, "HighPointsPulsePanel", pulseMarqueePatch());
  patchedBundle = insertBeforeFunction(patchedBundle, "HighPointOps", documentReviewPanelPatch());
  patchedBundle = patchDashboardPulsePlacement(patchedBundle);
  patchedBundle = patchOpsRenderLoop(patchedBundle);
}

let patchedHtml = html;
if (bundlePath && patchedBundle) {
  patchedHtml = patchedHtml
    .replace(bundlePath, "./app.bundle.patched.js")
    .replace(/src="\/vendor\//g, `src="${new URL("/vendor/", LIVE_APP_URL).toString()}`)
    .replace(/href="\/apple-touch-icon\.png"/g, `href="${new URL("/apple-touch-icon.png", LIVE_APP_URL).toString()}"`)
    .replace(/href="\/icons\//g, `href="${new URL("/icons/", LIVE_APP_URL).toString()}`)
    .replace(/href="\/manifest\.json"/g, 'href="./manifest.json"')
    .replace(/serviceWorker\.register\('\/service-worker\.js'\)/g, "serviceWorker.register('./service-worker.js')");
}
const patchedHtmlWithZendesk = injectZendeskWidget(patchedHtml);

await Promise.all([
  writeText("index.live.html", html),
  writeText("index.patched.html", patchedHtmlWithZendesk),
  ...(bundle ? [writeText("app.bundle.live.js", bundle), writeText("app.bundle.patched.js", patchedBundle)] : []),
  ...(serviceWorker ? [writeText("service-worker.js", serviceWorker)] : []),
  ...(manifest ? [writeText("manifest.json", manifest)] : []),
  writeText("sync-metadata.json", JSON.stringify({
    syncedAt: new Date().toISOString(),
    liveAppUrl: LIVE_APP_URL,
    bundleUrl,
    hashes: {
      html: sha256(html),
      bundle: bundle ? sha256(bundle) : "",
      patchedBundle: patchedBundle ? sha256(patchedBundle) : "",
      patchedHtml: sha256(patchedHtmlWithZendesk),
      serviceWorker: serviceWorker ? sha256(serviceWorker) : "",
      manifest: manifest ? sha256(manifest) : "",
    },
    patches: summary,
  }, null, 2)),
]);

console.log(JSON.stringify({
  ok: true,
  outputDir,
  liveAppUrl: LIVE_APP_URL,
  bundleUrl,
  hashes: {
    html: sha256(html),
    bundle: bundle ? sha256(bundle) : "",
    patchedBundle: patchedBundle ? sha256(patchedBundle) : "",
    patchedHtml: sha256(patchedHtmlWithZendesk),
  },
  patches: summary,
}, null, 2));

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

async function fetchTextOptional(url) {
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  return response.text();
}

function matchRequired(text, pattern, label) {
  const match = text.match(pattern);
  if (!match) throw new Error(`Could not find ${label}`);
  return match[1];
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function writeText(relativePath, content) {
  const fullPath = join(outputDir, relativePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, "utf8");
}

function replaceFunctionByAnchor(source, anchor, replacement) {
  const index = source.indexOf(anchor);
  if (index === -1) throw new Error(`Could not find anchor: ${anchor}`);

  // Expand outwards to find function bounds
  let start = index;
  let end = index;

  // Find start of function
  while (start > 0 && !source.slice(start - 10, start).includes("function")) {
    start--;
  }

  // Find end of function (simple brace matching)
  let depth = 0;
  let foundBrace = false;
  for (let i = index; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        foundBrace = true;
        break;
      }
    }
  }

  if (!foundBrace) throw new Error(`Could not find bounds for anchor: ${anchor}`);

  summary.push({ type: "replace_function_by_anchor", anchor });
  return source.slice(0, start) + replacement + source.slice(end);
}

function insertBeforeFunction(source, name, insertText) {
  if (source.includes(insertText.trim())) return source;
  const signature = `function ${name}(`;
  const index = source.indexOf(signature);
  if (index === -1) throw new Error(`Could not find ${name} for insertion`);
  summary.push({ type: "insert_function", before: name, name: insertText.match(/function ([A-Za-z0-9]+)/)?.[1] || "unknown" });
  return source.slice(0, index) + insertText + "\n" + source.slice(index);
}

function findFunctionBounds(source, name) {
  const signature = `function ${name}(`;
  const start = source.indexOf(signature);
  if (start === -1) throw new Error(`Could not find function ${name}`);
  const bodyStart = source.indexOf("{", start + signature.length);
  if (bodyStart === -1) throw new Error(`Could not find body for ${name}`);

  let depth = 0;
  let state = "code";
  for (let i = bodyStart; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (state === "single") {
      if (char === "\\" && next) {
        i += 1;
      } else if (char === "'") {
        state = "code";
      }
      continue;
    }
    if (state === "double") {
      if (char === "\\" && next) {
        i += 1;
      } else if (char === "\"") {
        state = "code";
      }
      continue;
    }
    if (state === "template") {
      if (char === "\\" && next) {
        i += 1;
      } else if (char === "`") {
        state = "code";
      }
      continue;
    }
    if (state === "line_comment") {
      if (char === "\n") state = "code";
      continue;
    }
    if (state === "block_comment") {
      if (char === "*" && next === "/") {
        state = "code";
        i += 1;
      }
      continue;
    }

    if (char === "/" && next === "/") {
      state = "line_comment";
      i += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      state = "block_comment";
      i += 1;
      continue;
    }
    if (char === "'") {
      state = "single";
      continue;
    }
    if (char === "\"") {
      state = "double";
      continue;
    }
    if (char === "`") {
      state = "template";
      continue;
    }
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return { start, end: i + 1 };
      }
    }
  }

  throw new Error(`Could not find end of function ${name}`);
}

function patchDashboardPulsePlacement(source) {
  const startNeedle = 'dept==="dashboard"&&React.createElement("div",{style:{animation:"fadeInUp 0.35s ease"}}';
  const endNeedle = 'dept==="maintenance"&&React.createElement(MaintenancePanel';
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);
  if (start === -1 || end === -1) throw new Error("Could not locate dashboard block");

  let dashboard = source.slice(start, end);
  dashboard = dashboard.replace('React.createElement(PulseSnapshot,{data:data,config:config,setDept:setDept}),', "");

  const closeIndex = dashboard.lastIndexOf(")");
  if (closeIndex === -1) throw new Error("Could not patch dashboard close");
  dashboard =
    dashboard.slice(0, closeIndex) +
    ',React.createElement(HighPointsPulseMarquee,{data:data,config:config,setDept:setDept})' +
    dashboard.slice(closeIndex);

  summary.push({ type: "patch_dashboard", move: "pulse_to_bottom_marquee" });
  return source.slice(0, start) + dashboard + source.slice(end);
}

function patchOpsRenderLoop(source) {
  const needle = 'dept!=="dashboard"&&dept!=="pulse"&&React.createElement(DepartmentCopilotPanel,{dept:dept,data:data,add:add,config:config,user:user,isMgr:isMgr,isAdmin:isAdmin})';
  const replacement = 'dept==="documents"&&(isMgr||isAdmin)?React.createElement(DocumentReviewPanel,{data:data,add:add,config:config,user:user}):' + needle;
  if (!source.includes(needle)) throw new Error("Could not find DepartmentCopilotPanel render loop");
  summary.push({ type: "patch_render_loop", added: "DocumentReviewPanel" });
  return source.replace(needle, replacement);
}

function injectZendeskWidget(source) {
  if (source.includes("static.zdassets.com/ekr/snippet.js")) return source;
  const marker = "</body>";
  const index = source.lastIndexOf(marker);
  if (index === -1) throw new Error("Could not find closing body tag for Zendesk injection");
  summary.push({ type: "inject_widget", widget: "zendesk" });
  return source.slice(0, index) + ZENDESK_WIDGET_SNIPPET + ZENDESK_SUPPORT_BOOTSTRAP + source.slice(index);
}

function pulseMarqueePatch() {
  return `function HighPointsPulseMarquee({data,config,setDept}) {
  const pulse = hpPulseMetrics(data, config);
  const items = [
    "Pulse score " + pulse.risk,
    ...pulse.signals.slice(0, 6).map((signal) => signal.k + " " + signal.v),
    ...pulse.next.slice(0, 3),
  ];
  const badgeColor = pulse.risk < 75 ? "#ef4444" : "#14b8a6";

  return React.createElement("div", {
    style: {
      ...cardS,
      marginTop: 16,
      padding: "12px 16px",
      overflow: "hidden",
      borderColor: badgeColor + "55",
      background: "linear-gradient(135deg, rgba(20,184,166,0.10), rgba(201,162,64,0.08), rgba(11,10,18,0.35))",
    },
  },
    React.createElement("style", null, "@keyframes hpPulseMarquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}"),
    React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 10,
      },
    },
      React.createElement("div", null,
        React.createElement("div", {
          style: {
            fontFamily: T.mono,
            fontSize: "0.55rem",
            color: badgeColor,
            fontWeight: 900,
            letterSpacing: "0.14em",
          },
        }, "HIGHPOINTS PULSE"),
        React.createElement("div", {
          style: {
            fontSize: "0.78rem",
            color: T.muted,
            marginTop: 3,
          },
        }, "Bottom-line risk, staffing, Outlook, and survey pressure in one moving feed.")
      ),
      React.createElement(Btn, {
        small: true,
        onClick: () => setDept && setDept("pulse"),
        color: badgeColor,
      }, "Open Pulse")
    ),
    React.createElement("div", {
      style: {
        overflow: "hidden",
        whiteSpace: "nowrap",
      },
    },
      React.createElement("div", {
        style: {
          display: "inline-flex",
          minWidth: "200%",
          animation: "hpPulseMarquee 32s linear infinite",
        },
      },
        [0, 1].map((loop) => React.createElement("div", {
          key: loop,
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 24,
            minWidth: "50%",
            paddingRight: 24,
          },
        },
          items.map((item, index) => React.createElement("span", {
            key: loop + "-" + index,
            style: {
              fontFamily: T.mono,
              fontSize: "0.62rem",
              color: index === 0 ? badgeColor : T.text,
              letterSpacing: "0.04em",
            },
          }, item))
        ))
      )
    )
  );
}`;
}

function userTasksPanelPatch() {
  return `function UserTasksPanel({data,add,patch,user,config}) {
  const [form, setForm] = useState(false);
  const [filter, setFilter] = useState("open");
  const [selectedIds, setSelectedIds] = useState([]);
  const tasks = data.userTasks || [];
  const mine = tasks.filter((task) => !task.assignedTo || task.assignedTo === user?.name || task.assignedTo === user?.username || task.assignedTo === "All");
  const visible = (filter === "mine"
    ? mine
    : filter === "done"
      ? tasks.filter((task) => task.status === "Complete")
      : tasks.filter((task) => task.status !== "Complete")
  ).sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  const visibleIds = visible.map((task) => String(task.id || "")).filter(Boolean);
  const mineIds = mine
    .filter((task) => task.status !== "Complete")
    .map((task) => String(task.id || ""))
    .filter(Boolean);
  const counts = {
    overdue: tasks.filter((task) => hpTaskDueState(task) === "overdue").length,
    today: tasks.filter((task) => hpTaskDueState(task) === "today").length,
    open: tasks.filter((task) => task.status !== "Complete").length,
    mine: mine.filter((task) => task.status !== "Complete").length,
  };
  const fields = [
    { key: "title", label: "Task", type: "text", ph: "Follow up on PM evidence" },
    { key: "assignedTo", label: "Assigned To", type: "text", ph: user?.name || "Staff name or All" },
    { key: "dept", label: "Department", type: "select", options: ["All", ...(config.departments || []), "Nursing", "Scheduling", "Family", "Admin"] },
    { key: "dueDate", label: "Due Date", type: "date" },
    { key: "priority", label: "Priority", type: "select", options: ["Critical", "High", "Medium", "Low"] },
    { key: "source", label: "Source", type: "select", options: ["Manual", "Outlook", "Survey Lab", "Department Copilot", "Manager"] },
    { key: "notes", label: "Notes", type: "textarea", ph: "Details, link, resident, room, or owner notes" },
  ];

  useEffect(() => {
    setSelectedIds((previous) => previous.filter((id) => visibleIds.includes(id)));
  }, [visibleIds.join("|")]);

  function toggleSelected(taskId) {
    if (!taskId) return;
    setSelectedIds((previous) => previous.includes(taskId)
      ? previous.filter((id) => id !== taskId)
      : [...previous, taskId]);
  }

  function selectIds(ids) {
    setSelectedIds([...new Set(ids)]);
  }

  function completeSelected() {
    selectedIds.forEach((taskId) => {
      patch("userTasks", taskId, {
        status: "Complete",
        completedAt: now(),
        completedBy: user?.name || "",
      });
    });
    setSelectedIds([]);
  }

  return React.createElement("div", { style: { animation: "fadeInUp 0.35s ease" } },
    React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
        flexWrap: "wrap",
      },
    },
      React.createElement("div", null,
        React.createElement("div", { style: { fontFamily: T.heading, fontSize: "1.35rem", fontWeight: 800 } }, "User Tasks & Deadlines"),
        React.createElement("div", { style: { fontSize: "0.78rem", color: T.muted } }, "Assigned work, Outlook follow-ups, survey deadlines, and department action items.")
      ),
      React.createElement(Btn, { onClick: () => setForm(!form), color: "#22c55e" }, form ? "Close" : "New Task")
    ),
    form && React.createElement(QForm, {
      title: "Create Task Deadline",
      color: "#22c55e",
      fields,
      onSubmit: (draft) => {
        add("userTasks", { ...draft, status: "Open", assignedTo: draft.assignedTo || user?.name || "All" });
        setForm(false);
      },
      onCancel: () => setForm(false),
      btnLabel: "Save Task",
    }),
    React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
        gap: 8,
        marginBottom: 10,
      },
    },
      [["OVERDUE", counts.overdue, "#ef4444"], ["DUE TODAY", counts.today, "#f59e0b"], ["OPEN", counts.open, "#22c55e"], ["MY TASKS", counts.mine, "#38bdf8"]].map((item) => React.createElement("button", {
        key: item[0],
        onClick: () => setFilter(item[0] === "MY TASKS" ? "mine" : "open"),
        style: { ...cardS, padding: 10, textAlign: "center", cursor: "pointer" },
      },
        React.createElement("div", { style: { fontSize: "1.6rem", fontWeight: 900, color: item[2] } }, item[1]),
        React.createElement("div", { style: { fontFamily: T.mono, fontSize: "0.52rem", color: T.muted } }, item[0])
      ))
    ),
    React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" } },
      ["open", "mine", "done"].map((view) => React.createElement(Btn, {
        key: view,
        small: true,
        active: filter === view,
        onClick: () => setFilter(view),
        color: "#22c55e",
      }, view.toUpperCase()))
    ),
    React.createElement("div", {
      style: {
        ...cardS,
        padding: 12,
        marginBottom: 10,
        borderColor: selectedIds.length ? "#22c55e55" : T.border,
      },
    },
      React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 8,
        },
      },
        React.createElement("div", null,
          React.createElement("div", { style: { fontWeight: 800 } }, "Bulk Actions"),
          React.createElement("div", { style: { fontSize: "0.74rem", color: T.muted, marginTop: 3 } }, selectedIds.length + " selected in the current view")
        ),
        React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
          React.createElement(Btn, { small: true, onClick: () => selectIds(visibleIds), color: "#22c55e" }, "Select All"),
          React.createElement(Btn, { small: true, onClick: () => selectIds(mineIds), color: "#38bdf8" }, "Select Mine"),
          React.createElement(Btn, { small: true, onClick: () => setSelectedIds([]), color: "#64748b" }, "Clear"),
          React.createElement(Btn, {
            small: true,
            onClick: completeSelected,
            color: "#4ade80",
            disabled: selectedIds.length === 0,
          }, "Complete Selected")
        )
      ),
      React.createElement("div", { style: { fontFamily: T.mono, fontSize: "0.56rem", color: T.muted } }, "Use the row checkboxes when you only want part of the list.")
    ),
    visible.length === 0
      ? React.createElement(Empty, { text: "No tasks in this view" })
      : visible.map((task) => {
        const taskId = String(task.id || "");
        const checked = taskId ? selectedIds.includes(taskId) : false;
        const state = hpTaskDueState(task);
        const color = state === "overdue" ? "#ef4444" : state === "today" ? "#f59e0b" : state === "complete" ? "#4ade80" : "#22c55e";

        return React.createElement("div", {
          key: task.id,
          style: {
            ...cardS,
            marginBottom: 8,
            borderColor: checked ? "#22c55e88" : color + "55",
          },
        },
          React.createElement("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              alignItems: "flex-start",
              flexWrap: "wrap",
            },
          },
            React.createElement("div", {
              style: {
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                flex: 1,
                minWidth: 0,
              },
            },
              React.createElement("label", {
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 2,
                  cursor: taskId ? "pointer" : "not-allowed",
                },
              },
                React.createElement("input", {
                  type: "checkbox",
                  checked,
                  disabled: !taskId,
                  onChange: () => toggleSelected(taskId),
                  style: {
                    width: 18,
                    height: 18,
                    accentColor: "#22c55e",
                    cursor: taskId ? "pointer" : "not-allowed",
                  },
                }),
                React.createElement("span", { style: { fontFamily: T.mono, fontSize: "0.5rem", color: T.muted } }, "SELECT")
              ),
              React.createElement("div", { style: { minWidth: 0, flex: 1 } },
                React.createElement("div", { style: { fontWeight: 800, fontSize: "0.95rem" } }, task.title || task.summary || "Task"),
                React.createElement("div", { style: { fontFamily: T.mono, fontSize: "0.56rem", color: T.muted, marginTop: 4 } }, task.dept || "All", " • ", task.assignedTo || "Unassigned", " • due ", task.dueDate || "none", " • ", task.source || "Manual")
              )
            ),
            React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" } },
              React.createElement(Badge, { text: task.priority || "Medium", color: prioC(task.priority || "Medium") }),
              React.createElement(Badge, { text: state, color }),
              task.status !== "Complete" && React.createElement(Btn, {
                small: true,
                onClick: () => patch("userTasks", task.id, { status: "Complete", completedAt: now(), completedBy: user?.name || "" }),
                color: "#4ade80",
              }, "Complete")
            )
          ),
          task.notes && React.createElement("div", { style: { fontSize: "0.75rem", color: T.muted, marginTop: 8 } }, task.notes)
        );
      })
  );
}`;
}

function outlookPanelPatch() {
  return `function OutlookPanel({data,add,config,user}) {
  const [form, setForm] = useState(false);
  const [status, setStatus] = useState({ loading: true, connected: false, connection: null, error: "" });
  const [authBusy, setAuthBusy] = useState(false);
  const [disconnectBusy, setDisconnectBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncedEmails, setSyncedEmails] = useState([]);
  const [composer, setComposer] = useState(null);
  const [sendBusy, setSendBusy] = useState(false);

  const imports = data.outlookEmailImports || [];
  const fields = [
    { key: "from", label: "From", type: "text", ph: "sender@company.com" },
    { key: "subject", label: "Subject", type: "text", ph: "Inspection follow-up due Friday" },
    { key: "receivedAt", label: "Received Date", type: "date" },
    { key: "dept", label: "Department", type: "select", options: ["Admin", ...(config.departments || []), "Nursing", "Family", "Scheduling"] },
    { key: "priority", label: "Priority", type: "select", options: ["Critical", "High", "Medium", "Low"] },
    { key: "dueDate", label: "Task Due Date", type: "date" },
    { key: "body", label: "Email Summary", type: "textarea", ph: "Paste the useful part of the email or summary" },
  ];

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/v2/outlook/status");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Outlook status unavailable");
      setStatus({
        loading: false,
        connected: Boolean(payload.connected),
        connection: payload.connection || null,
        error: "",
      });
    } catch (error) {
      setStatus({
        loading: false,
        connected: false,
        connection: null,
        error: error.message || "Outlook status unavailable",
      });
    }
  }, []);

  const syncInbox = async () => {
    setSyncBusy(true);
    try {
      const response = await fetch("/api/v2/outlook/sync");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Inbox sync failed");
      setSyncedEmails(payload.items || []);
    } catch (error) {
      alert(error.message);
    } finally {
      setSyncBusy(false);
    }
  };

  const sendEmail = async (draft) => {
    setSendBusy(true);
    try {
      const response = await fetch("/api/v2/outlook/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to send email");
      setComposer(null);
      alert("Email sent successfully");
    } catch (error) {
      alert(error.message);
    } finally {
      setSendBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const stateToken = params.get("state");
      const authError = params.get("error");
      if (code || authError) {
        const cleanUrl = new URL(window.location.href);
        ["code", "state", "session_state", "error", "error_description"].forEach((key) => cleanUrl.searchParams.delete(key));
        history.replaceState({}, document.title, cleanUrl.toString());

        if (authError) {
          if (active) {
            setStatus({
              loading: false,
              connected: false,
              connection: null,
              error: params.get("error_description") || authError,
            });
          }
        } else {
          setAuthBusy(true);
          try {
            const response = await fetch("/api/v2/outlook/auth/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code, state: stateToken, redirectUri: cleanUrl.toString() }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "Outlook connection failed");
            if (payload.mail || payload.account) {
              add("outlookConnections", {
                account: payload.mail || payload.account,
                displayName: payload.profile?.displayName || "",
                source: "server",
                connectedAt: now(),
                status: "active",
              });
            }
          } catch (error) {
            if (active) {
              setStatus({
                loading: false,
                connected: false,
                connection: null,
                error: error.message || "Outlook connection failed",
              });
            }
          } finally {
            setAuthBusy(false);
          }
        }
      }

      await loadStatus();
    })();
    return () => {
      active = false;
    };
  }, [add, loadStatus]);

  async function startAuth() {
    setAuthBusy(true);
    try {
      const redirectUri = new URL(window.location.href);
      ["code", "state", "session_state", "error", "error_description"].forEach((key) => redirectUri.searchParams.delete(key));
      const response = await fetch("/api/v2/outlook/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectUri: redirectUri.toString() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.authUrl) {
        throw new Error(payload.error || "Outlook auth start failed");
      }
      window.location.href = payload.authUrl;
    } catch (error) {
      setAuthBusy(false);
      setStatus((current) => ({
        ...current,
        loading: false,
        error: error.message || "Outlook auth start failed",
      }));
    }
  }

  async function disconnect() {
    setDisconnectBusy(true);
    try {
      const response = await fetch("/api/v2/outlook/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Outlook disconnect failed");
      setStatus({ loading: false, connected: false, connection: null, error: "" });
    } catch (error) {
      setStatus((current) => ({
        ...current,
        loading: false,
        error: error.message || "Outlook disconnect failed",
      }));
    } finally {
      setDisconnectBusy(false);
    }
  }

  return React.createElement("div", { style: { animation: "fadeInUp 0.35s ease" } },
    React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        alignItems: "center",
        marginBottom: 12,
        flexWrap: "wrap",
      },
    },
      React.createElement("div", null,
        React.createElement("div", { style: { fontFamily: T.heading, fontSize: "1.35rem", fontWeight: 800 } }, "Outlook Email Integration"),
        React.createElement("div", { style: { fontSize: "0.78rem", color: T.muted } }, "Each staff user can connect their own Microsoft 365 mailbox, import follow-ups, and turn messages into HighPoints tasks.")
      ),
      React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
        React.createElement(Btn, { onClick: () => setComposer(composer ? null : { to: "", subject: "", body: "" }), color: "#0078d4" }, composer ? "Close Composer" : "Compose Email"),
        React.createElement(Btn, { onClick: () => setForm(!form), color: "#0078d4" }, form ? "Close Import" : "Manual Import"),
        React.createElement(Btn, {
          onClick: startAuth,
          color: "#0078d4",
          disabled: authBusy,
        }, authBusy ? "Connecting..." : status.connected ? "Reconnect Microsoft" : "Connect Microsoft"),
        React.createElement(Btn, {
          onClick: disconnect,
          color: "#64748b",
          disabled: !status.connected || disconnectBusy,
        }, disconnectBusy ? "Disconnecting..." : "Disconnect")
      )
    ),
    React.createElement("div", {
      style: {
        ...cardS,
        marginBottom: 12,
        borderColor: (status.connected ? "#4ade80" : status.error ? "#ef4444" : "#0078d4") + "55",
      },
    },
      React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 8,
        },
      },
        React.createElement("div", null,
          React.createElement("div", { style: { fontFamily: T.mono, fontSize: "0.55rem", color: T.muted } }, "MAILBOX"),
          React.createElement("div", { style: { fontWeight: 800, color: status.connected ? "#4ade80" : "#94a3b8" } }, status.connection?.accountEmail || status.connection?.account || "Not connected")
        ),
        React.createElement("div", null,
          React.createElement("div", { style: { fontFamily: T.mono, fontSize: "0.55rem", color: T.muted } }, "CONNECTION"),
          React.createElement("div", { style: { fontWeight: 800, color: status.connected ? "#4ade80" : "#94a3b8" } }, status.loading ? "Checking..." : status.connected ? "Server connected" : "Disconnected")
        ),
        React.createElement("div", null,
          React.createElement("div", { style: { fontFamily: T.mono, fontSize: "0.55rem", color: T.muted } }, "SERVER STATUS"),
          React.createElement("div", { style: { fontWeight: 800, color: status.error ? "#ef4444" : "#0078d4" } }, status.error ? "Needs attention" : status.connected ? "Refresh ready" : "Awaiting sign-in")
        ),
        React.createElement("div", null,
          React.createElement("div", { style: { fontFamily: T.mono, fontSize: "0.55rem", color: T.muted } }, "IMPORTED EMAILS"),
          React.createElement("div", { style: { fontWeight: 800, color: "#0078d4" } }, imports.length)
        )
      ),
      status.connection && React.createElement("div", { style: { fontSize: "0.72rem", color: T.muted, marginTop: 8 } },
        "Connected as ",
        status.connection.displayName || status.connection.account || "Microsoft account",
        status.connection.updatedAt ? " • updated " + fmt(status.connection.updatedAt) : "",
        status.connection.expiresAt ? " • token window " + fmt(status.connection.expiresAt) : ""
      ),
      status.error && React.createElement("div", { style: { fontSize: "0.72rem", color: "#fca5a5", marginTop: 8 } }, status.error)
    ),
    composer && React.createElement(QForm, {
      title: "Compose Outlook Email",
      color: "#0078d4",
      fields: [
        { key: "to", label: "To", type: "text", ph: "recipient@example.com" },
        { key: "subject", label: "Subject", type: "text", ph: "Follow up" },
        { key: "body", label: "Message", type: "textarea", ph: "Type your message here..." },
      ],
      onSubmit: sendEmail,
      onCancel: () => setComposer(null),
      btnLabel: sendBusy ? "Sending..." : "Send Email",
    }),
    form && React.createElement(QForm, {
      title: "Import Outlook Email",
      color: "#0078d4",
      fields,
      onSubmit: (draft) => {
        add("outlookEmailImports", { ...draft, status: "Imported", source: "Outlook", importedBy: user?.name || "" });
        if (draft.dueDate || draft.subject) {
          add("userTasks", {
            title: draft.subject || "Outlook follow-up",
            assignedTo: user?.name || "All",
            dept: draft.dept || "Admin",
            dueDate: draft.dueDate,
            priority: draft.priority || "Medium",
            source: "Outlook",
            status: "Open",
            notes: (draft.from ? "From " + draft.from + ": " : "") + (draft.body || ""),
          });
        }
        setForm(false);
      },
      onCancel: () => setForm(false),
      btnLabel: "Import + Create Task",
    }),
    status.connected && React.createElement("div", { style: { marginBottom: 12 } },
      React.createElement(Btn, { onClick: syncInbox, disabled: syncBusy, color: "#0078d4" }, syncBusy ? "Syncing..." : "Sync Live Inbox"),
      syncedEmails.length > 0 && React.createElement("div", { style: { marginTop: 10, display: "grid", gap: 8 } },
        syncedEmails.map((email) => React.createElement("div", { key: email.id, style: { ...cardS, padding: "10px 14px" } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
            React.createElement("div", { style: { fontWeight: 700 } }, email.subject || "(No Subject)"),
            React.createElement(Badge, { text: email.importance === "high" ? "High" : "Normal", color: email.importance === "high" ? "#ef4444" : "#4ade80" })
          ),
          React.createElement("div", { style: { fontSize: "0.74rem", color: T.muted, marginTop: 4 } },
            "From: ", email.from?.emailAddress?.name || email.from?.emailAddress?.address || "Unknown",
            " • ", fmt(email.receivedDateTime)
          ),
          React.createElement("div", { style: { fontSize: "0.74rem", color: T.muted, marginTop: 6, fontStyle: "italic" } }, email.bodyPreview),
          React.createElement("div", { style: { marginTop: 8, display: "flex", gap: 6 } },
            React.createElement(Btn, {
              small: true,
              onClick: () => {
                const draft = {
                  from: email.from?.emailAddress?.address || "",
                  subject: email.subject || "",
                  receivedAt: email.receivedDateTime ? email.receivedDateTime.slice(0, 10) : now().slice(0, 10),
                  body: email.bodyPreview || "",
                  dept: "Admin",
                  priority: email.importance === "high" ? "High" : "Medium",
                };
                add("outlookEmailImports", { ...draft, status: "Imported", source: "Outlook", importedBy: user?.name || "" });
                alert("Imported to tasks");
              },
            }, "Quick Task"),
            React.createElement(Btn, {
              small: true,
              onClick: () => setComposer({ to: email.from?.emailAddress?.address || "", subject: "Re: " + email.subject, body: "\n\n--- Original Message ---\n" + email.bodyPreview }),
            }, "Reply")
          )
        ))
      )
    ),
    imports.length === 0
      ? React.createElement(Empty, { text: "No Outlook emails imported yet" })
      : imports.slice(0, 10).map((message) => React.createElement("div", {
        key: message.id,
        style: { ...cardS, marginBottom: 8 },
      },
        React.createElement("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          },
        },
          React.createElement("div", { style: { fontWeight: 800 } }, message.subject || "Outlook email"),
          React.createElement(Badge, { text: message.priority || "Medium", color: prioC(message.priority || "Medium") })
        ),
        React.createElement("div", { style: { fontFamily: T.mono, fontSize: "0.56rem", color: T.muted, marginTop: 4 } }, message.from || "unknown sender", " • ", message.dept || "Admin", " • due ", message.dueDate || "none"),
        message.body && React.createElement("div", { style: { fontSize: "0.75rem", color: T.muted, marginTop: 7 } }, message.body)
      ))
  );
}`;
}

function documentReviewPanelPatch() {
  return `function DocumentReviewPanel({data,add,config,user}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v2/documents/review");
      const json = await res.json().catch(() => ({}));
      if (res.ok) setItems(json.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  const decide = async (id, decision) => {
    setBusy(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch("/api/v2/documents/review/" + id + "/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes: "Approved via Admin Review Panel" }),
      });
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error || "Decision failed");
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(prev => ({ ...prev, [id]: false }));
    }
  };

  const batchDecide = async (decision) => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (!confirm("Approve " + count + " items?")) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/v2/documents/review/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, decision }),
      });
      if (res.ok) {
        setItems(prev => prev.filter(item => !selectedIds.includes(item.id)));
        setSelectedIds([]);
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error || "Batch decision failed");
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return React.createElement("div", { style: { animation: "fadeInUp 0.35s ease" } },
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } },
      React.createElement("div", null,
        React.createElement("div", { style: { fontFamily: T.heading, fontSize: "1.35rem", fontWeight: 800 } }, "Admin Document Review"),
        React.createElement("div", { style: { fontSize: "0.78rem", color: T.muted } }, "Approve extracted data from AI intake. Validated items move to their destination departments.")
      ),
      React.createElement("div", { style: { display: "flex", gap: 8 } },
        React.createElement(Btn, { small: true, onClick: loadPending, color: T.accent, disabled: loading }, loading ? "Loading..." : "Refresh"),
        React.createElement(Btn, { small: true, onClick: () => batchDecide("approved"), color: "#4ade80", disabled: selectedIds.length === 0 || loading }, "Approve Selected (" + selectedIds.length + ")")
      )
    ),
    loading && items.length === 0 ? React.createElement(Spinner, { size: 24 }) :
    items.length === 0 ? React.createElement(Empty, { text: "No pending documents for review" }) :
    React.createElement("div", { style: { display: "grid", gap: 12 } },
      items.map(item => {
        const extracted = JSON.parse(item.extracted_json || "{}");
        const confidence = item.confidence || 0;
        const color = confidence > 0.8 ? "#4ade80" : confidence > 0.5 ? "#f59e0b" : "#ef4444";
        
        return React.createElement("div", { key: item.id, style: { ...cardS, padding: 16, borderColor: selectedIds.includes(item.id) ? T.accent : T.border } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 } },
            React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center" } },
              React.createElement("input", { type: "checkbox", checked: selectedIds.includes(item.id), onChange: () => toggleSelect(item.id), style: { width: 18, height: 18, accentColor: T.accent } }),
              React.createElement("div", null,
                React.createElement("div", { style: { fontWeight: 800, fontSize: "1rem" } }, item.file_name),
                React.createElement("div", { style: { fontFamily: T.mono, fontSize: "0.55rem", color: T.muted, marginTop: 4 } }, 
                  "ID: " + item.id + " • Uploaded " + fmt(item.uploaded_at) + " • Confidence: ",
                  React.createElement("span", { style: { color, fontWeight: 700 } }, Math.round(confidence * 100) + "%")
                )
              )
            ),
            React.createElement("div", { style: { display: "flex", gap: 6 } },
              React.createElement(Btn, { small: true, color: "#4ade80", onClick: () => decide(item.id, "approved"), disabled: busy[item.id] }, "Approve"),
              React.createElement(Btn, { small: true, color: "#ef4444", onClick: () => decide(item.id, "rejected"), disabled: busy[item.id] }, "Reject")
            )
          ),
          React.createElement("div", { style: { marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 } },
            React.createElement("div", null,
              React.createElement("div", { style: lblS }, "Extracted Fields"),
              React.createElement("div", { style: { fontSize: "0.78rem", color: T.muted, background: "rgba(0,0,0,0.2)", padding: 8, borderRadius: 8, fontFamily: T.mono } },
                Object.entries(extracted).map(([k, v]) => React.createElement("div", { key: k }, k + ": " + (typeof v === 'object' ? JSON.stringify(v) : v)))
              )
            ),
            React.createElement("div", null,
              React.createElement("div", { style: lblS }, "Destination"),
              React.createElement("div", { style: { fontSize: "0.85rem", fontWeight: 600 } }, item.destination_resource || "Auto-detect"),
              React.createElement("div", { style: { fontSize: "0.72rem", color: T.muted, marginTop: 4 } }, "Department: " + (item.assigned_department_id || "None"))
            )
          )
        );
      })
    )
  );
}`;
}
