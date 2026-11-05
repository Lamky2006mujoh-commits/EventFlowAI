# EventFlow AI Sprint 3 Backlog and Planning

Planning date: **5 November 2026**.

## Sprint Goal

Deliver a usable workflow from a saved brief to comparable AI concepts, an editable proposal with an itemized budget, and venue options based on the brief location. Preserve agency security and version history, and complete the authentication follow-up carried over from Sprint 2.

This plan includes work already implemented and the remaining validation and acceptance tasks. Priorities and execution order below are planning proposals; assignees, estimates, sprint dates, and Product Owner approval remain to be agreed.

**Scenario assumption requested for this plan:** S3-BUG-01 is shown as **Done (assumed)** for a simulated sprint walkthrough. This does not record an actual email-delivery fix or a successful live email test. The factual verification status is retained in the carry-over section.

## Sprint Backlog

| ID        | Type                 | Priority | Backlog Item                                                               | Planning Status                                                           |
| --------- | -------------------- | -------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| S3-BUG-01 | Bug / carry-over     | P0       | Resolve confirmation-email delivery and rate-limit incident from S2-BUG-01 | Done (assumed for the planning scenario); real verification pending       |
| US-04     | Story                | P0       | Generate structured event concepts from a saved brief                      | Implemented; include in final regression                                  |
| US-05     | Story                | P0       | Compare concepts and persist the selected option                           | Implemented; include in final regression                                  |
| US-06     | Story                | P0       | Generate, edit, and version proposals                                      | Implemented; final acceptance pending                                     |
| S3-US-01  | Story / extension    | P0       | Build an editable itemized proposal budget                                 | Implemented; fresh AI budget generation needs live verification           |
| S3-US-02  | Story / extension    | P1       | Search, compare, and select event venues with prices and conditions        | Implemented; live grounded search validation pending                      |
| US-07     | Story                | P1       | Export the latest saved proposal as UTF-8 text                             | Implemented; include in final regression                                  |
| S3-T01    | Technical / QA       | P0       | Run Sprint 2 and Sprint 3 regression, security, and CI checks              | Local evidence available; final commit and remote CI verification pending |
| S3-T02    | Technical / QA       | P0       | Validate Gemini availability, quota handling, and real search results      | Pending provider quota recovery and live retest                           |
| S3-T03    | Technical / delivery | P0       | Verify deployment, migrations, configuration, and handover documentation   | Backend deployed; final delivery checks pending                           |
| S3-T04    | Acceptance           | P1       | Conduct the sprint review and record acceptance or remaining defects       | Pending Product Owner review                                              |

US-04, US-05, US-06, US-07, and S3-T01 retain the existing Sprint 3 identifiers. S3-US-01, S3-US-02, and S3-T02–S3-T04 are supplemental planning identifiers. S3-BUG-01 continues the existing S2-BUG-01 issue rather than introducing a second independent incident.

## Sprint 2 Carry-over

| Original Item                      | Sprint 3 Destination | Remaining Work                                                                                             | Factual Status                                                              |
| ---------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| S2-BUG-01                          | S3-BUG-01            | Verify the email provider, delivery limits, actual confirmation-email receipt, and successful confirmation | Unresolved; no delivery test or provider fix has been recorded              |
| US-20 outstanding email acceptance | S3-BUG-01            | Verify registration → email receipt → confirmation → membership assignment → login                         | Application code and error guidance implemented; full email flow unverified |
| S2-T01 remote CI follow-up         | S3-T01               | Inspect the remote run for the final delivery commit and resolve failures                                  | A configured workflow and local passes do not establish remote CI success   |

The first two rows are two acceptance concerns for the same email incident, not separate bug estimates. Sprint 2 implementation and test evidence remain unchanged. The simulated Done label applies only to the planning walkthrough.

### S3-BUG-01 Confirmation Email Delivery and Rate Limits

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

As a planner, I want multiple concepts based on my saved brief so I can evaluate practical directions for the event.

- Generate two or three distinct concepts with a title, theme, activities, and explicit assumptions.
- Validate structured output before saving; handle invalid JSON, incomplete output, timeouts, and provider errors.
- Keep Gemini credentials server-side and check authentication, membership, brief version, and planning revision.
- Preserve existing saved data if generation fails; require confirmation before replacing existing concepts.

### US-05 Compare and Select a Concept

As a planner, I want to compare concepts and save my choice so the proposal uses the intended direction.

- Display themes, activities, and assumptions in a layout usable on desktop and smaller screens.
- Persist selection for the correct brief and agency.
- Reject foreign or stale concept identifiers.
- Require a current concept selection before generating a proposal.

### US-06 Generate and Version Proposals

As a planner, I want to review and edit a generated proposal without losing earlier work.

- Generate objectives, audience, theme, agenda, assumptions, and the associated proposal title.
- Append immutable versions with author, timestamp, source brief version, and selected concept.
- Confirm regeneration and protect unsaved edits when navigating or replacing content.
- Reject stale writes and mark output from an earlier brief for review.
- Keep new and edited versions in Draft. A proposal approval workflow is outside this sprint.

