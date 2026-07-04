# Highpoints Department Access + AI Document Intake

This package is the server/client feature work needed for High Point Ops to show each staff member only the information that belongs to their job and to ingest photographed documents into the correct database tables.

The live app is currently served from Cloudflare Workers as an inline React app at `https://highpoints.work/app`. This local mobile repo only wraps that website, so these files are written as drop-in Worker/app additions for the `highpoint-ops` and/or `highpoint-compliance-api` Workers.

## What This Adds

- Department-scoped access policy for Maintenance, Nursing, Housekeeping, Culinary, Activities, Compliance, Admin, Executive, Inventory, Scheduling, Reports, Training, and Messages.
- Database tables for departments, role permissions, staff assignments, document uploads, extraction audit trails, and review queues.
- AI document intake endpoint that accepts an image/PDF upload, extracts structured fields, classifies the department and destination table, stores an auditable record, and returns extracted values for staff review.
- Client-side integration helpers for department navigation and a document intake panel.

## Deployment Order

1. Apply `schema.sql` to the Cloudflare D1 database used by the Highpoints Workers.
2. Merge `worker-routes.js` into the API Worker that owns `/api/*`.
3. Merge `app-integration.js` into the React app shell served by `highpoint-ops`.
4. Configure a document AI provider with these Worker env vars:
   - `DOCUMENT_AI_ENDPOINT`
   - `DOCUMENT_AI_API_KEY`
   - `DOCUMENT_AI_MODEL`
5. Protect all data APIs with `requireAuth()` and `assertDepartmentAccess()` from `worker-routes.js`.

## Staff Visibility Rules

Admin and Executive users can see all departments. Directors and Supervisors can see their own department plus shared operational dashboards and reports. Staff users see only:

- Dashboard
- Their assigned department queue
- Documents they uploaded or documents assigned to their department
- Training
- Messages

Records are filtered on the server by department, assigned user, and role. Client-side filtering improves the UI, but the Worker policy is the source of truth.

## Document Flow

1. Staff opens `AI Document Intake`.
2. Staff takes a picture or uploads a file.
3. Worker stores upload metadata in `document_uploads`.
4. Worker sends the file to the configured AI extraction provider with the schema prompt.
5. Worker stores normalized fields in `document_extractions`.
6. Worker inserts a draft row into the classified destination table, such as `work_orders`, `incidents`, `inventory_items`, `staff_credentials`, `pm_checks`, `meal_notes`, or `activity_events`.
7. Supervisor/Admin reviews and approves the draft from `document_review_queue`.

Nothing should be auto-finalized without review for clinical, compliance, payroll, or resident-sensitive records.
