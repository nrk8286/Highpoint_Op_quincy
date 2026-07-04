# Working Agreements

## Shared Rules

- Keep changes scoped to the active task and stated paths.
- Do not revert, overwrite, or reformat work from another human or agent unless explicitly asked.
- Before changing shared behavior, identify the owning role and the required review gate.
- Prefer small changes with clear verification over broad rewrites.
- Keep secrets out of code, docs, logs, tickets, screenshots, and handoffs.
- Treat resident, staff, clinical, compliance, payroll, and credential data as sensitive.
- Record assumptions in the task ticket when they affect behavior, release risk, or data handling.

## Task Ownership

Each task has exactly one current owner. Contributors may assist, but the owner is responsible for:

- Keeping the queue state current.
- Asking for review from the right role.
- Recording changed paths or artifacts.
- Completing or delegating verification.
- Writing a handoff before leaving the task blocked, in review, or partially complete.

## Codebase Etiquette

- Check for existing patterns before adding new structure.
- Do not change unrelated files to satisfy formatting preferences.
- Do not run destructive git commands unless the user explicitly asks for them.
- If a file already has unrelated edits, work around them and preserve them.
- If the task requires a risky operation, stop and request explicit approval.

## Review Expectations

Reviews should focus on correctness, user impact, data safety, maintainability, and release risk. A review note should include one of:

- Approved: No release-blocking concerns found.
- Approved with follow-up: Work can proceed, but a tracked follow-up is required.
- Changes requested: Work must be updated before release or deploy.
- Blocked: Missing context, environment, access, or verification prevents review.

## Definition of Done

A task is done only when:

- Acceptance criteria are met or explicitly revised.
- Required review gates are complete.
- Verification evidence is recorded.
- Rollback, mitigation, or operational follow-up is documented when relevant.
- Any downstream owner has a handoff with the next action.

