# Highpoints Backend v2

This is the canonical Cloudflare Worker for `highpoints.work`. It serves the public HighPoints pages, protected app handoff, API routes, and operational bindings from one edge deployment using this request pipeline:

1. Request context
2. Auth session
3. Capability policy
4. Route handler
5. Repository write/read
6. Audit event
7. Structured response

The Worker replaces the former split between the `highpoints-work` Pages marketing project and the `highpoints-backend-v2` edge runtime. Cloudflare keeps the internal Worker service name `highpoints-backend-v2`, while `highpoints.work` is the single public hostname and deployment surface.

## Core Ideas

- `src/index.js` owns the Worker entrypoint and request lifecycle.
- `src/router.js` keeps routes declarative and small.
- `src/auth.js` authenticates staff using Highpoints headers or Cloudflare Access email.
- `src/policy.js` is the server-side source of truth for role and department access.
- `src/repositories.js` keeps D1 SQL in one layer.
- `src/events.js` records audit events after responses with `ctx.waitUntil()`.
- `src/graph/*` mirrors important operations into Neo4j Aura through the HTTPS Query API and queues failed writes in D1.
- `src/modules/*` holds feature modules for operations flow, Outlook auth, security cameras, and documents.

## Endpoints

- `GET /api/v2/health`
- `GET /api/v2/me`
- `GET /api/v2/flow`
- `POST /api/v2/events`
- `GET /api/v2/security/cameras`
- `POST /api/v2/outlook/auth/start`
- `POST /api/v2/outlook/auth/complete`
- `GET /api/v2/outlook/status`
- `POST /api/v2/outlook/disconnect`
- `GET /api/v2/documents/review`
- `POST /api/v2/documents/review/:id/decision`
- `GET /api/v2/graph/health`
- `POST /api/v2/graph/query`
- `GET /api/v2/graph/entity/:type/:id`
- `GET /api/v2/graph/search?q=...`
- `POST /api/v2/graph/sync/retry`
- `GET /api/v2/graph/sync/failures`

## Deploy Setup

1. Create D1 and R2 resources.
2. Copy `wrangler.jsonc.example` to `wrangler.jsonc`.
3. Fill in the D1 database IDs and R2 bucket name.
4. Set secrets:

```bash
wrangler secret put OUTLOOK_CLIENT_SECRET
wrangler secret put OUTLOOK_STATE_SECRET
wrangler secret put SESSION_SECRET
wrangler secret put DOCUMENT_AI_API_KEY
wrangler secret put NEO4J_USERNAME
wrangler secret put NEO4J_PASSWORD
```

5. Apply migrations:

```bash
wrangler d1 migrations apply highpoints --remote
```

6. Bootstrap Neo4j constraints, roles, permissions, and relationship catalog data with `npm run graph:migrate`. For the local Neo4j instance on Bolt `localhost:7687`, use the matching local HTTP endpoint `http://127.0.0.1:7474/db/neo4j/tx/commit`. For Aura production, replace it with `https://<aura-host>/db/<database>/query/v2`. If running Cypher manually in Neo4j Browser, switch to `:use neo4j` first; the `system` database rejects `MATCH` and most schema/data clauses.

7. Deploy:

```bash
wrangler deploy
```

## Notes

- Do not store Outlook tokens in client local storage. This backend stores token responses server-side in D1.
- Outlook auth is pinned to the configured Highpoints app redirect URL and returns per-user status from the backend, so staff can connect or disconnect their own Microsoft mailbox inside the app.
- The camera endpoint returns only the configured work-network URL and requires Admin or Executive access.
- Document review remains approval-gated. Drafts are not finalized until a supervisor/admin approval route runs.
- D1 remains the operational source of truth. Graph writes are additive; failed Neo4j writes are persisted in `hp_graph_sync_outbox` and can be retried from the secured graph sync endpoint.
