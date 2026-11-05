# EventFlowAI — Team Agreement & Definition of Done

**Origin:** Team handwritten notes supplied for the course project; normalized 2026-11-05.  
**Status:** Proposed canonical transcription; team review/sign-off required.  
**Scope:** Original team agreements and DoD only; new Engineering/AI rules are in separate files.

## Team Agreement (original content)
| ID | Agreement |
|---|---|
| TA-01 | Sprint duration: **one week, Monday–Friday**. |
| TA-02 | Sprint Planning: **Monday 09:00**. |
| TA-03 | Daily Scrum: **every day 16:30**. |
| TA-04 | Sprint Review: **Friday 16:30**. |
| TA-05 | Sprint Retrospective: **Friday 17:00**. |
| TA-06 | **Update Trello daily.** |
| TA-07 | **Complete tasks before their deadlines.** |

**Open scheduling conflict:** Daily Scrum on Friday at 16:30 overlaps Sprint Review Friday at 16:30. SM and Scrum Team must resolve; do not silently rewrite the original.

## Definition of Done (8 original conditions)
A User Story is Done only when all applicable conditions are evidenced:

| ID | Original condition | Minimum traceability evidence (proposed mechanism, not additional original wording) |
|---|---|---|
| DOD-01 | Code is complete and meets the Acceptance Criteria. | AC mapping and passing actual behavior |
| DOD-02 | Relevant unit/integration tests are run and passed. | Test outputs for reviewed commit |
| DOD-03 | TypeScript checks and production build are successful. | Typecheck/build logs, relevant Edge checks |
| DOD-04 | Pull Requests have been reviewed and merged. | Reviewed PR and merge SHA |
| DOD-05 | There are no known critical errors within the Story. | Defect register and risk disposition |
| DOD-06 | The UI meets the agreed-upon responsive and accessibility requirements. | Responsive and accessibility evidence for UI stories |
| DOD-07 | AI output is validated using Zod and business rules are checked upon application. | AI response/schema and business-rule tests, only if AI output applies |
| DOD-08 | The feature has been demoed and approved by the Product Owner. | Demo and explicit PO decision |

**Interpretation note:** A non-AI task may propose DOD-07 as N/A with written rationale; a non-UI task may propose DOD-06 as N/A. Team must approve applicability. No assumed PASS and no implicit PO acceptance.

## Authorities and traceability
- **Sprint 3 product scope & AC:** [PO-approved backlog](SPRINT3_BACKLOG.md). This supersedes *old Trello requirements for Sprint 3*, but TA-06 daily Trello updates remain an original team habit until team changes it.
- **Engineering and AI workflow (proposed):** [Working Agreement](engineering/WORKING_AGREEMENT.md) and [AGENTS.md](../AGENTS.md).
- Preserve original handwritten notes separately as historical evidence; this transcription is not a claim of retrospective PO approval.
- Record review date and approvers here before changing status to APPROVED.
