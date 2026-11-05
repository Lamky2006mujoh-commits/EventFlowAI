# EventFlowAI — AI Agent Rules (Sprint 3 bootstrap)

Status: **PROPOSED — review and merge before team-wide enforcement**. Applies to Codex, Claude Code, Copilot, Gemini and other coding agents. Human Developers remain responsible for changes.

## Read first (in order)
1. This file and [Engineering Working Agreement](docs/engineering/WORKING_AGREEMENT.md).
2. PO's **sole Sprint 3 scope authority**: [docs/SPRINT3_BACKLOG.md](docs/SPRINT3_BACKLOG.md). Do not import extra AC from historical Trello exports/specs.
3. [Team Agreement & 8 DoD](docs/TEAM_AGREEMENT_DOD.md).
4. [Sprint 3 Execution Plan](docs/SPRINT3_EXECUTION_PLAN.md) for proposed ownership and parallel work.
5. [Technical Contract Baseline](docs/engineering/SPRINT3_CONTRACT_BASELINE.md) and actual source code for interface details.

In case of conflict: approved PO backlog controls product scope; actual code controls current behavior; shared schemas/migrations control currently implemented contracts; security and DoD are non-negotiable quality gates. **Report unresolved contradictions; do not silently decide business requirements.**

## Task boundary
- Begin every task by printing: backlog ID, goal/AC, working branch and commit, relevant files, interface dependencies, tests, ambiguities.
- Work on **one approved task/PR at a time**, on a short-lived branch from the agreed baseline. Never push directly to main.
- Before editing, inspect relevant code and tests. Prefer small compatible changes, avoid duplicate models/components and unrelated refactoring.
- Do **not** modify other owners' shared contracts, security policies, DB migrations, deployment configuration or CI without agreement and reviewer approval.
- Fixtures/mock providers may enable parallel development but are **not** proof of real Gemini, Supabase, email or venue-search acceptance.
- Do not invent prices, venue availability, PO approvals, deployment status or test successes.

## Data, security and AI
- Keep keys/tokens/passwords out of prompts, commits, console output, examples and \`VITE_\` public variables; only public Supabase values may be client-exposed.
- Verify Supabase Auth, agency membership and RLS/database checks server-side. Never use client-side authorization as the sole gate.
- Gemini calls and secrets must remain server-side; validate output with the shared Zod schema **and** business rules before persistence.
- Treat provider-generated writes and user-authored writes as different trust boundaries. Never allow an ordinary authenticated client to masquerade as trusted AI output.
- Preserve saved versions, source brief version, manual edits and optimistic concurrency protections.
- Do not apply migrations, alter RLS, deploy, create live accounts or modify shared/production data without explicit human authorization and an approved environment/rollback plan.

## Verification and handoff
- At minimum run relevant tests plus \`npm test\`, \`npm run lint\`, \`npm run check:functions\`, \`npm run verify:edge\`, \`npm run build\` when code/config is changed; run relevant Playwright suites for UI behavior.
- Do not call an AC PASS without recorded expected, actual, environment, commit and evidence. Never mark DoD or PO approval yourself.
- Finish with changed files, tests/results, AC mapping, risk, known blockers, requested reviews and PR link.
- Stop and ask for a team decision if any change would break a shared contract or widen scope.
