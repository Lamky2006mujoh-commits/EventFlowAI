# EventFlowAI — Sprint 3 Team Execution Plan

**Status:** DRAFT for Scrum Team approval, 2026-11-05.  
**PO requirements (sole scope source):** [SPRINT3_BACKLOG.md](SPRINT3_BACKLOG.md).  
**Governance baseline PR:** \`chore/sprint3-team-bootstrap-20261105\` based on original \`main@38b077b68ca52ff2660e1cec92189548c6a944c6\`. **Do not start real feature branches until the bootstrap PR is reviewed/merged; then record its resulting main SHA.**

## Goal and actual-state caution
PO Sprint Goal: from a saved brief to comparable AI concepts, editable proposal, itemized budget and location-based venues; preserve agency security/version history and close email carry-over. The backlog notes various items as implemented, but these are **historical/planning statuses** and not automatic proof of the selected build, deployment, AC or DoD. S3-BUG-01 "Done (assumed)" is only a simulation—actual email receipt/confirmation is not verified.

**Baseline decision:** The current GitHub \`main\` already contains Sprint 3 code. Team must decide whether to **stabilize and finish gaps on current main (recommended)** or deliberately build from a specific historical Sprint-2-only commit in a separate supported branch, with clear migration/rollback implications. NEVER reset shared main to achieve a simulated clean start.

## Backlog allocation — ownership proposal, not assignments
Every item owns a vertical slice including tests, not a frontend → backend → QA chain. The person in "suggested" column is based on previous project roles where applicable. Confirm names, reviewer and capacity in planning; no author self-approval.

| ID | Priority | Proposed coordinator/owner | Independent first action after bootstrap | Evidence needed |
|---|---|---|---|---|
| S3-BUG-01 | P0 | Owhea Amejdb + Phúc Âu Gia (proposed) | Audit Auth provider and email rate-limit; use controlled synthetic account | Delivered email, confirmation, pending→membership→login, limits |
| US-04 | P0 | Hoài An Đặng (previous owner) | Audit concept schema/Edge/Gemini against PO AC and use saved brief fixture | 2–3 distinct concepts, failure/retry, protected AI secrets, persisted version |
| US-05 | P0 | Bảo Chí (previous owner) | Audit comparison/select UI on seeded concepts | Compare, one selection, persistence/reload, stale/foreign reject |
| US-06 | P0 | Hoài An Đặng + Bình Lê Duy (previous owner/support) | Audit proposal/editor/history on seeded selected concept | Draft, manual edits protected, immutable versions and conflicts |
| S3-US-01 | P0 | **Unassigned** | Audit budget contract/legacy fixtures; add deterministic test table | Items/category/totals/edit/versioning/live AI budget evidence |
| S3-US-02 | P1 | **Unassigned** | Audit geography/price evidence from fixtures; provider probe separately | Grounded venue options, price labels, versioning and quote handling |
| US-07 | P1 | Đinh Nhật Bảo Nhi (previous owner) | Audit existing saved TXT export with seeded proposal | Export UTF-8, latest saved, budget/venue content and error state |
| S3-T01 | P0 | Phúc Âu Gia + Owhea Amejdb (proposed) | Build per-item AC traceability + CI evidence on common SHA | S2/S3 regression, RLS, CI, browser and contract tests |
| S3-T02 | P0 | **Unassigned** | Probe Gemini/provider adapter with synthetic fixtures and quotas | Live generation + grounded venue verification, errors, sanitized evidence |
| S3-T03 | P0 | **Unassigned** | Verify deploy baseline/Edge/migrations/env names and README | Deployment identity and approved environment smoke |
| S3-T04 | P1 | Quỳnh Hương as PO acceptance decision; SM Thiên Thanh facilitates | Prepare demo plan and acceptance log | Explicit PO decision, unresolved defects, review evidence |

**Current Sprint 3 Scope:** eight P0 items and three P1 items; P1 commitment depends on real capacity, not this proposed table. Sprint dates, estimates, assignments and PO acceptance still open per backlog.

## Parallel-start strategy
1. After bootstrap merges, synchronize all local clones using \`git fetch origin && git switch main && git pull --ff-only\`; record \`BASE_SHA\`.
2. Every Developer creates their **own** branch from \`BASE_SHA\`, not an earlier local checkout. Branch examples:
   - \`fix/S3-BUG-01-email\`
   - \`feature/US-04-generate-concepts\`
   - \`feature/US-05-compare-select\`
   - \`feature/US-06-edit-proposal\`
   - \`feature/S3-US-01-budget\`
   - \`feature/S3-US-02-venues\`
   - \`feature/US-07-export\`
   - \`test/S3-T01-regression\`
   - \`test/S3-T02-provider\`
   - \`chore/S3-T03-delivery\`
   - \`docs/S3-T04-acceptance\`
3. Each owner first performs a read-only gap analysis of their card against the **same baseline** and PO AC; then proposes a focused edit/test plan.
4. Use existing stable fixture/adapter for parallel tasks. Integrate real boundaries continuously; coordinate changes to shared planning/Zod/RPC with reviewers.
5. Use independent PR review + CI. Test against local fixture first; run staging verification only when an isolated approved environment and accounts exist.
6. Demo actual integrated Increment; do not mark done until applicable 8 DoD plus explicit PO approval.

## Shared-file collision map
| Likely collision | Involved items | Required coordination |
|---|---|---|
| \`planning.ts\`, \`planning-service.ts\`, \`planning-handler.ts\` | US-04/06, S3-US-01/02, S3-T02 | Joint contract proposal and one reviewer before changes |
| \`PlanningPanel.tsx\` | US-05/06/07, budget/venue | Separate component changes when feasible; notify other owners; avoid simultaneous large rewrites |
| \`save_planning\` SQL/migrations | US-04/06, budget/venues, S3-T01 | Security reviewer, additive migration, rollback + two-tenant tests |
| Auth onboarding and membership | S3-BUG-01, S3-T01/03 | Controlled test account, provider evidence, unchanged access rules |
| CI/E2E fixtures | S3-T01 and all owners | Test owners contribute tests in their PR; S3-T01 coordinates cross-story coverage |

## Required Sprint Planning decisions (fill before coding)
- [ ] Record approved \`BASE_SHA\` after bootstrap PR merge.
- [ ] Approve Sprint Goal and P0/P1 commitment based on capacity.
- [ ] Assign owners + one independent reviewer per item.
- [ ] Agree on shared technical contract change procedure and security reviewer.
- [ ] Confirm Friday 16:30 calendar conflict and actual Sprint dates.
- [ ] Agree staging scope, synthetic user/agency fixtures, cleanup and provider quota.
- [ ] Approve branch-protection admin configuration, reviewer threshold and CI gate.

## Suggested micro-PR order (not a waterfall)
- Governance bootstrap PR; parallel read-only card audits.
- Independent bugfix/contract-focused PRs: Auth/email; concept/AI validation; comparison; proposal/versioning; budget; venue/search; export.
- Continuous QA, provider and deployment tasks alongside feature work.
- Integrated demo/PO decision last; keep cards with missing evidence open.

**Hard rule:** no direct main commits, no uncontrolled live writes, no undocumented contract changes. 
