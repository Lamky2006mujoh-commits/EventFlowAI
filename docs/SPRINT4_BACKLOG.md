# EventFlow AI Sprint 4 Backlog — AI Logistics & Resource Planning

Planning revision: **5 November 2026**. **Proposed selection; implementation and acceptance not asserted.**

## 1 Authoritative Source

**EventFlow_AI_User_Stories.docx**, Product Backlog v1.0, **03 November 2026**, **EPIC 3 — AI Logistics & Resource Planning**. Supplied location: C:/Users/buing/OneDrive/Documents/EVENTFLOWAI/EventFlow_AI_User_Stories.docx.

Source SHA-256: 5b699d468026e8ef5ee1753278cc5665f572257ecb2a915bcbb85d26e49a7303.

Use original IDs **US-08–US-12**. Role, priority, user-story text and the two acceptance criteria for each story below are reproduced unchanged from the supplied source. AC-1/AC-2 are local references to those criteria, not new backlog identifiers.

Implementation tasks, verification cases and integration notes are proposed decomposition, not additional approved stories or replacements for the source criteria. Product-scope changes need explicit refinement with the responsible people.

The previous draft's invented S4-US identifiers, estimates, manual-checklist/transport/readiness stories and optional AI/export stories are removed. Generation and suggestions remain in their original logistics stories; they are not optional substitutes for manual CRUD.

## 2 Sprint Goal and Selection

Turn a selected concept and event inputs into reviewable equipment/resource requirements, staffing suggestions, a setup/rehearsal/teardown timeline and a categorized logistics estimate. If US-12 is selected, recorded supplier quotes/availability replace assumptions and inform recalculation. Human review remains required; suggested resources are not confirmed stock.

| ID    | Source role             | Source priority | Item                                             | Proposed selection               | Estimate / owner / reviewer |
| ----- | ----------------------- | --------------- | ------------------------------------------------ | -------------------------------- | --------------------------- |
| US-08 | Logistics Coordinator   | P0              | Generate Equipment and Resource Requirements     | Core candidate                   | TBD / TBD / TBD             |
| US-09 | Logistics Manager       | P0              | Suggest Staffing Roles and Shifts                | Core candidate                   | TBD / TBD / TBD             |
| US-10 | Production Manager      | P0              | Generate Setup, Rehearsal and Teardown Timeline  | Core candidate                   | TBD / TBD / TBD             |
| US-11 | Event Planner           | P0              | Calculate a Categorized Logistics Estimate       | Core candidate                   | TBD / TBD / TBD             |
| US-12 | Procurement Coordinator | P1              | Record Supplier Quotes and Resource Availability | P1 candidate if capacity permits | TBD / TBD / TBD             |

The source defines P0 as essential MVP and P1 as next release. Preserve those priorities. The team selects a capacity-based subset during Planning; no invented points, velocity, sprint dates or assignees are supplied. All entries remain proposed, not verified Done. Reuse existing Sprint 3 budget functionality where compatible, but do not treat general proposal-budget evidence as completion of every logistics criterion.

## 3 Canonical Stories and Decomposition

### US-08 — Generate Equipment and Resource Requirements

**Source:** EPIC 3 | **Role:** Logistics Coordinator | **Priority:** P0 | **Estimate/owner/reviewer:** TBD.

**Original user story**

> As a Logistics Coordinator, I want to generate an equipment and resource list based on the selected concept so that I can estimate what the event requires.

**Original acceptance criteria — unchanged**

1. Given a selected concept and attendance estimate, when I generate a logistics plan, then it provides item categories, quantities, purpose and assumptions.
2. Given quantities are suggested, when displayed, then they are editable and not described as confirmed stock.

**Independent starting input**

Saved selected concept, attendance estimate and resource fixtures; use a controlled provider adapter without waiting for staffing, timeline or supplier stories.

**Proposed implementation tasks**

- Define and validate equipment output: category, item, quantity/unit, purpose and assumptions.
- Generate through an authenticated server-side AI service; keep credentials private and validate output before displaying/saving.
- Allow review and quantity editing; persist reviewed data with source revision and author/time. Do not present suggestions as confirmed stock.

**Verification mapped to the original criteria**

- AC-1: Generate from a concept/attendance fixture; verify categories, quantities, purpose and assumptions.
- AC-2: Edit a suggested quantity, save/reload and verify the changed quantity; check that no confirmed-stock claim appears.
- Quality: invalid quantities, malformed output, timeout/quota, unauthorized/stale save and preservation of existing data.

### US-09 — Suggest Staffing Roles and Shifts

**Source:** EPIC 3 | **Role:** Logistics Manager | **Priority:** P0 | **Estimate/owner/reviewer:** TBD.

**Original user story**

> As a Logistics Manager, I want to get suggested staffing roles and shift requirements so that I can prepare a staffing plan.

**Original acceptance criteria — unchanged**

1. Given event duration, activities and attendees, when I request staffing suggestions, then the output lists roles, indicative headcounts and shift time windows.
2. Given staffing recommendations are generated, when I review them, then I can modify quantities before saving.

