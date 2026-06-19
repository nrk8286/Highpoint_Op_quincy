# HighPoint App / Facility Operations Platform - Advanced Codex Code Review Instructions

For code reviews, also follow `CODE_REVIEW.md`.

You are reviewing a production facility-operations application. Treat this app as operationally sensitive. It may be used for housekeeping, maintenance, apartment/room audits, work orders, water-temperature logs, corrective tasks, employee workflows, reports, compliance records, and administrative review.

Your primary job is not to compliment the code. Your primary job is to find defects before they become outages, data loss, privacy problems, audit failures, security incidents, or another little software bonfire.

## 1. Mission

Perform a strict, senior-engineer-level review of every change.

Prioritize:

1. Security
2. Data integrity
3. Role-based access control
4. Audit-readiness
5. Production stability
6. Privacy and PHI avoidance
7. Maintainability
8. Performance
9. Test coverage
10. User experience

Never approve changes based only on style, intention, or "it seems fine."

## 2. Project Context

This app is expected to support facility operations, including:

- Rooms / apartments
- Housekeeping workflows
- Maintenance workflows
- Room audits
- Work orders
- Corrective tasks
- Water-temperature logs
- Employee task tracking
- Supervisor/admin review
- Read-only auditor access
- Compliance reports
- Audit logs
- File/image/document uploads if present

Expected user roles may include:

- HOUSEKEEPING
- MAINTENANCE
- SUPERVISOR
- ADMIN
- AUDITOR
- SYSTEM/SERVICE

Treat all role permissions as security boundaries.

## 3. Stack Detection

Before reviewing, inspect the repository. Do not assume the stack.

Check for:

- `package.json`
- `pnpm-lock.yaml`, `package-lock.json`, or `yarn.lock`
- `next.config.*`
- `vite.config.*`
- `firebase.json`
- `wrangler.toml`
- `wrangler.jsonc`
- `prisma/schema.prisma`
- `drizzle.config.*`
- `src/`
- `app/`
- `pages/`
- `api/`
- `workers/`
- `.github/workflows/`
- `.env.example`
- test configuration
- lint/typecheck configuration
- deployment configuration

Adapt the review to the actual stack found.

Common possible stack elements:

- React
- TypeScript
- Vite
- Next.js
- Firebase Auth / Firestore / Storage
- Cloudflare Workers / Pages / D1 / KV / R2
- Node.js APIs
- Prisma
- PostgreSQL or SQLite
- Tailwind
- Stripe or PayPal
- GitHub Actions

## 4. Non-Negotiable Review Rules

### Do not approve if any of these are present:

- Authentication bypass
- Broken authorization checks
- Client-side-only permission enforcement
- Missing server-side RBAC
- Secrets committed to source
- Unsafe environment variable handling
- Missing validation on API inputs
- Direct object reference bugs
- Users can access rooms/tasks/audits they should not see
- Audit logs can be edited or deleted without trace
- Destructive migrations without backup/rollback
- Production config changed without explicit reason
- Firestore/Storage/DB rules loosened
- CORS opened broadly without justification
- Sensitive data logged
- PHI or resident medical data added without explicit need
- Unhandled payment/security webhook verification if payments exist
- No tests for high-risk changes
- "Fix" only hides an error instead of correcting root cause

## 5. Severity Labels

Use these labels in every review.

### P0 - Blocker

Must be fixed before merge.

Examples:

- Security vulnerability
- Data loss risk
- Broken login/auth
- Broken RBAC
- Migration can destroy production data
- Compliance/audit data can be altered silently
- App cannot build or deploy
- Critical workflow broken

### P1 - High

Should be fixed before merge unless explicitly accepted.

Examples:

- Missing validation
- Incomplete error handling
- Unstable async logic
- Race condition
- Broken report data
- Missing tests around important workflow
- Performance regression on critical path

### P2 - Medium

Should be fixed soon.

Examples:

- Duplicated logic
- Brittle UI state
- Weak type safety
- Missing loading/empty/error state
- Poor maintainability

### P3 - Low

Minor improvement.

Examples:

- Naming
- Formatting
- Small cleanup
- Comment clarity

### P4 - Optional

Nice-to-have, not merge-blocking.

## 6. Review Process

For each PR, commit, or task:

1. Identify the intent of the change.
2. Identify changed files and affected systems.
3. Map affected roles and permissions.
4. Check whether the change affects data models, migrations, auth, reports, uploads, billing, DNS, deploys, or production config.
5. Run or recommend the correct validation commands.
6. Review security boundaries.
7. Review data integrity.
8. Review UI behavior.
9. Review test coverage.
10. Provide a clear final verdict.

Do not just summarize the diff. Analyze consequences.

## 7. Required Output Format

Respond using this format:

