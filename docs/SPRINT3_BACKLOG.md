# EventFlow AI Sprint 3 Backlog and Planning

Planning date: **5 November 2026**.

## Sprint Goal

Deliver a usable workflow from a saved brief to comparable AI concepts, an editable proposal with an itemized budget, and venue options based on the brief location. Preserve agency security and version history, and complete the authentication follow-up carried over from Sprint 2.

This plan includes work already implemented and the remaining validation and acceptance tasks. Priorities and the parallel delivery model below are planning proposals; assignees, estimates, sprint dates, and Product Owner approval remain to be agreed.

**Scenario assumption requested for this plan:** S3-BUG-01 is shown as **Done (assumed)** for a simulated sprint walkthrough. This does not record an actual email-delivery fix or a successful live email test. The factual verification status is retained in the carry-over section.

## Current execution evidence — 5 November 2026

The current implementation and delivery findings are recorded in
[SPRINT3_EXECUTION_REPORT.md](SPRINT3_EXECUTION_REPORT.md). All local story flows
are implemented and regression-tested. Fresh live Gemini/budget/search evidence,
deployment of the local increment and Product Owner acceptance remain separate
gates. The user explicitly deferred the fresh email-delivery test; no email was
sent and its actual acceptance is not marked Done. Upstream backlog commit
`38b077b` has green CI; that run does not verify the uncommitted local increment.

## Sprint Backlog

| ID        | Type                 | Priority | Backlog Item                                                               | Planning Status                                                                       |
| --------- | -------------------- | -------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| S3-BUG-01 | Bug / carry-over     | P0       | Resolve confirmation-email delivery and rate-limit incident from S2-BUG-01 | Done only in scenario; actual email test deferred by user                             |
| US-04     | Story                | P0       | Generate structured event concepts from a saved brief                      | Implemented; current local regression passed                                          |
| US-05     | Story                | P0       | Compare concepts and persist the selected option                           | Implemented; current local regression passed                                          |
| US-06     | Story                | P0       | Generate, edit, and version proposals                                      | Implemented; local regression passed; PO acceptance pending                           |
| S3-US-01  | Story / extension    | P0       | Build an editable itemized proposal budget                                 | Implemented and locally verified; fresh AI budget acceptance pending                  |
| S3-US-02  | Story / extension    | P1       | Search, compare, and select event venues with prices and conditions        | Implemented; local regression passed; real city/nationwide search pending             |
| US-07     | Story                | P1       | Export the latest saved proposal as UTF-8 text                             | Implemented; current local regression passed                                          |
| S3-T01    | Technical / QA       | P0       | Run Sprint 2 and Sprint 3 regression, security, and CI checks              | Local acceptance passed; CI runner unified; delivery CI pending                       |
| S3-T02    | Technical / QA       | P0       | Validate Gemini availability, quota handling, and real search results      | Failure contracts verified; fresh authenticated provider retest pending               |
| S3-T03    | Technical / delivery | P0       | Verify deployment, migrations, configuration, and handover documentation   | Existing functions/7 migrations inspected; local package verified; deployment pending |
| S3-T04    | Acceptance           | P1       | Conduct the sprint review and record acceptance or remaining defects       | Review scenarios prepared; Product Owner decision pending                             |

US-04, US-05, US-06, US-07, and S3-T01 retain the existing Sprint 3 identifiers. S3-US-01, S3-US-02, and S3-T02–S3-T04 are supplemental planning identifiers. S3-BUG-01 continues the existing S2-BUG-01 issue rather than introducing a second independent incident.

## Sprint 2 Carry-over

| Original Item                      | Sprint 3 Destination | Remaining Work                                                                                             | Factual Status                                                              |
| ---------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| S2-BUG-01                          | S3-BUG-01            | Verify the email provider, delivery limits, actual confirmation-email receipt, and successful confirmation | Unresolved; no delivery test or provider fix has been recorded              |
| US-20 outstanding email acceptance | S3-BUG-01            | Verify registration → email receipt → confirmation → membership assignment → login                         | Application code and error guidance implemented; full email flow unverified |
| S2-T01 remote CI follow-up         | S3-T01               | Inspect the remote run for the final delivery commit and resolve failures                                  | A configured workflow and local passes do not establish remote CI success   |

The first two rows are two acceptance concerns for the same email incident, not separate bug estimates. Sprint 2 implementation and test evidence remain unchanged. The simulated Done label applies only to the planning walkthrough.

