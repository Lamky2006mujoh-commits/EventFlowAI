# EventFlow AI Team Agreement and Definition of Done

**Version:** 2.0 proposed revision

**Updated:** 5 November 2026

**Timezone:** Asia/Ho_Chi_Minh, ICT, UTC+07:00

**Status:** Prepared at the project owner's request. Meeting changes and team standards require Scrum Team confirmation before being represented as an approved team agreement. No approval record has been supplied.

This agreement describes how the team plans, collaborates, verifies work and records completion. It retains the original one-week cadence and eight DoD identifiers while resolving the Friday scheduling conflict and making their application testable.

The source was the supplied TEAM_AGREEMENT_AND_DOD.md transcription. Its referenced handwritten images have not been independently rechecked. This revision is a proposed working agreement, not a claim that the original notes already contained every rule below.

## 1 Team Cadence

Sprints run from Monday through Friday. All times below are local ICT.

| ID    | Event or practice    | Proposed agreement                                                                                |
| ----- | -------------------- | ------------------------------------------------------------------------------------------------- |
| TA-01 | Sprint duration      | One working week, Monday to Friday; record actual sprint dates in Trello                          |
| TA-02 | Sprint Planning      | Monday 09:00–09:45                                                                                |
| TA-03 | Daily Scrum          | Monday–Thursday 16:30–16:45; Friday 16:00–16:15                                                   |
| TA-04 | Sprint Review        | Friday 16:30–17:00                                                                                |
| TA-05 | Sprint Retrospective | Friday 17:00–17:30                                                                                |
| TA-06 | Trello updates       | Update progress, evidence and blockers daily and whenever their state changes                     |
| TA-07 | Delivery discipline  | Work toward agreed commitments; report deadline risk early and renegotiate the plan transparently |

Friday's Daily Scrum moves from 16:30 to 16:00 so it does not overlap the Review. This is a proposed change, not a recorded team decision. Exact timeboxes may be adjusted by the team; do not silently change the agreed schedule or invent attendance.

Daily Scrum focuses on progress toward the Sprint Goal and the next actionable plan. Detailed debugging and design discussions continue separately with the people involved.

## 2 Responsibilities and Decisions

- The Product Owner clarifies product value, orders the Product Backlog and confirms story acceptance. Record the actual person and decision when available.
- Developers select work according to capacity, own implementation and testing, review each other's changes and adapt the Sprint Backlog.
- The Scrum Master facilitates the agreed process and helps expose and remove impediments.
- AI agents assist the team under [AGENTS.md](../AGENTS.md). They are not the Product Owner, a human reviewer or an approver.
- Existing assignees, estimates and historical sprint labels are preserved unless the responsible team changes them. Unassigned values remain unassigned.
- Product or technical changes that affect the Sprint Goal are discussed with the responsible people; no one silently adds unrelated scope.

## 3 Planning Before Implementation

Every change starts with a visible plan. Read-only discovery may be performed to make that plan accurate.

A plan states the intended outcome, in/out scope, affected components/files, acceptance criteria, approach, independent inputs, verification, risks and any external action requiring authorization.

For substantial work, save it under docs/plans and link it to the card or PR. Small documentation-only edits may use a concise plan in the task discussion.

Publishing a plan does not automatically require a second approval. When the request already authorizes routine, reversible work and the scope is clear, implementation can proceed. Stop for clarification only when a material requirement, required access or consequential action is not authorized.

If new findings change the plan, update it and explain the change before expanding the work.

## 4 Parallel Work and Integration

The product journey is not the developer execution order. Concept generation, comparison, proposal editing, budgets, venues and export can start from shared contracts and seeded records.

- Use the current Zod contracts and existing synthetic fixtures as the initial interface agreement.
- Each story owns a usable slice including relevant UI, service, persistence and tests. Do not split the sprint into frontend, backend and QA handoff phases.
- Examples: comparison starts with seeded concepts; proposal work starts with a seeded selection; budgets use Budget fixtures; export uses saved proposal snapshots.
- Pair on shared-file or contract changes and update affected fixtures/tests together. Integrate small changes frequently rather than connecting everything at sprint end.
- QA, deployment preparation and review preparation start with available increments and continue throughout the sprint.
- External email or Gemini problems block only the affected acceptance checks. Other owners can use valid fixtures or existing confirmed test accounts.
- Fixtures do not bypass production authorization or replace required live evidence.

