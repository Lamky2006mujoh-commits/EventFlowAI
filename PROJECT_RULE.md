# EventFlow AI Agent Rules

Read this file and the [Team Agreement and DoD](docs/TEAM_AGREEMENT_AND_DOD.md) before making changes. Follow higher-priority instructions and the user's current scope.

## Workflow

1. **Understand the task.** Read its description, acceptance criteria, existing code and git status. Identify user changes and missing access; do not modify unrelated work.
2. **Plan first.** Before editing or external writes, publish the goal, scope/files, steps, tests and risks. Read-only investigation is allowed beforehand. Save substantial plans in docs/plans; a short chat plan is enough for small edits. Update the plan if scope changes. Do not require another approval for work already authorized.
3. **Implement a focused change.** Follow existing patterns, shared Zod contracts and validated fixtures. Include relevant validation, persistence and failure handling. Use additive migrations; preserve existing data and version history. Independent items can start with fixtures rather than waiting for another story.
4. **Test.** Run relevant checks below and verify the acceptance criteria. Include invalid input, permissions, stale/concurrent writes and provider failures when affected. Fixtures do not replace required live evidence.
5. **Fix and review.** If a check fails, fix the cause and rerun affected checks. Then inspect the diff for regressions, secrets and unrelated changes. Prepare evidence for the teammate review required by the DoD; AI self-review is not human approval.
6. **Request a commit after checks pass.** Tell the task owner what is ready, ask them to review and commit, and supply a suitable commit message. The agent commits/pushes only when the user has authorized that delivery; reuse existing authorization rather than asking again. Stage only intended files. If required checks are blocked or failing, report that instead of recommending the work as verified.
7. **Report accurately.** Summarize changes, commands/results, evidence, remaining work and commit/delivery state. Distinguish implemented, tested, merged, deployed and PO accepted. Mark Done only when applicable DoD checks have evidence.

## Verification

Select checks appropriate to the change; do not run unrelated tests merely to produce a green count.

| Change                                  | Checks                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| Application/API                         | npm test; npm run lint; npm run build                                            |
| Edge Functions, contracts or migrations | Also npm run check:functions; npm run verify:edge; relevant PostgreSQL/API tests |
| Proposal/budget/venue UI                | Also npm run test:e2e and relevant desktop/mobile checks                         |
| Signup/approval UI                      | Also npm run test:e2e:onboarding and relevant authorization tests                |
| Documentation only                      | Formatting, links and consistency with workflow/DoD                              |

Record tested commit/environment, commands and actual results. Live scripts may save data, send requests or consume quota; run them only within authorized scope. A blocked required check is not N/A or a pass.

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