### S3-BUG-01 Confirmation Email Delivery and Rate Limits

**Independent starting point:** Investigate and test Auth/email directly with a coordinated account. Other items use existing confirmed test accounts and do not wait for this incident to close.

**User outcome:** a new employee can receive a confirmation email, confirm account ownership, and sign in after the agency administrator grants membership.

**Planned tasks**

- Review the active Supabase project's Auth and email-provider configuration and the reported failure codes.
- Resolve the confirmed provider or delivery-limit cause using the project owner's approved configuration.
- Retain clear messages for email limits, unconfirmed email, unauthorized recipient addresses, request limits, and provider errors.
- Coordinate a controlled test account and verify inbox delivery and the complete onboarding flow.
- Record project, attempt time, provider response, receipt time, confirmation result, and login result.

**Acceptance criteria**

1. A confirmation email reaches the agreed test inbox and the link confirms the intended account.
2. Confirmation alone grants no agency or administrator access; membership remains an explicit administrator action.
3. The confirmed account can sign in after membership is assigned, while unconfirmed or unauthorized accounts remain restricted.
4. Rate-limit failures provide useful guidance and do not trigger automatic repeated signup or resend attempts.
5. Closure includes actual delivery evidence; a dashboard-created review account or mocked test is insufficient.

**Scenario status:** Done (assumed). **Actual status:** verification pending; no delivery evidence has been added by preparing this plan.

## Story Acceptance Criteria

### US-04 Generate Structured Event Concepts

**Independent starting point:** Use an existing saved brief fixture and a controlled Gemini adapter. Generate and persist concepts without waiting for comparison, proposal, budget, or export work.

As a planner, I want multiple concepts based on my saved brief so I can evaluate practical directions for the event.

- Generate two or three distinct concepts with a title, theme, activities, and explicit assumptions.
- Validate structured output before saving; handle invalid JSON, incomplete output, timeouts, and provider errors.
- Keep Gemini credentials server-side and check authentication, membership, brief version, and planning revision.
- Preserve existing saved data if generation fails; require confirmation before replacing existing concepts.

### US-05 Compare and Select a Concept

**Independent starting point:** Load two or three seeded concepts through the existing planning contract. Implement and verify comparison/selection without waiting for US-04 generation.

As a planner, I want to compare concepts and save my choice so the proposal uses the intended direction.

- Display themes, activities, and assumptions in a layout usable on desktop and smaller screens.
- Persist selection for the correct brief and agency.
- Reject foreign or stale concept identifiers.
- Require a current concept selection before generating a proposal.

### US-06 Generate and Version Proposals

**Independent starting point:** Start with a seeded brief, selected concept, and saved proposal/history. Implement generation, editing, persistence, and replacement checks without waiting for US-04 or US-05.

As a planner, I want to review and edit a generated proposal without losing earlier work.

- Generate objectives, audience, theme, agenda, assumptions, and the associated proposal title.
- Append immutable versions with author, timestamp, source brief version, and selected concept.
- Confirm regeneration and protect unsaved edits when navigating or replacing content.
- Reject stale writes and mark output from an earlier brief for review.
- Keep new and edited versions in Draft. A proposal approval workflow is outside this sprint.

### S3-US-01 Itemized Proposal Budget

**Independent starting point:** Use standalone Budget fixtures, a brief ceiling, and an existing/legacy proposal snapshot. Verify editing, arithmetic, and persistence without waiting for proposal generation or venue search.

As a planner, I want a complete estimated cost breakdown so I can assess and adjust the proposal against the client budget.

- Support venue, catering, production/AV, decoration, staffing, marketing, transport, permits/safety/insurance, and other relevant costs.
- Store category, description, quantity, unit, VND unit cost, and notes for each line.
- Calculate line amounts, subtotal, contingency, additional tax, total, and the remaining budget or overspend deterministically.
- Allow editing, adding, and removing cost lines with validation.
- Keep estimates, unknown taxes, and supplier assumptions explicit; avoid double-counting venue packages.
- Preserve legacy proposals and add budgets through a new saved version.
- Complete a live test of fresh AI generation under the expanded budget contract.

### S3-US-02 Venue Search and Selection

**Independent starting point:** Start from the saved brief contract and venue/price fixtures. Search requires no concept; verify rental updates using an existing proposal/budget snapshot rather than waiting for their owners.

As a planner, I want sourced venue options with rental costs and conditions so I can choose a suitable location.

