package main

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

type Page struct {
	Path        string
	Title       string
	Description string
	Badge       string
	Heading     string
	Intro       string
	Metrics     []Metric
	Cards       []Card
	Interactive bool
	Search      bool
	Diagnostics bool
	Support     bool
	Priority    string
	ChangeFreq  string
}

type Metric struct{ Value, Label string }
type Card struct{ Title, Body string }
type AzureService struct {
	Name          string `json:"name"`
	Type          string `json:"type"`
	ResourceGroup string `json:"resource_group"`
	Role          string `json:"role"`
}
type View struct {
	Page   Page
	Year   int
	Schema template.JS
}

var pages = []Page{
	{Path: "/", Title: "HighPoints - Facility Operations & Compliance Platform", Description: "All-in-one operations hub for senior living facilities with maintenance, housekeeping, scheduling, compliance inspections, and real-time reporting.", Badge: "Operations · Compliance · Intelligence", Heading: "One platform for every department in your facility", Intro: "Maintenance, housekeeping, nursing, culinary, activities, compliance inspections, and executive reporting stay connected in one secure operating rhythm.", Metrics: []Metric{{"56", "Resident Rooms"}, {"4", "Care Wings"}, {"48", "Staff Members"}, {"15+", "Department Modules"}}, Cards: []Card{{"Command center", "See daily readiness, open work, department pressure, and follow-up status without chasing spreadsheets."}, {"Floor-team speed", "Give staff a mobile path to capture issues, complete checks, and route tasks to the right owner."}, {"Audit-ready trail", "Turn work orders, inspection evidence, and document intake into searchable operational history."}}, Priority: "1.0", ChangeFreq: "weekly"},
	{Path: "/executive-command-center", Title: "Executive Command Center for Senior Living - HighPoints", Description: "A real-time executive command center for senior living operations, compliance risk, maintenance backlog, staffing visibility, and survey readiness.", Badge: "Executive Command Center", Heading: "See facility risk before it becomes a fire drill", Intro: "HighPoints turns department work into a live executive view: open work, overdue inspections, staffing pressure, supply risk, and survey-readiness signals.", Metrics: []Metric{{"94%", "Readiness Signal"}, {"18m", "Response Target"}, {"7", "Priority Lanes"}}, Cards: []Card{{"Real-time operations score", "Track signals by department and surface where leaders need to focus today."}, {"Risk flags", "Highlight overdue work, incidents, missing evidence, and stale handoffs before they compound."}, {"Leadership review", "Support daily standup and weekly readiness review with one consistent operating picture."}}, Priority: "0.9", ChangeFreq: "weekly"},
	{Path: "/ai-operations", Title: "AI Operations Layer for Facility Teams - HighPoints", Description: "AI-ready operations workflows for senior living teams, including document intake, follow-up suggestions, compliance summaries, and department action queues.", Badge: "AI Operations", Heading: "Move from dashboards to suggested next actions", Intro: "Structured intake, audit trails, and department queues create the foundation for AI-assisted summaries, document extraction, and follow-up prioritization.", Metrics: []Metric{{"3x", "Faster Intake"}, {"12m", "Review Cycle"}, {"24/7", "Signal Layer"}}, Cards: []Card{{"Document intelligence", "Photograph or upload records and route extracted details through human review."}, {"Action summaries", "Summarize work by department so supervisors know what changed and what needs attention."}, {"Review gates", "Keep sensitive operational and compliance records behind approval before they become source of truth."}}, Priority: "0.9", ChangeFreq: "weekly"},
	{Path: "/workflow-automation", Title: "Workflow Automation for Senior Living Facilities - HighPoints", Description: "Workflow automation for maintenance, housekeeping, compliance, inventory, scheduling, and executive follow-up in senior living facilities.", Badge: "Workflow Automation", Heading: "Automate the handoff, not the accountability", Intro: "HighPoints connects triggers, assignments, reminders, and evidence capture so work moves cleanly between departments without losing ownership.", Metrics: []Metric{{"40%", "Less Admin Drag"}, {"5", "Core Workflows"}, {"1", "Shared View"}}, Cards: []Card{{"Inspection triggers", "Create follow-up automatically when checks reveal a gap."}, {"Role routing", "Route tasks by department, role, priority, and location."}, {"Escalation rules", "Move stale work up before it becomes a compliance problem."}}, Priority: "0.85", ChangeFreq: "weekly"},
	{Path: "/readiness-assessment", Title: "Facility Readiness Assessment - HighPoints", Description: "Interactive facility readiness assessment for operations leaders reviewing maintenance, housekeeping, staffing, compliance evidence, and survey preparation.", Badge: "Readiness Assessment", Heading: "Score readiness across the work that matters", Intro: "Use the interactive assessment to model operational pressure and see where HighPoints creates the most leverage for your facility team.", Interactive: true, Metrics: []Metric{{"Live", "Readiness Model"}, {"5", "Review Areas"}, {"0", "Paper Binders"}}, Cards: []Card{{"Maintenance backlog", "Score preventive maintenance evidence and open work pressure."}, {"Room readiness", "Model housekeeping quality checks and reset discipline."}, {"Compliance evidence", "Review documentation and follow-up coverage before survey season."}}, Priority: "0.85", ChangeFreq: "weekly"},
	{Path: "/azure-services", Title: "Azure Services for Facility Operations - HighPoints", Description: "HighPoints uses Azure servers, application gateway, cognitive services, telemetry, log analytics, networking, and Linux scale sets alongside secure Cloudflare APIs for resilient facility operations.", Badge: "Azure Services", Heading: "Azure capacity behind the operations website", Intro: "The HighPoints website can run from Azure origin servers while Azure AI, telemetry, networking, and Linux worker capacity support document intelligence, diagnostics, and resilient operations.", Metrics: []Metric{{"Azure", "Origin Server"}, {"AI", "Cognitive Services"}, {"VMSS", "Worker Capacity"}}, Cards: []Card{{"Direct Azure origin", "server.highpoints.work, origin.highpoints.work, and azure.highpoints.work serve the site from the Azure VM with TLS and Nginx."}, {"Service telemetry", "Application Insights and Log Analytics are available for operational diagnostics and live infrastructure visibility."}, {"Compute expansion", "The Linux VM scale set can take background jobs, desktop access, and future service workloads without moving the app shell."}}, Priority: "0.78", ChangeFreq: "weekly"},
	{Path: "/features", Title: "HighPoints Features - Facility Operations Platform", Description: "Feature overview for the HighPoints public site, app handoff, support flow, live status, and operations workflows.", Badge: "Features", Heading: "See how the platform fits the daily work", Intro: "HighPoints keeps the public story small and the operational surface focused: executive views, AI-assisted workflows, support, and secure app handoff.", Metrics: []Metric{{"6", "Core Flows"}, {"1", "App Entry"}, {"17", "Public Pages"}}, Cards: []Card{{"Command center", "Track readiness, backlog, and risk from a single operations view."}, {"AI-assisted flow", "Use document intake, summaries, and review gates to reduce manual rework."}, {"App and support", "Keep protected app actions behind login while public pages route to support and status."}}, Priority: "0.77", ChangeFreq: "monthly"},
	{Path: "/privacy", Title: "HighPoints Privacy and Data Handling", Description: "Public overview of how HighPoints handles public site traffic, support details, and authenticated app data.", Badge: "Privacy", Heading: "Privacy and data handling", Intro: "The public site is designed to stay lightweight while authenticated app, support, and operational data remain behind the proper routes.", Metrics: []Metric{{"Public", "Site"}, {"App-gated", "Data"}, {"Support", "Cases"}}, Cards: []Card{{"Public pages", "The marketing site can be served without exposing internal operational records."}, {"Authenticated app", "Sensitive operational data stays behind the app entry and role-aware support flows."}, {"Support details", "Support bundles should include only the issue details needed to troubleshoot the request."}}, Priority: "0.45", ChangeFreq: "yearly"},
	{Path: "/operations-status", Title: "HighPoints Operations Status", Description: "Live status page for the HighPoints backend, Azure origin, graph gate, and app redirect path.", Badge: "Operations Status", Heading: "Check the live surfaces that keep HighPoints moving", Intro: "Use this page to verify backend health, Azure services, graph protection, and the app entry boundary from one place.", Diagnostics: true, Metrics: []Metric{{"5", "Live Checks"}, {"1", "Support Bundle"}, {"401", "Protected Graph"}}, Cards: []Card{{"Backend health", "Confirms the Cloudflare Worker is healthy and that D1 and document bindings are present."}, {"Azure origin", "Summarizes the Azure service catalog and whether the direct origin still answers cleanly."}, {"Graph gate", "Verifies the protected graph surface still returns 401 for unauthenticated requests."}, {"App boundary", "Verifies that /app keeps redirecting to the production sign-in route with callback parameters preserved."}, {"Public site", "Checks the Go site health endpoint that the public surface depends on."}}, Priority: "0.76", ChangeFreq: "weekly"},
	{Path: "/support", Title: "HighPoints Support and Contact", Description: "Public support landing page for app handoff, live status, and support bundle capture.", Badge: "Support", Heading: "Get help without losing the thread", Intro: "Use the app for authenticated support, check live status when something looks systemic, or copy a bundle that gives support the facts they need.", Support: true, Metrics: []Metric{{"3", "Help Paths"}, {"1", "Bundle"}, {"24/7", "Status"}}, Cards: []Card{{"App support", "Open the app entry and continue through the existing Zendesk-backed support flow after login."}, {"Live status", "Verify backend, Azure, graph, and app redirect behavior before filing a ticket."}, {"Support bundle", "Copy a concise summary with the issue, device, browser, and reproduction steps."}}, Priority: "0.74", ChangeFreq: "weekly"},
	{Path: "/integrations", Title: "Facility Operations Integrations - HighPoints", Description: "Integration-ready facility operations platform for mobile app launch, PWA install, email workflows, document intake, and Cloudflare-secured APIs.", Badge: "Integrations", Heading: "A connected operations layer that can grow with the stack", Intro: "HighPoints is built around web, mobile, secure APIs, and modular services so the platform can add new workflows without a rebuild.", Metrics: []Metric{{"Edge", "Delivery"}, {"PWA", "Install Path"}, {"API", "Expansion"}}, Cards: []Card{{"Secure app boundary", "Keep public pages fast while protected operations data stays behind the app and API boundary."}, {"Mobile packaging", "Support PWA and native mobile shells without splitting the product story."}, {"Workflow expansion", "Add document, email, and department workflows as the operation matures."}}, Priority: "0.75", ChangeFreq: "monthly"},
	{Path: "/pricing", Title: "HighPoints Pricing - Facility Operations Platform", Description: "Pricing overview for HighPoints facility operations software for senior living teams, maintenance, housekeeping, compliance, and executive reporting.", Badge: "Pricing", Heading: "Start with the workflows your facility needs most", Intro: "HighPoints pricing is designed around facility size, department rollout, app access, and the operations modules your team needs first.", Metrics: []Metric{{"Pilot", "Launch Option"}, {"15+", "Modules"}, {"Secure", "App + API"}}, Cards: []Card{{"Operations rollout", "Launch maintenance, housekeeping, inspections, and reporting with a focused implementation path."}, {"Department expansion", "Add document intake, AI-assisted summaries, and integrations as the facility operating rhythm matures."}, {"Mobile access", "Support PWA and native app workflows for supervisors and floor teams."}}, Priority: "0.7", ChangeFreq: "monthly"},
	{Path: "/senior-living-operations", Title: "Senior Living Operations Software - HighPoints", Description: "Senior living operations software for maintenance, housekeeping, compliance inspections, staffing handoffs, and executive facility visibility.", Badge: "Senior Living Operations", Heading: "Connect the daily work that keeps care environments ready", Intro: "HighPoints gives senior living operators one place to coordinate maintenance, housekeeping, inspections, follow-up, and leadership reporting.", Metrics: []Metric{{"1", "Shared Work Queue"}, {"Daily", "Readiness Reviews"}, {"Every", "Department"}}, Cards: []Card{{"Department visibility", "Coordinate work across maintenance, housekeeping, nursing, culinary, activities, and leadership."}, {"Follow-up discipline", "Keep ownership and evidence attached to every issue from intake through completion."}, {"Operational history", "Turn daily work into searchable context for reviews, trends, and survey preparation."}}, Priority: "0.8", ChangeFreq: "weekly"},
	{Path: "/facility-maintenance-software", Title: "Facility Maintenance Software - HighPoints", Description: "Facility maintenance software for senior living work orders, preventive maintenance, room readiness, inspections, and compliance evidence.", Badge: "Facility Maintenance", Heading: "Make maintenance work visible before it backs up", Intro: "HighPoints helps teams capture work requests, prioritize repairs, document follow-up, and connect maintenance evidence to readiness reviews.", Metrics: []Metric{{"PM", "Evidence"}, {"Mobile", "Capture"}, {"Live", "Backlog"}}, Cards: []Card{{"Work order intake", "Capture issues from the floor and route them to the right owner."}, {"Preventive maintenance", "Track recurring checks and attach completion evidence."}, {"Readiness signal", "Surface overdue or high-priority maintenance items for leadership review."}}, Priority: "0.8", ChangeFreq: "weekly"},
	{Path: "/survey-readiness", Title: "Survey Readiness Software - HighPoints", Description: "Survey readiness software for senior living teams managing inspections, compliance evidence, follow-up work, and leadership review.", Badge: "Survey Readiness", Heading: "Keep survey evidence close to the work", Intro: "HighPoints connects inspections, documentation, tasks, and review queues so teams can see gaps while there is still time to correct them.", Metrics: []Metric{{"Evidence", "Attached"}, {"Gaps", "Flagged"}, {"Review", "Ready"}}, Cards: []Card{{"Inspection follow-up", "Create tasks directly from readiness checks and attach supporting evidence."}, {"Documentation review", "Route sensitive records through review before they become operational source of truth."}, {"Leadership rhythm", "Give executives a consistent view of open gaps and completed follow-up."}}, Priority: "0.8", ChangeFreq: "weekly"},
	{Path: "/housekeeping-management", Title: "Housekeeping Management Software - HighPoints", Description: "Housekeeping management software for room readiness, quality checks, department handoffs, and senior living facility operations.", Badge: "Housekeeping Management", Heading: "Turn room readiness into a visible operating rhythm", Intro: "HighPoints helps housekeeping teams coordinate room resets, quality checks, follow-up, and handoffs with the rest of facility operations.", Metrics: []Metric{{"Rooms", "Tracked"}, {"Checks", "Logged"}, {"Handoffs", "Clear"}}, Cards: []Card{{"Room readiness", "Track room reset status and quality checks by location."}, {"Mobile updates", "Let teams capture progress and issues from the floor."}, {"Cross-team handoff", "Connect housekeeping gaps with maintenance, nursing, and leadership follow-up."}}, Priority: "0.8", ChangeFreq: "weekly"},
	{Path: "/search", Title: "Search HighPoints Facility Operations Content", Description: "Search HighPoints public resources for senior living operations, maintenance, housekeeping, compliance, workflow automation, and readiness content.", Badge: "Search", Heading: "Search facility operations resources", Intro: "Find the HighPoints workflow, operations, compliance, and readiness pages that match what your facility team is working on.", Search: true, Metrics: []Metric{{"17", "Public Pages"}, {"Live", "Search API"}, {"Fast", "Content Lookup"}}, Cards: []Card{{"Search by workflow", "Look up maintenance, housekeeping, survey readiness, AI operations, integrations, and command-center content."}, {"Jump to pages", "Results link directly to the strongest matching public page."}, {"Built in Go", "The same Go runtime serves the search UI and JSON endpoint."}}, Priority: "0.75", ChangeFreq: "weekly"},
}

