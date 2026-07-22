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
  const cards = page.bullets.map((bullet, index) => `<article class="card"><span class="card-index">0${index + 1}</span><h2>${["See the signal", "Move with clarity", "Keep the record"][index] || "Operate with confidence"}</h2><p>${escapeHtml(bullet)}</p></article>`).join("");
  const primary = `<a class="primary" href="${escapeHtml(page.primaryHref)}">${escapeHtml(page.primaryLabel)}<span aria-hidden="true">↗</span></a>`;
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
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        --ink: #f8f5ee;
        --muted: #aaa9b1;
        --quiet: #777985;
        --night: #07090d;
        --gold: #e4c66e;
        --mint: #7bd8ba;
        --line: rgba(255,255,255,.11);
        --max: 1180px;
      }
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body { margin: 0; min-height: 100vh; overflow-x: hidden; background: var(--night); color: var(--ink); -webkit-font-smoothing: antialiased; }
      body::before { position: fixed; inset: 0; z-index: -2; content: ""; background: radial-gradient(circle at 82% 3%, rgba(228,198,110,.12), transparent 31rem), radial-gradient(circle at 5% 60%, rgba(49,95,95,.12), transparent 34rem), linear-gradient(145deg, #0d1117 0%, #06070a 65%); }
      body::after { position: fixed; inset: 0; z-index: -1; pointer-events: none; content: ""; opacity: .28; background-image: linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px); background-size: 64px 64px; mask-image: linear-gradient(to bottom, #000, transparent 75%); }
      a { color: inherit; text-decoration: none; }
      a:focus-visible { outline: 3px solid var(--gold); outline-offset: 4px; }
      .skip-link { position: fixed; top: 10px; left: 10px; z-index: 100; padding: 10px 14px; border-radius: 10px; background: var(--gold); color: #111; font-weight: 800; transform: translateY(-160%); }
      .skip-link:focus { transform: translateY(0); }
      .site-nav { position: sticky; top: 0; z-index: 20; border-bottom: 1px solid rgba(255,255,255,.07); background: rgba(7,9,13,.82); backdrop-filter: blur(18px); }
      .nav-inner { display: flex; align-items: center; justify-content: space-between; width: min(var(--max), calc(100% - 36px)); min-height: 72px; margin: 0 auto; gap: 28px; }
      .brand { display: inline-flex; align-items: center; gap: 11px; flex: 0 0 auto; font-size: .96rem; font-weight: 850; letter-spacing: -.01em; }
      .brand-mark { display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid rgba(228,198,110,.45); border-radius: 10px; background: linear-gradient(145deg, rgba(228,198,110,.19), rgba(228,198,110,.03)); color: var(--gold); font-family: Georgia, serif; }
      .nav-links { display: flex; align-items: center; justify-content: flex-end; gap: 23px; color: #b8b8bf; font-size: .82rem; font-weight: 650; }
      .nav-links a { transition: color .2s ease; }
      .nav-links a:hover { color: #fff; }
      .nav-app { padding: 9px 13px; border: 1px solid rgba(228,198,110,.36); border-radius: 999px; color: var(--gold) !important; }
      main { width: min(var(--max), calc(100% - 36px)); margin: 0 auto; padding: 28px 0 70px; }
      .hero { position: relative; isolation: isolate; display: grid; grid-template-columns: minmax(0, 1.18fr) minmax(320px, .82fr); min-height: 610px; overflow: hidden; border: 1px solid var(--line); border-radius: 32px; background: linear-gradient(135deg, rgba(17,21,29,.97), rgba(10,13,18,.93)); box-shadow: 0 40px 100px rgba(0,0,0,.45); }
      .hero::before { position: absolute; inset: auto auto -38% -12%; z-index: -1; width: 520px; height: 520px; content: ""; border: 1px solid rgba(228,198,110,.15); border-radius: 50%; box-shadow: 0 0 0 78px rgba(228,198,110,.025), 0 0 0 156px rgba(228,198,110,.018); }
      .hero-copy { display: flex; flex-direction: column; justify-content: center; padding: clamp(38px, 6vw, 76px); }
      .eyebrow { display: inline-flex; align-items: center; align-self: flex-start; gap: 9px; color: var(--gold); font-size: .7rem; font-weight: 850; letter-spacing: .16em; text-transform: uppercase; }
      .eyebrow::before { width: 26px; height: 1px; content: ""; background: currentColor; }
      h1 { max-width: 760px; margin: 24px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: clamp(3rem, 6.3vw, 6.5rem); font-weight: 500; letter-spacing: -.055em; line-height: .93; text-wrap: balance; }
      .summary { max-width: 61ch; margin: 27px 0 0; color: #c1c0c7; font-size: clamp(1rem, 1.5vw, 1.16rem); line-height: 1.72; }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; }
      .primary, .secondary { display: inline-flex; align-items: center; justify-content: center; gap: 14px; min-height: 52px; padding: 0 21px; border-radius: 12px; font-size: .86rem; font-weight: 800; transition: transform .2s ease, border-color .2s ease, background .2s ease; }
      .primary { background: linear-gradient(135deg, #efd681, #c79d42); color: #15130d; box-shadow: 0 12px 30px rgba(199,157,66,.16); }
      .secondary { border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.035); color: #f2f0e9; }
      .primary:hover, .secondary:hover { transform: translateY(-2px); }
      .secondary:hover { border-color: rgba(228,198,110,.42); background: rgba(228,198,110,.06); }
      .executive-view { position: relative; display: flex; align-items: center; padding: 34px; border-left: 1px solid var(--line); background: linear-gradient(160deg, rgba(228,198,110,.07), rgba(255,255,255,.018)); }
      .signal-panel { width: 100%; border: 1px solid rgba(255,255,255,.14); border-radius: 22px; background: rgba(7,9,13,.76); box-shadow: 0 28px 70px rgba(0,0,0,.32); animation: rise-in .8s .12s both; }
      .signal-head { display: flex; align-items: center; justify-content: space-between; padding: 19px 20px; border-bottom: 1px solid var(--line); }
      .signal-head strong { font-size: .78rem; letter-spacing: .08em; text-transform: uppercase; }
      .live { display: inline-flex; align-items: center; gap: 7px; color: var(--mint); font-size: .69rem; font-weight: 800; text-transform: uppercase; }
      .live::before { width: 7px; height: 7px; content: ""; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 5px rgba(123,216,186,.09); animation: pulse 2.4s ease-in-out infinite; }
      .signal-body { padding: 8px 20px 20px; }
      .signal-row { display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: center; padding: 17px 0; border-bottom: 1px solid rgba(255,255,255,.07); }
      .signal-row:last-child { border: 0; }
      .signal-row span { color: var(--muted); font-size: .78rem; }
      .signal-row strong { color: #f4f1e9; font-size: .84rem; }
      .signal-row strong::before { display: inline-block; width: 6px; height: 6px; margin-right: 8px; border-radius: 50%; background: var(--gold); content: ""; }
      .decision-note { margin: 14px 0 0; padding: 15px 16px; border: 1px solid rgba(228,198,110,.17); border-radius: 14px; background: rgba(228,198,110,.055); color: #d9d4c6; font-size: .76rem; line-height: 1.55; }
      .decision-note b { display: block; margin-bottom: 3px; color: var(--gold); font-size: .64rem; letter-spacing: .1em; text-transform: uppercase; }
      .trust-strip { display: grid; grid-template-columns: repeat(3, 1fr); margin: 18px 0 0; border: 1px solid var(--line); border-radius: 18px; background: rgba(255,255,255,.025); }
      .trust-item { padding: 22px 25px; border-right: 1px solid var(--line); }
      .trust-item:last-child { border: 0; }
      .trust-item strong { display: block; font-family: Georgia, serif; font-size: 1.22rem; font-weight: 500; }
      .trust-item span { display: block; margin-top: 5px; color: var(--quiet); font-size: .73rem; letter-spacing: .08em; text-transform: uppercase; }
      .section { padding: 94px 0 0; }
      .section-heading { display: grid; grid-template-columns: .72fr 1.28fr; gap: 60px; align-items: end; margin-bottom: 32px; }
      .section-label { color: var(--gold); font-size: .7rem; font-weight: 850; letter-spacing: .16em; text-transform: uppercase; }
      .section-heading h2 { max-width: 760px; margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: clamp(2.15rem, 4vw, 4.25rem); font-weight: 500; letter-spacing: -.04em; line-height: 1.03; text-wrap: balance; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
      .card { position: relative; min-height: 230px; padding: 31px 26px 34px; border-right: 1px solid var(--line); background: linear-gradient(180deg, rgba(255,255,255,.018), transparent); transition: background .25s ease, transform .25s ease; }
      .card:last-child { border: 0; }
      .card:hover { z-index: 1; background: rgba(255,255,255,.042); transform: translateY(-4px); }
      .card-index { color: var(--gold); font-family: Georgia, serif; font-size: .8rem; }
      .card h2 { margin: 51px 0 11px; font-size: 1rem; font-weight: 780; letter-spacing: -.01em; }
      .card p { max-width: 33ch; margin: 0; color: var(--muted); font-size: .9rem; line-height: 1.65; }
      .proof { display: grid; grid-template-columns: minmax(260px, .78fr) minmax(0, 1.22fr); gap: 20px; margin-top: 94px; }
      .proof-copy, .proof-table { border: 1px solid var(--line); border-radius: 24px; background: rgba(255,255,255,.022); }
      .proof-copy { display: flex; flex-direction: column; justify-content: space-between; min-height: 430px; padding: 36px; background: radial-gradient(circle at 85% 10%, rgba(228,198,110,.11), transparent 18rem), rgba(255,255,255,.022); }
      .proof-copy h2 { max-width: 500px; margin: 20px 0; font-family: Georgia, serif; font-size: clamp(2rem, 3.7vw, 3.7rem); font-weight: 500; letter-spacing: -.045em; line-height: 1.03; }
      .proof-copy p { max-width: 48ch; margin: 0; color: var(--muted); line-height: 1.7; }
      .proof-seal { align-self: flex-start; margin-top: 32px; padding: 10px 13px; border: 1px solid rgba(123,216,186,.22); border-radius: 999px; color: var(--mint); font-size: .69rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      .proof-table { overflow: hidden; }
      .proof-row { display: grid; grid-template-columns: 1fr 1.3fr auto; gap: 20px; align-items: center; min-height: 108px; padding: 22px 26px; border-bottom: 1px solid var(--line); }
      .proof-row:last-child { border: 0; }
      .proof-row > span { color: var(--quiet); font-size: .72rem; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
      .proof-row strong { font-size: .92rem; }
      .proof-row em { color: var(--mint); font-size: .73rem; font-style: normal; font-weight: 800; }
      .outcomes { margin-top: 20px; padding: 55px; overflow: hidden; border: 1px solid rgba(228,198,110,.22); border-radius: 24px; background: linear-gradient(125deg, rgba(228,198,110,.13), rgba(228,198,110,.025) 48%, rgba(123,216,186,.04)); }
      .outcomes-top { display: flex; align-items: end; justify-content: space-between; gap: 30px; }
      .outcomes h2 { max-width: 740px; margin: 15px 0 0; font-family: Georgia, serif; font-size: clamp(2rem, 4vw, 4rem); font-weight: 500; letter-spacing: -.045em; line-height: 1.02; }
      .outcome-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin-top: 48px; background: rgba(255,255,255,.1); }
      .outcome { min-height: 170px; padding: 25px; background: #0f1218; }
      .outcome strong { display: block; color: var(--gold); font-family: Georgia, serif; font-size: 1.35rem; font-weight: 500; }
      .outcome p { margin: 12px 0 0; color: var(--muted); font-size: .84rem; line-height: 1.6; }
      .footer { display: flex; align-items: center; justify-content: space-between; gap: 22px; margin-top: 72px; padding-top: 26px; border-top: 1px solid var(--line); color: var(--quiet); font-size: .78rem; }
      .footer-links { display: flex; flex-wrap: wrap; gap: 20px; color: #b6b5ba; }
      @keyframes rise-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pulse { 50% { box-shadow: 0 0 0 9px rgba(123,216,186,0); } }
      @media (max-width: 900px) {
        .nav-inner { align-items: flex-start; flex-direction: column; gap: 12px; padding: 15px 0; }
        .nav-links { width: 100%; justify-content: flex-start; overflow-x: auto; padding: 2px 0 5px; scrollbar-width: none; }
        .hero { grid-template-columns: 1fr; min-height: 0; }
        .executive-view { border-top: 1px solid var(--line); border-left: 0; }
        .section-heading { grid-template-columns: 1fr; gap: 18px; }
        .proof { grid-template-columns: 1fr; }
      }
      @media (max-width: 680px) {
        .nav-inner, main { width: min(100% - 24px, var(--max)); }
        main { padding-top: 12px; }
        .nav-links { gap: 18px; }
        .hero { border-radius: 22px; }
        .hero-copy, .executive-view { padding: 28px 22px; }
        h1 { font-size: clamp(2.65rem, 14vw, 4.5rem); }
        .trust-strip, .grid, .outcome-list { grid-template-columns: 1fr; }
        .trust-item { border-right: 0; border-bottom: 1px solid var(--line); }
        .trust-item:last-child { border-bottom: 0; }
        .section { padding-top: 68px; }
        .card { min-height: 0; border-right: 0; border-bottom: 1px solid var(--line); }
        .card:last-child { border-bottom: 0; }
        .card h2 { margin-top: 24px; }
        .proof-copy { min-height: 0; padding: 28px 24px; }
        .proof-row { grid-template-columns: 1fr auto; gap: 8px 16px; }
        .proof-row strong { grid-column: 1 / -1; grid-row: 2; }
        .outcomes { padding: 34px 22px; }
        .outcomes-top, .footer { align-items: flex-start; flex-direction: column; }
      }
      @media (prefers-reduced-motion: reduce) {
        html { scroll-behavior: auto; }
        *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
      }
    </style>
  </head>
  <body>
    <a class="skip-link" href="#main-content">Skip to content</a>
    <nav class="site-nav" aria-label="Primary navigation">
      <div class="nav-inner">
        <a class="brand" href="/" aria-label="HighPoints home"><span class="brand-mark" aria-hidden="true">H</span><span>HighPoints</span></a>
        <div class="nav-links">
          <a href="/executive-command-center">Executive</a>
          <a href="/features">Platform</a>
          <a href="/ai-operations">AI operations</a>
          <a href="/operations-status">Status</a>
          <a href="/support">Support</a>
          <a class="nav-app" href="/app">Open workspace</a>
        </div>
      </div>
    </nav>
    <main id="main-content">
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">${escapeHtml(page.kicker)}</span>
          <h1>${title}</h1>
          <p class="summary">${summary}</p>
          <div class="actions">${primary}${secondary}</div>
        </div>
        <aside class="executive-view" aria-label="Executive operating model">
          <div class="signal-panel">
            <div class="signal-head"><strong>Executive operating model</strong><span class="live">Decision lens</span></div>
            <div class="signal-body">
              <div class="signal-row"><span>Priority posture</span><strong>In view</strong></div>
              <div class="signal-row"><span>Accountability</span><strong>Named owners</strong></div>
              <div class="signal-row"><span>Evidence chain</span><strong>Attached</strong></div>
              <div class="decision-note"><b>Decision brief</b>Move from cross-department noise to the next accountable action without losing operational context.</div>
            </div>
          </div>
        </aside>
      </section>
      <section class="trust-strip" aria-label="HighPoints operating principles">
        <div class="trust-item"><strong>One operating picture</strong><span>Across departments</span></div>
        <div class="trust-item"><strong>Decision-ready context</strong><span>From signal to owner</span></div>
        <div class="trust-item"><strong>Audit-conscious by design</strong><span>Evidence stays connected</span></div>
      </section>
      <section class="section" aria-labelledby="clarity-title">
        <div class="section-heading"><span class="section-label">The leadership layer</span><h2 id="clarity-title">Clarity where leaders need it. Detail where teams do the work.</h2></div>
        <div class="grid" aria-label="Platform highlights">${cards}</div>
      </section>
      <section class="proof" aria-labelledby="proof-title">
        <div class="proof-copy">
          <div><span class="section-label">Executive proof</span><h2 id="proof-title">Built for the Monday operating review—and every decision after it.</h2><p>HighPoints connects the management view to the work itself, so executive confidence comes from visible ownership and traceable follow-through.</p></div>
          <span class="proof-seal">Operational context preserved</span>
        </div>
        <div class="proof-table" role="table" aria-label="Executive proof points">
          <div class="proof-row" role="row"><span role="cell">Readiness</span><strong role="cell">Cross-department risk surfaced in one view</strong><em role="cell">Visible</em></div>
          <div class="proof-row" role="row"><span role="cell">Accountability</span><strong role="cell">Every priority tied to an owner and next action</strong><em role="cell">Owned</em></div>
          <div class="proof-row" role="row"><span role="cell">Evidence</span><strong role="cell">Inspections, follow-up, and closure stay connected</strong><em role="cell">Traceable</em></div>
          <div class="proof-row" role="row"><span role="cell">Continuity</span><strong role="cell">Handoffs preserve the operating record</strong><em role="cell">Durable</em></div>
        </div>
      </section>
      <section class="outcomes" aria-labelledby="outcomes-title">
        <div class="outcomes-top"><div><span class="section-label">Executive outcomes</span><h2 id="outcomes-title">Run the organization with less decision drag.</h2></div>${primary}</div>
        <div class="outcome-list">
          <article class="outcome"><strong>See sooner</strong><p>Bring operational pressure into view before it becomes an avoidable escalation.</p></article>
          <article class="outcome"><strong>Decide faster</strong><p>Give leaders the context, ownership, and evidence needed to make a clean call.</p></article>
          <article class="outcome"><strong>Follow through</strong><p>Keep executive direction connected to accountable work and a defensible record.</p></article>
        </div>
      </section>
      <footer class="footer"><span>HighPoints · Executive operations for senior living</span><div class="footer-links"><a href="/privacy">Privacy</a><a href="/pricing">Pricing</a><a href="/operations-status">System status</a><a href="/support">Support</a></div></footer>
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
