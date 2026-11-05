# English planning UI and generation

Goal: consistent English for proposal, venue and budget screens, exports, demo
fixtures, application-authored notes and future AI prose. Preserve venue/person
names, user content, source quotations, numeric values and immutable history.

Scope: BudgetEditor, VenuePicker, shared budget/venue/export text, legacy display
compatibility, generation and venue-extraction instructions. No schema migration
or bulk rewrite of saved content. Explicit English system instructions cover
all generated free-text fields; existing arbitrary prose can be regenerated.

Checks: English labels/exports/legacy-note regressions; provider-request assertions
for English output; updated semantic browser selectors; full verification,
responsive screenshots and packaged-function checks. Fixtures establish routing
and instructions, not a successful fresh paid provider response. Deployment of
the planning function is required to apply the new instructions to live requests.

## Verification and delivery evidence

`npm run verify:sprint3 -- --live-readonly` passed on 5 November 2026 with
source fingerprint `cb610030c65bf3f2154c4625825ed75746e946d56f7cb5e510b8f7691f9da453`.
No source files changed during verification. This includes unit/integration/DB
checks, lint, function types, migration bootstrap, production build, 14 planning
browser scenarios, 15 onboarding scenarios, one fresh-clone routing scenario,
live Auth configuration and anonymous access denial. English regressions cover
provider instructions, English exports, known legacy notes and preservation of
saved values. Desktop/mobile screenshots were captured; mobile overflow was
checked. The existing production bundle-size warning remains non-blocking.

Deployed the verified bundle to shared project `qazukdulzixiudzyrhdn`, planning
version 26 (ACTIVE). Retrieved deployed files match the local verified bundle
exactly. All 15 live anonymous-access checks passed again after deployment.
Version 25 rollback files are retained locally under ignored `dist-edge/rollback`.
No database migration, email or paid provider generation was performed.

| DoD | Status | Evidence / remaining action |
| --- | --- | --- |
| DOD-01 | Implemented; live prose review pending | UI/export regressions pass; future English policy deployed. Confirm a real generated result during the next demo. |
| DOD-02 | Met | Full verification passed; regression checks include legacy data and request policy. |
| DOD-03 | Met | Lint, frontend/function types, packaging and production build passed. |
| DOD-04 | Pending | Changes target the existing demo branch; teammate review and merge remain required. |
| DOD-05 | Met within reviewed scope | No known critical defect found; authentication denial checks pass after deployment. |
| DOD-06 | Verified in automated scope | English semantic controls, desktop/mobile workflows and mobile overflow check pass; human accessibility review remains available. |
| DOD-07 | Partial | Existing Zod validation retained; provider-request policy tested. A new paid response was not sampled, so English prose compliance is not claimed as live-verified. |
| DOD-08 | Pending | Product Owner demo and explicit acceptance remain required. |

Existing preview-image edits are unrelated user work and excluded from delivery.
