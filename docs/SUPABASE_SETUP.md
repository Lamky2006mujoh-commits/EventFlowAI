# Supabase setup and verification

The app uses real Supabase accounts by default. Explicit `VITE_APP_MODE=demo` enables the older browser-only samples.

## Database and backend

For a new project, apply these migrations in order, once each:

1. `supabase/migrations/20261104024425_sprint2_agency_briefs.sql`
2. `supabase/migrations/20261104024516_sprint2_member_management.sql`
3. `supabase/migrations/20261104025022_sprint2_restrict_rpc_execution.sql`
4. `supabase/migrations/20261104025815_sprint2_admin_brief_deletion.sql`

They create agencies, memberships, briefs, and version history; enable RLS; and expose checked atomic RPCs. Existing connection-test data is untouched. Do not rerun them on an existing schema.

Deploy the function after reviewing the source:

```powershell
supabase functions deploy workspace --project-ref YOUR_PROJECT_REF
```

The workspace function validates the signed-in user and shared Zod payloads. It queries the database with that user's token. Server membership determines the agency and permissions; submitted agency/role metadata is never trusted. The backend does not need a service-role key.

Default CORS origins are localhost and 127.0.0.1 on ports 5173 and 5174. Other frontend origins require an exact comma-separated `ALLOWED_ORIGINS` function setting.

## Frontend configuration

Preserve the existing `.env.local` values:

```dotenv
VITE_APP_MODE=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

`VITE_SUPABASE_ANON_KEY` is an accepted legacy alias. Restart Vite after environment changes. Public keys identify the project; they do not replace a signed-in user's access token. Never expose a service-role/secret key in frontend configuration.

## First administrator

There is deliberately no public first-user-admin endpoint. The project owner must assign the first confirmed user to an agency through a trusted administrative connection. Register and confirm the intended account first. In a reviewed owner-only SQL transaction:

- Find the confirmed Auth user by their exact registered email.
- Verify they have no existing membership.
- Create the intended agency and capture its generated UUID.
- Insert membership with that user's UUID, the new agency UUID, their display name, and role `admin`.

The active project is now **epmgcyiuloxtblzdrwsw**, initialized with **EventFlow Agency** and a local review administrator for Sprint 3 acceptance. Read the review credentials from the ignored `.env.acceptance.local` file on this computer. Real employee accounts still require the controlled membership workflow below. See [Sprint 3 setup](SPRINT3_SETUP.md) for the deployed environment.

## Other members

Employees create and confirm their own accounts in the app. An agency administrator adds each registered email under **Members & roles**. Only confirmed accounts without another agency membership can be added. New members are added as `member`; promotion is a separate administrator action. Administrators may remove agency access without deleting the Auth account. At least one administrator must remain.

One account belongs to one agency in this small-course implementation. Agency transfers, email invitations, and password recovery are outside this increment.

## Signup fails for teammates

Cloning the frontend does not clone Supabase or its email settings. All teammates configured with the same public project URL/key share the hosted Auth service and its email quotas. `.env.local` is intentionally ignored by Git and must be configured on each machine.

Run this read-only check after configuring `.env.local`:

```powershell
npm run check:auth
```

It validates the public URL/key against Auth and reports whether email signup and confirmation are enabled. It never attempts signup or sends email. A successful connection check does not prove confirmation-email delivery works.

The signup UI maps known Auth error codes to specific actions and keeps the entered password in memory after a failed attempt. It never displays raw backend error payloads or logs a password.

| Error | Meaning | Fix |
| --- | --- | --- |
| `over_email_send_rate_limit` / HTTP 429 | The hosted project's confirmation-email quota was reached | Stop repeated attempts. Let the provider limit reset, configure custom SMTP for ongoing self-registration, or have the project owner provision known course accounts without sending invitations |
| `email_address_not_authorized` | The built-in sender cannot deliver to the submitted address | Configure custom SMTP; the built-in service only sends to permitted organization-team addresses |
| `email_not_confirmed` | Login was attempted before confirmation | Complete the confirmation email; if it was never delivered, fix email delivery or use owner-provisioned course accounts |
| Signup/provider disabled | Project configuration rejects email signup | Review Authentication → Sign In / Providers |
| Invalid project URL/key | The frontend cannot reach the intended Auth project | Correct the ignored `.env.local`, keep the URL/key from the same project, and restart Vite |

For the one-day course, the project owner can use **Supabase Dashboard → Authentication → Users → Add user → Create new user** to provision known teammates. Use the auto-confirm option if shown and do not choose **Send invitation** when avoiding email delivery. Set each account's password privately with its owner; never commit or post passwords. Then an app administrator adds each account under **Members & roles**. A project-dashboard-created user still has no agency access until membership is assigned.

For self-service signup with email confirmation, configure **Authentication → Email → SMTP Settings** (the exact navigation label can vary) with your email provider's host, port, username, password, and verified sender. Keep those credentials in Supabase's server-side settings, never in `VITE_` variables. Confirm delivery to a teammate and check the provider's sending quota. Do not add people to the Supabase organization merely to work around email restrictions; application membership is separate from project administration.

Do not disable email confirmation as an automatic workaround. That stops proving ownership of submitted email addresses and changes the trust assumptions of member onboarding. Any course-only change to that setting must be an explicit project-owner decision.

Sources: [Supabase test-auth guidance](https://supabase.com/docs/guides/auth/testing-auth-flows), [SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp).

Members can create and edit agency briefs and inspect preserved versions. Only administrators can permanently delete a brief and its history, after explicit UI confirmation.

## Verification

Run `npm test`, `npm run lint`, and `npm run build` locally. `tests/live-anonymous.mjs` checks invalid credentials, anonymous table reads, and missing/invalid bearer tokens against the configured project. `tests/database-security.sql` performs authenticated/anonymous checks with rolled-back fixtures:

- Users cannot read another agency's briefs, membership, or version history.
- Cross-agency saves/deletes and direct table writes are rejected.
- A member can edit an agency brief; old snapshots and author/timestamp are retained.
- Stale saves and invalid budgets are rejected.
- Members cannot grant themselves roles or remove other members.
- Administrators cannot move another agency's member into their agency.
- Unconfirmed accounts cannot be added.
- Removed members cannot read or write agency briefs.
- Anonymous table reads and RPC execution are denied.

Complete the browser acceptance flow with separate real admin/member accounts: login, create brief, change budget, compare versions, logout, then test the same flow as a member. Wrong credentials must stay outside the workspace.

Import `api-tests/postman/sprint2-agency-isolation.postman_collection.json` into Postman to repeat the cross-company test. Create a private environment containing `publishable_key`, `company_a_email`, `company_a_password`, `company_b_email`, and `company_b_password`. Company A must use an administrator account for test cleanup; Company B may use an admin or member. The accounts must belong to different agencies. Run the collection in order: it checks that A can read its own brief, B cannot read/edit/delete it or see its history, and A's original budget stays unchanged. It deletes only the disposable test brief at the end. Do not share or export environment values containing passwords or access tokens.

## Security advisor interpretation

Supabase reports advisory 0029 for the six intentionally callable SECURITY DEFINER helpers/RPCs. Their design is deliberate: clients cannot write tables directly, so the atomic write functions derive identity from `auth.uid()`, check agency/role, and use an empty search path. Anonymous execution is explicitly revoked. The security tests exercise both direct RPC calls and RLS reads; UI restrictions are not the security boundary. Review any changes to those functions carefully.

Advisor reference: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
