# Plan: consolidate agent rules and add focused skills

Date: 5 November 2026

## Goal and scope

Merge PROJECT_RULE.md into AGENTS.md; add three repository skills for task execution, change-specific testing and DoD/handover. Update active references. Keep the team agreement as the canonical detailed DoD; preserve historical plans and unrelated changes. No application changes or external writes are needed.

## Steps

1. Inspect rules, references, package scripts and skill-creator guidance.
2. Consolidate root instructions and add explicit skill routing; remove the redundant rule file.
3. Create instruction-only skills under .agents/skills with scoped triggers and project-specific workflows.
4. Update active documentation links; validate skills, Markdown formatting, local links and the diff.

## Verification and risks

Run the bundled skill validator for all three skills, repository Prettier for affected Markdown, local-link checks and git diff --check. Review routing against documentation-only, auth, AI, testing-only and handover-only examples. Application tests are not applicable to instruction-only edits. Avoid duplicated DoD, blanket test requirements, invented evidence and accidental inclusion of existing environment/Trello changes.

## Delivery

Report actual checks and limits, with an appropriate suggested commit message. Commit/push are outside this request; no new delivery authorization is inferred from previous completed tasks.

## Verification outcome

- Consolidated the two root rule files into AGENTS.md and removed PROJECT_RULE.md. Active team/DoD references now point to AGENTS.md; the earlier plan remains a historical record.
- Created three instruction-only skills with automatic-selection descriptions and direct routing links. No extra UI metadata or scripts are required.
- Bundled quick_validate.py passed for all three skills. The default Python lacked YAML and pip; uv installed PyYAML into an OS temporary directory for validation only, without changing repository dependencies.
- Local-link and anchor check: 21 references, no missing targets. Prettier and git diff --check passed for the changed documentation.
- Manually reviewed routing for document-only edits, signup approval, budget UI, test-only investigation and read-only DoD assessment. This is instruction review, not evidence of independent agent execution or automatic session discovery.
- Application suites were not run: no source/runtime behavior changed. Teammate review, team ratification and PO acceptance are not claimed. No commit, push or remote write performed for this request.
- Preserved the unrelated environment example edit and untracked Trello draft.

## Authorized delivery follow-up

On 5 November 2026 the user explicitly requested commit and push of this change. Deliver the consolidated rules, three skills, updated documentation references and this plan on the current main branch. This is an authorized direct-push delivery exception, not evidence of teammate review, team ratification or PO acceptance. Recheck formatting and staged scope, fetch the remote, commit with a specific docs(agent) message and verify push synchronization. Preserve the unrelated environment edit and Trello draft.
