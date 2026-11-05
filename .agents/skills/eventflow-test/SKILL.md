---
name: eventflow-test
description: Select and run EventFlow AI checks by changed behavior, or diagnose failed tests. Use when planning verification or validating a change; documentation-only work uses document checks rather than application suites.
---

# Verify by change type

Read [AGENTS.md](../../../AGENTS.md), the relevant acceptance criteria and current package.json scripts. Select the union of affected rows below. Explain additions or omissions based on behavior and risk, not file extension alone.

| Changed behavior                | Relevant checks                                                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documents/instructions only     | Markdown formatting, local links/anchors, consistency with current code, workflow and DoD; validate SKILL.md when skills change                                               |
| Application/API logic           | npm test; npm run lint; npm run build; targeted acceptance checks                                                                                                             |
| Edge Functions/shared contracts | Application/API checks plus npm run check:functions and npm run verify:edge; affected callers and invalid payloads                                                            |
| Migrations/RLS/RPC              | Relevant PostgreSQL/API tests plus affected edge/application checks; unauthorized and cross-agency access, atomicity, stale/concurrent writes and existing-data compatibility |
| Proposal/budget/venue UI        | Application checks plus npm run test:e2e; affected desktop/mobile flows, keyboard/focus and loading/error/empty states                                                        |
| Signup/admin approval UI        | Application checks plus npm run test:e2e:onboarding and relevant database/HTTP authorization tests                                                                            |
| AI/provider/search contracts    | Schema/business-rule tests and provider failure cases; affected edge checks. Real-provider acceptance requires separately recorded live evidence                              |

## Evidence-sensitive cases

- Auth: invalid agency code, unconfirmed/pending/rejected access, agency isolation, administrator-only review, fixed member role, persisted reviewer/time and competing/duplicate decisions.
- Money: quantity/unit price, totals, contingency/tax, overspend and bundled services. Check currency/price units and avoid double counting.
- Venues: search follows the saved brief's geographic scope; city scope may include suitable nearby cities, country scope covers the country. Label estimates/reference prices/quotation-required results and preserve sources. Fixtures cannot prove real grounded search.
- AI: malformed/truncated payloads, timeouts, quota/rate limits and failure handling. Structural validity is not factual correctness.
- Export/versioning: latest saved snapshot, required metadata, no unsaved edits and no stale overwrite.
- UI: applicable workflows at 1440×1000 and 390×844; no unintended overflow, accessible labels, keyboard operation and visible focus.

## Live checks and failures

Inspect scripts/configuration before live runs. npm run test:e2e:live saves a proposal version; npm run test:ai:live and npm run test:venues:live consume provider quota. Run only within authorization covering the environment/action. npm run check:auth is configuration health evidence, not confirmation-email delivery evidence. Do not repeatedly retry an unchanged quota/access blocker or send email to manufacture evidence.

Use fixtures to progress local checks; label the test mode. Do not call a live criterion passed with mocked evidence. Fix an observed failure and rerun affected checks; broaden only when changes or unresolved risks justify it. Add regression coverage for meaningful defects, not assertions that merely mirror implementation or low-impact document wording.

Record revision plus dirty-tree scope, environment/mode, command, actual exit/result, criterion covered and limits. Keep historical reports intact; do not sum overlapping suites. Missing access, failed tests and quota blocks remain pending/blocked. Never expose credentials or private payloads in reports. Pass these facts to [handover](../eventflow-handover/SKILL.md) when readiness is being assessed.
