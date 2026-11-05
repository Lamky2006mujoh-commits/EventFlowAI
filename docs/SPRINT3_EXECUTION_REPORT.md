# Sprint 3 implementation and acceptance evidence

Execution date: **5 November 2026**, Asia/Saigon. This report supersedes historical
environment assumptions in the 4 November report without changing that evidence.

## Implemented increment

The working increment covers saved briefs → 2–3 validated concepts → comparison
and selection → generated/editable proposals → itemized VND budgets → venue
search and selection → immutable proposal history → latest-saved UTF-8 export.
Agency membership, RLS and checked RPCs protect persisted data. Signup approval
includes a pending badge, email-confirmation gating, Member-only approval, search,
confirmation filters and review history.

The repository already contained most story implementations. This execution
verified them and completed the following integration and delivery improvements:

- Restore the selected venue's saved rental quantity in result cards after reload;
  the displayed cost and selected state now match persisted selection.
- Reject blank, non-integer, negative and out-of-range rental quantities before
  submission; keep the field editable and avoid displaying NaN costs.
- Include venue price caveats, price evidence and included services in TXT export.
- Retain the earlier fixes for unsaved brief/proposal navigation, sign-out and
  history, current-version planning visibility, saved signup decisions followed
  by refresh failures, and responses from ended sessions.
- Add `npm run verify:sprint3` for local acceptance and the opt-in
  `--live-readonly` mode for configured Auth/access-denial checks. A failed,
  skipped or source-changing run cannot report full verification success.
- Record Node version, Git revision, source fingerprint, check exit codes and
  durations in `test-results/sprint3-verification.json`.
- Run the same acceptance command in CI and upload test output on success/failure.
  Store browser screenshots in separate ignored output folders rather than
  overwriting documentation previews or local images.
- Strengthen live anonymous checks: connection/setup failures no longer count as
  permission-denial evidence. Include both signup tables and protected review RPCs.
- Correct the current project, migration count and optional credential-file
  assumptions in setup documentation.

Concurrent provider-adapter work in the shared checkout is preserved and included
in final verification; the evidence does not attribute those edits to this run.

## Verification and reproducibility

Run with Node 24 and the locked dependencies:

```powershell
npm ci
# Optional when using installed Chrome instead of Playwright Chromium:
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe'
npm run verify:sprint3 -- --live-readonly
```

Without configured `.env.local` or network access, omit `--live-readonly`.
Install Playwright Chromium with the existing project workflow if no installed
browser is selected. The verification command does not install packages.

The final machine-readable result is in
`test-results/sprint3-verification.json`. Browser output is under
`test-results/proposals` and `test-results/onboarding`. These files are ignored;
CI uploads them as the `sprint3-verification` artifact. The source fingerprint
identifies the implementation/test inputs, including uncommitted changes; the
base Git SHA alone does not identify this local increment.

Checks cover Auth, agency boundaries, invalid input, membership removal,
stale writes, provider failures, structured output, proposal replacement,
history, budget arithmetic, venues, export, desktop/mobile and signup review.
Local PostgreSQL tests apply all seven real migrations to PGlite fixtures.

Final verified results: **84/84 unit/integration tests**, **13/13 proposal/venue
browser scenarios**, **15/15 onboarding browser scenarios**, plus lint, Edge
types, production build, migration bootstrap, live Auth settings and **15 live
anonymous/Auth denial checks**. All nine verification groups passed and the
source fingerprint stayed unchanged during the final run.

## Demo reliability follow-up

The 5 November follow-up fixes these failure paths:

- A committed brief followed by a failed workspace reload now leaves the editor
  and retains the success notice. The user can refresh the workspace without
  submitting another create request. Previously retrying the form could create
  a duplicate brief.
- A committed member addition clears its form and retains success feedback even
  when the following read fails. It no longer looks like an unsuccessful add.
- Brief fields are disabled during saving, preserving the submitted snapshot
  rather than silently dropping edits typed while a slow request is pending.
- A workspace refresh control provides read-only recovery and refreshes stale
  lists. It is disabled while a request or unsaved edits need protection.
- Ambiguous write transport failures instruct the user to refresh/reload before
  retrying, because the server may already have committed the request. This is
  guidance, not a claim of server-side idempotency for unknown write outcomes.
- Planning reload is disabled while a replacement confirmation is open, avoiding
  conflicting interactions with that pending decision.
- Grounded venue-provider responses are validated at the external boundary.
  Invalid JSON or malformed parts now produce a controlled GenerationError
  without invoking extraction or changing saved planning. The regression failed
  against the previous parser and passes after the fix.

New browser tests exercise committed-save/read-failure recovery, committed member
addition/read-failure recovery, and fields frozen during a delayed save. New unit
tests exercise ambiguous transport failures and malformed provider payloads.
The Edge Function parser fix is included in the subsequently approved planning
v23 deployment described below.

Build retains a non-blocking JavaScript chunk-size warning, approximately 622 KB
before gzip. No production frontend hosting is established by a successful build.

## Live environment findings

### Proposal location and concept alignment follow-up

Proposal generation now normalizes the provider's brief location to the user's
chosen search venue (name/address) and sends that venue's conditions alongside
the selected concept. If no venue search was used, it retains the user-provided
brief location exactly and performs no automatic venue search or substitution.
A completed search without an explicit selection is rejected before paid
proposal generation. Concepts generated after venue selection receive the same
venue context.