var pageByPath = func() map[string]Page {
	m := map[string]Page{}
	for _, p := range pages {
		m[p.Path] = p
	}
	return m
}()

const appEntryURL = "https://highpoints.work/next/login"

func appEntryLocation(r *http.Request) string {
	if r.URL.RawQuery == "" {
		return appEntryURL
	}
	return appEntryURL + "?" + r.URL.RawQuery
}

var layout = template.Must(template.New("layout").Parse(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{{.Page.Title}}</title>
  <meta name="description" content="{{.Page.Description}}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <meta name="theme-color" content="#c9a240">
  <meta property="og:title" content="{{.Page.Title}}">
  <meta property="og:description" content="{{.Page.Description}}">
  <meta property="og:url" content="https://highpoints.work{{if ne .Page.Path "/"}}{{.Page.Path}}{{end}}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="HighPoints">
  <link rel="canonical" href="https://highpoints.work{{if ne .Page.Path "/"}}{{.Page.Path}}{{end}}">
  <link rel="manifest" href="/manifest.json">
  <script type="application/ld+json">{{.Schema}}</script>
  <style>:root{--gold:#c9a240;--dark:#151625;--ink:#1e293b;--muted:#64748b;--soft:#f7f4ea;--line:#e2e8f0}*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;color:var(--ink);line-height:1.6;background:#fff}.container{max-width:1140px;margin:0 auto;padding:0 1.5rem}nav{background:rgba(21,22,37,.96);position:sticky;top:0;z-index:10}nav .container{display:flex;justify-content:space-between;align-items:center;padding-top:.9rem;padding-bottom:.9rem}.logo{font-weight:900;color:var(--gold);text-decoration:none;font-size:1.2rem}.nav a{color:rgba(255,255,255,.78);text-decoration:none;margin-left:1.2rem;font-weight:650}.hero{background:linear-gradient(145deg,#151625,#24304a);color:#fff;text-align:center;padding:5rem 0}.badge{display:inline-block;border:1px solid rgba(201,162,64,.35);background:rgba(201,162,64,.13);color:#efd47d;border-radius:999px;padding:.35rem .9rem;font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em}h1{font-size:clamp(2.2rem,5vw,4.5rem);line-height:1.05;margin:1rem auto;max-width:860px}h2{font-size:2rem;line-height:1.15}.hero p{max-width:680px;margin:0 auto 2rem;color:rgba(255,255,255,.74);font-size:1.12rem}.btn{display:inline-flex;align-items:center;justify-content:center;padding:.8rem 1.35rem;border-radius:8px;font-weight:850;text-decoration:none}.btn.gold{background:var(--gold);color:#111}.btn.ghost{border:1px solid rgba(201,162,64,.55);color:#f4d77a}.section{padding:4.5rem 0}.alt{background:var(--soft)}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin-bottom:2.5rem}.stat,.card{border:1px solid var(--line);border-radius:10px;background:#fff;padding:1.4rem}.stat strong{display:block;font-size:2rem;color:var(--gold)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.4rem}.card h3{margin-top:0}.card p{color:var(--muted)}.assess{background:var(--dark);color:#fff;border-radius:14px;padding:2rem;margin-bottom:2.5rem}.assess-grid{display:grid;grid-template-columns:1.4fr .8fr;gap:2rem}.control{margin:1rem 0}.control label{display:flex;justify-content:space-between;font-weight:800}.control input{width:100%}.score{font-size:4rem;font-weight:950;color:var(--gold)}.search-box{border:1px solid var(--line);border-radius:10px;background:#fff;padding:1.4rem;margin-bottom:2rem}.search-box input{width:100%;border:1px solid var(--line);border-radius:8px;padding:.9rem 1rem;font:inherit}.results{display:grid;gap:1rem;margin-top:1rem}.result{border:1px solid var(--line);border-radius:10px;padding:1rem;background:#fff}.result a{font-weight:850;color:var(--ink);text-decoration:none}.result p{margin:.35rem 0 0;color:var(--muted)}.panel{border:1px solid var(--line);border-radius:10px;background:#fff;padding:1.4rem;margin-bottom:2rem}.panel h2{margin-top:0}.tool-row{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1rem}.chip{appearance:none;border:0;border-radius:999px;background:linear-gradient(135deg,#e0c464,#c9a240);color:#111;cursor:pointer;font:inherit;font-weight:850;padding:.8rem 1rem}.chip.secondary{background:linear-gradient(145deg,#fff,#f7f4ea);color:var(--ink)}textarea{width:100%;min-height:12rem;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink);font:inherit;margin-top:1rem;padding:1rem;resize:vertical}.status-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem}.status-card strong{display:block;font-size:1.2rem;color:var(--gold)}footer{padding:2rem 0;border-top:1px solid var(--line)}@media(max-width:720px){.nav a{display:none}.assess-grid{grid-template-columns:1fr}}</style>
</head>
<body>
<nav><div class="container"><a class="logo" href="/">HighPoints</a><div class="nav"><a href="/executive-command-center">Command Center</a><a href="/ai-operations">AI Ops</a><a href="/azure-services">Azure</a><a href="/features">Features</a><a href="/operations-status">Status</a><a href="/support">Support</a><a href="/search">Search</a><a href="/pricing">Pricing</a><a href="/app">App</a></div></div></nav>
<section class="hero"><div class="container"><span class="badge">{{.Page.Badge}}</span><h1>{{.Page.Heading}}</h1><p>{{.Page.Intro}}</p><a class="btn gold" href="/signup">Start Free</a> <a class="btn ghost" href="/readiness-assessment">Assess Readiness</a></div></section>
<main><section class="section"><div class="container">
{{if .Page.Search}}<div class="search-box" data-search><input type="search" name="q" value="" placeholder="Search maintenance, survey readiness, housekeeping, AI operations..." aria-label="Search HighPoints pages"><div class="results" data-results></div></div>{{end}}
{{if .Page.Interactive}}<div class="assess" data-assess><div class="assess-grid"><div><h2>Readiness model</h2><p>Adjust each area to estimate operational readiness and prioritize workflow cleanup.</p><div class="control"><label>Maintenance <b data-maintenance>72</b></label><input name="maintenance" type="range" min="20" max="100" value="72"></div><div class="control"><label>Housekeeping <b data-housekeeping>78</b></label><input name="housekeeping" type="range" min="20" max="100" value="78"></div><div class="control"><label>Compliance <b data-compliance>68</b></label><input name="compliance" type="range" min="20" max="100" value="68"></div><div class="control"><label>Staff Handoff <b data-staffing>74</b></label><input name="staffing" type="range" min="20" max="100" value="74"></div></div><div><div class="score" data-score>73%</div><p data-verdict>Needs focused cleanup</p></div></div></div>{{end}}{{if .Page.Diagnostics}}<div class="panel" data-status><h2>Live status snapshot</h2><div class="grid"><article class="card status-card"><h3>Backend</h3><p><strong data-backend-state>Loading…</strong><br><span data-backend-meta>Checking Cloudflare Worker health.</span></p></article><article class="card status-card"><h3>Azure</h3><p><strong data-azure-state>Loading…</strong><br><span data-azure-meta>Checking the Azure service catalog.</span></p></article><article class="card status-card"><h3>Graph</h3><p><strong data-graph-state>Loading…</strong><br><span data-graph-meta>Checking the protected graph surface.</span></p></article><article class="card status-card"><h3>App boundary</h3><p><strong data-app-state>Loading…</strong><br><span data-app-meta>Checking /app redirect behavior.</span></p></article><article class="card status-card"><h3>Public site</h3><p><strong data-site-state>Loading…</strong><br><span data-site-meta>Checking the Go site health endpoint.</span></p></article></div><div class="tool-row"><button class="chip" type="button" data-status-refresh>Refresh status</button><button class="chip secondary" type="button" data-status-copy>Copy support bundle</button></div><textarea readonly data-status-output rows="12">Loading live operational status...</textarea></div>{{end}}
{{if .Page.Support}}<div class="panel" data-support><h2>Contact and escalation</h2><p>Use the app for authenticated support, check live status if the issue looks systemic, and copy a bundle that gives support the facts they need.</p><div class="grid"><article class="card status-card"><h3>App support</h3><p><strong>Zendesk-backed</strong><br><span>Open the app entry and continue through the existing support flow after login.</span></p></article><article class="card status-card"><h3>Live status</h3><p><strong>Operations</strong><br><span>Verify backend, Azure, graph, and app redirect behavior before filing a ticket.</span></p></article><article class="card status-card"><h3>Support bundle</h3><p><strong>Copy-ready</strong><br><span>Capture the issue, device, browser, and repro steps in one place.</span></p></article></div><div class="tool-row"><a class="chip" href="/app">Open app support</a><a class="chip secondary" href="/operations-status">Check live status</a><button class="chip secondary" type="button" data-support-copy>Copy support bundle</button></div><textarea readonly data-support-output rows="12">HighPoints support bundle&#10;- page:&#10;- account:&#10;- device:&#10;- browser/app:&#10;- issue:&#10;- steps to reproduce:&#10;- timestamp:&#10;- screenshots:</textarea></div>{{end}}
<div class="stats">{{range .Page.Metrics}}<div class="stat"><strong>{{.Value}}</strong><span>{{.Label}}</span></div>{{end}}</div><div class="grid">{{range .Page.Cards}}<article class="card"><h3>{{.Title}}</h3><p>{{.Body}}</p></article>{{end}}</div></div></section><section class="section alt"><div class="container"><h2>Built for modern facility operations</h2><div class="grid"><article class="card"><h3>Fast signal</h3><p>Leadership sees the work that needs attention without digging through paper, texts, and separate spreadsheets.</p></article><article class="card"><h3>Clear routing</h3><p>Tasks move through department ownership, priority, evidence, and follow-up instead of loose reminders.</p></article><article class="card"><h3>Protected operations</h3><p>The public site can be served from Go while protected app and API workflows remain behind secure routes.</p></article></div></div></section></main>
<footer><div class="container">&copy; {{.Year}} HighPoints · <a href="/sitemap.xml">Sitemap</a> · <a href="/privacy">Privacy</a></div></footer><script>(function(){var statusPanel=document.querySelector('[data-status]');if(statusPanel){var refreshButton=statusPanel.querySelector('[data-status-refresh]');var copyButton=statusPanel.querySelector('[data-status-copy]');var output=statusPanel.querySelector('[data-status-output]');var backendState=statusPanel.querySelector('[data-backend-state]');var backendMeta=statusPanel.querySelector('[data-backend-meta]');var azureState=statusPanel.querySelector('[data-azure-state]');var azureMeta=statusPanel.querySelector('[data-azure-meta]');var graphState=statusPanel.querySelector('[data-graph-state]');var graphMeta=statusPanel.querySelector('[data-graph-meta]');var appState=statusPanel.querySelector('[data-app-state]');var appMeta=statusPanel.querySelector('[data-app-meta]');var siteState=statusPanel.querySelector('[data-site-state]');var siteMeta=statusPanel.querySelector('[data-site-meta]');var latestBundle=null;function setNode(node,value){if(node)node.textContent=value}function safeText(value,fallback){var text=String(value||'').trim();return text||fallback}function renderBundle(bundle){latestBundle=bundle;output.value=JSON.stringify(bundle,null,2)}async function loadStatus(){setNode(backendState,'Loading…');setNode(backendMeta,'Checking Cloudflare Worker health.');setNode(azureState,'Loading…');setNode(azureMeta,'Checking the Azure service catalog.');setNode(graphState,'Loading…');setNode(graphMeta,'Checking the protected graph surface.');setNode(appState,'Loading…');setNode(appMeta,'Checking /app redirect behavior.');setNode(siteState,'Loading…');setNode(siteMeta,'Checking the Go site health endpoint.');output.value='Refreshing live operational status...';var bundle={checkedAt:new Date().toISOString()};try{var backendResponse=await fetch('/api/v2/health',{headers:{Accept:'application/json'}});var backendJson=await backendResponse.json().catch(function(){return{}});bundle.backend={ok:!!backendJson.ok,status:backendResponse.status,service:safeText(backendJson.service,'highpoints-backend-v2'),bindings:backendJson.bindings||{},azure:backendJson.azure||null,requestId:safeText(backendJson.requestId,'')};setNode(backendState,backendResponse.ok?'OK':'HTTP '+backendResponse.status);setNode(backendMeta,backendJson.bindings&&backendJson.bindings.db&&backendJson.bindings.documents?'DB + documents bindings present.':'Backend health responded.')}catch(error){bundle.backend={ok:false,error:safeText(error&&error.message,error)};setNode(backendState,'Error');setNode(backendMeta,safeText(error&&error.message,'Backend health check failed.'))}try{var azureResponse=await fetch('/api/v2/azure/services',{headers:{Accept:'application/json'}});var azureJson=await azureResponse.json().catch(function(){return{}});bundle.azure={ok:!!azureJson.ok,status:azureResponse.status,service:safeText(azureJson.service,'highpoints-azure-services'),origin:azureJson.origin||null,services:Array.isArray(azureJson.services)?azureJson.services.length:0,config:azureJson.config||{}};setNode(azureState,azureResponse.ok?(bundle.azure.services+' services'):'HTTP '+azureResponse.status);setNode(azureMeta,azureJson.origin&&azureJson.origin.ok===false?'Origin issue detected.':azureJson.origin&&azureJson.origin.redirected?'Origin reachable via redirect.':'Azure service catalog responded.')}catch(error){bundle.azure={ok:false,error:safeText(error&&error.message,error)};setNode(azureState,'Error');setNode(azureMeta,safeText(error&&error.message,'Azure services check failed.'))}try{var graphResponse=await fetch('/api/v2/graph/health',{headers:{Accept:'application/json'}});var graphText=await graphResponse.text();var graphJson={};try{graphJson=graphText?JSON.parse(graphText):{}}catch(error){}bundle.graph={status:graphResponse.status,ok:graphResponse.ok,protected:graphResponse.status===401,body:graphJson};setNode(graphState,graphResponse.status===401?'Protected':'HTTP '+graphResponse.status);setNode(graphMeta,graphResponse.status===401?'Requires staff auth.':graphResponse.ok?'Graph health responded.':'Graph health check failed.')}catch(error){bundle.graph={ok:false,error:safeText(error&&error.message,error)};setNode(graphState,'Error');setNode(graphMeta,safeText(error&&error.message,'Graph health check failed.'))}try{var appResponse=await fetch('/app',{redirect:'manual',headers:{Accept:'text/html'}});bundle.app={status:appResponse.status,location:safeText(appResponse.headers.get('location'),'')};setNode(appState,appResponse.status===307||appResponse.status===308?'Redirect':'HTTP '+appResponse.status);setNode(appMeta,appResponse.headers.get('location')?'→ '+appResponse.headers.get('location'):'App route responded.')}catch(error){bundle.app={ok:false,error:safeText(error&&error.message,error)};setNode(appState,'Error');setNode(appMeta,safeText(error&&error.message,'App boundary check failed.'))}try{var siteResponse=await fetch('/healthz',{headers:{Accept:'text/plain'}});var siteText=await siteResponse.text();bundle.site={status:siteResponse.status,ok:siteResponse.ok,body:siteText.slice(0,120)};setNode(siteState,siteResponse.ok?'OK':'HTTP '+siteResponse.status);setNode(siteMeta,siteResponse.ok?'Site health responded.':'Site health check failed.')}catch(error){bundle.site={ok:false,error:safeText(error&&error.message,error)};setNode(siteState,'Error');setNode(siteMeta,safeText(error&&error.message,'Site health check failed.'))}renderBundle(bundle)}async function copyStatusBundle(){if(!latestBundle){await loadStatus()}var text=JSON.stringify(latestBundle,null,2);try{await navigator.clipboard.writeText(text);output.value='Support bundle copied to clipboard.'}catch(error){output.value=text}}if(refreshButton)refreshButton.addEventListener('click',loadStatus);if(copyButton)copyButton.addEventListener('click',copyStatusBundle);loadStatus()}var supportPanel=document.querySelector('[data-support]');if(supportPanel){var supportCopyButton=supportPanel.querySelector('[data-support-copy]');var supportOutput=supportPanel.querySelector('[data-support-output]');var supportBundle='HighPoints support bundle\n- page:\n- account:\n- device:\n- browser/app:\n- issue:\n- steps to reproduce:\n- timestamp:\n- screenshots:';if(supportOutput)supportOutput.value=supportBundle;async function copySupportBundle(){if(supportOutput)supportOutput.value=supportBundle;try{await navigator.clipboard.writeText(supportBundle);if(supportOutput)supportOutput.value='Support bundle copied to clipboard.'}catch(error){if(supportOutput)supportOutput.value=supportBundle}}if(supportCopyButton)supportCopyButton.addEventListener('click',copySupportBundle)}})();(function(){var w=document.querySelector('[data-assess]');if(w){var inputs=[].slice.call(w.querySelectorAll('input[type=range]'));var scoreEl=w.querySelector('[data-score]');var verdictEl=w.querySelector('[data-verdict]');var requestId=0;function values(){var params=new URLSearchParams();var total=0;inputs.forEach(function(i){var value=Number(i.value);total+=value;w.querySelector('[data-'+i.name+']').textContent=value;params.set(i.name,value)});return{params:params,score:Math.round(total/inputs.length)}}function apply(score,verdict){scoreEl.textContent=score+'%';verdictEl.textContent=verdict}function localVerdict(score){return score>82?'Ready to scale':score>64?'Needs focused cleanup':'High leverage opportunity'}function calc(){var state=values();var fallback=localVerdict(state.score);apply(state.score,fallback);if(!window.fetch)return;var id=++requestId;fetch('/api/readiness-score?'+state.params.toString(),{headers:{Accept:'application/json'}}).then(function(r){return r.ok?r.json():Promise.reject(new Error('bad status'))}).then(function(data){if(id!==requestId)return;apply(data.score,data.verdict)}).catch(function(){if(id===requestId)apply(state.score,fallback)})}inputs.forEach(function(i){i.addEventListener('input',calc)});calc()}var s=document.querySelector('[data-search]');if(s){var input=s.querySelector('input[name=q]');var results=s.querySelector('[data-results]');var sid=0;function render(items){if(!items.length){results.innerHTML='<div class="result"><p>No matching pages yet.</p></div>';return}results.innerHTML=items.map(function(item){return '<article class="result"><a href="'+item.path+'">'+item.title+'</a><p>'+item.description+'</p></article>'}).join('')}function search(){var q=input.value.trim();if(!q){render([]);return}var id=++sid;fetch('/api/search?q='+encodeURIComponent(q),{headers:{Accept:'application/json'}}).then(function(r){return r.ok?r.json():Promise.reject(new Error('bad status'))}).then(function(data){if(id===sid)render(data.results||[])}).catch(function(){if(id===sid)results.innerHTML='<div class="result"><p>Search is temporarily unavailable.</p></div>'})}input.addEventListener('input',search);var initial=new URLSearchParams(location.search).get('q')||'';if(initial){input.value=initial;search()}}})();</script></body></html>`))

func canonicalURL(path string) string {
	if path == "/" {
		return "https://highpoints.work"
	}
	return "https://highpoints.work" + path
}

func schemaJSON(p Page) template.JS {
	payload := map[string]any{
		"@context":            "https://schema.org",
		"@type":               "SoftwareApplication",
		"name":                "HighPoints",
		"applicationCategory": "BusinessApplication",
		"operatingSystem":     "Web, iOS, Android",
		"url":                 canonicalURL(p.Path),
		"description":         p.Description,
		"offers": map[string]string{
			"@type":         "Offer",
			"price":         "0",
			"priceCurrency": "USD",
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "{}"
	}
	return template.JS(body)
}

func renderPage(p Page) ([]byte, error) {
	var buf bytes.Buffer
	err := layout.Execute(&buf, View{Page: p, Year: time.Now().Year(), Schema: schemaJSON(p)})
	return buf.Bytes(), err
}

func sitemap() string {
	var b strings.Builder
	b.WriteString("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n")
	for _, p := range pages {
		loc := "https://highpoints.work"
		if p.Path != "/" {
			loc += p.Path
		}
		freq, priority := p.ChangeFreq, p.Priority
		if freq == "" {
			freq = "weekly"
		}
		if priority == "" {
			priority = "0.8"
		}
		b.WriteString(fmt.Sprintf("  <url><loc>%s</loc><changefreq>%s</changefreq><priority>%s</priority></url>\n", loc, freq, priority))
	}
	b.WriteString("</urlset>\n")
	return b.String()
}
func robots() string {
	return "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /app/\n\nSitemap: https://highpoints.work/sitemap.xml\n"
}

func manifest() string {
	return `{
  "name": "High Point Ops",
  "short_name": "HighPoints",
  "description": "Facility operations and compliance workspace for senior living maintenance, housekeeping, scheduling, inspections, and reporting.",
  "id": "/app",
  "start_url": "/app",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#c9a240",
  "background_color": "#0b0a12",
  "categories": ["business", "productivity", "medical"],
  "icons": [
    {"src":"/icons/icon-192.webp","type":"image/webp","sizes":"192x192","purpose":"any maskable"},
    {"src":"/icons/icon-512.webp","type":"image/webp","sizes":"512x512","purpose":"any maskable"}
  ]
}
`
}

func setCommonHeaders(w http.ResponseWriter, contentType, cacheControl string) {
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", cacheControl)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
	w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
	w.Header().Set("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://highpoints.work; base-uri 'self'; frame-ancestors 'none'")
}

type SearchResult struct {
	Path        string `json:"path"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Score       int    `json:"score"`
}

func searchableText(p Page) string {
	parts := []string{p.Title, p.Description, p.Badge, p.Heading, p.Intro}
	for _, card := range p.Cards {
		parts = append(parts, card.Title, card.Body)
	}
	for _, metric := range p.Metrics {
		parts = append(parts, metric.Value, metric.Label)
	}
	return strings.ToLower(strings.Join(parts, " "))
}

func searchPages(query string, limit int) []SearchResult {
	terms := strings.Fields(strings.ToLower(query))
	if len(terms) == 0 || limit <= 0 {
		return nil
	}
	results := make([]SearchResult, 0, len(pages))
	for _, p := range pages {
		text := searchableText(p)
		score := 0
		for _, term := range terms {
			if strings.Contains(strings.ToLower(p.Title), term) {
				score += 4
			}
			if strings.Contains(strings.ToLower(p.Heading), term) {
				score += 3
			}
			if strings.Contains(text, term) {
				score++
			}
		}
		if score > 0 {
			results = append(results, SearchResult{Path: p.Path, Title: p.Title, Description: p.Description, Score: score})
		}
	}
	for i := 0; i < len(results); i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].Score > results[i].Score || results[j].Score == results[i].Score && results[j].Path < results[i].Path {
				results[i], results[j] = results[j], results[i]
			}
		}
	}
	if len(results) > limit {
		results = results[:limit]
	}
	return results
}

