// Client-side helpers for the Highpoints inline React app.
// The Worker-side policy in worker-routes.js remains the security boundary.

export const HIGHPOINTS_DEPARTMENTS = {
  maintenance: {
    label: "Maintenance",
    nav: ["dashboard", "maintenance", "inventory", "training", "messages"],
    documentTypes: ["Work Order", "PM Check", "Inspection Report", "Vendor Invoice", "Asset Photo"],
  },
  nursing: {
    label: "Nursing",
    nav: ["dashboard", "nursing", "training", "messages"],
    documentTypes: ["Incident Report", "Care Note", "CNA Log", "Medication Follow-up"],
  },
  housekeeping: {
    label: "Housekeeping",
    nav: ["dashboard", "housekeeping", "training", "messages"],
    documentTypes: ["Cleaning Checklist", "Room Turn", "Inspection Photo", "Supply Request"],
  },
  culinary: {
    label: "Culinary",
    nav: ["dashboard", "culinary", "inventory", "training", "messages"],
    documentTypes: ["Diet Order", "Menu", "Kitchen Invoice", "Meal Service Note"],
  },
  activities: {
    label: "Activities",
    nav: ["dashboard", "activities", "training", "messages"],
    documentTypes: ["Activity Calendar", "Attendance Sheet", "Resident Program Note"],
  },
  compliance: {
    label: "Compliance",
    nav: ["dashboard", "reports", "maintenance", "nursing", "training", "messages"],
    documentTypes: ["Inspection", "Deficiency", "Policy", "Fire Drill", "SLP Record"],
  },
  admin: {
    label: "Admin",
    nav: ["*"],
    documentTypes: ["Staff Credential", "Policy", "Invoice", "Facility Record"],
  },
  executive: {
    label: "Executive",
    nav: ["*"],
    documentTypes: ["Portfolio Report", "Budget", "Compliance Summary"],
  },
};

export function visibleNavForStaff(user, navItems) {
  if (!user) return [];
  const role = user.role || "Staff";
  const dept = normalizeDepartment(user.dept || user.department || "admin");
  if (role === "Admin" || role === "Executive" || dept === "admin" || dept === "executive") return navItems;
  const allowed = new Set(HIGHPOINTS_DEPARTMENTS[dept]?.nav || ["dashboard", dept, "training", "messages"]);
  if (role === "Director" || role === "Supervisor") {
    allowed.add("reports");
    allowed.add("scheduling");
    allowed.add("attendance");
    allowed.add("ai");
  }
  return navItems.filter((item) => allowed.has("*") || allowed.has(item.id));
}

export function canSeeRecord(user, record) {
  if (!user || !record) return false;
  const role = user.role || "Staff";
  const userDept = normalizeDepartment(user.dept || user.department || "admin");
  const recordDept = normalizeDepartment(record.department_id || record.department || record.dept || userDept);
  if (role === "Admin" || role === "Executive" || userDept === "admin" || userDept === "executive") return true;
  if (recordDept !== userDept) return false;
  if (role === "Director" || role === "Supervisor") return true;
  return !record.assigned_to || record.assigned_to === user.id || record.created_by === user.id || record.uploaded_by === user.id;
}

export function departmentDocumentTypes(user) {
  const dept = normalizeDepartment(user?.dept || user?.department || "admin");
  return HIGHPOINTS_DEPARTMENTS[dept]?.documentTypes || HIGHPOINTS_DEPARTMENTS.admin.documentTypes;
}

export async function uploadDocumentForExtraction({ file, department, documentType, user }) {
  const form = new FormData();
  form.append("file", file);
  form.append("department", department);
  form.append("documentType", documentType || "");
  const headers = highpointsAuthHeaders(user);
  const response = await fetch("/api/documents/extract", { method: "POST", headers, body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Document extraction failed");
  return payload;
}

export function AiDocumentIntakePanel({ React, user, onExtracted }) {
  const { useState } = React;
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const department = normalizeDepartment(user?.dept || user?.department || "admin");
  const types = departmentDocumentTypes(user);

  async function submit() {
    if (!file) {
      setError("Choose a document photo or file first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const extracted = await uploadDocumentForExtraction({ file, department, documentType, user });
      setResult(extracted);
      if (onExtracted) onExtracted(extracted);
    } catch (err) {
      const draft = saveOfflineDocumentDraft({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        department,
        documentType,
        error: err.message || "Extraction failed.",
      });
      setResult({ offline: true, draft });
      setError("Upload saved on this device for retry.");
    } finally {
      setBusy(false);
    }
  }

  return React.createElement("section", { className: "hp-doc-intake" },
    React.createElement("header", null,
      React.createElement("h2", null, "AI Document Intake"),
      React.createElement("p", null, "Upload or photograph a document. Highpoints extracts the fields, classifies it, and creates a draft for supervisor review.")
    ),
    React.createElement("div", { className: "hp-doc-grid" },
      React.createElement("label", null, "Document Type",
        React.createElement("select", { value: documentType, onChange: (e) => setDocumentType(e.target.value) },
          React.createElement("option", { value: "" }, "Auto-detect"),
          types.map((type) => React.createElement("option", { key: type, value: type }, type))
        )
      ),
      React.createElement("label", null, "Photo or File",
        React.createElement("input", {
          type: "file",
          accept: "image/*,application/pdf",
          capture: "environment",
          onChange: (e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null),
        })
      )
    ),
    React.createElement("button", { type: "button", disabled: busy, onClick: submit }, busy ? "Extracting..." : "Extract and Create Draft"),
    error ? React.createElement("div", { className: "hp-doc-error" }, error) : null,
    result ? React.createElement("pre", { className: "hp-doc-result" }, JSON.stringify(result, null, 2)) : null
  );
}

export function saveOfflineDocumentDraft(payload) {
  const key = "hp2:documentDrafts";
  const current = JSON.parse(localStorage.getItem(key) || "[]");
  const draft = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: new Date().toISOString(),
    ...payload,
  };
  current.unshift(draft);
  localStorage.setItem(key, JSON.stringify(current.slice(0, 50)));
  return draft;
}

export function highpointsAuthHeaders(user) {
  if (!user?.id || !user?.pin) return {};
  return {
    "x-highpoints-user-id": user.id,
    "x-highpoints-session": btoa(user.id + ":" + user.pin),
  };
}

function normalizeDepartment(value) {
  return String(value || "admin").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
