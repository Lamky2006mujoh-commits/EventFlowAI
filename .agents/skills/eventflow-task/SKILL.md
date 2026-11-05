---
name: eventflow-task
description: Plan and implement scoped EventFlow AI features, fixes, refactors or project-document changes. Use before editing; skip for simple read-only questions or test-only requests.
---

# Execute an EventFlow task

Read [AGENTS.md](../../../AGENTS.md) and the relevant [team agreement](../../../docs/TEAM_AGREEMENT_AND_DOD.md). This skill supplies task mechanics; root rules govern permission and delivery.

1. Read the card/request, acceptance criteria, relevant implementation and git status. Preserve existing user work. Separate the requested outcome from optional improvements.
2. Before edits, publish the goal, in/out scope, affected files/contracts, steps, verification and risks. Save substantial or multi-component plans under docs/plans; small document edits can use a chat plan. Use [eventflow-test](../eventflow-test/SKILL.md) to select verification during planning. Read-only discovery is allowed first.
3. Identify an independent starting input. Concept comparison can use seeded concepts; proposals can use a saved selection; budgets, venues and export can use validated snapshots. Do not require another story to be Done before starting. Coordinate shared contract changes through code/fixtures, not bypasses.
4. Implement a usable slice following React/TypeScript and Supabase patterns. Check shared Zod contracts and affected callers before changing shapes. Include persistence, authorization and error states where relevant. Database changes use new additive migrations and preserve existing versions/data.
5. Verify incrementally with the selected checks. Fix causes, rerun affected checks and update the plan if evidence changes scope. Finish with a focused diff review and [eventflow-handover](../eventflow-handover/SKILL.md) when presenting the completed change.

## Project invariants

- Signup is not membership: pending/rejected accounts cannot enter the workspace; only an agency administrator approves a confirmed account as member. Never grant admin on signup.
- Saved versions remain immutable; stale writes must not overwrite newer work.
- AI output needs runtime-schema and business-rule validation; provider failures must remain visible. Keep provider keys server-side.
- Calculate budget totals in application code. Preserve venue scope from the brief, source/price units and uncertainty; do not invent booking or availability confirmation.
- Keep implementation, deployment and live acceptance separate. A local change does not establish remote rollout.

Return the changed behavior and acceptance-criteria mapping, plan/evidence links and any unfinished scope. Do not expand the task to clear unrelated historical blockers.