func searchAPIHandler(w http.ResponseWriter, r *http.Request) {
	results := searchPages(r.URL.Query().Get("q"), 8)
	writeJSON(w, http.StatusOK, map[string]any{"results": results})
}

func readinessScore(values map[string]int) (int, string) {
	areas := []string{"maintenance", "housekeeping", "compliance", "staffing"}
	total := 0
	for _, area := range areas {
		v := values[area]
		if v < 20 {
			v = 20
		}
		if v > 100 {
			v = 100
		}
		total += v
	}
	score := total / len(areas)
	verdict := "High leverage opportunity"
	if score > 82 {
		verdict = "Ready to scale"
	} else if score > 64 {
		verdict = "Needs focused cleanup"
	}
	return score, verdict
}

func parseReadinessRequest(r *http.Request) map[string]int {
	defaults := map[string]int{"maintenance": 72, "housekeeping": 78, "compliance": 68, "staffing": 74}
	for key := range defaults {
		if raw := r.URL.Query().Get(key); raw != "" {
			if parsed, err := strconv.Atoi(raw); err == nil {
				defaults[key] = parsed
			}
		}
	}
	return defaults
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	setCommonHeaders(w, "application/json; charset=utf-8", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func azureServices() []AzureService {
	return []AzureService{
		{Name: "Azure VM origin", Type: "Microsoft.Compute/virtualMachines", ResourceGroup: "Highpoint", Role: "Direct website origin and Nginx front door"},
		{Name: "Application Gateway", Type: "Microsoft.Network/applicationGateways", ResourceGroup: "Highpoint", Role: "Regional ingress and future failover routing"},
		{Name: "Cognitive Services", Type: "Microsoft.CognitiveServices/accounts", ResourceGroup: "Highpoint", Role: "Document intelligence and AI-assisted intake"},
		{Name: "Application Insights", Type: "Microsoft.Insights/components", ResourceGroup: "Highpoint", Role: "Application telemetry and diagnostics"},
		{Name: "Log Analytics", Type: "Microsoft.OperationalInsights/workspaces", ResourceGroup: "Highpoint", Role: "Central Azure infrastructure logs"},
		{Name: "Linux VM scale set", Type: "Microsoft.Compute/virtualMachineScaleSets", ResourceGroup: "vmss-rg", Role: "Elastic Linux worker and desktop capacity"},
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":       "ok",
		"service":      "highpoints-go-site",
		"pages":        len(pages),
		"generated_at": time.Now().UTC().Format(time.RFC3339),
		"origin": map[string]string{
			"server": "https://server.highpoints.work",
			"origin": "https://origin.highpoints.work",
			"azure":  "https://azure.highpoints.work",
		},
		"azure_services": azureServices(),
	})
}

func readinessAPIHandler(w http.ResponseWriter, r *http.Request) {
	values := parseReadinessRequest(r)
	score, verdict := readinessScore(values)
	writeJSON(w, http.StatusOK, map[string]any{
		"score":   score,
		"verdict": verdict,
		"inputs":  values,
	})
}

func iconHandler(root string) http.HandlerFunc {
	iconDir := filepath.Join(root, "www", "icons")
	return func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(r.URL.Path, "/icons/")
		if name == "" || strings.Contains(name, "/") || strings.Contains(name, "\\") || !strings.HasSuffix(name, ".webp") {
			http.NotFound(w, r)
			return
		}
		setCommonHeaders(w, "image/webp", "public, max-age=31536000, immutable")
		http.ServeFile(w, r, filepath.Join(iconDir, name))
	}
}

