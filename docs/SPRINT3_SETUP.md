# Sprint 3 setup and acceptance

Requirements: [Sprint 2 and Sprint 3 backlog](https://docs.google.com/document/d/1irYp_DkbgPj6lJ2FU0WXk0ySDDemt37Oig_87RbJ9dc/edit).

## Current deployed environment

Project: **epmgcyiuloxtblzdrwsw**. Both `workspace` and `planning` are deployed; all six migrations have been applied and recorded. The local frontend uses this project at **http://localhost:5173/**. A review admin account and synthetic AI proposal remain available. Read its credentials from the ignored `.env.acceptance.local` file on this computer.

The previous project settings were backed up to `.env.previous-project.local`. Existing data/accounts were not migrated between projects.

## Backend deployment

Apply all migrations in timestamp order to a development Supabase project. The new migration is `supabase/migrations/20261104040000_sprint3_planning.sql`. It adds planning storage and RPCs without rewriting existing briefs or their history.

Configure these **Edge Function secrets**, using Supabase Dashboard or the Supabase CLI:

- `GEMINI_API_KEY`: a Google AI API key; never a `VITE_` variable.
- `GEMINI_MODEL`: a Gemini model ID available to this project and supporting structured JSON output through `generateContent`. The tested deployment uses `gemini-3.5-flash`.
- `ALLOWED_ORIGINS`: comma-separated allowed frontend origins. Defaults cover localhost ports 5173 and 5174; include the actual hosted origin when deploying.

Supabase supplies `SUPABASE_URL` and `SUPABASE_ANON_KEY`. The planning function forwards the caller's JWT; it does not use a service-role key. Authentication is verified with `getUser`, agency membership and brief access are checked before calling Gemini, and database RLS protects planning reads. The write RPC checks current membership and locks the brief before committing.

Deploy both `workspace` and `planning`. `supabase/config.toml` records `verify_jwt = false` because the legacy-only gateway cannot verify new signing keys. Both handlers verify the caller with Supabase Auth `getUser` and enforce membership before any protected access.

For dashboard deployment, run `npm run bundle:edge`. Upload/paste the single-file functions in `dist-edge/workspace/index.ts` and `dist-edge/planning/index.ts`. Fresh projects can use the atomic `dist-edge/bootstrap-new-project.sql`; existing projects must apply only migrations not already recorded (including `20261104090000_proposal_budget_venues.sql` for budgets/venues). `npm run verify:edge` checks the generated bootstrap on PostgreSQL. Never rerun the fresh-project bootstrap on a populated schema.

## Review workflow

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

The Gemini adapter uses the documented [structured output contract](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), validates output again with Zod and uses per-attempt timeouts. The deployed handler permits two attempts of up to 60 seconds each, with a brief backoff; the shared adapter supports at most three attempts for other callers. Gemini 3.5 Flash uses minimal thinking for concise planning generation. Permanent provider rejections are not retried. Provider error bodies and API keys are never returned to the browser.

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
