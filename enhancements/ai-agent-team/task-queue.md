# Task Queue Format

Use this file format for local task tracking when agents coordinate Highpoints work. The queue can live in a copied project-specific file, an issue tracker, or another shared system, but each task should preserve these fields.

## Queue States

- `proposed`: Idea exists, but scope and owner are not ready.
- `ready`: Scope, owner, acceptance criteria, and verification plan are defined.
- `in_progress`: Owner is actively working.
- `blocked`: Owner cannot continue without a decision, access, dependency, or review.
- `review`: Work is ready for role review.
- `verify`: Review passed and final checks are running.
- `done`: Acceptance, review, verification, and handoff requirements are complete.
- `parked`: Work is intentionally paused and not expected to move soon.

## Ticket Template

```markdown
## HP-AI-000

- Title:
- State: proposed
- Owner:
- Role:
- Created:
- Updated:
- Priority: low | medium | high | urgent
- Area: frontend | backend | data | cloudflare | android | qa-security | operations | docs
- Related paths:
- Related deploy/release target:

### Context

What problem is this solving? Include links, user reports, source files, screenshots, logs, or prior decisions when available.

### Acceptance Criteria

- [ ] Observable result 1
- [ ] Observable result 2
- [ ] Edge case or permission requirement

### Verification Plan

- Command, manual flow, device, endpoint, or review checklist:
- Expected result:
- Evidence location:

### Risk Notes

- Data sensitivity:
- Security/privacy concerns:
- Rollback or mitigation:
- Operational impact:

### Work Log

- YYYY-MM-DD HH:MM CT: note

### Review Gates

- Product:
- Data:
- QA/security:
- Deploy/release:
- Operations:

### Handoff

- Current state:
- Decisions made:
- Changed paths or artifacts:
- Verification completed:
- Remaining risks:
- Next action:
```

## Priority Guide

- `urgent`: Active production incident, security issue, data-loss risk, broken release, or blocked facility workflow.
- `high`: Important user-facing bug, release-blocking QA issue, or planned deploy dependency.
- `medium`: Normal feature, improvement, or non-blocking defect.
- `low`: Cleanup, documentation, nice-to-have improvement, or investigation without current user impact.

