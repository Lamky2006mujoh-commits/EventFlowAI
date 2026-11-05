# Sprint 3 setup and acceptance

Requirements: [Sprint 2 and Sprint 3 backlog](https://docs.google.com/document/d/1irYp_DkbgPj6lJ2FU0WXk0ySDDemt37Oig_87RbJ9dc/edit).

## Current deployed environment

Verified on 5 November 2026: the current local configuration points to
**qazukdulzixiudzyrhdn**. The connected project reports active `workspace` v17 and
`planning` v23 functions and all seven repository migrations in its ledger.
The retrieved planning source includes explicit `getUser` authentication, venue
search, server-only Gemini configuration, and two 45-second generation attempts.
The user approved deployment of the proposal-location alignment fix. `planning`
v23 was deployed and its retrieved source matched the verified local bundle
exactly. All 15 live anonymous/Auth denial checks passed after deployment.

Use your own confirmed agency account. `.env.acceptance.local` and
`.env.gemini.local` are optional, ignored inputs for live acceptance tools;
neither file is present in this checkout. Do not assume historical review
credentials or provider keys from another computer/project are available.
The 4 November report describes an earlier project and remains historical evidence.

## Teammate setup after cloning

For a real AI demo against the existing shared Supabase project, teammates do
**not** need the Gemini or Tavily keys. The deployed Edge Functions read those
keys from the project's server-side secrets. Each teammate should:

1. Clone the delivery branch and run `npm ci` with Node 24 or newer.
2. Copy `.env.example` to the ignored `.env.local` and configure:

   ```dotenv
   VITE_APP_MODE=supabase
   VITE_SUPABASE_URL=https://YOUR_SHARED_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SHARED_PUBLIC_PUBLISHABLE_KEY
   ```

3. Obtain the shared project's public URL/publishable key and the intended
   agency registration code from its administrator. Register a personal account,
   confirm email and wait for administrator approval as a Member.
4. Run `npm run dev`, open the printed URL, and sign in. Real AI/search requests
   use the shared backend's provider quotas and billing settings. Email delivery
   and provider availability remain subject to the documented live-test limits.

Only the public Supabase configuration belongs in browser `VITE_` variables.
Never put `GEMINI_API_KEY`, `TAVILY_API_KEY`, a Supabase secret/service-role key,
or account passwords in Git, frontend variables, examples or screenshots.
`.gitignore` excludes `.env.local` and other private environment files; this
does not make a secret safe if it is copied into tracked source code.

For a browser-only sample demo with no backend or provider keys, set
`VITE_APP_MODE=demo` in `.env.local`. This mode uses labeled sample templates and
local browser storage; it does not demonstrate real AI, web search or backend
authorization.

For an independent real backend, create a separate Supabase project, apply the
migrations, deploy the functions, and configure the owner's own provider keys
using the deployment instructions below. The Gemini key authenticates API access;
`GEMINI_MODEL` chooses the model supported by that project's access and quota.

## Backend deployment steps

Apply all migrations in timestamp order to a development Supabase project. The new migration is `supabase/migrations/20261104040000_sprint3_planning.sql`. It adds planning storage and RPCs without rewriting existing briefs or their history.

Configure these **Edge Function secrets**, using Supabase Dashboard or the Supabase CLI:

### Free-tier venue web search (Tavily)

Venue search now defaults to Tavily rather than Gemini's Google grounding. Create a free account at https://app.tavily.com and save `TAVILY_API_KEY` in this Supabase project's Edge Function secrets. `VENUE_SEARCH_PROVIDER=tavily` is optional because it is the default. Keep the existing `GEMINI_API_KEY` and `GEMINI_MODEL` for concepts, proposals and extraction of sourced venue cards. `GEMINI_VENUE_MODEL` is ignored in Tavily mode.

Tavily documents 1,000 free credits/month with no card required; this adapter fixes `search_depth=basic`, disables automatic parameter upgrades, performs one search request (1 credit), and does not call paid Extract/Crawl endpoints or fall back to Google. Stay on the free plan without pay-as-you-go. Search sends location, event type, attendee count and optional search preferences; it excludes client identity and full brief objectives. Result snippets remain untrusted and all venue output is validated before saving. Free credits and Gemini extraction quota remain finite. Live search requires the owner's Tavily secret and an authenticated acceptance check.

References checked 5 November 2026: [Tavily credits](https://docs.tavily.com/documentation/api-credits) and [Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search).

For an explicitly configured Google grounding backend, set `VENUE_SEARCH_PROVIDER=google`; the legacy settings below then apply.

- `GEMINI_API_KEY`: a Google AI API key; never a `VITE_` variable.
- `GEMINI_VENUE_MODEL` (optional): defaults to `gemini-2.5-flash-lite`, independently of the proposal model. Google lists free-tier Search grounding for this model but restricts 2.5 access to existing users; actual project eligibility must be tested. Set an explicit model ID to override the default. Structured extraction continues to use `GEMINI_MODEL`. A text-generation allowance does not imply Search grounding allowance. An HTTP 404 can indicate unavailable legacy-model access; an HTTP 429 can indicate grounding or generation limits. Neither is fixed by repeated clicks. Code cannot grant quota, and no paid-model fallback or billing change is performed.

Model references checked on 5 November 2026: [Google pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash-lite), [2.5 Flash-Lite availability](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite), and [deprecation status](https://ai.google.dev/gemini-api/docs/deprecations#gemini-2.5-flash-models). A successful live grounded search is still required before marking venue search accepted.

Proposal reliability: provider schemas retain field structure and enums, but move array/numeric bounds into descriptions to reduce constrained-decoding complexity. Full Zod limits and budget validation still run before persistence. Proposals request concise sections (under 80 words each) and 9–15 budget lines, with a 6,144-token output cap; concepts use 3,072. Thinking text is excluded from JSON parsing. Blocked content and permanent HTTP failures are not retried; safe log categories distinguish key, schema and generation-parameter rejection without recording provider payloads. These changes do not establish successful live generation or a measured latency improvement; verify with the intended project's authenticated workflow.

- `GEMINI_MODEL` (optional): defaults to `gemini-3.8-flash` when absent or blank. Set an exact model ID to override it; a `models/` prefix is accepted. The historical baseline used `gemini-3.5-flash`.

Generation uses the supported `low` thinking level for Gemini 3.8 Flash. Concept/proposal calls have at most two 45-second provider attempts. Browser planning reads time out after 30 seconds; planning actions have a three-minute limit to accommodate grounded searches. An HTTP 503 indicates provider unavailability; HTTP 429 indicates quota/rate limiting. Both differ from missing Supabase secrets. These failures preserve saved planning. A timeout can occur after the server has started work: reload planning before retrying to check whether a result was saved.

- `ALLOWED_ORIGINS`: comma-separated allowed frontend origins. Defaults cover localhost ports 5173 and 5174; include the actual hosted origin when deploying.

Supabase supplies `SUPABASE_URL` and `SUPABASE_ANON_KEY`. The planning function forwards the caller's JWT; it does not use a service-role key. Authentication is verified with `getUser`, agency membership and brief access are checked before calling Gemini, and database RLS protects planning reads. The write RPC checks current membership and locks the brief before committing.

Deploy both `workspace` and `planning`. `supabase/config.toml` records `verify_jwt = false` because the legacy-only gateway cannot verify new signing keys. Both handlers verify the caller with Supabase Auth `getUser` and enforce membership before any protected access.

For dashboard deployment, run `npm run bundle:edge`. Upload/paste the single-file functions in `dist-edge/workspace/index.ts` and `dist-edge/planning/index.ts`. Fresh projects can use the atomic `dist-edge/bootstrap-new-project.sql`; existing projects must apply only migrations not already recorded (including `20261104090000_proposal_budget_venues.sql` for budgets/venues). `npm run verify:edge` checks the generated bootstrap on PostgreSQL. Never rerun the fresh-project bootstrap on a populated schema.

## Review workflow

**Location alignment:** enter an exact venue in the brief to generate for that
location directly, or run venue discovery and explicitly select a result.
Proposal generation combines that location with the selected concept; search
results alone never choose a location. The planning panel displays the location
being used. New proposal snapshots retain location provenance, and TXT export
includes it. A venue change preserves older narrative/history and updates costs,
but marks the narrative for regeneration before further editing. An exported
snapshot whose selected venue differs from its narrative location is explicitly
marked for location review. Legacy snapshots remain readable; selecting a new
venue records their prior location for review.

The change uses the existing JSON proposal storage and needs no new database
migration. The updated `planning` Edge Function is deployed as v23; refresh the
local frontend to load its updated controls. Regenerate existing saved proposals
to apply the new location/concept instructions; historical text is not rewritten.

1. Sign in as an agency member, then create or open a saved brief.
2. Open its latest version and generate concepts. Compare themes, activities and assumptions side by side.
3. Select a concept, then generate a proposal.
4. Edit the objectives, audience, theme, agenda or assumptions and save a new version.
5. Inspect earlier saved versions. Regeneration requires explicit confirmation and retains saved versions.
6. Export the latest saved proposal as UTF-8 `.txt`. The file includes title, content, proposal version, source brief version, author, timestamp and Draft/Approved status. Unsaved edits are excluded. Sprint 3 has no approval action, so new and edited proposals are Draft.
7. Edit the source brief. Old planning output remains visible for review; generate concepts for the new brief before continuing.

Demo mode (`VITE_APP_MODE=demo`) uses clearly labeled sample templates. It never calls Gemini and is not a security boundary. Backend and live AI validation require a configured Supabase development project.

## Authentication test procedure — Sprint 2 follow-up

- Use existing, confirmed test accounts for repeated password login tests.
- Coordinate signup/email tests through one owner; avoid repeated signup or resend requests for the same account.
- HTTP 429 and Supabase email/request rate-limit codes now produce a service-limit message. Unconfirmed email has a separate message from incorrect credentials.
- Run read-only anonymous checks with `node --env-file=.env.local tests/live-anonymous.mjs`.
- The email delivery incident remains **pending** until a coordinated test confirms actual mailbox delivery. Record project, test time, provider response, delivery time and owner. Passing mocked rate-limit tests does not verify email delivery or resolve a provider quota.

## Automated checks

Run the complete local acceptance set with one command:

```powershell
npm run verify:sprint3
```

To include read-only checks of the project in `.env.local`:

```powershell
npm run verify:sprint3 -- --live-readonly
```

If Playwright's Chromium is unavailable, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed Chrome/Chromium executable.
The runner saves exit codes, timings, Node version, repository revision and a
source fingerprint to `test-results/sprint3-verification.json`. It fails if
sources change during verification, any check fails, or `--skip-browser` leaves
required checks unverified. It performs no deployment, signup or paid generation.
CI runs this command and uploads test evidence on both success and failure.
Screenshots are saved under `test-results/proposals` and `test-results/onboarding`,
preserving the tracked documentation previews.

```powershell
npm ci
npm test
npm run lint
npm run check:functions
npm run verify:edge
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm test` includes PostgreSQL checks through PGlite. It creates temporary Auth schema/roles, applies every real migration, and runs RLS and RPC tests. This verifies SQL behavior locally; it does not substitute for a live Supabase deployment smoke test.

The Gemini adapter uses the documented [structured output contract](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), validates output again with Zod and uses per-attempt timeouts. The current handler permits two attempts of up to 45 seconds each, with a brief backoff; the shared adapter supports at most three attempts for other callers. Thinking settings depend on the configured model. Permanent provider rejections are not retried. Provider error bodies and API keys are never returned to the browser.

## Live verification

`npm run test:ai:live` reads the ignored server-only `.env.gemini.local` and verifies real concept/proposal generation with synthetic data. `npm run test:e2e:live` uses the ignored `.env.acceptance.local` to test the deployed backend from Chromium; it intentionally saves a new proposal version.

`tests/live-sprint3.mjs` is an explicit live backend acceptance test. It requires `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and a matching `EVENTFLOW_LIVE_PROJECT_REF` supplied through a server-only process environment. It creates temporary isolation accounts, removes them afterward, and retains a synthetic review brief/admin. Never put these server credentials into Vite variables.

Email rate limiting remains deferred at the user’s request. No signup/resend email test is required to review Sprint 3 with the provisioned review account.

## Itemized budgets and venue search (2026-11-04)

Proposals now include editable quantities, units, VND unit costs, line totals, contingency, additional tax, total and comparison with the brief ceiling. Existing snapshots stay unchanged; use **Thêm bảng ngân sách dự kiến** to upgrade a legacy proposal, then save a new version.

The brief **Venue / proposed location** controls venue coverage: **TP.HCM** searches the entire city and nearby cities; **Việt Nam** searches nationwide. Search works before concept generation. Optional criteria narrow requirements. Results include capacity, rental/package unit, price provenance, included services, conditions and source links. Choose a result and rental quantity to update the venue cost. Selecting a venue preserves saved prose and other budget lines, appends a proposal version, and asks before discarding unsaved edits. Unknown prices retain a provisional allocation. No booking or availability confirmation is performed.

Real search uses Gemini Google Search grounding followed by validated extraction. Published reference prices require evidence; unsupported references become **Cần liên hệ báo giá**. Demo venues and AI estimates are explicitly labeled. See [Google Search grounding](https://ai.google.dev/gemini-api/docs/google-search).

**Current verification limit:** the supplied Gemini project returned HTTP 503, then HTTP 429 RESOURCE_EXHAUSTED during live venue-search checks. Real venue search and fresh budget generation need a rerun after Gemini quota is available. Do not interpret demo or mocked results as real rental quotes. Budget editing/saving/exporting on the deployed Supabase backend passed live browser testing.

Run `npm run test:venues:live` for public synthetic TP.HCM search. Set `VENUE_TEST_AREA=Việt Nam` in the process environment to check nationwide search. This calls the provider and may consume quota; no credentials are written to evidence.
