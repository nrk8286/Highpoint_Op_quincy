import { jsonResponse, readJson } from "./runtime.js";
import { visibleProfile } from "./policy.js";
import { health } from "./modules/health.js";
import { azureServices } from "./modules/azure.js";
import { getFlow, postEvent } from "./modules/flow.js";
import { getSecurityCameras, openSecurityCameras } from "./modules/security-cameras.js";
import { completeOutlookAuth, disconnectOutlook, getOutlookStatus, startOutlookAuth, syncOutlookInbox, sendOutlookEmail } from "./modules/outlook.js";
import { approveReview, batchApproveReview, listReviewQueue } from "./modules/documents.js";
import { graphEntity, graphFailures, graphHealth, graphQuery, graphRetry, graphSearch } from "./modules/graph.js";
import { listShellEvents, postShellEvent } from "./modules/shell.js";
import { workspaceBrief } from "./modules/workspace.js";

const PUBLIC_PAGES = [
  {
    path: "/",
    audit: "public_page_home",
    kicker: "Facility operations and compliance",
    title: "Run every facility workflow from one HighPoints workspace",
    summary: "HighPoints unifies maintenance, housekeeping, inspections, compliance readiness, and executive visibility behind one secure operational surface.",
    bullets: [
      "Coordinate daily work across departments without splitting the operating record",
      "Keep inspections, evidence, follow-up, and immutable audit context connected",
      "Launch the protected workspace from the same public HighPoints domain",
    ],
    primaryLabel: "Launch HighPoints",
    primaryHref: "/app",
    secondaryLabel: "Review features",
    secondaryHref: "/features",
  },
  {
    path: "/features",
    audit: "public_page_features",
    kicker: "Platform features",
    title: "HighPoints features",
    summary: "The operational surface for maintenance, housekeeping, compliance, and recovery workflows.",
    bullets: [
      "Live operational views for staff handoff and recovery",
      "Queue-driven support bundle and direct app launch",
      "Search, automation, and review paths in one place",
    ],
    primaryLabel: "Open the app",
    primaryHref: "/app",
    secondaryLabel: "Check status",
    secondaryHref: "/operations-status",
  },
  {
    path: "/privacy",
    audit: "public_page_privacy",
    kicker: "Data handling",
    title: "Privacy and data handling",
    summary: "How HighPoints handles operational data, support artifacts, and staff-visible state.",
    bullets: [
      "Sensitive fields stay scoped to the authenticated app and APIs",
      "Support exports are intentionally compact and user-controlled",
      "Camera, document, and integration access remain explicit",
    ],
    primaryLabel: "Open support",
    primaryHref: "/support",
    secondaryLabel: "Open the app",
    secondaryHref: "/app",
  },
  {
    path: "/support",
    audit: "public_page_support",
    kicker: "Support bundle",
    title: "Support and diagnostics",
    summary: "Collect a short diagnostic bundle, then jump back into the app or the platform status page.",
    bullets: [
      "Copy a support bundle for quick issue triage",
      "Open the authenticated workspace when you are ready",
      "Use the operations status page to verify live health",
    ],
    primaryLabel: "Open status",
    primaryHref: "/operations-status",
    secondaryLabel: "Open the app",
    secondaryHref: "/app",
  },
  {
    path: "/operations-status",
    audit: "public_page_operations_status",
    kicker: "System health",
    title: "Operations status",
    summary: "Current public status for the platform edge, app origin, and operational APIs.",
    bullets: [
      "API health should stay green before any rollout",
      "Azure origin and app handoff remain part of the live path",
      "Use this page before support or release checks",
    ],
    primaryLabel: "Open health",
    primaryHref: "/api/v2/health",
    secondaryLabel: "Open the app",
    secondaryHref: "/app",
  },
  {
    path: "/search",
    audit: "public_page_search",
    kicker: "Find anything",
    title: "Search",
    summary: "A quick path into the records, handoffs, and operations views that teams use every day.",
    bullets: [
      "Jump to the right workflow without hunting across modules",
      "Keep the top surface minimal while the data flows underneath",
      "Move from search result to action with one click",
    ],
    primaryLabel: "Open the app",
    primaryHref: "/app",
    secondaryLabel: "See features",
    secondaryHref: "/features",
  },
  {
    path: "/pricing",
    audit: "public_page_pricing",
    kicker: "Plans and rollout",
    title: "Pricing",
    summary: "A straightforward way to evaluate the platform for pilot, rollout, or enterprise deployment.",
    bullets: [
      "Start with a pilot and expand by department or campus",
      "Keep support, recovery, and integrations included in the same lane",
      "Scale without changing the operational surface users rely on",
    ],
    primaryLabel: "Open support",
    primaryHref: "/support",
    secondaryLabel: "Open features",
    secondaryHref: "/features",
  },
  {
    path: "/executive-command-center",
    audit: "public_page_executive_command_center",
    kicker: "Executive view",
    title: "Executive command center",
    summary: "A compact surface for cross-team visibility, escalation, and recovery decisions.",
    bullets: [
      "Watch priority work without exposing unnecessary detail",
      "Keep compliance, maintenance, and support aligned",
      "Move from status to action without losing context",
    ],
    primaryLabel: "Open status",
    primaryHref: "/operations-status",
    secondaryLabel: "Open the app",
    secondaryHref: "/app",
  },
  {
    path: "/ai-operations",
    audit: "public_page_ai_operations",
    kicker: "AI-assisted work",
    title: "AI operations",
    summary: "Operational AI that helps staff summarize, route, and prepare the right next step.",
    bullets: [
      "Turn support and workflow data into compact briefs",
      "Keep AI focused on operations, not a generic chat surface",
      "Preserve auditability while reducing busywork",
    ],
    primaryLabel: "Open the app",
    primaryHref: "/app",
    secondaryLabel: "Open support",
    secondaryHref: "/support",
  },
  {
    path: "/workflow-automation",
    audit: "public_page_workflow_automation",
    kicker: "Automation",
    title: "Workflow automation",
    summary: "Queue-based automation for recurring operational steps, approvals, and handoffs.",
    bullets: [
      "Reduce repetitive admin work without hiding the state",
      "Keep exceptions visible and easy to recover",
      "Automate the handoff, not the accountability",
    ],
    primaryLabel: "Open the app",
    primaryHref: "/app",
    secondaryLabel: "See features",
    secondaryHref: "/features",
  },
  {
    path: "/readiness-assessment",
    audit: "public_page_readiness_assessment",
    kicker: "Readiness checks",
    title: "Readiness assessment",
    summary: "A practical way to verify operational readiness before a survey, audit, or inspection.",
    bullets: [
      "Check open items, owners, and status at a glance",
      "Use the app to close out follow-up work quickly",
      "Pair readiness results with a visible recovery path",
    ],
    primaryLabel: "Open the app",
    primaryHref: "/app",
    secondaryLabel: "Open privacy",
    secondaryHref: "/privacy",
  },
  {
    path: "/azure-services",
    audit: "public_page_azure_services",
    kicker: "Azure integration",
    title: "Azure services",
    summary: "The Azure-backed parts of the platform used for app handoff and service visibility.",
    bullets: [
      "Keep the app origin and status endpoint easy to verify",
      "Tie deployment checks back to the live health path",
      "Preserve a direct line from edge to origin when needed",
    ],
    primaryLabel: "Check status",
    primaryHref: "/operations-status",
    secondaryLabel: "Open the app",
    secondaryHref: "/app",
  },
  {
    path: "/integrations",
    audit: "public_page_integrations",
    kicker: "Connected tools",
    title: "Integrations",
    summary: "Connect the operational app to the tools staff already use for communication and service work.",
    bullets: [
      "Outlook, graph, and camera workflows stay aligned",
      "Keep each integration explicit and testable",
      "Use the app as the central place for routed work",
    ],
    primaryLabel: "Open the app",
    primaryHref: "/app",
    secondaryLabel: "Open support",
    secondaryHref: "/support",
  },
  {
    path: "/senior-living-operations",
    audit: "public_page_senior_living_operations",
    kicker: "Senior living",
    title: "Senior living operations",
    summary: "Operational tooling built for the day-to-day realities of senior living facilities.",
    bullets: [
      "Maintenance, housekeeping, and compliance stay in the same flow",
      "Make the top surface small and the data path reliable",
      "Keep staff focused on action instead of navigation",
    ],
    primaryLabel: "Open the app",
    primaryHref: "/app",
    secondaryLabel: "See features",
    secondaryHref: "/features",
  },
  {
    path: "/facility-maintenance-software",
    audit: "public_page_facility_maintenance_software",
    kicker: "Maintenance",
    title: "Facility maintenance software",
    summary: "A straightforward page for the maintenance side of the platform.",
    bullets: [
      "Track tasks, dispatch, and follow-through in one lane",
      "Keep escalation visible when work gets stuck",
      "Use the app for the operational record and handoff",
    ],
    primaryLabel: "Open the app",
    primaryHref: "/app",
    secondaryLabel: "Open status",
    secondaryHref: "/operations-status",
  },
  {
    path: "/survey-readiness",
    audit: "public_page_survey_readiness",
    kicker: "Survey prep",
    title: "Survey readiness",
    summary: "A focused page for survey prep, findings, and closure work.",
    bullets: [
      "Keep open items visible before survey day",
      "Move findings into the recovery path quickly",
      "Use status pages to verify the platform before a review",
    ],
    primaryLabel: "Open the app",
    primaryHref: "/app",
    secondaryLabel: "Open privacy",
    secondaryHref: "/privacy",
  },
  {
    path: "/housekeeping-management",
    audit: "public_page_housekeeping_management",
    kicker: "Housekeeping",
    title: "Housekeeping management",
    summary: "A lightweight entry point for room turnover, cleaning status, and staffing flow.",
    bullets: [
      "Keep rooms, tasks, and shifts visible to the team",
      "Preserve a clean handoff between staff members",
      "Use the app as the authoritative operational record",
    ],
    primaryLabel: "Open the app",
    primaryHref: "/app",
    secondaryLabel: "See features",
    secondaryHref: "/features",
  },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function publicPageHtml(page) {
  const title = escapeHtml(page.title);
  const summary = escapeHtml(page.summary);
  const path = escapeHtml(page.path);
  const cards = page.bullets.map((bullet) => `<article class="card"><h2>Key point</h2><ul><li>${escapeHtml(bullet)}</li></ul></article>`).join("");
  const primary = `<a class="primary" href="${escapeHtml(page.primaryHref)}">${escapeHtml(page.primaryLabel)}</a>`;
  const secondary = page.secondaryHref ? `<a class="secondary" href="${escapeHtml(page.secondaryHref)}">${escapeHtml(page.secondaryLabel)}</a>` : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="index,follow">
    <meta name="description" content="${summary}">
    <meta property="og:title" content="${title} | HighPoints">
    <meta property="og:description" content="${summary}">
    <meta property="og:url" content="https://highpoints.work${path}">
    <link rel="canonical" href="https://highpoints.work${path}">
    <title>${title} | HighPoints</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: linear-gradient(145deg, #11131a 0%, #06070c 100%); color: #ece9f3; }
      main { max-width: 1040px; margin: 0 auto; padding: 40px 18px 56px; }
      .hero { border: 1px solid rgba(255,255,255,.12); border-radius: 24px; background: rgba(15,16,22,.86); padding: 28px; box-shadow: 0 28px 70px rgba(0,0,0,.36); }
      .eyebrow { display: inline-flex; padding: 7px 11px; border-radius: 999px; background: rgba(224,196,100,.12); color: #e0c464; font-size: .74rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
      h1 { margin: 14px 0 0; font-size: clamp(2rem, 4vw, 3.6rem); line-height: 1.04; }
      .summary { margin: 14px 0 0; max-width: 64ch; color: #bbb5c7; font-size: 1.03rem; line-height: 1.6; }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; }
      a { text-decoration: none; }
      .primary, .secondary { display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 0 18px; border-radius: 14px; font-weight: 800; }
      .primary { background: linear-gradient(135deg, #e0c464, #c9a240); color: #101018; }
      .secondary { background: rgba(255,255,255,.06); color: #ece9f3; border: 1px solid rgba(255,255,255,.12); }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-top: 18px; }
      .card { border: 1px solid rgba(255,255,255,.1); border-radius: 18px; background: rgba(255,255,255,.04); padding: 16px; }
      .card h2 { margin: 0 0 8px; font-size: 1rem; }
      .card ul { margin: 0; padding-left: 18px; color: #d2cfe0; line-height: 1.55; }
      .footer { margin-top: 18px; color: #978fa7; font-size: .9rem; }
      @media (max-width: 640px) { main { padding: 18px 12px 28px; } .hero { padding: 20px; } }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <span class="eyebrow">${escapeHtml(page.kicker)}</span>
        <h1>${title}</h1>
        <p class="summary">${summary}</p>
        <div class="actions">${primary}${secondary}</div>
      </section>
      <section class="grid" aria-label="Highlights">
        ${cards}
      </section>
      <p class="footer">HighPoints routes this page directly from the edge. <a class="secondary" href="/operations-status">View status</a></p>
    </main>
  </body>
</html>`;
}

function publicPageResponse(page) {
  return new Response(publicPageHtml(page), {
    status: 200,
    headers: {
      "content-type": "text/html;charset=UTF-8",
      "cache-control": "public, max-age=300",
      "referrer-policy": "same-origin",
      "x-content-type-options": "nosniff",
      "x-frame-options": "SAMEORIGIN",
    },
  });
}

function publicTextResponse(body, contentType, cacheControl = "public, max-age=3600") {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": cacheControl,
      "referrer-policy": "same-origin",
      "x-content-type-options": "nosniff",
      "x-frame-options": "SAMEORIGIN",
    },
  });
}

function publicSitemap() {
  const urls = PUBLIC_PAGES.map((page) => {
    const priority = page.path === "/" ? "1.0" : "0.8";
    const canonical = page.path === "/" ? "https://highpoints.work/" : `https://highpoints.work${page.path}`;
    return `  <url><loc>${canonical}</loc><changefreq>weekly</changefreq><priority>${priority}</priority></url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

function registerPublicMetadata(router) {
  router.add("GET", "/robots.txt", { auth: false, resource: "public_metadata", audit: "public_robots" }, () => publicTextResponse(
    "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /app/\n\nSitemap: https://highpoints.work/sitemap.xml\n",
    "text/plain;charset=UTF-8",
  ));
  router.add("GET", "/sitemap.xml", { auth: false, resource: "public_metadata", audit: "public_sitemap" }, () => publicTextResponse(
    publicSitemap(),
    "application/xml;charset=UTF-8",
  ));
  router.add("GET", "/.well-known/microsoft-identity-association.json", { auth: false, resource: "public_metadata", audit: "public_microsoft_identity" }, () => publicTextResponse(
    JSON.stringify({ associatedApplications: [{ applicationId: "e4e687a9-bccc-4425-ac28-6ee66ea994c9" }] }),
    "application/json;charset=UTF-8",
  ));
  router.add("GET", "/healthz", { auth: false, resource: "health", audit: "public_health" }, () => publicTextResponse(
    "ok\n",
    "text/plain;charset=UTF-8",
    "no-store",
  ));
}

function registerPublicPages(router) {
  for (const page of PUBLIC_PAGES) {
    router.add("GET", page.path, { auth: false, resource: "public_page", audit: page.audit }, () => publicPageResponse(page));
  }
}

export function registerRoutes(router) {
  registerPublicPages(router);
  registerPublicMetadata(router);
  router.add("GET", "/api/v2/health", { auth: false, resource: "health", audit: "health_check" }, health);
  router.add("GET", "/api/v2/azure/services", { auth: false, resource: "azure", audit: "azure_services" }, azureServices);
  router.add("GET", "/api/azure/services", { auth: false, resource: "azure", audit: "azure_services_legacy" }, azureServices);

  const me = async (context) => {
    return jsonResponse({ user: visibleProfile(context.user), requestId: context.requestId });
  };
  router.add("GET", "/api/v2/me", { resource: "profile", audit: "profile_read" }, me);
  router.add("GET", "/api/me/access", { resource: "profile", audit: "profile_read_legacy" }, me);

  router.add("GET", "/api/v2/flow", { resource: "flow", audit: "flow_read" }, getFlow);
  router.add("POST", "/api/v2/workspace/brief", { resource: "dashboard", audit: "workspace_brief" }, async (context) => {
    context.body = await readJson(context.request);
    return workspaceBrief(context);
  });

  router.add("POST", "/api/v2/events", { resource: "flow", audit: "flow_event" }, async (context) => {
    context.body = await readJson(context.request);
    return postEvent(context);
  });
  router.add("GET", "/api/v2/shell/events", { resource: "shell", audit: "shell_events_read" }, listShellEvents);
  router.add("POST", "/api/v2/shell/events", { resource: "shell", audit: "shell_event" }, postShellEvent);

  router.add("GET", "/api/v2/security/cameras", { resource: "security_cameras", audit: "security_camera_read" }, getSecurityCameras);
  router.add("GET", "/api/v2/security/camera", { resource: "security_cameras", audit: "security_camera_read_singular" }, getSecurityCameras);
  router.add("GET", "/api/security/cameras", { resource: "security_cameras", audit: "security_camera_read_legacy" }, getSecurityCameras);
  router.add("GET", "/api/security/camera", { resource: "security_cameras", audit: "security_camera_read_legacy_singular" }, getSecurityCameras);
  router.add("GET", "/api/v2/security/cameras/open", { auth: false, resource: "security_cameras", audit: "security_camera_open" }, openSecurityCameras);
  router.add("GET", "/api/v2/security/cameras/feed", { auth: false, resource: "security_cameras", audit: "security_camera_feed" }, openSecurityCameras);
  router.add("GET", "/api/security/cameras/open", { auth: false, resource: "security_cameras", audit: "security_camera_open_legacy" }, openSecurityCameras);
  router.add("GET", "/api/security/cameras/feed", { auth: false, resource: "security_cameras", audit: "security_camera_feed_legacy" }, openSecurityCameras);

  const outlookStart = async (context) => {
    context.body = await readJson(context.request);
    return startOutlookAuth(context);
  };
  router.add("POST", "/api/v2/outlook/auth/start", { resource: "outlook", audit: "outlook_auth_start" }, outlookStart);
  router.add("POST", "/api/outlook/auth/start", { resource: "outlook", audit: "outlook_auth_start_legacy" }, outlookStart);

  const outlookComplete = async (context) => {
    context.body = await readJson(context.request);
    return completeOutlookAuth(context);
  };
  router.add("POST", "/api/v2/outlook/auth/complete", { resource: "outlook", audit: "outlook_auth_complete" }, outlookComplete);
  router.add("POST", "/api/outlook/auth/complete", { resource: "outlook", audit: "outlook_auth_complete_legacy" }, outlookComplete);
  router.add("GET", "/api/v2/outlook/status", { resource: "outlook", audit: "outlook_status" }, getOutlookStatus);
  router.add("GET", "/api/outlook/status", { resource: "outlook", audit: "outlook_status_legacy" }, getOutlookStatus);

  const outlookDisconnect = async (context) => {
    return disconnectOutlook(context);
  };
  router.add("POST", "/api/v2/outlook/disconnect", { resource: "outlook", audit: "outlook_disconnect" }, outlookDisconnect);
  router.add("POST", "/api/outlook/disconnect", { resource: "outlook", audit: "outlook_disconnect_legacy" }, outlookDisconnect);

  router.add("GET", "/api/v2/outlook/sync", { resource: "outlook", audit: "outlook_sync" }, syncOutlookInbox);
  router.add("POST", "/api/v2/outlook/send", { resource: "outlook", audit: "outlook_send" }, sendOutlookEmail);

  router.add("GET", "/api/v2/documents/review", { resource: "documents", audit: "review_queue_read" }, listReviewQueue);
  router.add("GET", "/api/documents/review", { resource: "documents", audit: "review_queue_read_legacy" }, listReviewQueue);

  const reviewDecision = async (context) => {
    context.body = await readJson(context.request);
    return approveReview(context);
  };
  router.add("POST", "/api/v2/documents/review/:id/decision", { resource: "documents", audit: "review_decision" }, reviewDecision);
  router.add("POST", "/api/documents/review/:id", { resource: "documents", audit: "review_decision_legacy" }, reviewDecision);

  const batchReview = async (context) => {
    return batchApproveReview(context);
  };
  router.add("POST", "/api/v2/documents/review/batch", { resource: "documents", audit: "review_batch_decision" }, batchReview);

  router.add("GET", "/api/v2/graph/health", { resource: "graph", audit: "graph_health" }, graphHealth);
  router.add("POST", "/api/v2/graph/query", { resource: "graph", audit: "graph_query" }, graphQuery);
  router.add("GET", "/api/v2/graph/entity/:type/:id", { resource: "graph", audit: "graph_entity" }, graphEntity);
  router.add("GET", "/api/v2/graph/search", { resource: "graph", audit: "graph_search" }, graphSearch);
  router.add("POST", "/api/v2/graph/sync/retry", { resource: "graph", audit: "graph_sync_retry" }, graphRetry);
  router.add("GET", "/api/v2/graph/sync/failures", { resource: "graph", audit: "graph_sync_failures" }, graphFailures);
}
