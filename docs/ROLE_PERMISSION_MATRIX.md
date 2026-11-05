# EventFlow AI Role and Permission Matrix

Updated: **5 November 2026**.

**Status:** Consolidated documentation of existing access controls plus explicitly marked permission proposals for future stories. This document does not grant permissions, change original user stories or establish live deployment/PO approval.

## 1 Sources and Interpretation

The supplied **EventFlow_AI_User_Stories.docx**, Product Backlog v1.0, 03 November 2026, defines US-01–US-22 and their business personas. It does not define a complete persona-to-admin/member mapping.

Existing access rules are documented in [Sprint 1 onboarding backlog](SPRINT1_BACKLOG.md), [signup approval](SIGNUP_APPROVAL.md) and [Supabase setup](SUPABASE_SETUP.md). This matrix brings those rules together; it does not replace their rollout instructions or invent new US identifiers.

Implementation references: [role contracts](../supabase/functions/_shared/contracts.ts), [workspace authorization](../supabase/functions/_shared/workspace-handler.ts), [planning authorization](../supabase/functions/_shared/planning-handler.ts), [admin-only brief deletion](../supabase/migrations/20261104025815_sprint2_admin_brief_deletion.sql) and [signup review controls](../supabase/migrations/20261105010000_signup_approval.sql). These are code/document observations, not a new live access test. Inspect the deployed revision before asserting production behavior.

## 2 Business Personas and System Roles

A persona such as Event Planner describes the user's job and purpose. A system role determines permitted operations. The implemented role contract contains only **admin** and **member**; it does not store separate Event Planner, Logistics Manager or Project Manager permission roles.

- **member:** an active agency membership permitted to use available planning workflows within that agency.
- **admin:** an active agency membership with the existing planning capabilities plus administrative operations such as signup review and member-role management. It never grants cross-agency access.
- **No membership:** signing up, confirming an email or having a pending/rejected request does not grant workspace access. These are account/access states, not additional system roles.

The following mapping is a least-privilege working proposal where the original source does not explicitly name a system role. It must not be represented as an original US requirement or automatic title-based provisioning.

| Original business persona | Original US                | System-role mapping                                                      | Basis / limitation                                                                   |
| ------------------------- | -------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Account Manager           | US-01, US-02, US-07        | member sufficient; admin can also use available workflow                 | Business persona; no admin requirement in original criteria                          |
| Event Planner             | US-03, US-06, US-11, US-15 | member baseline                                                          | US-11/US-15 are future-story mappings, not implementation claims                     |
| Creative Planner          | US-04, US-05               | member sufficient; admin can also use workflow                           | Current agency planning access                                                       |
| Logistics Coordinator     | US-08                      | member baseline                                                          | Proposed access for future logistics implementation                                  |
| Logistics Manager         | US-09, US-14               | member baseline                                                          | Manager title does not grant agency administration                                   |
| Production Manager        | US-10                      | member baseline                                                          | Proposed access for future logistics implementation                                  |
| Procurement Coordinator   | US-12                      | member baseline                                                          | Proposed access for future quote/availability workflow                               |
| Project Manager           | US-13, US-16, US-18        | member baseline                                                          | Checking feasibility or preparing tasks is not member-role administration            |
| Agency Project Manager    | US-17                      | Approval permission unresolved; proposed admin-only for the two-role MVP | Original criterion says authorized reviewer, not admin; see section 5                |
| Team Member               | US-19                      | member baseline, with assignment-level authorization                     | Original criterion concerns assigned tasks; implementation must enforce object scope |
| Agency Member             | US-20                      | Both active member and admin memberships                                 | Authentication is required for both; sign-in alone does not create membership        |
| Agency Administrator      | US-21, US-22               | admin for administrative actions                                         | US-21 isolation protects every account, including member accounts                    |

An Event Planner can separately be appointed admin if the agency assigns administrative responsibility. Neither the job title nor the word Manager gives that privilege automatically. Do not rewrite every persona in the US source as Member; preserve both business meaning and access policy.

## 3 Existing-operation Matrix

**Allowed** means eligible within the caller's own agency, subject to validation and object/version checks. **Denied** means no workspace permission. This is the implemented design, not evidence that every migration/function is deployed or every acceptance criterion has passed.

