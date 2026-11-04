# EventFlow AI — Sprint 2 course demo

A small, runnable agency workspace for the Sprint 2 backlog: sign-in flow, agency-scoped client briefs, editing/version history, shared validation, readiness checks, and member roles.

## Run locally

Requires Node.js 24+ for the included tests.

```powershell
npm install
npm run dev -- --host 127.0.0.1
```

Open the URL printed by Vite, normally http://127.0.0.1:5173. If that port is occupied, Vite chooses the next available port. No cloud services, passwords, or API keys are required in the default demo mode.

## Present the demo

1. Choose **Quỳnh Hương · Flow Studio · admin**, then enter the demo workspace.
2. Create a brief. Submit incomplete fields first to show validation, then save valid event details to see a brief ID.
3. Edit its budget, audience, and constraints. Save version 2 and open version 1 to show preserved values, author, and timestamp.
4. Fill optional details to see readiness change. Clarifications are labeled suggestions, not client requirements.
5. Open **Members & roles**. Admins can update roles, with a guard against removing the last administrator.
6. Sign out and choose **Bảo Chí** to show member controls. Choose **Alex Nguyen** to show a separate sample agency.
7. Refresh the page: briefs persist in local storage and the demo session persists in the current tab.

The in-app **Demo guide** includes this walkthrough. Browser storage simulates sign-in and permissions; it is not real authentication or secure tenant isolation. Use sample data only.

## Sprint 2 coverage

| Backlog item | Included implementation |
| --- | --- |
| US-20 — authentication | Demo sign-in/out and protected workspace; optional Supabase email/password adapter |
| US-21 — agency isolation | Separate demo agency data; optional server RLS and checked RPCs |
| US-01 — create brief | Required field/budget validation, saved brief ID, success/error states |
| US-02 — edit/version history | Append-only saved snapshots, author/time, stale-write rejection, dependent-output review flag |
| S2-T01 — shared schemas | Same Zod request/data/response contracts imported by frontend and Edge Function |
| US-03 — readiness (P1) | Missing optional information and labeled suggested clarifications |
| US-22 — roles (P1) | Admin/member UI, demo role checks, optional server permission checks |

AI generation, proposals, logistics, feasibility, and execution tasks belong to later sprints. The review flag is groundwork for those future outputs; no generated output is fabricated.

## Optional real Supabase backend

See [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md). The backend includes an SQL migration and a single authenticated Edge Function, using existing dependencies. Default mode remains local even when Supabase keys already exist. Enable it explicitly with `VITE_APP_MODE=supabase` after setup. Existing `.env.local` configuration should be preserved.

## Checks

```powershell
npm test
npm run lint
npm run build
```

Tests cover validation boundaries, create/edit history, attribution, conflicting edits, demo agency boundaries, member restrictions, last-admin protection, readiness, session handling, deletion, and failed storage writes. Real Supabase authentication, RLS, and function deployment require the separate live checks in the setup guide.

## Code layout

- `src/App.tsx` — workspace UI and workflow
- `src/lib/demo.ts` — browser-only sample data adapter
- `src/lib/api.ts` — adapter selection and Supabase access
- `supabase/functions/_shared/contracts.ts` — shared Zod contracts/readiness checks
- `supabase/functions/workspace/` — authenticated backend gateway
- `supabase/migrations/` — tables, RLS, atomic version saves, permission checks
- `tests/sprint2.test.mjs` — deterministic local tests

No commits, deployments, paid services, or additional dependencies are needed for the local demo.
