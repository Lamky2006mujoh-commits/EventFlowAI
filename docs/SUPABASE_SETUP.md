# Optional Supabase mode

The localhost demo runs immediately without this setup. Real Sprint 2 authentication and agency isolation require the cloud backend. No migration or function has been deployed automatically.

## 1. Prepare a development project

Use a dedicated Supabase development project. Run `supabase/migrations/202611040001_sprint2.sql` once in its SQL Editor after reviewing it. It creates agencies, agency membership, briefs, immutable version records, RLS read policies, and permission-checked write functions. Do not rerun the migration on an existing schema.

Create test accounts through Supabase Authentication. This demo uses existing email/password accounts; public sign-up, invitations, and password recovery are outside this increment.

Create agency rows and membership rows using the SQL Editor as the project administrator. Use actual user UUIDs from Authentication:

```sql
insert into public.agencies (id, name)
values ('11111111-1111-4111-8111-111111111111', 'Flow Studio');

-- Replace the example user UUID with an existing Auth user's UUID.
insert into public.agency_members (user_id, agency_id, display_name, role)
values ('22222222-2222-4222-8222-222222222222',
        '11111111-1111-4111-8111-111111111111', 'Course Administrator', 'admin');
```

The small-course model intentionally supports one agency per account. Add a second agency and separate users to verify isolation. Add a `member` account in the first agency to verify permissions.

## 2. Deploy the workspace function

With the Supabase CLI already installed and authenticated, run:

```powershell
supabase functions deploy workspace --project-ref YOUR_PROJECT_REF
```

The function uses `supabase/functions/workspace/deno.json` for imports and shares the Zod contract in `supabase/functions/_shared/contracts.ts` with React. It authenticates the bearer token with `auth.getUser()` and uses that user's token for database reads and RPCs. It never uses a service-role key.

Default CORS origins cover localhost and 127.0.0.1 on ports 5173 and 5174. For another origin, set the function's `ALLOWED_ORIGINS` secret to a comma-separated list of exact allowed origins.

## 3. Enable the frontend

Preserve any existing `.env.local` values. Add the explicit mode setting and use your project's public URL and publishable key:

```dotenv
VITE_APP_MODE=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

`VITE_SUPABASE_ANON_KEY` is also accepted for projects using legacy anon keys. Never put a service-role key, secret key, or password into a `VITE_` variable. Restart Vite after environment changes. Set `VITE_APP_MODE=demo` to return to the offline sample workflow.

## 4. Verify before calling backend stories Done

Run `deno check supabase/functions/workspace/index.ts` if Deno is available. Then test the following against the configured development project using the UI and Postman:

| Check | Expected result |
| --- | --- |
| Valid and invalid passwords | Only valid credentials open the workspace |
| Missing, invalid, or expired access token | Workspace function rejects the request |
| Valid create and edit | Brief ID returned; edit appends author/timestamp/version |
| Negative budget, impossible date, or blank required field | Rejected; no brief or history inserted |
| Two edits with the same expected version | Second edit rejected; first edit retained |
| Agency B reads Agency A brief or version using REST | No rows returned under RLS |
| Agency B calls save/delete RPC with Agency A brief ID | Rejected |
| Ordinary member calls role-change RPC directly | Rejected |
| Admin changes a role | Updated permissions apply to the next request |
| Last administrator attempts self-demotion | Rejected |
| Direct table insert/update/delete by authenticated user | Rejected; writes must use checked RPCs |
| Sign out then access protected data | Access denied |

Postman function requests use `POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/workspace`, `Content-Type: application/json`, `apikey: YOUR_PUBLISHABLE_KEY`, and `Authorization: Bearer YOUR_USER_ACCESS_TOKEN`.

Example bodies:

```json
{ "action": "workspace" }
```

```json
{
  "action": "save",
  "data": {
    "title": "Course demo event",
    "client": "Sample Client",
    "eventType": "Workshop",
    "date": "2026-11-28",
    "venue": "UIT Hall",
    "attendees": 80,
    "budget": 30000000,
    "objectives": "Present the team project and gather feedback.",
    "audience": "Course participants",
    "constraints": "None confirmed"
  }
}
```

For editing, add `id` and `expectedVersion` to the save body. For a role change, use `{"action":"role","memberId":"USER_UUID","role":"member"}`. Keep access tokens/passwords private and out of exported collections.

## Verification boundary

Automated tests exercise the browser-demo implementation and shared contracts. They do not establish Supabase RLS or real authentication correctness. The cloud migration, Deno function, and cross-agency backend tests require an actual configured project and must be verified separately. Browser-only mode has no security boundary and is for sample data.
