# EventFlow AI Sprint 2 Updated Backlog

Updated: **5 November 2026**. Implementation baseline: commit [8305ac5](https://github.com/Lamky2006mujoh-commits/EventFlowAI/commit/8305ac5).

Sprint 2 establishes authentication, agency access control, and client brief management with version history. This update records the implemented improvements to authentication errors, Supabase configuration, session handling, data isolation tests, and brief change tracking.

**Status interpretation:** “Technically complete” means implementation and test evidence are available. The registration flow is not fully closed because confirmation-email delivery remains unverified. This follow-up is now planned in Sprint 3 as S3-BUG-01. No Product Owner acceptance has been recorded in the available evidence.

## Backlog Summary

| ID        | Item                                                | Updated Status                                                                                                 |
| --------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| US-20     | Registration, login, logout, and session management | Implementation complete; email-delivery verification remains pending before closing the full registration flow |
| US-21     | Agency data isolation and access control            | Technically complete                                                                                           |
| US-01     | Validated client brief creation and saving          | Technically complete                                                                                           |
| US-02     | Brief editing and preserved version history         | Technically complete                                                                                           |
| S2-T01    | Shared contracts, regression tests, and CI          | Technically complete; check remote CI results for each commit                                                  |
| S2-P1-01  | Agency member and role management                   | Technically complete                                                                                           |
| S2-P1-02  | Brief readiness and usability improvements          | Technically complete                                                                                           |
| S2-BUG-01 | Confirmation-email delivery and rate-limit incident | Carried over to S3-BUG-01; actual delivery verification pending                                                |

S2-P1-01, S2-P1-02, and S2-BUG-01 are supplemental identifiers introduced in this backlog update. Estimates, assignees, and approvals have not been inferred.

## US-01 Build Client Brief Creation Form

**User story:** As an event planner, I want to save event requirements as a brief with a unique ID so my agency can use and update it.

**Updated acceptance criteria**

1. Require an event name, client, event type, valid date, venue or proposed area, attendee count, budget, and objectives.
2. Validate event names at 3–160 characters, client names at 2–160, locations at 2–300, and objectives at 10–5,000. Event types must come from the supported list.
3. Accept an integer attendee count from 1 to 100,000 and a finite budget greater than zero and no more than VND 1,000,000,000,000. The current implementation validates calendar dates; it does not require a future date.
4. Allow audience and constraints to be empty, enforce their length limits, and identify them as information to clarify.
5. Return a brief ID after a successful save and associate the record with the correct agency and server-derived author. Invalid data or failed saves must not report success or create false history.
6. Accept a venue name, city, region, or country as the proposed location. Venue search using this field belongs to Sprint 3.

**Evidence:** shared frontend/backend Zod contracts; tests for required fields, dates, attendee and budget boundaries, failed saves, and access control.

## US-02 Implement Brief Editing and Version History

**User story:** As an agency member, I want to update briefs and inspect earlier versions so the team can trace changes and decisions.

**Updated acceptance criteria**

1. Each saved update appends a snapshot with a version number, author, and timestamp. Earlier snapshots remain unchanged.
2. Other authorized members of the same agency can edit the brief. The server determines authorship rather than trusting client-submitted author data.
3. Show before/after values for changed fields; identify the first version as the initial creation.
4. Reject a save based on an outdated version after another user has saved a newer version. Require a reload before retrying.
5. Mark dependent planning output for review when the brief changes. Readiness checks use the current brief even while an older snapshot is displayed.
6. Only administrators can delete a brief and its history after UI confirmation; other briefs remain unaffected.

**Evidence:** tests for immutable snapshots, attribution, field differences, same-agency edits, stale writes, and deletion permissions.

## US-20 Implement Authentication with Supabase Auth

**User story:** As an agency employee, I want to sign in with my own account and end my session safely so I can access only the workspace assigned to me.

**Updated acceptance criteria**

1. Administrators and members use the same email/password login flow. Roles and agency access come from server-side membership; registration cannot grant an administrator role or select an agency.
2. Validate registration name, email, and passwords of 12–128 characters. Registration alone grants no workspace access. Accounts must be confirmed and added to an agency by an administrator.
3. Invalid credentials must not open the workspace. Unconfirmed accounts and accounts without membership receive appropriate guidance.
4. Restore valid sessions and close protected views when a session expires or is signed out. A pending response must not reopen protected data after logout.
5. Report logout failures instead of claiming success. The implemented logout ends the session in the current browser.
6. Distinguish confirmation-email limits, authentication request limits, unconfirmed email, unauthorized recipient addresses, disabled providers, weak passwords, connection failures, and invalid URL/key configuration.
7. Preserve the entered password in form memory after failed registration so the user can correct or retry after the cause is resolved. Do not log passwords or display raw provider error payloads.
8. Invalid live configuration must show an error rather than silently falling back to demo access. Support the publishable key and legacy anon-key alias; the URL and key must identify the same project.

**Implemented improvements:** actionable Auth error mapping; the read-only npm run check:auth configuration check; rejection of late responses after logout; separate handling of session loss and agency-access revocation.

**Outstanding verification:** registration → email receipt → email confirmation → membership assignment → login. A pre-provisioned review account does not verify confirmation-email delivery. Track this work under S2-BUG-01.

## S2-P1-02 Brief Readiness and Usability Improvements

**User story:** As an event planner, I want to see which brief details still need clarification so I can improve the brief before planning.

**Updated acceptance criteria**

1. Evaluate the latest saved brief for missing audience and planning constraints.
2. Identify each missing field and provide a relevant clarification prompt.
3. Show the ready state when the checked fields are filled; evaluate the current brief even when an older version is being inspected.
4. Treat readiness as an information-completeness check. It must not imply supplier confirmation, event feasibility, or approval.

**Evidence:** readiness tests cover incomplete and complete briefs. Version-aware readiness behavior is documented in the interface.

## S2-P1-01 Agency Member and Role Management

**User story:** As an agency administrator, I want to manage membership and roles so employees receive the appropriate access.

**Updated acceptance criteria**

1. Only administrators can add members, change roles, or remove membership.
2. Add only confirmed Auth accounts that do not already belong to another agency.
3. New members start with the member role; promotion is a separate administrator action.
4. Prevent members from promoting themselves or managing other members.
5. Retain at least one administrator; reject removal or demotion of the last administrator.
6. Reject changes to members of another agency.
7. Removing membership revokes agency access on subsequent requests without deleting the Auth account.

**Scope limits:** this implementation assigns one agency per account. Agency transfers, email invitations, and password recovery are outside this increment.

**Evidence:** membership and role regression tests, server-side RPC checks, agency isolation tests, and membership-revocation checks.

## US-21 Agency Data Isolation and Access Control

**User story:** As an agency member, I want agency data protected by server-side authorization so users from other agencies cannot access it.

**Updated acceptance criteria**

1. Verify Supabase Auth identity and current membership before protected reads or writes. Never trust client-supplied agency or role metadata.
2. Enforce agency boundaries for briefs, memberships, and version history through RLS and checked RPCs, including direct API/RPC requests.
3. Permit authorized members to create, read, and edit agency briefs. Restrict administration and deletion to administrators.
4. Reject anonymous access, missing/invalid/expired tokens, and unauthorized direct table writes.
5. Revoke read/write access on the next request after membership removal.
6. Keep service-role keys and server secrets out of the frontend. Exclude private environment files and review credentials from Git.

**Evidence:** PostgreSQL RLS/RPC tests; the SQL security suite executed against live Supabase on 4 November 2026 with rolled-back fixtures; a two-agency Postman collection.

## S2-T01 Shared Contracts and Regression Testing

Implemented shared Zod request/data/response contracts, unit and integration tests, PostgreSQL tests with real migrations, SQL security checks, a Postman collection, and GitHub Actions for tests, lint, type checks, build, and Chromium E2E.

| Date            | Check                                  | Result and Verification Boundary                                                                  |
| --------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 5 November 2026 | Authentication and error handling      | 14/14 passed; no email sent                                                                       |
| 5 November 2026 | Sprint 2 brief regression              | 11/11 passed                                                                                      |
| 5 November 2026 | PostgreSQL integration                 | 4/4 passed; includes Sprint 2 security and Sprint 3 regression across all migrations              |
| 4 November 2026 | Full unit/integration suite            | 51/51 passed across the project, not 51 Sprint 2-only tests                                       |
| 4 November 2026 | Browser testing                        | 8/8 demo E2E and 1/1 live E2E passed; primarily Sprint 3 workflows, not email-delivery acceptance |
| 4 November 2026 | Live anonymous and SQL security checks | 10/10 anonymous checks and SQL security passed according to the saved report                      |

Repeat the regression group run on 5 November 2026:

```powershell
node --test tests/auth.test.mjs tests/sprint2.test.mjs tests/database.test.mjs
```

The npm run check:auth command neither creates accounts nor sends email and cannot prove inbox delivery. A configured CI workflow does not establish that every remote run has passed.

## Other Implemented Usability Improvements

The interface provides before/after brief comparisons and layouts suitable for smaller screens. These improvements support the relevant stories; they do not introduce additional story IDs or change approval status.

## S2-BUG-01 Confirmation Email Follow-up

**Observed issue:** registration can encounter over_email_send_rate_limit, HTTP 429, or recipient restrictions from the email provider. Machines using the same Supabase project share its Auth service limits; cloning Git does not create a separate Auth service.

**Implemented handling:** distinguish error codes, provide actionable guidance, preserve form input after errors, avoid automatic email resends, and document configuration and connection checks.

**Still unresolved:** provider delivery configuration or capacity, actual email receipt, and the complete confirmation flow. SMTP, quotas, and email-confirmation requirements have not been changed to claim resolution. The incident is carried over to S3-BUG-01 in [Sprint 3 planning](SPRINT3_BACKLOG.md). Its Done label there is an explicit planning assumption, not a verified fix.

**Closure criteria:** coordinate one agreed test account and record the project, attempt time, provider response, email receipt time, and confirmation/login outcome. Do not repeatedly register or resend. After successful acceptance, update this issue and the outstanding verification under US-20.

## Sprint 3 Boundary and References

Open email-delivery acceptance and remote CI follow-up are tracked in the [Sprint 3 backlog](SPRINT3_BACKLOG.md). Existing Sprint 2 test evidence is unchanged.

Concept generation and selection, proposals, TXT export, itemized proposal budgets, and venue search/selection with rental prices and conditions belong to Sprint 3. Gemini quota is separate from the Sprint 2 Auth email incident.

- [Project repository](https://github.com/Lamky2006mujoh-commits/EventFlowAI)
- [Supabase configuration and registration troubleshooting](SUPABASE_SETUP.md)
- [Saved deployment and test report](SPRINT3_TEST_REPORT.md)
- [Budget and venue extension results](BUDGET_VENUES_TEST_REPORT.md)
- Tests: tests/auth.test.mjs, tests/sprint2.test.mjs, tests/database.test.mjs, and tests/database-security.sql.
- Agency-isolation API checks: api-tests/postman/sprint2-agency-isolation.postman_collection.json.