## 5 Backlog and Trello Rules

Maintain one ordered Product Backlog and one canonical card for each outcome or defect. Link carry-over work to its original ID instead of creating duplicate estimates.

Every actionable card contains:

1. User outcome and bounded scope.
2. Observable acceptance criteria.
3. Independent starting input or contract.
4. Owner/reviewer when assigned and relevant evidence links.
5. Remaining work, blocker, next action and current delivery environment.
6. The applicable DoD checklist and justified N/A entries.

Use existing board lists with these meanings:

| State                 | Meaning                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| Product Backlog       | Ordered future or unfinished work                                                                    |
| Ready                 | Clear enough to start using current contracts and inputs; not a separate approval phase              |
| In Progress           | Work is actively being implemented or verified                                                       |
| Review / Verification | Implementation exists but required review, tests, deployment or acceptance evidence is incomplete    |
| Blocked               | A named condition prevents a required check; record the affected criterion and next action           |
| Done                  | Every applicable DoD condition has evidence, including the recorded PO acceptance required by DOD-08 |

A blocker is surfaced when discovered, not saved for the next meeting. Deadline pressure, a green test count, a merge or a presentation does not justify a false Done status.

Historical completion is not rewritten silently when scope expands. Keep baseline evidence and track the new increment or missing acceptance separately.

## 6 Code Review and Delivery

- Default to a focused working branch and a reviewable PR; link the story, plan, behavior change and verification.
- At least one teammate other than the author reviews the change. Self-review or an AI review can assist but does not impersonate that teammate.
- Merge only after the relevant checks pass and unresolved critical defects are addressed.
- Direct main pushes or another delivery exception require explicit authorization covering that action. Record the exception; it does not silently satisfy the PR-review requirement.
- Preserve other people's uncommitted work and private environment files. Do not rewrite shared history or change applied migrations to make tests pass.
- Apply new migrations and deploy functions in the documented order. Code present locally or in Git is not evidence of live deployment.
- Reuse existing authorizations that actually cover the action; do not repeatedly ask for the same permission. Never infer PO approval from permission to implement or push.

## 7 Definition of Done

These are the eight source conditions, with project-specific evidence requirements. Acceptance criteria define what a story does; DoD defines the shared completion standard.

| ID     | Condition                                                                        | Required evidence                                                                                                                                                                                                               |
| ------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOD-01 | Code is complete and meets the Acceptance Criteria                               | Every criterion has an actual pass/fail result; the feature is integrated with current contracts and persistence; required environment/deployment checks are complete                                                           |
| DOD-02 | Relevant unit/integration tests are run and passed                               | Commands, tested commit and results; include database/API/browser coverage where the change requires it; do not combine overlapping suites as independent totals                                                                |
| DOD-03 | TypeScript checks and production build are successful                            | Relevant lint/type/build/package results; existing non-blocking warnings are recorded rather than hidden                                                                                                                        |
| DOD-04 | Pull Requests have been reviewed and merged                                      | PR URL, actual teammate review and merge commit; an authorized delivery exception must be recorded and explicitly accepted by the responsible maintainer                                                                        |
| DOD-05 | There are no known critical errors within the Story                              | No unresolved authorization bypass, secret exposure, data loss/corruption or failure preventing the required user outcome; other defects have linked follow-ups                                                                 |
| DOD-06 | The UI meets agreed responsive and accessibility requirements                    | For UI changes: test applicable workflows at 1440×1000 desktop and 390×844 mobile; no unintended horizontal overflow; meaningful labels, keyboard-operable controls, visible focus and clear loading/error/success/empty states |
| DOD-07 | AI output is validated using Zod and business rules are checked upon application | Runtime-schema validation plus applicable business-rule and failure tests; distinguish structural validity, factual evidence and human review; live-provider criteria require live-provider evidence                            |
| DOD-08 | The feature has been demoed and approved by the Product Owner                    | Working feature demonstration and explicit PO acceptance linked to the card, with actual person, date, environment/commit and outcome                                                                                           |

PO inspection and acceptance may occur asynchronously or on an available increment during the sprint. DOD-08 does not require every developer to wait until Friday's Review before integrating work or receiving feedback. Until acceptance is recorded, use Review / Verification rather than inventing an approval.

