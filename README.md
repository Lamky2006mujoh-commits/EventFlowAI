# EventFlow AI — Sprint 2

A localhost React app connected to Supabase for real admin/member accounts, agency-protected client briefs, and version history.

## Run

Use Node.js 24 or newer.

```powershell
npm install
npm run dev -- --host 127.0.0.1
```

Open the URL printed by Vite. The current course session uses http://localhost:5174/. Both administrators and members sign in with email/password. Their role comes from server-side agency membership, never a role selected on the login form.

Configure `.env.local` with the project public values:

```dotenv
VITE_APP_MODE=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Legacy `VITE_SUPABASE_ANON_KEY` is also supported. Missing/invalid live configuration shows a setup error and never falls back to simulated access. Never put a service-role key, secret key, or password in a `VITE_` variable.

## Account workflow

1. A new employee selects **Create an account**, enters their own name/email/password, and confirms the email sent by Supabase.
2. Registration alone grants no agency access or admin privileges.
3. An existing agency administrator opens **Members & roles** and adds the confirmed account's registered email and name. The account starts as a member.
4. The employee signs in to access that agency's workspace. Members can create, view, and edit agency briefs and inspect version history.
5. Administrators can also change roles and remove membership. The last administrator cannot be removed or demoted. Removal revokes subsequent backend data access without deleting the Auth account.
6. **Sign out** ends the current browser session and clears the protected UI. Other-browser logout and expired sessions are handled too.

The first administrator must be explicitly provisioned by the project owner; there is no public bootstrap or automatic first-user-admin endpoint. See [Supabase setup](docs/SUPABASE_SETUP.md).

## Sprint 2 features

- **US-20:** Supabase Auth registration, email/password login, logout, session restoration, and expired-session handling.
- **US-21:** Agency membership, database RLS, authenticated API requests, and checked database functions. Cross-agency reads and writes are denied at the server.
- **US-01:** Validated client brief form including event type, objectives, attendees, date, venue, budget, and special requirements; saved brief ID and failure states.
- **US-02:** Editing appends a snapshot with author and timestamp. The **What changed** table shows before/after values for the selected version. Previous versions are preserved, stale saves are rejected, and dependent outputs are marked for review.
- **S2-T01:** Shared Zod request/data/response contracts, automated tests, and GitHub CI.
- **P1 extras:** Readiness checks and administrator member/role management.

AI generation, proposals, logistics, feasibility, and execution are outside this increment. Browser-only sample mode is still available explicitly with `VITE_APP_MODE=demo`; it is simulated and must not be used for confidential data.

## Verification

```powershell
npm test
npm run lint
npm run build
```

Read-only live anonymous/authentication checks:

```powershell
node --env-file=.env.local tests/live-anonymous.mjs
```

`tests/database-security.sql` verifies agency boundaries, immutable history, author attribution, stale writes, invalid input, role escalation, membership removal, and anonymous denial using temporary fixtures inside a transaction that is rolled back. Run it against a development project using its SQL Editor or the connected Supabase tool. It does not require or expose a user's password.

CI runs tests, lint, and build on pull requests and pushes to `main`. The database checks require a configured Supabase project and are separate from unit tests.