| Operation                                                              | No active agency membership                    | member  | admin   | Evidence / notes                                                               |
| ---------------------------------------------------------------------- | ---------------------------------------------- | ------- | ------- | ------------------------------------------------------------------------------ |
| Sign in with valid credentials                                         | Auth session may exist; workspace still denied | Allowed | Allowed | US-20; authentication and membership are separate                              |
| View agency workspace, briefs and accessible version history           | Denied                                         | Allowed | Allowed | US-01/US-02/US-21; server membership and agency isolation                      |
| Create/edit agency briefs                                              | Denied                                         | Allowed | Allowed | Checked save operation; preserve versions and reject stale writes              |
| Permanently delete brief and history                                   | Denied                                         | Denied  | Allowed | Existing destructive-operation rule; not a new original US                     |
| Generate/compare/select concepts; generate/edit/version proposals      | Denied                                         | Allowed | Allowed | US-04–US-06; agency/brief/version checks still apply                           |
| Edit existing proposal budget, select venues and export saved proposal | Denied                                         | Allowed | Allowed | Current Sprint 3 extensions and US-07; does not prove all US-11/US-12 behavior |
| Read agency registration code, signup queue and review history         | Denied                                         | Denied  | Allowed | Same-agency administrator only                                                 |
| Approve/reject a signup request                                        | Denied                                         | Denied  | Allowed | Approval requires confirmed email and creates fixed member role atomically     |
| Change member roles / remove membership                                | Denied                                         | Denied  | Allowed | US-22; same agency, checked operations, retain at least one admin              |
| Read/write another agency's protected data                             | Denied                                         | Denied  | Denied  | US-21 applies to everyone, including admin                                     |

A signed-in account can use its own restricted signup-status operation without membership; this is not access to the agency workspace or other applicants. Public agency-code validation does not grant membership or expose the signup queue. Legacy controlled account-addition paths must not bypass a recorded signup review.

## 4 Future-story Permission Design

These rows specify a proposed access baseline for implementation/refinement. They do not imply that future features exist or permission tests have passed.

| Original US | Proposed member permission                                                                    | Proposed admin permission                                | Additional constraint                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| US-08–US-12 | Generate/review/edit/save logistics, staffing, timeline, estimate and quote/availability data | Same planning operations                                 | Same agency; runtime validation, source/version integrity; suggestions are not verified stock or quotes |
| US-13–US-16 | Run/read feasibility checks and review/apply supported revisions                              | Same planning operations                                 | Calculations/checks remain separate from human approval                                                 |
| US-17       | No approval under the proposed admin-only MVP mapping                                         | Approve/request changes only if this proposal is adopted | Original authorized-reviewer policy still needs agreement; see section 5                                |
| US-18       | Create/edit execution tasks from an approved plan                                             | Same proposed capability                                 | Server must verify source plan is actually approved                                                     |
| US-19       | Update own assigned execution tasks                                                           | Own assigned tasks; any broader override is TBD          | Source does not explicitly grant admins an override for all task updates                                |

Do not implement a generic member-equals-all-operations shortcut: task ownership, source state and agency checks remain necessary. Future operations are unavailable until implemented and verified; a proposed permission row does not enable an endpoint.

## 5 Open Decisions — Especially US-17

The original US-17 requires an **authorized reviewer** and rejection of users without approval permission. It does not explicitly identify that reviewer as admin.

**Proposal:** for an MVP retaining only admin/member, allow admin to approve/request changes and deny member approval. This is not yet an adopted requirement or an existing implemented approval workflow. Before implementation, the PO/responsible team must confirm whether approval follows the admin role or needs a separate explicit reviewer capability. Do not grant all Project Managers admin merely to match a title.

Also clarify during US-17 refinement: reviewer assignment, whether authors can approve their own plans, which immutable revision is approved, and how later changes affect approval. These are unresolved product decisions, not rules silently added to the original criteria.

US-19 additionally needs a decision if administrative overrides for another person's assigned task are desired. Until an explicit policy is agreed, do not invent that privilege.

## 6 Account and Membership Lifecycle

1. The project owner provisions the first agency admin through a trusted administrative path; public signup never bootstraps admin.
2. An employee registers with the agency code. A pending request is recorded without membership or a user-selected role.
3. The employee confirms the email. Confirmation alone still grants no workspace access.
4. An active same-agency admin reviews the request. Approval creates member membership and records reviewer/time; rejection grants none.
5. Promotion to admin is a separate checked administrative action. Role changes are enforced on subsequent authorized requests; removing membership revokes workspace access while preserving the Auth account.
6. Retain at least one agency admin. A client-submitted role/persona/agency must never override server-derived membership.

See [signup approval rollout and evidence](SIGNUP_APPROVAL.md) for deployment status and [setup](SUPABASE_SETUP.md) for first-admin provisioning. Application admin is distinct from Supabase project/organization access and GitHub permissions.

## 7 Authorization Verification and Maintenance

For implemented operations, exercise positive member/admin cases and negative anonymous, expired-session, pending/rejected, revoked-membership and cross-agency cases. Call protected APIs/RPCs directly; hiding a button is not authorization. Verify forged role/agency metadata, role changes, last-admin protection, fixed-member signup approval and concurrent/stale mutations where relevant.

Future approval tests must cover member denial, actual authorized-reviewer enforcement, reviewer/time persistence and the agreed revision/self-approval policy. Future task tests must cover assigned-user and unassigned/foreign-user access. These are planned verification concerns, not results from writing this document.

Keep original US IDs/criteria intact. When a permission decision changes, record its decision/owner/date, update affected backlog refinement, server controls, tests and this matrix together. Do not mark proposals approved or controls deployed without evidence. Follow the canonical [Definition of Done](TEAM_AGREEMENT_AND_DOD.md#7-definition-of-done).
