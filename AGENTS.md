# EventFlow AI Agent Instructions

This is the single entry point for agent rules; it replaces PROJECT_RULE.md. Read the relevant [Team Agreement and DoD](docs/TEAM_AGREEMENT_AND_DOD.md) before making changes. Follow higher-priority instructions and the user's current scope.

## Workflow

1. **Understand the task.** Read its description, acceptance criteria, existing code and git status. Identify user changes and missing access; do not modify unrelated work.
2. **Plan first.** Before editing or external writes, publish the goal, scope/files, steps, tests and risks. Read-only investigation is allowed beforehand. Save substantial plans in docs/plans; a short chat plan is enough for small edits. Update the plan if scope changes. Do not require another approval for work already authorized.
3. **Implement a focused change.** Follow existing patterns, shared Zod contracts and validated fixtures. Include relevant validation, persistence and failure handling. Use additive migrations; preserve existing data and version history. Independent items can start with fixtures rather than waiting for another story.
4. **Test.** Use eventflow-test to select relevant checks and verify the acceptance criteria. Include invalid input, permissions, stale/concurrent writes and provider failures when affected. Fixtures do not replace required live evidence.
5. **Fix and review.** If a check fails, fix the cause and rerun affected checks. Then inspect the diff for regressions, secrets and unrelated changes. Prepare evidence for the teammate review required by the DoD; AI self-review is not human approval.
6. **Request a commit after checks pass.** Tell the task owner what is ready, ask them to review and commit, and supply a suitable commit message. The agent commits/pushes only when the user has authorized that delivery; reuse existing authorization rather than asking again. Stage only intended files. If required checks are blocked or failing, report that instead of recommending the work as verified.
7. **Report accurately.** Summarize changes, commands/results, evidence, remaining work and commit/delivery state. Distinguish implemented, tested, merged, deployed and PO accepted. Mark Done only when applicable DoD checks have evidence.

## Skill selection

Read the relevant SKILL.md before its phase. These repository skills live in .agents/skills; use the links directly if the session has not discovered them yet. State which skill is being used on its first use. Explicit invocation uses the names below with a dollar sign.

| Skill                                                            | When to use                                                                                                 | Expected output                                              |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [eventflow-task](.agents/skills/eventflow-task/SKILL.md)         | Implement or modify a feature, bug fix, refactor or project document; start before edits                    | Visible plan, focused change and acceptance-criteria mapping |
| [eventflow-test](.agents/skills/eventflow-test/SKILL.md)         | Choose/run checks for a change, or investigate a test failure; select during planning and apply after edits | Relevant commands, actual results and evidence limits        |
| [eventflow-handover](.agents/skills/eventflow-handover/SKILL.md) | Assess DoD, prepare review/commit, hand off work, or update completion status                               | DoD evidence/gaps and accurate delivery report               |

For a normal change: task skill to plan and implement, test skill to verify, handover skill to report readiness. Verification and review continue during implementation; these are not team handoff gates. For testing-only requests, use test; for read-only DoD/release-readiness review, use handover. Simple read-only questions do not require all three. Load only applicable skills; they supplement these rules without expanding scope or authorization.

Examples: signup approval uses all three with auth/database/onboarding checks; budget UI uses all three with money and browser checks; documentation edits use all three with document checks only; rerunning a failing suite uses test, plus handover if a readiness decision is requested.

## Commit Message

Use a short, specific imperative message:

`<type>(<scope>): <change>`

Types: feat, fix, docs, test, refactor, chore. Use the type matching the actual change; include the card ID and test details in the body when useful.

Examples:

- `fix(auth): prevent workspace access before admin approval`
- `feat(members): add signup review notifications`
- `test(auth): cover duplicate approval requests`
- `docs(agent): simplify task workflow and commit guidance`

Do not use vague messages such as "update code" or claim a fix, deployment or test result that did not occur. A commit does not replace PR review or PO acceptance.

## Boundaries

- Allowed after planning: task-related local edits, relevant tests and preparation of a reviewable diff.
- External writes, merge, deployment, remote migrations, email and paid AI calls require authorization covering the resource and action; a plan alone is not permission.
- Never expose credentials/private data, weaken Auth/RLS, grant signup admin access, discard others' work, force-push shared history or edit applied migrations to hide failures.
- Validate AI structures with Zod and applicable business rules; calculate money in application code and preserve source/price uncertainty.
- Never fabricate test passes, reviewer/PO approval, live-service evidence, Trello changes or deployment. Missing access must be reported, not bypassed.
