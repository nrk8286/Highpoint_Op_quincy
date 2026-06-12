#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const LIVE_APP_URL = process.env.HIGHPOINTS_APP_URL || "https://highpoints.work/app";
const outputDir = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(process.cwd(), "synced-live-app/current");

const summary = [];

await mkdir(outputDir, { recursive: true });

const html = await fetchText(LIVE_APP_URL);
const bundlePath = matchRequired(html, /<script src="(\/app\.bundle\.js\?v=[^"]+)"><\/script>/, "app bundle path");
const bundleUrl = new URL(bundlePath, LIVE_APP_URL).toString();
const serviceWorkerUrl = new URL("/service-worker.js", LIVE_APP_URL).toString();
const manifestUrl = new URL("/manifest.json", LIVE_APP_URL).toString();

const [bundle, serviceWorker, manifest] = await Promise.all([
  fetchText(bundleUrl),
  fetchText(serviceWorkerUrl),
  fetchText(manifestUrl),
]);

let patchedBundle = bundle;
patchedBundle = replaceFunctionByAnchor(patchedBundle, "const[form,setForm]=useState(false)", outlookPanelPatch());
patchedBundle = replaceFunctionByAnchor(patchedBundle, "data.userTasks || []", userTasksPanelPatch());
patchedBundle = insertBeforeFunction(patchedBundle, "HighPointsPulsePanel", pulseMarqueePatch());
patchedBundle = insertBeforeFunction(patchedBundle, "HighPointOps", documentReviewPanelPatch());
patchedBundle = patchDashboardPulsePlacement(patchedBundle);
patchedBundle = patchOpsRenderLoop(patchedBundle);

const patchedHtml = html
  .replace(bundlePath, "./app.bundle.patched.js")
  .replace(/src="\/vendor\//g, `src="${new URL("/vendor/", LIVE_APP_URL).toString()}`)
  .replace(/href="\/apple-touch-icon\.png"/g, `href="${new URL("/apple-touch-icon.png", LIVE_APP_URL).toString()}"`)
  .replace(/href="\/icons\//g, `href="${new URL("/icons/", LIVE_APP_URL).toString()}`)
  .replace(/href="\/manifest\.json"/g, 'href="./manifest.json"')
  .replace(/serviceWorker\.register\('\/service-worker\.js'\)/g, "serviceWorker.register('./service-worker.js')");

await Promise.all([
  writeText("index.live.html", html),
  writeText("index.patched.html", patchedHtml),
  writeText("app.bundle.live.js", bundle),
  writeText("app.bundle.patched.js", patchedBundle),
  writeText("service-worker.js", serviceWorker),
  writeText("manifest.json", manifest),
  writeText("sync-metadata.json", JSON.stringify({
    syncedAt: new Date().toISOString(),
    liveAppUrl: LIVE_APP_URL,
    bundleUrl,
    hashes: {
      html: sha256(html),
      bundle: sha256(bundle),
      patchedBundle: sha256(patchedBundle),
      serviceWorker: sha256(serviceWorker),
      manifest: sha256(manifest),
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
    bundle: sha256(bundle),
    patchedBundle: sha256(patchedBundle),
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
