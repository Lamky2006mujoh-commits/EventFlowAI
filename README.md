# EventFlow AI — Sprint 3

A React app connected to Supabase for agency-protected client briefs, Gemini concept generation, and editable proposals with version history.

## Run

Use Node.js 24 or newer.

```powershell
npm ci
# Fresh clone only: .env.example contains the shared public Supabase config.
Copy-Item .env.example .env.local
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Teammates use the deployed shared backend and do not need Gemini/Tavily keys or
their own Supabase project. Register a personal account and obtain agency approval.
Keep an existing `.env.local` if it already contains your intended configuration.
See [shared demo setup](docs/SPRINT3_SETUP.md#teammate-setup-after-cloning).

Open the URL printed by Vite (normally http://localhost:5173/). The current checkout's public configuration points to Supabase project `qazukdulzixiudzyrhdn`, verified on 5 November 2026. Sign in with your own confirmed agency account. Optional live-test credential files are ignored and are not distributed with the repository. Both administrators and members sign in with email/password. Their role comes from server-side agency membership, never a role selected on the login form.

Configure `.env.local` with the project public values:

```dotenv
VITE_APP_MODE=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Legacy `VITE_SUPABASE_ANON_KEY` is also supported. Missing/invalid live configuration shows a setup error and never falls back to simulated access. Never put a service-role key, secret key, or password in a `VITE_` variable.

Each teammate must create their own ignored `.env.local`; Git does not distribute that file. After setting the shared project's public URL/key, run `npm run check:auth` to verify the connection and signup settings without creating an account or sending email. Restart Vite after editing environment variables.

If registration fails, read the displayed Auth error code. `over_email_send_rate_limit` means the shared project's confirmation-email quota was reached, not that the Git clone is broken. See [signup troubleshooting](docs/SUPABASE_SETUP.md#signup-fails-for-teammates).

## Account workflow

The revised signup/approval flow requires the new migration and workspace function before rollout. See [Sprint 1 authentication backlog](docs/SPRINT1_BACKLOG.md) and [approval setup and test results](docs/SIGNUP_APPROVAL.md).

1. An administrator shares the agency registration code shown under **Members & roles → Signup requests**.
2. A new employee creates an account using that code, their name, email and password. A validated Auth signup records a pending request; no membership is granted.
3. The administrator sees an in-app notification, pending count and review queue. The employee confirms their email.
4. The administrator approves or rejects the request. Approval saves the **member** role and review attribution atomically; unconfirmed accounts cannot be approved.
5. The approved member signs in to work on agency briefs. Pending or rejected users remain outside the workspace.
6. Administrators may subsequently manage roles and membership, retaining at least one administrator. Logout and expired-session protection remain in effect.

The first administrator must be explicitly provisioned by the project owner; there is no public bootstrap or automatic first-user-admin endpoint. See [Supabase setup](docs/SUPABASE_SETUP.md).

Updated Sprint 2 backlog reflecting the implemented fixes: [read the document](docs/SPRINT2_BACKLOG.md).

## Sprint 2 features

- **US-20:** Supabase Auth registration, email/password login, logout, session restoration, and expired-session handling.
- **US-21:** Agency membership, database RLS, authenticated API requests, and checked database functions. Cross-agency reads and writes are denied at the server.
- **US-01:** Validated client brief form including event type, objectives, attendees, date, venue, budget, and special requirements; saved brief ID and failure states.
- **US-02:** Editing appends a snapshot with author and timestamp. The **What changed** table shows before/after values for the selected version. Previous versions are preserved, stale saves are rejected, and dependent outputs are marked for review.
- **S2-T01:** Shared Zod request/data/response contracts, automated tests, and GitHub CI.
- **P1 extras:** Readiness checks and administrator member/role management.

Sprint 3 planning and carried-over work: [read the backlog](docs/SPRINT3_BACKLOG.md). The email-completion assumption is explicitly labeled; actual delivery verification remains pending.

## Sprint 3 features