New proposal snapshots record location provenance, include a canonical location
header in the agenda, and retain the location in exported TXT. Exact-location
budget rows name the provided venue and keep unverified costs labeled as
estimates. Venue changes preserve saved text/history but require regeneration
before editing an out-of-date narrative. Stale selections from an older brief
cannot override a newer location. This is a deterministic input/provenance
contract plus provider instructions; generated prose still requires human review.

Seven targeted unit regressions cover both paths, selection gating, concept
inputs, stale selections, regeneration/history, and legacy snapshots. PostgreSQL
checks verify provenance survives storage/history. Browser tests cover exact
locations, searched venue + selected concept, reload, and venue changes requiring
regeneration. No database migration is needed for the additive JSON field.
After explicit user approval, the verified planning bundle was deployed as
**planning v23** to `qazukdulzixiudzyrhdn`. Retrieved deployed source matched the
local bundle exactly, including selection gating, normalized location input,
provenance and the venue-change save guard. All **15 live anonymous/Auth denial
checks** passed after deployment. The previous v22 source is preserved in the
ignored `dist-edge/rollback/planning-v22.json`. No database migration or secret
change was performed. Actual new paid AI prose was not generated by this smoke
check; provider-contract and semantic-routing tests use synthetic adapters.

Read-only inspection verified project **qazukdulzixiudzyrhdn**:

- All seven repository migrations appear in its ledger.
- `workspace` v11 and `planning` v12 are active. Retrieved planning source contains
  explicit `getUser` authentication, venue search and server-only Gemini settings.
- The configured public URL/key reaches Auth. Email sign-in and signup are enabled;
  email confirmation is required.
- Anonymous reads of protected tables and execution of signup review RPCs are
  denied. Workspace/planning reject missing and invalid bearer tokens.
- Recent sanitized provider logs include HTTP 400/503 and timeouts. Logs alone do
  not establish current quota recovery or successful live generation/search.

No live database records, secrets or Auth settings were changed. The planning
function was subsequently updated to v23 with explicit user approval. Live
advisors from the preceding review still require a
deliberate follow-up for leaked-password protection and the reviewer FK index.

The upstream [CI run for 38b077b](https://github.com/Lamky2006mujoh-commits/EventFlowAI/actions/runs/41955613434)
completed successfully. That commit updates the backlog. It does **not** verify
these later uncommitted implementation or CI changes; their remote run remains
pending until the user authorizes a delivery commit/push.

## Acceptance gates remaining

| Item                              | Factual status and next evidence                                                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S3-BUG-01                         | Email delivery deferred by the user in this execution. The supplied account was already confirmed and a member; no signup/resend email was sent. A fresh test inbox/alias and actual receipt/confirmation evidence are still required.                                               |
| US-04 / US-06 / S3-US-01 / S3-T02 | Local provider contracts, failure handling, persistence and budgets verified. A new successful provider-backed concept and budget/proposal run still requires a server-only Gemini key or an authenticated development app session. Neither ignored live credential file is present. |
| S3-US-02 / S3-T02                 | City/nationwide scope, sourced extraction, rental updates and preservation verified locally. Real grounded searches for both scopes and inspection of their source/price evidence remain required.                                                                                   |
| S3-T01                            | Local verification complete; remote CI for this uncommitted increment remains pending.                                                                                                                                                                                               |
| S3-T03                            | Planning v23 deployed with user approval; retrieved source matches the verified bundle and live denial checks pass. All seven migrations/bootstrap verified. Authenticated paid generation/read/save/reload acceptance remains pending.                                              |
| S3-T04                            | Review scenarios prepared below. Product Owner decisions are not recorded or assumed.                                                                                                                                                                                                |

No fixture, preconfirmed account, historical screenshot or successful build is
treated as proof of fresh email delivery, current provider availability, real
venue prices or Product Owner acceptance.

## Sprint review scenarios

1. **Onboarding:** register an unused controlled address with the intended agency;
   receive and confirm email; demonstrate no workspace access before admin
   approval, Member-only approval and durable review history. Live step deferred.
2. **Brief and concepts:** save a complete synthetic brief, generate concepts,
   compare themes/activities/assumptions and reload the selected option.
3. **Proposal and history:** generate a proposal, manually edit prose, save a new
   version, inspect earlier versions and cancel/confirm regeneration.
4. **Budget:** edit/add/remove costs, change tax/contingency, verify totals and
   overspend, then reload. Add a budget to a legacy proposal through a new version.
5. **Venues:** run city and nationwide searches, inspect source/price provenance,
   select a quantity, preserve other costs/prose and reload that same quantity.
6. **Export:** download the latest saved TXT; verify author/version/source brief,
   budget totals, venue caveats/conditions/sources and exclusion of unsaved edits.
7. **Safety of edits:** cancel navigation/sign-out/history with dirty content;
   exercise invalid quantities, stale revisions and source-brief changes.
8. **Authorization/failure:** demonstrate expired credentials, foreign agency and
   revoked membership denial; provider failure must preserve saved work.
9. **Decision:** record reviewer, date, accepted item IDs, observed defects and
   deferred live gates. Current decision: **not yet reviewed by Product Owner**.