func appHandler(root string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/app/" {
			location := "/app"
			if r.URL.RawQuery != "" {
				location += "?" + r.URL.RawQuery
			}
			http.Redirect(w, r, location, http.StatusPermanentRedirect)
			return
		}
		w.Header().Set("Cache-Control", "no-store, max-age=0")
		http.Redirect(w, r, appEntryLocation(r), http.StatusTemporaryRedirect)
	}
}

func exportSite(dir string) error {
	for _, p := range pages {
		out := filepath.Join(dir, strings.TrimPrefix(p.Path, "/"), "index.html")
		if p.Path == "/" {
			out = filepath.Join(dir, "index.html")
		}
		if err := os.MkdirAll(filepath.Dir(out), 0o755); err != nil {
			return err
		}
		body, err := renderPage(p)
		if err != nil {
			return err
		}
		if err := os.WriteFile(out, body, 0o644); err != nil {
			return err
		}
	}
	if err := os.WriteFile(filepath.Join(dir, "sitemap.xml"), []byte(sitemap()), 0o644); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(dir, "robots.txt"), []byte(robots()), 0o644); err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, "manifest.json"), []byte(manifest()), 0o644)
}

type statusRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func (r *statusRecorder) Write(body []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	n, err := r.ResponseWriter.Write(body)
	r.bytes += n
	return n, err
}