- **US-04:** Gemini concepts through an authenticated Edge Function; 2–3 structured concepts, Zod validation, bounded retries and controlled errors.
- **US-05:** Compare themes, activities and assumptions; persist the selected concept.
- **US-06:** Generate and edit proposal sections, append author/timestamp versions, explicitly confirm regeneration and retain manual edits in history.
- **Ngân sách dự kiến:** phân bổ theo hạng mục, số lượng × đơn giá, dự phòng, thuế, tổng và cảnh báo vượt ngân sách; chỉnh sửa, lưu lịch sử và xuất file.
- **Địa điểm:** tìm theo phạm vi trong brief (thành phố và lân cận hoặc toàn Việt Nam), xem giá có nguồn/ước tính/cần báo giá, điều kiện và sức chứa; lựa chọn để cập nhật chi phí thuê.
- **S3-T01:** Automated workflow, provider failure, HTTP authorization and PostgreSQL RLS/RPC checks.
- **US-07 (P1):** Export the latest saved proposal as UTF-8 text with title, content, version and status.
- **Sprint 2 improvements:** Distinct messages for authentication/email rate limits and unconfirmed email; SQL security regression tests and mobile layout fixes.

Configure the new migration, `planning` Edge Function and server-only Gemini secrets using [Sprint 3 setup](docs/SPRINT3_SETUP.md). See [test results](docs/SPRINT3_TEST_REPORT.md) for verification boundaries.

Browser-only sample mode is available explicitly with `VITE_APP_MODE=demo`; it uses labeled sample templates instead of AI and must not be used for confidential data. Logistics, feasibility and execution remain outside this increment.

## Verification

Proposal generation follows the selected concept and one explicit location.
Without a venue search it uses the location entered in the saved brief exactly.
After a successful venue search, choose a result before generating the proposal;
that choice takes precedence over the brief's original search area. Changing the
venue later preserves saved text/history and updates rental costs, then requires
proposal regeneration so the narrative can be adapted to the new venue.

Run `npm run verify:sprint3` for all local checks, or
`npm run verify:sprint3 -- --live-readonly` to also verify Auth settings and
anonymous access denial against `.env.local`. Results, timings and a source
fingerprint are written to `test-results/sprint3-verification.json`.
See [current Sprint 3 execution evidence](docs/SPRINT3_EXECUTION_REPORT.md)
for completed work and the remaining live-provider/email acceptance gates.

The signup review panel supports name/email search and filters for confirmed or
unconfirmed pending accounts. Search covers the latest 100 loaded requests; the
pending badge counts every pending request. Approval still requires email
confirmation and always grants Member access.

Unsaved brief and proposal edits require confirmation before leaving the editor
or signing out. Opening brief history also checks unsaved proposal edits. Closing
or reloading a dirty editor requests the browser's unsaved-changes warning.

```powershell
npm test
npm run lint
npm run check:functions
npm run verify:edge
npm run build
```

Read-only live anonymous/authentication checks:

```powershell
node --env-file=.env.local tests/live-anonymous.mjs
```

`tests/database-security.sql` verifies agency boundaries, immutable history, author attribution, stale writes, invalid input, role escalation, membership removal, and anonymous denial using temporary fixtures inside a transaction that is rolled back. Run it against a development project using its SQL Editor or the connected Supabase tool. It does not require or expose a user's password.

CI runs unit/integration tests, PostgreSQL checks, lint, function type checks, production build and Chromium E2E tests on pull requests and pushes to `main`. Local PostgreSQL checks use PGlite with all real migrations and temporary Auth fixtures. The standalone SQL script can also be run against a development Supabase project.

Browser checks: `npx playwright install chromium`, then `npm run test:e2e`. To use an installed browser instead, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path.

The original Sprint 3 baseline was verified on the new Supabase project: real Gemini generation, 12 backend checks, 10 anonymous checks and a real browser workflow. Use `npm run test:e2e:live` to repeat the browser check with the local review account. Email rate limiting is deferred as requested.

Budget/venue extension: 51 unit/integration/PostgreSQL checks, 8 browser scenarios and the live Supabase budget save/export/reload workflow are covered. Real Google-grounded venue search is currently blocked by Gemini quota (HTTP 429); provider-backed search and fresh AI budget generation must be rerun after quota recovery. See [extension results](docs/BUDGET_VENUES_TEST_REPORT.md).