- Use the location in the saved brief: a city such as TP.HCM covers the whole city and nearby cities; Vietnam covers the country.
- Search before or after concept creation and accept additional venue preferences.
- Display venue name, address, capacity where known, suitability, price range and unit, included services, conditions, and source links.
- Distinguish sourced reference prices, AI estimates, and quote-required results. Do not claim confirmed availability.
- Let the planner select a venue and rental quantity. Update the venue allocation and append a proposal version when applicable.
- Preserve saved prose, non-venue costs, and previous versions. Unknown rental prices retain a clearly provisional allocation.
- Reject selections from stale searches or a different brief/agency.
- Complete real Google-grounded search checks for both city and nationwide briefs. Demo fixtures do not establish actual rental prices.

### US-07 Export Saved Proposals

**Independent starting point:** Read a seeded saved proposal with representative budget/venue variants. Build and verify the formatter/download without waiting for live generation or venue search.

As a planner, I want to download the saved proposal for review and sharing.

- Export the latest saved proposal as UTF-8 TXT with title, sections, version, status, author, and source brief version.
- Include itemized budget lines and totals, plus the selected venue, conditions, and sources where present.
- Exclude unsaved edits and avoid unreadable object representations.
- Surface export failures without changing saved content or proposal status.

## Technical and Acceptance Tasks

### S3-T01 Regression Security and CI

**Independent starting point:** Extend existing tests and CI immediately. Support item owners and run cross-feature checks continuously rather than waiting for all features to finish.

- Rerun authentication, brief validation, version history, role management, and agency-isolation regressions from Sprint 2.
- Verify proposal generation, manual edits, regeneration confirmation, venue selection, budget calculations, export, and reload.
- Test invalid or expired authentication, cross-agency access, membership removal, stale writes, malformed provider output, and provider failures.
- Run lint, frontend/function type checks, production build, PostgreSQL migration/bootstrap checks, and Chromium E2E.
- Inspect the remote CI run for the final delivery commit and link the actual result.

**Existing evidence:** 51/51 project unit/integration checks, 8/8 demo browser scenarios, and 1/1 live Supabase browser workflow passed on 4 November 2026. The 29-test authentication/brief/database group passed on 5 November 2026. These results do not establish live email delivery or successful live venue search.

### S3-T02 Live AI and Search Verification

**Independent starting point:** Probe the existing provider adapter directly using synthetic inputs. Record quota and source-evidence results without waiting for the full UI workflow.

- Confirm that the configured Gemini model and project quota support structured output and Google Search grounding.
- Verify real concept/proposal generation, including the required budget.
- Search real city and nationwide venue briefs; inspect source citations, geography, units, price evidence, and unknown-price handling.
- Confirm controlled quota, rate-limit, timeout, and unavailable-provider errors without overwriting saved work.
- Store sanitized evidence without API keys or private client data.

**External verification gate:** the previous live venue checks returned HTTP 503 and then HTTP 429 RESOURCE_EXHAUSTED. Fresh AI budget generation and grounded venue search remain unverified until a successful retest.

### S3-T03 Deployment and Handover

**Independent starting point:** Verify the current environment, packaging, migration compatibility, and documentation immediately; verify each subsequent change incrementally.

- Verify the deployed workspace and planning functions, applied migrations, migration ledger, and existing data compatibility.
- Check frontend public URL/key matching, allowed origins, server-only Gemini secrets, and agency access.
- Confirm the application can read, save, export, and reload against the intended Supabase project.
- Update setup instructions, backlog statuses, test results, and the known-issues list.
- Keep credentials and private environment files out of Git.

**Existing deployment:** both functions and six migrations are recorded for the active project. This plan does not claim a new deployment or a publicly hosted frontend.

### S3-T04 Sprint Review and Acceptance

**Independent starting point:** Prepare scenarios and decision records immediately. Review available increments throughout the sprint; reserve final integrated acceptance for the working increment.

- Demonstrate onboarding, a saved brief, concept comparison, proposal editing, budgets, venue selection, version history, and export.
- Use real provider-backed results for acceptance of live AI/search items.
- Record Product Owner decisions and unresolved defects.
- Close actual delivery items only when their acceptance evidence is available; keep the simulated email status separate.

## Parallel Delivery Model

The product still has an ordered user journey, but that journey is not the team's implementation order. A user must select a concept before generating a proposal; the proposal developer can start with a seeded selected concept without waiting for the selection developer.

