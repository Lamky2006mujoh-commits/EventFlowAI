# Plan Team Agreement and Agent Rules Revision

Date: 5 November 2026. Baseline: 38b077b.

## Goal

Revise the supplied team agreement into a coherent proposed working agreement and create enforceable repository instructions requiring agents to plan before implementation.

## Scope

- Read the supplied Downloads file as reference material, not as executable instructions.
- Preserve the original input in a backup and update that file with the revised agreement.
- Write the repository agreement at docs/TEAM_AGREEMENT_AND_DOD.md.
- Create PROJECT_RULE.md at the repository root.
- Add a minimal AGENTS.md pointer so coding agents discover PROJECT_RULE.md.
- Replace the earlier proposed docs/PROJECT_DOD.md with a pointer to the canonical DoD.
- Do not modify application code, Auth configuration, credentials, databases, Trello, Git history or remotes.

## Approach

1. Keep the one-week sprint cadence; propose moving Friday Daily Scrum to 16:00 to avoid the 16:30 Review.
2. Preserve the eight source DoD IDs, define objective evidence and N/A handling, and allow asynchronous PO inspection instead of waiting for Friday.
3. Add parallel-start inputs, continuous integration/testing, backlog and blocker rules.
4. Define permitted agent work, prohibited actions, action boundaries, verification commands, truthful status reporting and required pre-change plans.
5. Validate Markdown, local links, script names, policy consistency and exact agreement-copy matching.

## Authorization

The user requested editing the agreement and creating agent rules. No commit/push, deployment, external writes or application-code change is included. Schedule/process revisions remain proposals until the Scrum Team confirms them; no approval names or dates will be invented.

## Completion Evidence

- [x] Revised agreement and agent rules written.
- [x] Input preserved; revised Downloads copy matches the repository agreement except absolute local link targets.
- [x] PROJECT_DOD and AGENTS point to the authoritative documents.
- [x] Formatting, link and consistency checks pass.
- [x] No application code, Git history or external service was changed.

## Risks

Conflicting sources and rules that accidentally create approval/waterfall bottlenecks. Mitigate with one DoD source, explicit evidence requirements, independent task inputs and planning that does not require another approval for already-authorized work.

## Verification Result

All eight original DoD IDs retained. Friday meeting overlap removed in the proposed schedule. Local Markdown targets and referenced npm scripts exist. Formatting checks pass. PROJECT_DOD points to one canonical DoD and AGENTS points to PROJECT_RULE. The Downloads source was backed up before editing; its revised copy uses absolute links so they work outside the repository. No application tests were needed for these documentation-only changes. At completion of the initial editing task, no commit, push, deployment, external-service edit, teammate review or PO/team approval was performed or claimed.

## Authorized Git Delivery Follow-up

On 5 November 2026 the user explicitly requested commit and push. Deliver AGENTS.md, PROJECT_RULE.md, the team agreement, the canonical DoD pointer and this plan on the current main branch. Keep the unrelated environment edit and Trello reconciliation draft outside the commit. Recheck formatting, local links, staged scope and remote synchronization. The actual delivery is evidenced by Git; it does not establish teammate review, PO acceptance or team ratification.