**Independent starting input**

Seeded duration, activities, attendees and staffing output. No predecessor-Done gate on equipment generation or timeline implementation.

**Proposed implementation tasks**

- Define staffing role, indicative headcount, dated shift window and assumptions.
- Generate suggestions from event duration, activities and attendees; validate the response.
- Support modifying headcounts before save and persist reviewed staffing suggestions. Operational staffing roles must not grant application permissions.

**Verification mapped to the original criteria**

- AC-1: Request suggestions with known inputs and check roles, indicative headcounts and shift windows.
- AC-2: Change a headcount before saving, reload and verify persistence.
- Quality: positive whole-person headcounts, valid dated windows, missing inputs, provider failure and agency/revision checks.

### US-10 — Generate Setup, Rehearsal and Teardown Timeline

**Source:** EPIC 3 | **Role:** Production Manager | **Priority:** P0 | **Estimate/owner/reviewer:** TBD.

**Original user story**

> As a Production Manager, I want to generate a setup, rehearsal and teardown timeline so that I can coordinate event operations.

**Original acceptance criteria — unchanged**

1. Given event date, start time and planned activities, when I generate a schedule, then milestones and estimated durations are returned in chronological order.
2. Given a milestone exceeds the available venue window, when checked, then the plan is flagged for review.

**Independent starting input**

Seeded event date/start time, activities and venue-access window. No need to wait for live venue search, equipment or staffing completion.

**Proposed implementation tasks**

- Generate milestones covering setup, rehearsal and teardown with estimated durations.
- Display chronological order using timezone-aware dated timestamps; persist source revision and reviewed output.
- Check milestones deterministically against the available venue window; identify the offending milestone and boundary. Missing venue-window data needs clarification, not assumed access.

**Verification mapped to the original criteria**

- AC-1: Generate from fixed timing/activities; verify milestone presence, durations and chronological order.
- AC-2: Test setup before venue access and teardown after closing; verify review flags. Also test milestones within the window.
- Quality: overnight dates, timezone display, invalid/reversed times, missing window, invalid provider output and auth/persistence/conflict cases.

### US-11 — Calculate a Categorized Logistics Estimate

**Source:** EPIC 3 | **Role:** Event Planner | **Priority:** P0 | **Estimate/owner/reviewer:** TBD.

**Original user story**

> As a Event Planner, I want to see a categorized estimated logistics budget so that I can assess likely event cost.

**Original acceptance criteria — unchanged**

1. Given logistics line items and reference unit prices, when I request an estimate, then the system calculates line totals and an overall estimate.
2. Given a price is unknown, when estimating, then the item is marked Unpriced instead of inventing a confirmed quote.

**Independent starting input**

Standalone logistics line items with known and unknown reference prices. Reuse compatible Sprint 3 budget utilities; do not wait for generated equipment or real supplier quotes.

**Proposed implementation tasks**

- Map logistics categories, quantities, unit prices and source/status to the current budget model. Extend rather than duplicate compatible Sprint 3 behavior.
- Calculate line/category totals and overall estimate deterministically. Unknown price is distinct from zero and displayed as Unpriced.
- Show known-price subtotal with an incomplete-estimate indication when items are Unpriced. Save/reload with source references and avoid duplicate logistics/proposal charges.

**Verification mapped to the original criteria**

- AC-1: Assert exact line totals, categorized totals and overall estimate for known prices after save/reload.
- AC-2: Verify unknown prices show Unpriced without invented quotes; distinguish genuine zero from unknown.
- Quality: invalid values, changed prices, duplicate-cost mapping, existing tax/contingency regression where reused, stale writes and agency isolation.

### US-12 — Record Supplier Quotes and Resource Availability

**Source:** EPIC 3 | **Role:** Procurement Coordinator | **Priority:** P1 | **Estimate/owner/reviewer:** TBD.

**Original user story**

> As a Procurement Coordinator, I want to record supplier quotes and resource availability so that I can replace assumptions with verified information.

**Original acceptance criteria — unchanged**

1. Given a resource requirement, when I enter a supplier quote or availability record, then its source, date and status are saved.
2. Given a new quote is entered, when the budget is recalculated, then the updated estimate uses the recorded data.

**Independent starting input**

Seeded resource requirements, quote/availability records and an estimate adapter. Start without waiting for US-08 generation or US-11 integration.

**Proposed implementation tasks**

- Record quotes and availability against a resource requirement, retaining source, date, status and author/time. Capture amount/quantity/unit where applicable.
- Preserve previous records and explicitly identify which recorded quote is used when alternatives exist. Do not silently select an arbitrary supplier.
- On recalculation, use the selected recorded quote rather than the earlier assumption; expose the changed estimate and its source, without duplicate charges. Saving records does not book or pay a supplier.

**Verification mapped to the original criteria**

- AC-1: Save/reload a quote and an availability record; verify source, date and status remain linked to the correct resource.
- AC-2: Recalculate using a new recorded quote and verify the updated line/overall estimate uses that data.
- Quality: multiple quotes, missing source/date/status, invalid prices, unavailable stock, foreign IDs, stale writes and recalculation failure without false success.