All eleven items can begin from the existing repository baseline. No item requires another Sprint 3 item to be marked Done before implementation starts. Existing shared contracts, persisted sample records, and controlled service adapters provide the starting inputs.

### Independent Starting Points

| Item      | Owned Deliverable                                                           | Input Available at the Start                                                  | Independently Verifiable Result                                                                                                        |
| --------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| S3-BUG-01 | Confirmation-email diagnosis, delivery fix, and onboarding evidence         | Existing Auth flow, error cases, and one coordinated test account             | Email receipt and confirmation evidence; other owners use existing confirmed test accounts                                             |
| US-04     | Concept generation, validation, persistence, and failure handling           | Saved brief fixture and provider success/error responses                      | Valid concepts saved for the correct source version; failures preserve data                                                            |
| US-05     | Concept comparison and persisted selection                                  | Two/three seeded concepts and a known planning revision                       | Responsive comparison, selected-state persistence, and foreign/stale-ID rejection without calling generation                           |
| US-06     | Proposal generation, editing, history, and replacement protection           | Seeded brief, selected concept, and proposal/history fixtures                 | Validated proposal snapshots, manual edits, confirmation, and stale-write rejection without running US-04 or US-05                     |
| S3-US-01  | Itemized budget editor, calculations, validation, and version/export data   | Budget fixtures, brief budget ceiling, and legacy proposal fixture            | Exact totals, editable lines, overspend warning, and legacy upgrade without waiting for proposal generation or a venue search          |
| S3-US-02  | Venue search, comparison, selection, and rental update behavior             | Saved brief plus city/nationwide, sourced/estimated/unknown-price fixtures    | Correct search scope, evidence labels, selection snapshot, and a deterministic rental update without a concept-generation prerequisite |
| US-07     | Saved-proposal TXT formatter and download behavior                          | Persisted proposal fixtures with/without budget and venue data                | Correct exported content and metadata; unsaved edits excluded; export failure leaves data unchanged                                    |
| S3-T01    | Security/regression coverage, contract checks, and CI evidence              | Existing test harness, migrations, Auth fixtures, and module contracts        | Executable tests and CI checks from the first changes; each item adds its own tests                                                    |
| S3-T02    | Provider capability probes, quota/error checks, and live AI/search evidence | Existing Gemini adapter and public synthetic brief/concept/budget fixtures    | Provider behavior checked directly, without requiring a completed UI journey                                                           |
| S3-T03    | Deployment/configuration checks, compatibility checks, and handover         | Existing functions, migration ledger, build scripts, and deployment checklist | Baseline environment verified immediately; each accepted change packaged and checked incrementally                                     |
| S3-T04    | Review scenarios, acceptance checklist, feedback, and decision log          | Existing acceptance criteria and representative saved examples                | Review material prepared immediately; working increments reviewed as they become available                                             |

Each story owns a testable user-facing slice, including the required UI, service, persistence, and tests. Do not create a frontend-finished → backend-starts → QA-starts handoff chain within the item.

### Shared Interfaces and Test Data

Use the existing Zod contracts as the starting agreement; creating a new shared-platform task is not a prerequisite for the sprint.

| Contract                                 | Consumers                                       | Stable Agreement                                                                                                                      |
| ---------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Brief / BriefData                        | Concepts, proposal, budget, venue search, tests | Saved ID/version, location, attendees, budget, objectives, and constraints                                                            |
| Concept and planning selection           | Concept generation, comparison, proposal        | Concept ID, title, theme, activities, assumptions, selected ID, and revision                                                          |
| ProposalData and saved proposal snapshot | Proposal, budget, venue selection, export       | Narrative sections, optional legacy-compatible budget/venue data, version, author, timestamp, source brief version, and concept ID    |
| Budget                                   | Budget editor, proposal, venue update, export   | VND line items, quantity, unit, unit cost, notes, contingency/tax percentages, and assumptions; totals calculated by application code |
| VenueSearch / SelectedVenue              | Venue search, proposal/budget update, export    | Search scope, source brief version, prices/units/evidence, sources, selection quantity, and unconfirmed availability                  |
| Auth, membership, and request errors     | All protected items and QA                      | Server-derived identity/agency, fixed authorization rules, controlled errors, and no access granted by fixtures                       |

