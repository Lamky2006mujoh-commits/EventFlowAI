# Budget and venue extension — 2026-11-04

## Implemented behavior

- Itemized VND costs: venue, catering, production/AV, decoration, staffing, marketing, transport, permits/safety and other relevant costs. Editable quantity, unit, unit cost and assumptions; deterministic contingency/tax/total and overspend warning.
- Brief-driven search: country Việt Nam → nationwide; city TP.HCM → entire city and nearby cities. Search and venue selection work before concepts.
- Authenticated Google-grounded search with source citations, capacity, rental/package price unit, included services and conditions. Reference, estimate and quote-required labels are distinct. No availability or booking claim.
- Choosing a venue updates the venue allocation and saves a new proposal version when current; saved prose, other costs and history are preserved. Unknown prices retain a clearly provisional allocation.
- Existing six-field proposal history remains readable. Upgrading adds a budget only to a newly saved version. Export includes itemized costs, totals, selected venue, conditions and references.

## Verification

- 51/51 unit/integration checks passed, including real PostgreSQL via PGlite with all six migrations. RPC tests cover canonical venue snapshots, immutable history, preservation of other manual content/costs, invalid budgets, stale source versions and agency boundaries.
- 8 Chromium scenarios passed across full workflow, legacy AI evidence, unsaved edits, export failure, mobile overflow, venue/budget linkage, city and nationwide search before concepts. Venue results in these local UI tests are explicitly synthetic demo data.
- Lint, frontend/function TypeScript, production build and Edge bootstrap verification passed. Build retains the existing non-blocking large-JS-chunk warning (~613 kB).
- Additive migration 20261104090000 and updated planning Edge Function deployed to epmgcyiuloxtblzdrwsw. Migration ledger now records six migrations.
- Live Supabase browser test passed: existing authenticated review account, legacy proposal upgrade with nine budget categories, new saved proposal v5, TXT export, reload and logout. First post-deploy attempt exceeded the 5-second loading assertion; rerun with a network-appropriate 30-second assertion passed.

## External verification still pending

Real Gemini venue search returned service unavailability (503), then RESOURCE_EXHAUSTED (429) with the supplied key/project. No successful live venue result or rental quote is claimed. Model availability checks did not resolve quota. Search and fresh AI generation of the expanded budget contract must be rerun after quota recovery. No billing settings were changed. Automated provider fixtures verify source extraction, error handling and price-evidence downgrade, but are not substitutes for live search acceptance.

Email rate limiting remains deferred as requested. No signup/resend email tests were sent. Credentials stay in ignored local environment files and Supabase secrets.
