# Shared backend defaults for fresh clones

Goal: a teammate can clone the delivery branch, run `npm ci` and `npm run dev`,
and use the existing hosted Supabase workspace/planning APIs without configuring
environment files or creating provider accounts.

Scope: public shared-backend constants, configuration resolution, read-only
diagnostics, setup documentation, and a fresh-clone browser regression. Gemini,
Tavily and privileged Supabase credentials remain server-side. Authentication,
agency approval and RLS remain required. No backend deployment/schema change or
public frontend hosting is part of this change.

Implementation: use the shared public URL/publishable key only when neither
connection field was explicitly configured. An incomplete custom URL/key must
fail closed rather than mix projects. Preserve complete custom configuration,
legacy anon-key compatibility and explicit browser-only sample mode.

Verification: targeted config tests for defaults/overrides/invalid input; a
browser fixture with no environment files verifies login, concept and venue-search
requests route to the shared project; run lint/types/build and the existing
regressions. Read-only Auth checks validate the public defaults. Fixtures do not
establish fresh live AI generation or email delivery. Human review/PO acceptance
remain pending independently of local verification and branch delivery.

Risk: approved users share the owner's provider quota and their agency's records.
The publishable key is public application configuration, not an authorization
bypass. Changes to the shared project's public key require updating the defaults.

## Verification and handover

`npm run verify:sprint3 -- --live-readonly` passed all ten groups: 85 unit/integration
tests, 13 proposal/venue browser scenarios, 15 onboarding scenarios, one fresh-clone
routing scenario, lint, Edge types, production build, migration packaging, live
Auth configuration and 15 anonymous/Auth denial checks. No source changes occurred
during the run. `node scripts/check-auth.mjs` also passed without loading any
environment file. The fresh-clone server removes connection environment variables
and uses an empty environment directory; login, concept generation and venue
search reach the shared project with synthetic network responses.

| Criterion | State                     | Evidence / next action                                                                                                 |
| --------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| DOD-01    | Scope verified            | Built-in shared routing and complete/invalid overrides tested; no private provider keys added.                         |
| DOD-02    | Passed                    | Unit/integration and browser regressions above; machine evidence in ignored test-results/sprint3-verification.json.    |
| DOD-03    | Passed                    | Lint, frontend/function types, build and bootstrap checks. Existing bundle-size warning remains.                       |
| DOD-04    | Pending                   | Delivery branch push is authorized; teammate PR review and merge are not recorded.                                     |
| DOD-05    | Verified within scope     | No critical defect identified in tested defaults/authorization paths; public configuration only.                       |
| DOD-06    | Regression passed         | Existing desktop/mobile workflows passed; no new visual controls. Independent accessibility review remains unrecorded. |
| DOD-07    | Existing contracts passed | Provider/schema/failure regressions unchanged and passing; fixture routing does not prove fresh paid generation.       |
| DOD-08    | Pending                   | Product Owner demo/acceptance is not recorded by this change.                                                          |

Delivery uses the existing codex/sprint3-demo-ready branch. Backend functions do
not need redeployment because only client defaults and diagnostics changed.
