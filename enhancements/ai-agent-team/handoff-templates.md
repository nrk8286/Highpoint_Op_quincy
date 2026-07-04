# Handoff Templates

## General Handoff

```markdown
### Handoff: [task id] [short title]

- From:
- To:
- Current state:
- Reason for handoff:
- Changed paths or artifacts:
- Decisions made:
- Verification completed:
- Verification not completed:
- Remaining risks:
- Blockers:
- Next action:
- Needed by:
```

## Frontend/Product to Backend/Data

```markdown
### Frontend/Product -> Backend/Data

- User workflow:
- Screen or component:
- Required API behavior:
- Request fields:
- Response fields:
- Error states:
- Permission assumptions:
- Data sensitivity:
- Mocked or temporary behavior:
- Acceptance criteria impacted:
- Next backend action:
```

## Backend/Data to Frontend/Product

```markdown
### Backend/Data -> Frontend/Product

- API route or data contract:
- Auth and permission behavior:
- Request example:
- Response example:
- Validation rules:
- Error codes:
- Data freshness or consistency notes:
- Migration status:
- Test or seed data available:
- Next frontend action:
```

## Backend/Data to Cloudflare Deployer

```markdown
### Backend/Data -> Cloudflare Deployer

- Service or Worker:
- Database or binding changes:
- Migration files:
- Required env var names:
- Secret names to confirm:
- Deploy order:
- Pre-deploy checks:
- Post-deploy checks:
- Rollback or mitigation:
- Next deploy action:
```

## Cloudflare Deployer to Operations Monitor

```markdown
### Cloudflare Deployer -> Operations Monitor

- Environment:
- Deployed service:
- Source version or package:
- Deploy timestamp:
- URL or route:
- Smoke checks completed:
- Expected monitoring signals:
- Watch window:
- Rollback trigger:
- Rollback contact:
- Next operations action:
```

## QA/Security to Release Owner

```markdown
### QA/Security -> Release Owner

- Task or release:
- Review result: approved | approved with follow-up | changes requested | blocked
- Test coverage:
- Security/privacy findings:
- Permission-boundary findings:
- Residual risks:
- Required follow-ups:
- Release recommendation:
- Next release action:
```

## Android Release to Operations Monitor

```markdown
### Android Release -> Operations Monitor

- Version name:
- Version code:
- Artifact path:
- Signing status:
- Device or emulator smoke checks:
- Distribution target:
- Known issues:
- Support notes:
- Monitoring or feedback channel:
- Next operations action:
```