## 4 Parallel Delivery

Runtime relationships remain real: generation uses selected concept/event inputs, supplier records reference requirements, and estimates use recorded prices. Developers do not wait for a predecessor story to be Done before starting.

| Story | Independent input                               | Integration responsibility                        |
| ----- | ----------------------------------------------- | ------------------------------------------------- |
| US-08 | Concept/attendance fixture and provider adapter | Validated requirement IDs/data                    |
| US-09 | Duration/activity/attendee fixture              | Role/headcount/shift semantics                    |
| US-10 | Event timing/activity/venue-window fixture      | Chronological milestones and window checks        |
| US-11 | Priced/Unpriced line-item fixture               | Canonical calculations and recalculation contract |
| US-12 | Seeded requirements/quotes and estimate adapter | Actual recorded-quote-to-budget integration       |

Agree shared shapes and synthetic fixtures early; coordinate shared-file changes. Each story includes its UI, service, persistence and tests. Fixtures permit independent starts but cannot replace integration or required live-generation evidence.

Proposed contract boundaries: source brief/concept revision; resource ID/category/quantity/unit/purpose/assumptions; staffing role/headcount/shift window; milestone time/duration; price source and known/Unpriced state; quote/availability source/date/status. These are implementation-refinement notes, not an already deployed schema.

## 5 Quality and Verification

Follow [AGENTS.md](../AGENTS.md) and the canonical [team agreement/DoD](TEAM_AGREEMENT_AND_DOD.md#7-definition-of-done). These checks support existing quality rules and do not introduce new US:

- Validate request and AI output with Zod and business rules. Calculate money and venue-window boundaries deterministically. AI output is not confirmed inventory, a quote or an approval.
- Enforce agency access and same-agency reference integrity server-side. Anonymous/pending/rejected/cross-agency accounts must not access logistics. Operational staffing roles do not change application roles.
- Preserve source revisions, author/time and saved work on failures; reject stale writes. Label assumptions and missing information rather than inventing certainty.
- Use explicit timezone-aware dates for overnight shifts/timelines; unknown availability remains unknown.
- Run relevant unit/integration/PostgreSQL checks and npm test, npm run lint, npm run build for implementation. Add npm run check:functions and npm run verify:edge when edge/contracts change.
- Extend npm run test:e2e for selected logistics workflows, reload/failure states, desktop/mobile and keyboard operation. Include relevant authorization regression and onboarding checks when membership behavior changes.
- Test malformed/truncated AI output, timeouts and quota errors with controlled adapters. Fixtures establish local behavior only. Actual generation acceptance requires appropriate live-provider evidence; provider calls must stay within authorized scope.
- Record criterion, tested revision/dirty scope, environment, fixture/mock/live mode, command and actual result. No feature-test result is claimed from writing this backlog.

## 6 Scrum, Review and DoD

1. During Planning, choose original stories according to available capacity, estimate as a team and assign actual owners/reviewers. Preserve the source IDs on cards and plans.
2. Implement vertical slices, test and integrate continuously. Use independent fixtures when another slice/provider is unavailable; record the affected criterion and next action for blockers.
3. Review available increments throughout the sprint. Teammate review and PO feedback need not wait for all stories to finish.
4. At Sprint Review, demonstrate each selected story's original criteria, record actual acceptance or remaining work, and apply canonical DOD-01–DOD-08. Permission to push is not teammate review or PO acceptance.
5. In Retrospective, inspect rework, contract/integration issues and provider blockers; choose a concrete improvement.

Use the cadence in the team agreement; do not invent meeting dates, attendance or ratification. Link actual test/build/review/delivery/UI/AI/demo evidence as applicable. Scope-based N/A needs justification; blocked or missing evidence remains pending.

**Planned synthetic-data demo:** Start with a selected concept and attendance estimate. Generate/edit equipment (US-08), suggest roles/shifts and change headcount (US-09), generate setup/rehearsal/teardown and flag an out-of-window milestone (US-10), calculate categorized totals and show Unpriced for unknown prices (US-11). If selected, record dated/sourced supplier data and recalculate from a recorded quote (US-12). Reload and demonstrate permission/failure handling. This is a scenario, not an executed demo.

## 7 Scope Boundaries and Carry-over

The source places feasibility in **US-13–US-16**, and approval/execution in **US-17–US-19**. Do not silently add those stories to this logistics sprint. Venue-window review stays in US-10 because it is an original criterion. General shortage/overlapping-allocation checking belongs to US-14, and traceable feasibility summaries to US-16. New transport modules, readiness dashboards or logistics export require separately agreed scope rather than invented US identifiers.

Keep [Sprint 3](SPRINT3_BACKLOG.md) follow-up under existing IDs. Revalidate actual email delivery, provider evidence and signup-rollout status if selected; do not claim those gaps were fixed or include them automatically in Sprint 4 capacity. Historical evidence remains unchanged.

The supplied Word file is unchanged. No source code, Trello cards, deployment or approval status was changed by this correction.
