# Highpoints.work Final Production Plan

Date: 2026-06-12
Target: `https://highpoints.work`
Build posture: production web app plus Capacitor Android/iOS wrappers

## Release Decision

Highpoints.work should ship as a Cloudflare-hosted operations platform with the
native apps acting as authenticated wrappers around `https://highpoints.work/app`
and using the packaged shell only as a recovery/offline fallback.

This is the safest final posture for the current codebase because the backend is
already organized as a Cloudflare Worker API, the mobile projects point at the
live app, and the local shell contains offline capture, health, queue, and graph
recovery tools. Store submissions must describe the app as an authenticated
facility operations tool, not as a generic website wrapper.

## Agent Operating Model

Use the existing local agent team roles as release lanes:

- Cloudflare deployer: Workers, D1 migrations, R2 binding, secrets, deploy,
  rollback, and post-deploy smoke checks.
- Backend/data engineer: auth, API contracts, D1 schema, Graph/Neo4j sync,
  Outlook, document review, and migration safety.
- Frontend/product builder: `/app` workflow, local recovery shell, offline
  queue, privacy mode, responsive checks, and store-facing UX claims.
- QA/security reviewer: role boundaries, sensitive data handling, unauthenticated
  paths, privacy disclosures, regression matrix, and final release risk.
- Android/iOS release maintainer: Capacitor sync, signed Android artifacts,
  Xcode archive, store metadata, reviewer credentials, and screenshots.
- Operations monitor: health checks, Worker logs, Cloudflare metrics, incident
  watch, and rollback coordination.

## Production Blockers

These must be resolved before a real production deploy or store release is
called final:

1. Set Worker secrets without exposing values:
   `SESSION_SECRET`, `OUTLOOK_CLIENT_SECRET`, `OUTLOOK_STATE_SECRET`,
   `DOCUMENT_AI_API_KEY`, `NEO4J_USERNAME`, and `NEO4J_PASSWORD`.
2. Replace `NEO4J_QUERY_ENDPOINT` in production with a reachable HTTPS Neo4j
   Aura Query API endpoint. `127.0.0.1` is not valid from Cloudflare Workers.
3. Set non-empty production `DOCUMENT_AI_ENDPOINT` and `DOCUMENT_AI_MODEL`, or
   feature-flag document extraction as unavailable.
4. Verify the D1 database contains both the new `hp_*` tables and the legacy app
   tables used by auth/documents: `app_users`, `staff_profiles`,
   `document_uploads`, `document_extractions`, and `document_review_queue`.
5. Align app-store privacy and permission disclosures with actual camera/photo
   permissions in Android and iOS.
6. Decide whether offline attachments are metadata-only or should upload binary
   files later. Do not let staff believe offline files are synced if only name,
   type, and size are stored.

## Build Gates

Run these before production deploy:

```bash
npm install
npm audit
npm run validate:shell
npm run validate:backend
GOCACHE=/tmp/highpoints-go-build go test ./site-go
```

Run these from `backend/` after Cloudflare credentials are available:

```bash
HOME=/tmp/highpoints-wrangler npx --yes wrangler@latest deploy --dry-run
HOME=/tmp/highpoints-wrangler npx --yes wrangler@latest d1 migrations apply highpoints --remote
npm run graph:migrate
npm run graph:check
HOME=/tmp/highpoints-wrangler npx --yes wrangler@latest deploy
```

Run these for Android:

```bash
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 npm run sync:android
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 npm run build:android:debug
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 npm run build:android:apk
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 npm run build:android
```

iOS archive must be performed on macOS with Xcode:

```bash
npm run sync:ios
npm run open:ios
```

## Production Deploy Sequence

1. Freeze scope and branch. Confirm no unrelated local files are included.
2. Run local gates and record output.
3. Confirm Worker config:
   - route: `highpoints.work/api/*`
   - D1 binding: `DB`
   - R2 binding: `DOCUMENTS`
   - observability enabled
   - compatibility date reviewed
4. Confirm secrets exist by name only. Never print secret values.
5. Apply D1 migrations with `--remote`.
6. Apply Neo4j graph migrations against the production HTTPS endpoint.
7. Run Wrangler dry-run.
8. Deploy Worker.
9. Smoke test:
   - `GET https://highpoints.work/api/v2/health`
   - unauthenticated `GET /api/v2/me` returns `401`
   - authenticated `/api/v2/me` returns the expected staff profile
   - authenticated shell event creates a `202` response
   - graph health returns relationship and catalog counts
   - Outlook status returns a user-scoped connection state
10. Monitor logs for at least 15 minutes. Roll back if auth failures, 500s, or
    D1/Graph sync failures exceed expected test traffic.

## Store Release Sequence

1. Update store privacy labels for camera/photos/media use.
2. Create or update Apple and Google app records.
3. Prepare reviewer/demo credentials with least-privilege access.
4. Capture phone and tablet screenshots from the live production app.
5. Build signed Android APK and AAB.
6. Archive iOS in Xcode on macOS.
7. Run device smoke tests:
   first launch, login, navigation, offline queue, queue sync, privacy mode,
   app resume, camera/photo permission prompt, and support/privacy links.
8. Submit first to internal testing, then production after QA/security signoff.

## Rollback

Cloudflare rollback is the primary web/API mitigation. Keep the previous Worker
version available, and roll back immediately if production smoke checks fail.
D1 migrations are additive in this repo; if a migration creates bad data, disable
the affected route or feature flag first, then run a reviewed corrective script.

Native rollback is slower. Keep the last known-good Android and iOS builds in
store tracks until the new version has passed production monitoring.

## Current Status

Local validation passes for shell, backend structure, and the Go site when the
Go build cache is placed in `/tmp`. The Android shell is configured to prevent
backup/device-transfer of WebView and local app state, and the camera domain no
longer permits cleartext traffic.

A live deploy is not yet complete in this workspace because Cloudflare deploy
commands require account credentials, a writable Wrangler home, production
secrets, and non-local Neo4j/document AI configuration.