type gzipResponseWriter struct {
	http.ResponseWriter
	writer *gzip.Writer
}

func (w gzipResponseWriter) Write(body []byte) (int, error) {
	return w.writer.Write(body)
}

func methodGuard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			setCommonHeaders(w, "text/plain; charset=utf-8", "no-store")
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func gzipMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") || strings.HasPrefix(r.URL.Path, "/icons/") {
			next.ServeHTTP(w, r)
			return
		}
		w.Header().Add("Vary", "Accept-Encoding")
		w.Header().Set("Content-Encoding", "gzip")
		gz := gzip.NewWriter(w)
		defer gz.Close()
		next.ServeHTTP(gzipResponseWriter{ResponseWriter: w, writer: gz}, r)
	})
}

func accessLogMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		rec := &statusRecorder{ResponseWriter: w}
		next.ServeHTTP(rec, r)
		status := rec.status
		if status == 0 {
			status = http.StatusOK
		}
		log.Printf("request method=%s path=%s status=%d bytes=%d duration=%s", r.Method, r.URL.Path, status, rec.bytes, time.Since(started).Round(time.Millisecond))
	})
}

func mainHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/signup" {
		setCommonHeaders(w, "text/html; charset=utf-8", "no-store, max-age=0")
		http.Redirect(w, r, appEntryLocation(r), http.StatusTemporaryRedirect)
		return
	}
	setCommonHeaders(w, "text/html; charset=utf-8", "public, max-age=300")
	if r.URL.Path != "/" && strings.HasSuffix(r.URL.Path, "/") {
		http.Redirect(w, r, strings.TrimRight(r.URL.Path, "/"), http.StatusPermanentRedirect)
		return
	}
	p, ok := pageByPath[r.URL.Path]
	if !ok {
		http.NotFound(w, r)
		return
	}
	body, err := renderPage(p)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_, _ = w.Write(body)
}