### Applicability and N/A

- UI-only conditions can be N/A for work without a UI; AI-output checks can be N/A for work without AI.
- Pure documentation work uses content, link and consistency checks rather than unnecessary application builds. Record why code/build-specific checks do not apply.
- Every N/A has a reason reviewed by the responsible teammate/PO as appropriate. Missing evidence, unavailable credentials, failed checks and external-service problems are pending/blocked, not N/A.
- The agent reports evidence and gaps; it does not grant itself a waiver or fabricate reviewer/PO decisions.
- Review this proposed standard with the team before claiming it is an approved organization policy. Do not retroactively fabricate compliance for earlier work.

## 8 Project-specific Quality Checks

Apply these checks under the relevant DoD conditions, not as new product scope.

**Authentication and authorization**

- Signup grants neither membership nor admin role. Invalid routing/setup stops the revised signup flow.
- Only the owning agency's administrator can approve a confirmed account as member.
- Pending/rejected users stay outside the workspace. Approval/rejection saves canonical reviewer/time atomically and competing decisions do not grant access twice.
- Verify anonymous/member/cross-agency denial, session expiry, logout and revoked membership where affected.

**Briefs and saved versions**

- Validate input, preserve immutable snapshots and author/time, and reject stale writes.
- Failed operations do not report success or overwrite saved work.

**AI**

- Handle malformed/truncated output, timeouts, rate limits and provider failure with bounded configured attempts.
- Keep secrets server-side. AI text and external content are untrusted input.
- Schema-valid output is not automatically factual, approved or feasible.

**Budgets, venues and export**

- Calculate VND totals with application code; check quantities, contingency, additional tax and overspend.
- Identify bundled services to avoid double-counting costs.
- Venue scope follows the saved brief; reference prices, AI estimates and quotation-required results have distinct labels and units.
- Preserve sources and uncertainty; do not claim confirmed availability or bookings.
- Export the latest saved proposal with relevant metadata/budget/venue data; exclude unsaved edits.
- A mocked venue result or older narrative proposal is not evidence of real grounded search or fresh generation under the expanded budget contract.

## 9 Verification and Evidence

Choose checks appropriate to the change:

| Change                       | Relevant commands or evidence                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Shared application/API logic | npm test; npm run lint; npm run build                                                          |
| Edge Functions/contracts     | npm run check:functions; npm run verify:edge; relevant API/database tests                      |
| Proposal/budget/venue UI     | npm run test:e2e; targeted visual and interaction checks                                       |
| Signup/approval UI           | npm run test:e2e:onboarding; relevant database/HTTP tests                                      |
| Existing live workspace      | npm run test:e2e:live only within the authorized test scope; it saves a proposal version       |
| Real AI/search               | npm run test:ai:live / npm run test:venues:live only within the authorized provider-test scope |
| Auth connection health       | npm run check:auth; read-only configuration check, not email-delivery evidence                 |
| Documentation-only change    | Formatting, links, terminology, scope and cross-document consistency                           |

Record test mode (local, mocked, PostgreSQL fixture, live), tested commit, environment, command, result and remaining limits. Never store passwords, tokens or private client data in evidence.

As of the last recorded implementation, signup approval is locally tested but its new live rollout is pending; actual email delivery and successful live venue/expanded-budget generation remain unverified. These are evidence boundaries, not new test results from editing this document.

## 10 Approval and Change Control

**Team confirmation:** not yet recorded. Do not fill names or dates without actual confirmation.

Before adoption, confirm the revised Friday cadence, reviewer arrangement, UI baseline, N/A handling and the DoD evidence/PO process.

For future revisions, record version, date, reason, affected rules and actual confirmation. A rule change must not erase historical evidence or silently lower quality to close a card.

| Version      | Date            | Change                                                                                           | Confirmation                       |
| ------------ | --------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 1.0          | 5 November 2026 | Supplied transcription of team notes                                                             | Source marked confirmation pending |
| 2.0 proposed | 5 November 2026 | Resolve schedule overlap; clarify parallel work, evidence, eight DoD checks and agent boundaries | Pending Scrum Team confirmation    |

[Agent execution rules](../AGENTS.md) implement this workflow for coding agents. [Project DoD reference](PROJECT_DOD.md) points to this section rather than maintaining a competing checklist.
