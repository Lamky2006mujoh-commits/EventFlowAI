# EventFlow AI Sprint 1 Authentication Backlog

Updated: **5 November 2026**. This revision defines the registration and administrator approval workflow requested for Sprint 1. Earlier Sprint 2 records remain historical references.

## S1-US-01 Register and Request Agency Membership

**User story:** As a new employee, I want to create an account and request membership in my agency so its administrators can review my access.

**Description:** An administrator shares the agency registration code. The employee enters their name, email, password, and code. A successful Auth account creation records a pending request in the database through an Auth trigger. The agency code routes the request; it grants no access or role. Email confirmation and administrator approval are separate requirements.

**Acceptance criteria**

1. Require a valid name, email, password of 12–128 characters, and a 16-character agency code.
2. Persist exactly one request per new account, with the intended agency, email, name, creation time, and email-confirmation state.
3. Registration never inserts agency membership or accepts a requested admin role.
4. Invalid agency codes fail a public boolean preflight before Auth signup; the Auth trigger independently rejects invalid routing. Missing backend approval setup must not proceed to account creation.
5. An Auth/email-provider failure is not reported as successful registration.
6. Existing registered accounts and agency memberships remain compatible; legacy accounts without signup metadata are not assigned an agency automatically.

## S1-US-02 Notify Administrators and Review Requests

**User story:** As an agency administrator, I want a visible queue and pending count so I know when someone has registered and can decide whether to admit them.

**Description:** In-app notifications and the Signup requests panel provide administrator awareness without depending on outgoing email. The queue refreshes automatically while the administrator is signed in and can be refreshed manually. Request history is persisted.

**Acceptance criteria**

1. Only an active administrator can read their agency's code, requests, pending count, and review history.
2. Administrators of another agency, ordinary members, and anonymous users cannot read or review these requests.
3. Pending requests show name, email, creation time, and confirmation state. Unconfirmed email is visible but cannot be approved.
4. Approval creates exactly one membership with the fixed role member and records reviewer ID/name and review time atomically.
5. Rejection records its reviewer and time without granting access.
6. Repeated or concurrent decisions cannot create duplicate membership or overwrite a previous decision.
7. Client-supplied role, agency, applicant identity, reviewer, and timestamps cannot override canonical database values.
8. A member added through approval appears in the agency member list. Existing administrator role-management safeguards remain in effect.

## S1-US-03 Enforce the Login Gate

**User story:** As an agency owner, I want workspace access allowed only after identity confirmation and membership approval.

**Acceptance criteria**

1. Unconfirmed accounts remain subject to the existing Supabase email-confirmation requirement.
2. Confirmed but pending accounts receive a clear awaiting-approval message and cannot open the workspace.
3. Rejected requests receive appropriate guidance and no workspace access.
4. Approved accounts can sign in as members; failed, pending, or rejected sign-in attempts do not leave protected workspace data open.
5. Logout, expired sessions, agency boundaries, and membership-revocation behavior continue to work.

## Test Criteria

| Case                                  | Expected result                                              |
| ------------------------------------- | ------------------------------------------------------------ |
| Valid registration with agency code   | Auth trigger persists a pending request; no membership       |
| Unknown/malformed agency code         | Account creation fails; no orphan request                    |
| Forged role or agency metadata        | No privilege grant; agency derived from code                 |
| Email confirmation                    | Persisted request state updates from Auth                    |
| Admin checks queue                    | Correct agency, pending count, and durable history           |
| Unconfirmed applicant approval        | Rejected without membership                                  |
| Valid approval                        | Fixed member role plus reviewer/time; one atomic transaction |
| Rejection                             | Durable rejected state; no membership                        |
| Duplicate/concurrent approval         | No duplicate member or decision overwrite                    |
| Cross-agency/member/anonymous request | Denied by server and database                                |
| Pending/rejected login                | Controlled message; workspace remains closed                 |
| Approved login                        | Member workspace loads                                       |
| Admin role revoked during review      | Review denied                                                |
| UI refresh/reload                     | Pending notification and review history remain consistent    |

## Delivery and Verification

Run unit/API tests, real-migration PostgreSQL tests, browser tests for notification/review, type checks, lint, build, and packaged-migration verification. Record actual results after implementation. Apply the new migration and deploy the updated workspace function before enabling this flow on an existing Supabase project.

This change adds in-app awareness and approval; it does not claim to fix the separate confirmation-email delivery/rate-limit incident. No new outbound email notification is required.

## Implementation Result

Code completed with 57 passing unit/integration tests, 8 passing onboarding browser scenarios, and 8 existing browser regressions. See [approval setup and verification](SIGNUP_APPROVAL.md) for the implementation, rollout order, and evidence boundaries. Live Supabase deployment and real email onboarding remain pending; local browser tests use synthetic mocked responses.
