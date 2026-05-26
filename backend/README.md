# Highpoints Backend v2

This is a modular Cloudflare Workers backend for High Point Ops. It is designed to replace one-off route files with a request pipeline:

1. Request context
2. Auth session
3. Capability policy
4. Route handler
5. Repository write/read
6. Audit event
7. Structured response

The backend is additive. It does not replace the live `highpoint-ops` or `highpoints-gateway` Workers until you deploy and route it.

## Core Ideas

- `src/index.js` owns the Worker entrypoint and request lifecycle.
- `src/router.js` keeps routes declarative and small.
- `src/auth.js` authenticates staff using Highpoints headers or Cloudflare Access email.
- `src/policy.js` is the server-side source of truth for role and department access.
- `src/repositories.js` keeps D1 SQL in one layer.
- `src/events.js` records audit events after responses with `ctx.waitUntil()`.
- `src/modules/*` holds feature modules for operations flow, Outlook auth, security cameras, and documents.

## Endpoints

- `GET /api/v2/health`
- `GET /api/v2/me`
- `GET /api/v2/flow`
- `POST /api/v2/events`
- `GET /api/v2/security/cameras`
- `POST /api/v2/outlook/auth/start`
- `POST /api/v2/outlook/auth/complete`
- `GET /api/v2/documents/review`
- `POST /api/v2/documents/review/:id/decision`

## Deploy Setup

1. Create D1 and R2 resources.
2. Copy `wrangler.jsonc.example` to `wrangler.jsonc`.
3. Fill in the D1 database IDs and R2 bucket name.
4. Set secrets:

```bash
wrangler secret put OUTLOOK_CLIENT_SECRET
wrangler secret put DOCUMENT_AI_API_KEY
```

5. Apply migrations:

```bash
wrangler d1 migrations apply HIGHPOINTS_DB
```

6. Deploy:

```bash
wrangler deploy
```

## Notes

- Do not store Outlook tokens in client local storage. This backend stores token responses server-side in D1.
- The camera endpoint returns only the configured work-network URL and requires Admin or Executive access.
- Document review remains approval-gated. Drafts are not finalized until a supervisor/admin approval route runs.
