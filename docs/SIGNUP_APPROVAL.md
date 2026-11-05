# Signup Approval Setup and Test Results

Updated: 5 November 2026.

## New Workflow

1. An agency administrator opens **Members & roles → Signup requests** and shares the 16-character agency registration code with an employee.
2. The employee selects **Create an account** and enters their name, email, password, and agency code.
3. A public boolean RPC checks the code before any Auth signup. Missing approval setup or an invalid code stops signup. The Auth insert trigger independently validates routing and records a pending request atomically with account creation.
4. The administrator sees an in-app pending notification, navigation badge, and review queue. It refreshes every 30 seconds and on window focus, with manual refresh available.
5. The employee confirms their email. The Auth update trigger synchronizes confirmation state into the request.
6. The administrator approves or rejects. Approval always creates a **member** membership; the client cannot choose an administrator role. The database saves reviewer ID/name and review time in the same transaction.
7. The approved employee signs in. Pending/rejected accounts cannot access the workspace. Review history remains available after reload.

An agency code only routes requests; it does not grant access. Existing accounts without signup routing metadata retain the controlled legacy add-member workflow. The legacy RPC cannot bypass review for accounts with a signup request.

## Existing Project Rollout

**Status: code and local verification completed; this revision has not been deployed to live Supabase.** No Supabase CLI installation or authenticated deployment connection is available in this execution environment.

Deploy in this order before releasing the updated registration interface:

1. Apply **supabase/migrations/20261105010000_signup_approval.sql** once to the existing project.
2. Deploy the updated **workspace** Edge Function. Keep its explicit Supabase getUser authentication and existing membership enforcement.
3. Release/restart the frontend with the intended public URL/key.
4. Sign in as the existing admin and obtain the agency code from the review panel.
5. Coordinate one real registration and email-confirmation test, then approve the request and verify member login.

For dashboard deployment, npm run bundle:edge produces dist-edge/workspace/index.ts and copies the individual migration under dist-edge/migrations/. Apply only the new migration to an existing project. Never run the fresh-project bootstrap against a populated schema.

No new server secret or service-role key is needed. Auth triggers and narrow database functions perform request persistence and approval. No public agency directory or public request list is exposed.

## Verification

- **57/57 unit/integration checks passed**, including five new PostgreSQL/HTTP approval tests and a registration preflight regression.
- **8/8 onboarding browser scenarios passed**: signup metadata and success guidance, invalid-code rejection, administrator notification, fixed-role approval, rejection, pending login, member UI restrictions, refresh error recovery, and automatic polling. Related behaviors are grouped within scenarios.
- **8/8 existing proposal/venue browser scenarios passed**.
- PostgreSQL tests apply all **seven migrations**. They verify confirmation gating, cross-agency denial, member/anonymous denial, canonical attribution, legacy-bypass prevention, competing decisions, immutable review decisions, and successful member workspace access after approval.
- The onboarding browser suite uses a mocked Supabase network adapter and synthetic accounts. Its screenshots demonstrate the UI; they are not evidence of live email delivery or live deployment.
- No real signup or resend emails were sent. The separate email delivery/rate-limit incident remains open.
- CI includes npm run test:e2e:onboarding. Inspect the remote workflow result for the pushed commit rather than assuming a configured workflow has passed.

Commands:

```powershell
npm test
npm run test:e2e
npm run test:e2e:onboarding
npm run lint
npm run check:functions
npm run verify:edge
npm run build
```

The build retains the existing non-blocking large-chunk warning. Test results are recorded from local execution.

## Access and Audit Rules

Only active administrators can load the code/review queue and decide requests in their own agency. Raw request/settings tables are inaccessible to anonymous and authenticated clients. Checked RPCs expose only the intended operations. The public code-validation RPC returns a boolean without agency names or IDs.

Approval locks the agency, rechecks administrator membership, locks the request and Auth account, verifies email confirmation, and inserts fixed-role membership together with the review decision. A second or competing review is rejected. Removing membership later does not reopen an approved request or allow a repeated approval to regrant access.

The queue displays at most 100 requests, with pending requests first; the pending counter covers all pending requests. It is an in-app review notification, not an outbound email notification.