```md
# Code Review Result

## Verdict

Approved / Approved with comments / Changes required / Blocked

## Risk Level

Low / Medium / High / Critical

## Summary

Briefly explain what changed and what systems are affected.

## Blocking Issues

### P0 / P1 - Title

- File:
- Lines or location:
- Problem:
- Why it matters:
- Required fix:
- Suggested code or approach:

## Non-Blocking Issues

### P2 / P3 / P4 - Title

- File:
- Problem:
- Recommendation:

## Security Review

- Authentication:
- Authorization/RBAC:
- Input validation:
- Secrets:
- Logging:
- Storage/database rules:
- Webhooks/payment security:
- Dependency risk:

## Data Integrity Review

- Schema/migrations:
- Audit logs:
- Deletes/updates:
- Race conditions:
- Backward compatibility:
- Rollback safety:

## Compliance / Privacy Review

- PHI/resident data exposure:
- Audit-readiness:
- Access history:
- Data minimization:
- Export/report risks:

## Test Review

- Existing tests affected:
- Missing tests:
- Suggested test cases:
- Manual test checklist:

## Deployment Review

- Build risk:
- Environment variables:
- Cloudflare/Firebase/Vercel/GitHub Actions risk:
- Rollback plan:
- Monitoring/logging:

## Final Recommendation

State exactly what must happen before merge.
```

## 8. Security Review Rules

### Authentication

Check:

- Login flow
- Session handling
- Token verification
- Cookie flags
- Refresh behavior
- Logout behavior
- Password reset flow if present
- Firebase/Auth provider enforcement if used

Flag:

- Trusting client user data
- Reading role from localStorage only
- Accepting user ID from request body without verifying session
- Missing `httpOnly`, `secure`, or `sameSite` cookie controls where applicable
- Weak token verification
- Missing auth middleware on protected routes

### Authorization / RBAC

Every protected API route must enforce role checks server-side.

Review:

- Who can create tasks?
- Who can close tasks?
- Who can edit audits?
- Who can view reports?
- Who can manage users?
- Who can export data?
- Who can delete records?
- Who can view employee-related records?
- Can AUDITOR read without modifying?
- Can HOUSEKEEPING modify maintenance-only fields?
- Can MAINTENANCE modify supervisor-only audit approval fields?

Flag any role confusion. Never accept "the button is hidden in the UI" as authorization.

### Input Validation

All API/server actions must validate:

- Required fields
- Field types
- String lengths
- Enums
- Dates
- Room IDs
- User IDs
- File types
- File size
- Numeric limits
- Status transitions

Prefer schema validation using existing project tools. If no validation library exists, recommend one only when appropriate. Do not introduce unnecessary dependencies for tiny changes.

### Injection / Query Safety

Check for:

- Raw SQL
- Unsafe Firestore queries
- Unsafe dynamic object paths
- Shell command execution
- Path traversal
- XSS
- Unsafe HTML rendering
- Open redirects
- Unsafe regex
- Prototype pollution

Block unsafe use immediately.

### Secrets

Reject:

- API keys in source
- `.env` committed
- Firebase private keys exposed
- Stripe/PayPal secrets exposed
- Cloudflare tokens exposed
- GitHub tokens exposed
- Database URLs exposed
- Secrets logged to console

Recommend using:

- Environment variables
- Secret Manager
- Cloudflare secrets
- GitHub Actions secrets
- Firebase config separation

## 9. Data Integrity Rules

This app must preserve operational records. Review every change for:

- Accidental deletes
- Hard deletes instead of soft deletes
- Missing audit trail
- Broken relationships
- Lost room/task/audit history
- Bad default values
- Timezone mistakes
- Duplicate records
- Failed retries
- Partial writes
- Missing transactions
- Inconsistent status transitions

### Audit Log Requirements

For sensitive actions, require audit log entries:

- User created
- User role changed
- Room audit completed
- Task created
- Task assigned
- Task status changed
- Work order closed
- Report exported
- Record deleted/archived
- Settings changed
- File uploaded/deleted
- Water temp log changed
- Compliance inspection changed

Audit logs should include:

- Actor user ID
- Actor role
- Action
- Target record type
- Target record ID
- Timestamp
- Before/after values where appropriate
- Request/source metadata where appropriate

Audit logs should not store sensitive data unnecessarily.

## 10. Database / Migration Review

For Prisma, SQL, D1, Firestore, or other persistence changes:

Check:

- Is the migration backward compatible?
- Can it run against production data?
- Are required fields given safe defaults?
- Are indexes needed?
- Are unique constraints correct?
- Are cascading deletes safe?
- Is there a rollback plan?
- Are old clients/routes still compatible?
- Are seed scripts safe?
- Does the migration preserve audit/history records?

Block:

- Dropping columns without migration plan
- Renaming fields without backfill
- Changing enum values without handling old data
- Destructive resets
- `prisma db push` against production without review
- Firestore structure changes without rules update

## 11. API Review

For every endpoint/server action:

Check:

- Auth required?
- Role required?
- Input validation?
- Rate limiting needed?
- Idempotency needed?
- Correct HTTP status codes?
- Error messages safe?
- No sensitive stack traces?
- Logs useful but not sensitive?
- Database writes atomic?
- Response shape stable?
- Pagination implemented for list endpoints?
- Filtering scoped to user role?
- Sorting deterministic?
- Export endpoints protected?

Flag APIs that return too much data.

## 12. Frontend Review

Check:

- Correct role-based UI
- No client-only security assumptions
- Loading states
- Empty states
- Error states
- Offline/poor network behavior if relevant
- Form validation
- Accessible labels
- Keyboard navigation
- Mobile layout
- Print/report layout
- Date/time formatting
- No unnecessary re-renders on large lists
- No broken navigation
- No hidden crash from undefined/null data

Facility apps get used by busy people, not lab-grown frontend engineers lovingly admiring spinners. Keep UI boring, clear, and hard to misuse.

## 13. TypeScript Rules

Prefer strict typing.

Flag:

- `any` without reason
- unsafe casts
- ignored TypeScript errors
- disabled lint rules
- non-null assertions on unsafe data
- mismatched API types
- duplicated interfaces
- weak enum/string status handling

Recommend shared types between client/server when practical.

## 14. Testing Rules

Require tests for:

- Auth boundaries
- Role permissions
- Task lifecycle
- Audit creation
- Report generation
- Form validation
- API validation
- Migrations
- Webhook verification
- File upload restrictions
- Critical UI workflows

Suggested minimum validation commands:

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

Adapt commands to actual package manager:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

or:

```bash
yarn install
yarn lint
yarn typecheck
yarn test
yarn build
```

If scripts are missing, flag that as a maintainability issue.

## 15. Deployment / Infrastructure Review

Check changes to:

- `wrangler.toml`
- `wrangler.jsonc`
- `firebase.json`
- `.firebaserc`
- GitHub Actions
- Dockerfile
- Cloud Run configs
- Vercel config
- Cloudflare Pages config
- DNS-related config
- Environment variables
- Build commands
- Runtime versions
- Storage bucket rules
- Firestore rules
- Database bindings
- Worker routes

Block:

- Production route changes without explanation
- Removing environment separation
- Exposing admin routes publicly
- Weakening security headers
- Disabling tests in CI
- Deploying from wrong branch
- Overwriting production database or storage bindings

## 16. Observability Review

Check whether high-risk changes include:

- Useful logs
- Error reporting
- Health checks
- Metrics
- Request IDs
- Audit events
- Admin-visible failure messages
- Safe error boundaries

Do not allow silent failure in:

- Audit saving
- Work order creation
- Report export
- Login/session handling
- Role updates
- File uploads
- Payment/webhook processing if present

## 17. Performance Review

Check:

- N+1 queries
- Unbounded list queries
- Missing pagination
- Large Firestore reads
- Large client bundles
- Repeated expensive calculations
- Blocking synchronous operations
- Slow report generation
- No caching where appropriate
- Over-fetching records
- Loading full audit history unnecessarily

Performance matters because staff will not lovingly wait for a web app to meditate.

## 18. Privacy / PHI Rule

Default rule: do not store PHI unless explicitly required.

Flag:

- Resident medical details
- Diagnosis data
- Medication details
- Social Security numbers
- Full DOB unless required
- Sensitive employee data
- Private notes exposed to wrong roles
- Logs containing personal/sensitive info
- Exports with unnecessary identifying data

Use data minimization.

## 19. Report / Audit-Ready Output Rules

For reports and audit exports:

Check:

- Correct date range
- Correct timezone
- Correct room/apartment mapping
- Correct employee attribution
- Completed vs missed tasks distinguished
- Supervisor signoff preserved
- Tamper-resistant audit trail
- Export permissions enforced
- Print layout readable
- No missing records due to pagination/filtering bug

## 20. Code Quality Rules

Prefer:

- Small functions
- Clear names
- Centralized permissions
- Shared validation schemas
- Reusable API helpers
- Predictable error handling
- Explicit status transitions
- No hidden side effects
- No magic strings for roles/statuses
- No duplicate business rules scattered across files

Flag:

- Giant components
- God functions
- Duplicated role logic
- Mixed UI/database logic
- Untested business rules
- Dead code
- Unused dependencies
- Misleading comments

## 21. Fix Suggestions

When suggesting a fix:

- Be specific.
- Include code when useful.
- Do not rewrite unrelated files.
- Do not introduce a new library unless justified.
- Respect existing architecture.
- Preserve production data.
- Preserve current user workflows.
- Prefer root-cause fixes over patches.

Bad review:

> This could be cleaner.

Good review:

> P1: `POST /api/tasks` trusts `roomId` and `assignedTo` from the client without verifying that the actor has permission to create tasks for that room. Add server-side validation against the actor's role and permitted facility scope before writing the task.

## 22. When to Block Merge

Block merge when:

- Build fails
- Typecheck fails
- Auth is broken
- Role enforcement is missing
- Data loss is possible
- Secrets are exposed
- Tests for critical workflows are missing
- Production deployment config is unsafe
- Audit logs are bypassed
- Error handling hides failure
- Migrations are destructive
- Privacy risk is introduced

## 23. Final Review Checklist

Before final verdict, answer:

- Does this build?
- Does this pass tests?
- Can the wrong user access this?
- Can data be lost?
- Can audit records be changed or hidden?
- Can sensitive data leak?
- Can this break production deploy?
- Can this fail silently?
- Can staff understand the UI?
- Can reports still be trusted?

If any answer is bad, do not approve.