func newMux() http.Handler {
	root, err := os.Getwd()
	if err != nil {
		root = "."
	}
	return newMuxWithRoot(root)
}

func routes(root string) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/app", appHandler(root))
	mux.HandleFunc("/app/", appHandler(root))
	mux.HandleFunc("/healthz", healthHandler)
	mux.HandleFunc("/api/readiness-score", readinessAPIHandler)
	mux.HandleFunc("/api/search", searchAPIHandler)
	mux.HandleFunc("/icons/", iconHandler(root))
	mux.HandleFunc("/sitemap.xml", func(w http.ResponseWriter, r *http.Request) {
		setCommonHeaders(w, "application/xml; charset=utf-8", "public, max-age=3600")
		_, _ = w.Write([]byte(sitemap()))
	})
	mux.HandleFunc("/robots.txt", func(w http.ResponseWriter, r *http.Request) {
		setCommonHeaders(w, "text/plain; charset=utf-8", "public, max-age=3600")
		_, _ = w.Write([]byte(robots()))
	})
	mux.HandleFunc("/manifest.json", func(w http.ResponseWriter, r *http.Request) {
		setCommonHeaders(w, "application/manifest+json; charset=utf-8", "public, max-age=3600")
		_, _ = w.Write([]byte(manifest()))
	})
	mux.HandleFunc("/", mainHandler)
	return mux
}

func newMuxWithRoot(root string) http.Handler {
	return accessLogMiddleware(gzipMiddleware(methodGuard(routes(root))))
}

func main() {
	addr := flag.String("addr", ":8080", "HTTP listen address")
	exportDir := flag.String("export", "", "export static site to directory and exit")
	flag.Parse()
	if *exportDir != "" {
		if err := exportSite(*exportDir); err != nil {
			log.Fatal(err)
		}
		log.Printf("exported Go site to %s", *exportDir)
		return
	}

	server := &http.Server{
		Addr:              *addr,
		Handler:           newMux(),
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Printf("HighPoints Go site serving on http://localhost%s", *addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatal(err)
	}
	log.Print("HighPoints Go site stopped")
}
