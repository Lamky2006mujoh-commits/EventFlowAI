# EventFlow AI — Sprint 3

A React app connected to Supabase for agency-protected client briefs, Gemini concept generation, and editable proposals with version history.

## Run

Use Node.js 24 or newer.

```powershell
npm install
npm run dev -- --host 127.0.0.1
```

Open the URL printed by Vite. The current workspace runs at http://localhost:5173/ and uses the newly deployed Supabase project `epmgcyiuloxtblzdrwsw`. Review account credentials are stored locally in the ignored `.env.acceptance.local` file. Both administrators and members sign in with email/password. Their role comes from server-side agency membership, never a role selected on the login form.

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

1. A new employee selects **Create an account**, enters their own name/email/password, and confirms the email sent by Supabase.
2. Registration alone grants no agency access or admin privileges.
3. An existing agency administrator opens **Members & roles** and adds the confirmed account's registered email and name. The account starts as a member.
4. The employee signs in to access that agency's workspace. Members can create, view, and edit agency briefs and inspect version history.
5. Administrators can also change roles and remove membership. The last administrator cannot be removed or demoted. Removal revokes subsequent backend data access without deleting the Auth account.
6. **Sign out** ends the current browser session and clears the protected UI. Other-browser logout and expired sessions are handled too.

The first administrator must be explicitly provisioned by the project owner; there is no public bootstrap or automatic first-user-admin endpoint. See [Supabase setup](docs/SUPABASE_SETUP.md).

Updated Sprint 2 backlog reflecting the implemented fixes: [read the document](docs/SPRINT2_BACKLOG.md).

## Sprint 2 features

- **US-20:** Supabase Auth registration, email/password login, logout, session restoration, and expired-session handling.
- **US-21:** Agency membership, database RLS, authenticated API requests, and checked database functions. Cross-agency reads and writes are denied at the server.
- **US-01:** Validated client brief form including event type, objectives, attendees, date, venue, budget, and special requirements; saved brief ID and failure states.
- **US-02:** Editing appends a snapshot with author and timestamp. The **What changed** table shows before/after values for the selected version. Previous versions are preserved, stale saves are rejected, and dependent outputs are marked for review.
- **S2-T01:** Shared Zod request/data/response contracts, automated tests, and GitHub CI.
- **P1 extras:** Readiness checks and administrator member/role management.

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