### S3-US-01 Itemized Proposal Budget

As a planner, I want a complete estimated cost breakdown so I can assess and adjust the proposal against the client budget.

- Support venue, catering, production/AV, decoration, staffing, marketing, transport, permits/safety/insurance, and other relevant costs.
- Store category, description, quantity, unit, VND unit cost, and notes for each line.
- Calculate line amounts, subtotal, contingency, additional tax, total, and the remaining budget or overspend deterministically.
- Allow editing, adding, and removing cost lines with validation.
- Keep estimates, unknown taxes, and supplier assumptions explicit; avoid double-counting venue packages.
- Preserve legacy proposals and add budgets through a new saved version.
- Complete a live test of fresh AI generation under the expanded budget contract.

### S3-US-02 Venue Search and Selection

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

As a planner, I want to download the saved proposal for review and sharing.

- Export the latest saved proposal as UTF-8 TXT with title, sections, version, status, author, and source brief version.
- Include itemized budget lines and totals, plus the selected venue, conditions, and sources where present.
- Exclude unsaved edits and avoid unreadable object representations.
- Surface export failures without changing saved content or proposal status.

## Technical and Acceptance Tasks

### S3-T01 Regression Security and CI

- Rerun authentication, brief validation, version history, role management, and agency-isolation regressions from Sprint 2.
- Verify proposal generation, manual edits, regeneration confirmation, venue selection, budget calculations, export, and reload.
- Test invalid or expired authentication, cross-agency access, membership removal, stale writes, malformed provider output, and provider failures.
- Run lint, frontend/function type checks, production build, PostgreSQL migration/bootstrap checks, and Chromium E2E.
- Inspect the remote CI run for the final delivery commit and link the actual result.

**Existing evidence:** 51/51 project unit/integration checks, 8/8 demo browser scenarios, and 1/1 live Supabase browser workflow passed on 4 November 2026. The 29-test authentication/brief/database group passed on 5 November 2026. These results do not establish live email delivery or successful live venue search.

### S3-T02 Live AI and Search Verification

- Confirm that the configured Gemini model and project quota support structured output and Google Search grounding.
- Verify real concept/proposal generation, including the required budget.
- Search real city and nationwide venue briefs; inspect source citations, geography, units, price evidence, and unknown-price handling.
- Confirm controlled quota, rate-limit, timeout, and unavailable-provider errors without overwriting saved work.
- Store sanitized evidence without API keys or private client data.

**Current dependency:** the previous live venue checks returned HTTP 503 and then HTTP 429 RESOURCE_EXHAUSTED. Fresh AI budget generation and grounded venue search remain unverified until a successful retest.

### S3-T03 Deployment and Handover

- Verify the deployed workspace and planning functions, applied migrations, migration ledger, and existing data compatibility.
- Check frontend public URL/key matching, allowed origins, server-only Gemini secrets, and agency access.
- Confirm the application can read, save, export, and reload against the intended Supabase project.
- Update setup instructions, backlog statuses, test results, and the known-issues list.
- Keep credentials and private environment files out of Git.

**Existing deployment:** both functions and six migrations are recorded for the active project. This plan does not claim a new deployment or a publicly hosted frontend.

### S3-T04 Sprint Review and Acceptance

- Demonstrate onboarding, a saved brief, concept comparison, proposal editing, budgets, venue selection, version history, and export.
- Use real provider-backed results for acceptance of live AI/search items.
- Record Product Owner decisions and unresolved defects.
- Close actual delivery items only when their acceptance evidence is available; keep the simulated email status separate.

## Proposed Execution Order

1. **Resolve external dependencies:** carry over the email incident and restore usable Gemini quota. The planning walkthrough assumes email completion; actual closure still requires evidence.
2. **Verify the core flow:** US-04 → US-05 → US-06, including agency boundaries and stale-version checks.
3. **Verify proposal completeness:** itemized budgets, city/nationwide venue search, selection and cost updates, then saved TXT export.
4. **Run final regression and delivery checks:** S3-T01 and S3-T03; inspect remote CI and update documentation.
5. **Conduct the sprint review:** S3-T04; record acceptance and move any unresolved work to the next backlog explicitly.

Existing code can be reviewed and locally tested while provider-dependent verification is blocked. Estimate carry-over work only once and agree assignees and capacity before committing the sprint scope.

## Definition of Done

An item is actually Done when its acceptance criteria pass, relevant regression checks pass, any required deployment is verified, evidence and documentation are updated, and the review outcome is recorded. Live email and grounded-search items require real service evidence. The explicitly labeled planning assumption is not an actual completion record.

## References

- [Sprint 2 backlog and carry-over source](SPRINT2_BACKLOG.md)
- [Sprint 3 setup](SPRINT3_SETUP.md)
- [Baseline deployment and test report](SPRINT3_TEST_REPORT.md)
- [Budget and venue extension verification](BUDGET_VENUES_TEST_REPORT.md)
- [Supabase and signup troubleshooting](SUPABASE_SETUP.md)
