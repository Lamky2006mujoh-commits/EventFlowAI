# Sprint 3 — Shared Technical Contract Baseline

**Status: PROPOSED / repository-derived — contract changes require Developers' review.**  
**Product requirements:** [PO Sprint 3 Backlog](../SPRINT3_BACKLOG.md). **Source:** repository main baseline \`38b077b68ca52ff2660e1cec92189548c6a944c6\`; source may change after bootstrap.

This document is an **index to current implementation contracts**, not a replacement for checked-in TypeScript/Zod/SQL. No fabricated API shapes. Inspect source before modifying it.

| Boundary | Existing source | Shared rule / compatibility obligation |
|---|---|---|
| Brief | \`supabase/functions/_shared/contracts.ts\` (\`briefDataSchema\`, \`briefSchema\`, \`requestSchema\`) | Persist UUID/version/agency ownership; saved brief supplies venue/location, budget VND, attendees, date and objectives. |
| Planning & concepts | \`supabase/functions/_shared/planning.ts\` (\`conceptSchema\`, \`conceptsSchema\`, \`planningSchema\`) | Concept UUID, title, theme, activities, assumptions; 2–3 concepts; selection uses \`selectedId\`; planning \`revision\` and \`briefVersion\` guard stale writes. |
| Proposal | \`planning.ts\` (\`proposalDataSchema\`, \`proposalSchema\`) | Title, objectives, audience, theme, agenda, assumptions; optional legacy budget/venue; immutable history snapshots, Draft on saves, author/timestamp/source concept/brief version. |
| Budget | \`supabase/functions/_shared/budget.ts\` | VND items; categories venue/catering/production/decoration/staffing/marketing/transport/permits/other; quantity integer, unitCost integer. \`budgetTotals\`: subtotal Σ(q×cost); contingency = round(subtotal×%); tax = round((subtotal+contingency)×%); total and remaining derived. |
| Venues | \`supabase/functions/_shared/venues.ts\` | Search scope \`city_and_nearby\`/\`nationwide\`, priced options with reference/estimate/quote_required kind, HTTPS sources, explicit \`availability: not_checked\`. Selection must honor brief/search version. |
| Frontend/Edge action | \`src/lib/workspace-api.ts\`, \`src/lib/api.ts\`, \`supabase/functions/_shared/planning-handler.ts\` | \`planningRequestSchema\` actions: load, generateConcepts, select, generateProposal, saveProposal, searchVenues, selectVenue. Client \`planningSchema.parse\` on response; live mode requires Supabase configured. |
| Persistence/authorization | \`supabase/migrations/20261104040000_sprint3_planning.sql\` and \`20261104090000_proposal_budget_venues.sql\` | Agency ownership checked; planning writes lock/check expected revision + briefVersion; RLS for scoped reads. **Security review required**: \`save_planning\` is granted to authenticated while accepting generation payload—never assume AI provenance from client payload. |
| Export | \`planning.ts::proposalText\` and \`src/components/PlanningPanel.tsx\` | Export the latest **saved** snapshot, UTF-8 TXT; include metadata, budget and venue when present; unsaved data must not be silently treated as saved. |

## Contract decisions to enforce now
1. Each owner starts with the existing exported schemas/types. No duplicate local definitions or breaking schema changes without a contract PR.
2. Match UI, Edge, Zod, SQL checks and tests for all changed fields. Verify migration compatibility with legacy proposals.
3. An authenticated user is not a trusted AI writer. S3-T01 and involved feature owners must resolve/retest direct-RPC provenance for generated payloads before claiming security DoD.
4. Do not invent search availability, confirmed quote, tax rate or Gemini success. Venue pricing must say reference vs estimate vs quote required; availability remains unchecked.
5. Real provider behavior is separately verified under S3-T02 with approved quota and synthetic inputs.
6. If \`main\` and an earlier local checkout differ, record SHA before implementing, then reconcile docs to that exact baseline.

## Decisions to record in Sprint 3 planning meeting
- Who reviews contract PRs and migrations/RLS? Which compatibility/rollback path?
- Is any P1 story committed this Sprint?
- What staging/deployed project and test accounts are approved?
- What are the team's responsive/a11y targets?
- What is the fixed scope and verification disposition for the email carry-over?

Do not infer these decisions from a fixture or a historical status label.