Starting examples must cover a saved brief, two and three concepts, a selected concept, a saved proposal with history, a legacy proposal, an itemized budget, city/nationwide venues, unknown prices, and stale/unauthorized requests. Reuse the existing synthetic fixtures in the test suites and saved example outputs; validate local adapters against the same contracts as real responses.

A fixture is a development input, not a replacement product requirement. Seed the test database or supply a test adapter rather than adding production shortcuts that bypass selection, approval, or authorization.

### Ownership and Daily Coordination

- Give each item an owner and a reviewer at sprint planning; names and estimates remain unassigned until the team agrees capacity.
- Owners start their slices together and include their own acceptance tests. S3-T01 supports cross-cutting quality rather than receiving all testing at the end.
- Keep changes within the relevant component/service and use small, frequently integrated changes. Shared-file edits are coordination points, not full-item handoffs.
- When a contract changes, notify affected owners immediately, review the change together, and update the contract example and affected tests in the same change. Prefer compatible additions over breaking another owner's working input.
- Use daily coordination to inspect progress toward the sprint goal, contract mismatches, integration failures, and external blockers. Pair on a mismatch rather than waiting for another item to finish.
- Priorities guide scope decisions and available capacity; they do not impose an execution sequence. Parallel-ready work does not mean every developer must keep several items in progress.

### Continuous Integration and Review

Integrate each available slice against the real adapter/persistence path early and repeatedly. For example, US-05 can exercise selection on seeded records while US-04 tests generation; US-07 can export persisted proposal fixtures while US-06 tests editing.

As the real components become available, replace the corresponding test adapter and rerun the relevant checks. The originating item and its counterpart jointly resolve a contract mismatch. Do not postpone all connection work to a final integration phase or pass unfinished story testing to S3-T01.

Keep cross-feature checks running throughout the sprint: brief-version checks, persisted selection, proposal snapshots, venue-to-budget updates, saved export, and agency authorization. S3-T03 verifies deployable changes incrementally, and S3-T04 gathers review feedback on available increments.

The final end-to-end demonstration and Product Owner decision still require the integrated increment. Preparing and carrying out those checks does not require the review owner to remain idle until every story is finished.

### External Gates and Completion Rules

| Gate                                          | Work That Can Continue                                                                                                  | Evidence Still Required                                                                         |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Confirmation-email provider or delivery limit | All planning stories, local Auth/approval regressions, and protected live checks using existing confirmed test accounts | Real receipt, confirmation, and onboarding evidence for S3-BUG-01                               |
| Gemini quota or service availability          | UI, contracts, deterministic calculations, persistence, error handling, export, and mocked-provider tests               | Successful live generation/search evidence wherever the original acceptance criteria require it |
| Live deployment access                        | Local migration tests, packaged functions, build/config checks, documentation, and review preparation                   | Actual deployment and smoke checks for the intended environment                                 |
| Integrated review availability                | Item-level review, prepared scenarios, feedback collection, and acceptance records for available increments             | Integrated sprint review and actual Product Owner decisions                                     |

Track an external gate against the affected acceptance check, not as a predecessor for the entire sprint. Provider-backed acceptance remains pending if the provider cannot be tested successfully. Do not weaken production authentication, mark fixtures as live evidence, or declare full completion merely because isolated tests pass.

## Definition of Done

An item is Done when its original acceptance criteria pass, its relevant tests pass, its boundary with real application contracts/persistence is verified, and required deployment evidence and documentation are available. Fixtures allow independent development and testing; they do not waive live email/search requirements or integrated behavior.

Each owner supplies evidence for their own item. Cross-feature regression and review occur throughout the sprint; neither is a final phase that substitutes for story-level quality. Record sprint-level Product Owner acceptance separately. The explicitly labeled email planning assumption remains separate from actual completion.

## Scope Preservation

The sprint goal, eleven backlog IDs, priorities, user outcomes, acceptance criteria, and recorded verification limits are retained. This revision changes how work starts, is owned, is tested, and is integrated; it adds no new product features and removes no acceptance obligations. Runtime relationships remain part of the product, while predecessor-story completion is removed as a development-start condition.

## References

- [Sprint 2 backlog and carry-over source](SPRINT2_BACKLOG.md)
- [Sprint 3 setup](SPRINT3_SETUP.md)
- [Baseline deployment and test report](SPRINT3_TEST_REPORT.md)
- [Budget and venue extension verification](BUDGET_VENUES_TEST_REPORT.md)
- [Supabase and signup troubleshooting](SUPABASE_SETUP.md)
