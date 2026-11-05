# EventFlowAI — Engineering Working Agreement

**Status: PROPOSED, not yet team-approved.** This is an addendum to the original Team Agreement, not a replacement. Owners: Developers (technical decisions), Scrum Master (facilitation), PO (product decisions).

## Shared baseline and local bootstrap
1. Bootstrap PR must be reviewed and merged to \`main\` first. All feature branches then start from the **same merged main SHA** noted in Sprint 3 execution plan; do not independently choose older Sprint 2 commits.
2. \`git fetch origin\`; \`git checkout main\`; \`git pull --ff-only origin main\`; \`git switch -c feature/US-04-short-description\` (example; use correct card ID).
3. Use Node **24** with project lockfile: \`npm ci\`. For local start: \`npm run dev -- --host 127.0.0.1\`.
4. Create a private ignored \`.env.local\` from README instructions. Use \`VITE_APP_MODE=demo\` only for explicit demo tests; real integration tests use \`VITE_APP_MODE=supabase\` with the **approved test project**. Do not place service-role/Gemini secrets into browser env or Git.
5. Record baseline SHA, test mode and planned change scope in every PR.

**Important:** At bootstrap date \`main\` already contains Sprint 3 implementation. Do not erase or reimplement code just because the backlog is a planning document. Audit each item against the chosen SHA and implement only genuine gaps.

## Git / PR flow
- No direct push, rebase/force-push or deploy to \`main\` under the proposed policy. Ask a repository **admin** to enable main branch protection/ruleset: PR required, independent approval, passing checks, restrict force-push/deletion.
- Branch names: \`feature/US-05-compare-selection\`, \`fix/S3-BUG-01-email\`, \`test/S3-T01-regression\`, \`chore/S3-T03-delivery\`.
- One backlog item / focused PR where feasible; small incremental PRs are allowed with a clear AC subset and compatibility plan. Avoid parallel edits of shared files without explicit ownership coordination.
- PR must link the PO backlog section, list AC tested, environment, screenshots/logs if appropriate, shared-schema change, migrations, regression risks and rollback.
- Human reviewer other than PR author reviews. Technical coordinator resolves contract collisions, not unilateral code ownership.
- CI already runs \`npm test\`, \`npm run lint\`, \`npm run check:functions\`, \`npm run verify:edge\`, \`npm run build\`, Playwright E2E + onboarding. Additional security/live/UAT evidence is required for relevant AC; green CI is **not** blanket DoD evidence.
- Do not declare a Story Done before applicable 8 DoD evidence and PO demo/approval.

## Change control for shared code
- Existing code is canonical for **currently implemented** shape; planned contract changes require a small reviewed contract-change PR and compatible test fixtures.
- Notify dependent owners before changing \`supabase/functions/_shared/*\`, SQL/RPC, Auth, \`src/lib/api.ts\`, \`src/components/PlanningPanel.tsx\` or CI. Assign explicit integrator and tests per changed boundary.
- Avoid frontend/backend/QA waterfall. Owners deliver vertical slices with their own tests; integration regression runs throughout the Sprint.
- Stale brief/planning revision is a conflict, not permission to silently overwrite. Preserve immutable proposal history and saved manual edits.

## Live environment / secrets
- Local mock/demo tests, PGlite and synthetic fixtures do not prove deployed Gemini/grounding, delivery, RLS, venue prices or quota.
- Use only approved isolated staging accounts/agencies and cleanup manifest for side-effect tests. No destructive production tests.
- Do not share secrets in chat, PR, CI artifacts, screenshots or test evidence.
- Validate deployment identity (frontend SHA, Edge revisions, migrations) before live acceptance.

## Who decides?
- PO: business priority, AC intent, proposal approval status, real-world data acceptance.
- Developers: implementation method, technical contracts, test strategy, engineering quality.
- Scrum Master: schedule/process facilitation, impediment tracking, visible Sprint Backlog.
- Unresolved decisions become entries in the Sprint 3 execution plan; agents may not settle them silently.

**Outstanding team decisions:** reviewer threshold / branch protection admin; Friday 16:30 conflict; responsible owners/reviewers and capacity; staging project/credentials management; UI responsive/accessibility target; P1 commitment. 
