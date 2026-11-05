---
name: eventflow-handover
description: Assess EventFlow AI Definition of Done and prepare review, commit guidance or delivery handover. Use after verification or for read-only readiness/status reviews; it does not authorize commits, deployment or backlog writes.
---

# Check DoD and hand over

Read [AGENTS.md](../../../AGENTS.md) and the canonical [Definition of Done](../../../docs/TEAM_AGREEMENT_AND_DOD.md#7-definition-of-done). Do not maintain a replacement DoD here. Read the actual request/card, diff, verification evidence and delivery state before judging readiness.

## Evidence review

Map every acceptance criterion and DOD-01 through DOD-08 to actual evidence. Use a compact table: ID/criterion, met/pending/blocked/N/A, evidence or reason, next action/owner if known.

- Check integrated behavior and persistence, relevant tests/build, nonauthor teammate review/merge, critical defects, applicable UI/accessibility, AI validation and actual demo/PO acceptance against the canonical conditions.
- An N/A needs a scope-based reason and responsible human review as appropriate. Missing access, provider failure or unfinished review is not N/A.
- Self-review is useful but cannot substitute for teammate review. Permission to push is not PO acceptance. Record explicit delivery exceptions without inventing a waiver.
- Keep implemented, locally tested, merged, deployed, live-verified and PO-accepted distinct. A proposal to change team standards is not ratified policy.
- Treat previous reports as dated evidence. Verify current rollout/email/provider status before asserting it changed; do not assume old blockers are fixed or still current without checking available evidence.

## Review and delivery

Inspect the final diff and git status for scope, regressions, secrets and unrelated work. Summarize behavior, relevant commands/results, evidence limits and next actions. For substantial work, update the plan with actual verification outcomes.

If checks pass and the user has not authorized delivery, ask the task owner to review and commit and supply a message using AGENTS.md's convention, for example docs(agent): add focused task and quality skills. If authorization already covers this delivery, execute it without asking again. Stage only intended files, inspect the staged diff, and verify the actual commit/push result. Historical authorization for a completed task does not automatically authorize every future task.

When required checks fail or are blocked, report that state and the next action; do not describe the change as fully verified. Do not mark a card Done until every applicable canonical DoD condition has evidence. Update Trello or another external resource only when authorized and accessible; a prepared local draft is not a board update.

Return a concise handover: outcome, verification, unmet criteria/risks, review/deployment/acceptance state and actual commit or suggested commit message. Include rollback/rollout instructions when the change needs them, never fabricated execution evidence.
