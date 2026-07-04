-- Highpoints role-based departments and AI document extraction schema.
-- Intended for Cloudflare D1 / SQLite.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_profiles (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin','Executive','Director','Supervisor','Staff')),
  department_id TEXT NOT NULL REFERENCES departments(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  department_id TEXT NOT NULL REFERENCES departments(id),
  resource TEXT NOT NULL,
  can_read INTEGER NOT NULL DEFAULT 0,
  can_create INTEGER NOT NULL DEFAULT 0,
  can_update INTEGER NOT NULL DEFAULT 0,
  can_approve INTEGER NOT NULL DEFAULT 0,
  can_export INTEGER NOT NULL DEFAULT 0,
  UNIQUE(role, department_id, resource)
);

CREATE TABLE IF NOT EXISTS document_uploads (
  id TEXT PRIMARY KEY,
  uploaded_by TEXT NOT NULL REFERENCES staff_profiles(id),
  source_department_id TEXT NOT NULL REFERENCES departments(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('uploaded','extracting','needs_review','approved','rejected','failed')),
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_extractions (
  id TEXT PRIMARY KEY,
  upload_id TEXT NOT NULL REFERENCES document_uploads(id) ON DELETE CASCADE,
  classified_department_id TEXT REFERENCES departments(id),
  destination_resource TEXT,
  confidence REAL NOT NULL DEFAULT 0,
  extracted_json TEXT NOT NULL,
  warnings_json TEXT NOT NULL DEFAULT '[]',
  ai_provider TEXT,
  ai_model TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_review_queue (
  id TEXT PRIMARY KEY,
  upload_id TEXT NOT NULL REFERENCES document_uploads(id) ON DELETE CASCADE,
  extraction_id TEXT NOT NULL REFERENCES document_extractions(id) ON DELETE CASCADE,
  assigned_department_id TEXT NOT NULL REFERENCES departments(id),
  assigned_to TEXT REFERENCES staff_profiles(id),
  destination_resource TEXT NOT NULL,
  destination_record_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','needs_correction')),
  reviewer_notes TEXT,
  reviewed_by TEXT REFERENCES staff_profiles(id),
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL DEFAULT 'maintenance' REFERENCES departments(id),
  source_upload_id TEXT REFERENCES document_uploads(id),
  title TEXT NOT NULL,
  location TEXT,
  priority TEXT CHECK (priority IN ('Critical','High','Medium','Low')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  assigned_to TEXT REFERENCES staff_profiles(id),
  created_by TEXT REFERENCES staff_profiles(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL DEFAULT 'nursing' REFERENCES departments(id),
  source_upload_id TEXT REFERENCES document_uploads(id),
  incident_type TEXT,
  resident_name TEXT,
  location TEXT,
  occurred_at TEXT,
  description TEXT,
  action_taken TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_by TEXT REFERENCES staff_profiles(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL REFERENCES departments(id),
  source_upload_id TEXT REFERENCES document_uploads(id),
  item_name TEXT NOT NULL,
  sku TEXT,
  quantity REAL,
  unit TEXT,
  vendor TEXT,
  reorder_level REAL,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_by TEXT REFERENCES staff_profiles(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_credentials (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL REFERENCES departments(id),
  source_upload_id TEXT REFERENCES document_uploads(id),
  staff_name TEXT NOT NULL,
  credential_type TEXT,
  license_number TEXT,
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_by TEXT REFERENCES staff_profiles(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_checks (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL DEFAULT 'maintenance' REFERENCES departments(id),
  source_upload_id TEXT REFERENCES document_uploads(id),
  asset_name TEXT NOT NULL,
  check_type TEXT,
  completed_at TEXT,
  next_due_at TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_by TEXT REFERENCES staff_profiles(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meal_notes (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL DEFAULT 'culinary' REFERENCES departments(id),
  source_upload_id TEXT REFERENCES document_uploads(id),
  meal_date TEXT,
  meal_type TEXT,
  resident_name TEXT,
  diet_type TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_by TEXT REFERENCES staff_profiles(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL DEFAULT 'activities' REFERENCES departments(id),
  source_upload_id TEXT REFERENCES document_uploads(id),
  title TEXT NOT NULL,
  event_date TEXT,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_by TEXT REFERENCES staff_profiles(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_department ON staff_profiles(department_id, role, active);
CREATE INDEX IF NOT EXISTS idx_doc_upload_department ON document_uploads(source_department_id, status);
CREATE INDEX IF NOT EXISTS idx_doc_review_department ON document_review_queue(assigned_department_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_department ON work_orders(department_id, status);
CREATE INDEX IF NOT EXISTS idx_incidents_department ON incidents(department_id, status);

INSERT OR IGNORE INTO departments (id, name, description) VALUES
  ('maintenance', 'Maintenance', 'Work orders, PM checks, assets, life safety, vendors'),
  ('nursing', 'Nursing', 'Incidents, resident care notes, CNA logs, med pass follow-up'),
  ('housekeeping', 'Housekeeping', 'Cleaning assignments, room turns, inspection notes'),
  ('culinary', 'Culinary', 'Menus, diet notes, meal service, kitchen inventory'),
  ('activities', 'Activities', 'Events, attendance, programming notes'),
  ('compliance', 'Compliance', 'Inspections, deficiencies, deadlines, policy documentation'),
  ('admin', 'Admin', 'Users, settings, facility configuration'),
  ('executive', 'Executive', 'Portfolio reporting and organization-wide dashboards'),
  ('inventory', 'Inventory', 'Supply counts, vendor invoices, reorder workflows'),
  ('scheduling', 'Scheduling', 'Schedules, attendance, shift coverage'),
  ('reports', 'Reports', 'Operational and compliance exports'),
  ('training', 'Training', 'Staff training and onboarding'),
  ('messages', 'Messages', 'Staff communication');
