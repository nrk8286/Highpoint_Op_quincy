# AI Agent Team Runbook

## 1. Intake

1. Create or update a task using `task-queue.md`.
2. Assign one owner and one role.
3. Confirm scope, affected paths, acceptance criteria, and verification plan.
4. Identify required review gates from `team-spec.yaml`.
5. Move the task to `ready` only after the owner can start without guessing.

## 2. Planning

1. Read nearby docs and code before proposing implementation details.
2. List assumptions that affect data, auth, UI, deploy, or release behavior.
3. Split work if one task crosses too many ownership boundaries.
4. Ask for explicit approval before destructive operations, production changes, or secret handling.

## 3. Implementation

1. Keep edits scoped to the task.
2. Preserve unrelated local changes.
3. Update documentation or config when behavior, deployment, or release steps change.
4. Record changed paths in the task work log.
5. Prepare a role handoff when the next step belongs to another owner.

## 4. Verification

Choose checks that match the risk:

- Frontend/product: responsive layout, key workflow, error states, accessibility basics.
- Backend/data: API contract, validation, authorization, migration safety, data integrity.
- Cloudflare: preview deploy, env binding presence, smoke endpoints, post-deploy logs.
- QA/security: regression matrix, permission boundaries, sensitive data handling, abuse cases.
- Android: Capacitor sync, debug build, install/launch, login, navigation, core workflow.
- Operations: health checks, logs, alerts, error rate, incident follow-up.

Record:

- Commands or manual steps run.
- Result and timestamp.
- Evidence path or artifact.
- Known gaps or skipped checks.

## 5. Cloudflare Deploy Flow

1. Confirm deploy target: preview, staging, or production.
2. Confirm source package, branch, or changed paths.
3. Confirm required environment bindings and secret names without exposing values.
4. Run preview or dry-run when available.
5. Deploy.
6. Record deployed URL, version/source, timestamp, and operator.
7. Run smoke checks.
8. Hand off to operations monitor for post-deploy watch.

## 6. Android Release Flow

1. Confirm web app target and release version.
2. Run Capacitor sync if web assets or config changed.
3. Build debug package and smoke test on device or emulator.
4. Confirm signing readiness without exposing credentials.
5. Build release package when approved.
6. Record version code, version name, artifact path, signing status, and smoke test result.
7. Hand off to QA/security reviewer before distribution.

## 7. Incident Flow

1. Operations monitor creates or updates an urgent task.
2. Assign an incident owner.
3. Capture impact, start time, affected service, and current symptoms.
4. Route to Cloudflare deployer, backend/data engineer, frontend/product builder, or Android release maintainer as needed.
5. Apply the smallest verified mitigation.
6. Confirm recovery through logs, health checks, and user-facing smoke checks.
7. Write a follow-up with root cause, timeline, residual risk, and prevention task.

## 8. Escalation

Escalate when:

- A production workflow is broken.
- A deploy or release may expose sensitive data.
- Authorization or department access may be incorrect.
- Database migration risk is not understood.
- An Android build cannot be reproduced.
- Monitoring shows recurring failures after rollback or mitigation.

