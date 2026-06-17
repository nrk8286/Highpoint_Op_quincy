# Highpoints AI Agent Team

This enhancement defines a local operating model for a small AI-assisted agent team working on Highpoints. It is documentation and configuration only; it does not change application code, deployment settings, database schemas, or Android build files.

## Contents

- `team-spec.yaml`: Machine-readable team roster, ownership boundaries, queues, gates, and escalation rules.
- `working-agreements.md`: Collaboration rules for agents and humans sharing the codebase.
- `task-queue.md`: Standard task ticket format and queue states.
- `runbook.md`: Common workflows for planning, implementation, verification, release, deployment, and operations.
- `handoff-templates.md`: Role-to-role handoff templates.

## Team Roles

- Cloudflare deployer: Owns Workers, D1, KV/R2, Wrangler workflows, env vars, secrets, preview deployments, and production deploys.
- Frontend/product builder: Owns user flows, mobile web UI, Capacitor-facing app behavior, accessibility, and product acceptance criteria.
- Backend/data engineer: Owns API contracts, database schema, migrations, data integrity, auth policy enforcement, and integration boundaries.
- QA/security reviewer: Owns test strategy, regression checks, privacy/security review, abuse cases, and release risk assessment.
- Android release maintainer: Owns Capacitor Android builds, signing readiness, store assets, versioning, device checks, and release packaging.
- Operations monitor: Owns runtime health, incident intake, logs, dashboards, alerts, post-deploy checks, and rollback coordination.

## Operating Principle

Agents work in small, traceable changes. Every task must have an owner, a verification plan, a rollback or mitigation note, and a handoff when work crosses role boundaries.

