# Advanced Review Rubric for HighPoint App

## Review Standard

Review as if the app is already in production and used by real staff.

Assume mistakes can cause:

- Missed maintenance tasks
- Incorrect room audit records
- Bad compliance reports
- Unauthorized access
- Lost operational history
- Broken staff workflow
- Production outage
- Security exposure

## Required Review Depth

For every changed file, evaluate:

1. Correctness
2. Security
3. Authorization
4. Data integrity
5. Audit trail
6. Privacy
7. Error handling
8. Testing
9. Deployment safety
10. Maintainability

## Required Comment Style

Every issue must include:

- Severity
- File/location
- Exact problem
- Why it matters
- Required fix

Do not leave vague comments.

Bad:

> Maybe check permissions here.

Good:

> P0: This endpoint updates an audit record without checking that the authenticated user is ADMIN or SUPERVISOR. A HOUSEKEEPING user could modify a completed audit by calling the API directly. Add server-side RBAC before the database update.

## High-Risk Areas

Always inspect carefully:

- Authentication middleware
- Role-checking helpers
- API routes
- Server actions
- Firebase/Firestore rules
- Cloudflare Worker routes
- Database migrations
- Prisma schema
- Report generation
- Audit-log writes
- File uploads
- Admin pages
- User-management pages
- Export/download endpoints
- Payment/webhook routes if present
- CI/CD deployment files
- Environment variable handling

## Role Matrix Expectations

Unless the codebase defines otherwise, assume:

| Role | Expected Access |
| --- | --- |
| HOUSEKEEPING | View assigned rooms/tasks, complete housekeeping work, add allowed notes |
| MAINTENANCE | View/complete maintenance tasks and work orders |
| SUPERVISOR | Review work, approve audits, assign tasks, see reports |
| ADMIN | Manage users, roles, settings, full operational access |
| AUDITOR | Read-only access to reports/audits/compliance records |
| SYSTEM | Background jobs and integrations only |

Flag any role that receives more access than necessary.

## API Review Checklist

For every API endpoint:

- Is authentication required?
- Is role authorization enforced server-side?
- Is input schema validated?
- Are database queries scoped?
- Are errors handled safely?
- Are status codes correct?
- Is sensitive data excluded?
- Is the operation logged if important?
- Is pagination used for lists?
- Are destructive actions protected?
- Is rate limiting needed?

## Data Model Checklist

For schema or persistence changes:

- Are IDs stable?
- Are relationships correct?
- Are indexes needed?
- Are required fields safe?
- Are defaults safe?
- Are deletes soft when history matters?
- Are migrations reversible?
- Is old data compatible?
- Are reports affected?
- Are audit logs preserved?

## Audit Trail Checklist

Any important action should create an audit entry.

Important actions include:

- Login failure patterns if tracked
- Role change
- User creation/deactivation
- Room/task status change
- Audit completion
- Audit approval
- Report export
- File upload/delete
- Maintenance work order close
- Water temperature record creation/edit
- Settings/config change

Audit logs should be append-only unless the app has a specific verified archival mechanism.

## Frontend Checklist

For UI changes:

- Does it work on mobile?
- Does it handle loading?
- Does it handle empty data?
- Does it handle errors?
- Does it handle unauthorized users?
- Does it prevent accidental destructive actions?
- Are forms validated before submit?
- Are dates clear?
- Are room/task statuses obvious?
- Are reports printable/readable?
- Are buttons disabled while submitting?
- Is the UI accessible by keyboard?

## Test Expectations

Require or recommend tests for:

- Role permissions
- API validation
- Audit logging
- Report output
- Task lifecycle
- Room/audit workflows
- Login/session behavior
- Migration behavior
- File upload restrictions
- Error paths

At minimum, critical changes should pass:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Use the package manager and scripts actually present in the repo.

## Final Verdict Rules

Use:

- `Approved` only when no blocking issues exist.
- `Approved with comments` only for low-risk cleanup.
- `Changes required` when P1/P2 items must be fixed.
- `Blocked` when P0 exists.

Never approve a risky change because it is "small." Small changes break production too. They're just cuter while doing it.
