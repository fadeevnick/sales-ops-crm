# Phase 3 File-Level Plan

Implementation-near plan для:

```text
Phase 3 — Approval workflow core
```

Этот документ отвечает на вопрос:

```text
какие файлы должны появиться или измениться,
что в них должно жить,
и как разложить approval core по backend/frontend слоям
без преждевременного ухода в metadata admin, import/export или reporting
```

Это file-level execution map для Phase 3.

## 1. Phase 3 Goal

В конце Phase 3 система должна уметь:

- отправлять approval request из opportunity;
- определять applicable approval policy в MVP scope;
- создавать последовательные approval steps;
- показывать approver queue/inbox;
- принимать решения `approve / reject / send back`;
- связывать outcome approval с opportunity lifecycle;
- хранить decision history как append-only domain record.

## 2. Explicit Out of Scope

Не включать в Phase 3:

- generic workflow designer;
- metadata-driven policy builder UI;
- escalations with full timer engine if not minimal;
- import/export integration;
- dashboard/reporting projections;
- custom-field-driven dynamic approval DSL;
- universal notification platform.

Если эти вещи начинают попадать в Phase 3 plan, scope уже уходит из approval core в platform product.

## 3. Target Backend Structure After Phase 3

```text
backend/src/main/kotlin/com/salesops/bootstrap/
├── api/
│   ├── AccountController.kt
│   ├── ContactController.kt
│   ├── OpportunityController.kt
│   ├── ActivityController.kt
│   ├── ApprovalController.kt
│   └── ApiExceptionHandler.kt
├── auth/
│   ├── CurrentUserContext.kt
│   ├── TenantContext.kt
│   ├── SessionResolver.kt
│   └── ShellModuleVisibilityPolicy.kt
├── crm/
│   ├── account/
│   ├── contact/
│   ├── opportunity/
│   │   ├── OpportunityDtos.kt
│   │   ├── OpportunityService.kt
│   │   ├── OpportunityRepository.kt
│   │   ├── StageTransitionPolicy.kt
│   │   ├── TeamScopePolicy.kt
│   │   └── OpportunityApprovalBridge.kt
│   └── activity/
├── approval/
│   ├── ApprovalDtos.kt
│   ├── ApprovalService.kt
│   ├── ApprovalRepository.kt
│   ├── ApprovalPolicyResolver.kt
│   ├── ApprovalStatePolicy.kt
│   ├── ApprovalVisibilityPolicy.kt
│   └── ApprovalTimelineAssembler.kt
├── repository/
│   └── UserShellRepository.kt
└── service/
    └── SessionService.kt
```

## 4. Target Frontend Structure After Phase 3

```text
frontend/src/
├── api/
│   ├── session.ts
│   ├── accounts.ts
│   ├── contacts.ts
│   ├── opportunities.ts
│   ├── activities.ts
│   └── approvals.ts
├── types/
│   ├── session.ts
│   ├── crm.ts
│   └── approvals.ts
├── features/
│   ├── shell/
│   ├── crm/
│   │   ├── OpportunityDetail.tsx
│   │   └── StageMovePanel.tsx
│   └── approvals/
│       ├── SubmitApprovalPanel.tsx
│       ├── ApprovalRequestDetail.tsx
│       ├── ApproverInbox.tsx
│       ├── DecisionActionPanel.tsx
│       └── ApprovalTimeline.tsx
└── lib/
    └── sessionStorage.ts
```

## 5. Approval Domain Boundary

### Core principle

`Approval request` is a separate domain object.

It is related to opportunity but must not be reduced to:

- one more status field on opportunity;
- one generic comment stream;
- one flat list of approvers.

### Minimum domain objects in Phase 3

- approval request
- approval step
- approval decision history
- opportunity approval snapshot

### What is still allowed to stay simplified

- policy matching can be rule-limited in MVP;
- escalation can remain minimal or deferred;
- notification side effects can stay out of core module.

## 6. Backend File Plan

## 6.1 Existing files to modify

### `api/OpportunityController.kt`

Phase 3 additions:

- endpoint for submit approval from opportunity context
- opportunity detail may include approval summary strip

Should not become:

- the place where approval lifecycle logic lives

### `crm/opportunity/OpportunityService.kt`

Phase 3 additions:

- cooperate with approval core when submission happens
- reflect approval outcome into opportunity lifecycle status

Should not contain:

- policy resolution logic
- approver queue logic
- decision history assembly

### `crm/opportunity/OpportunityRepository.kt`

Phase 3 additions:

- fetch approval-relevant opportunity context
- persist lifecycle updates after approval outcome if needed

### `crm/opportunity/StageTransitionPolicy.kt`

Phase 3 additions:

- incorporate approval gate checks for protected stages

Rule:

- stage transition validation still belongs here
- approval decision mechanics do not

## 6.2 New controller

### `api/ApprovalController.kt`

Purpose:

- expose approval request and approver queue endpoints

Should contain:

- `POST /api/opportunities/{opportunityId}/submit-approval`
- `GET /api/approvals/inbox`
- `GET /api/approvals/{approvalRequestId}`
- `POST /api/approvals/{approvalRequestId}/approve`
- `POST /api/approvals/{approvalRequestId}/reject`
- `POST /api/approvals/{approvalRequestId}/send-back`

Should not contain:

- raw SQL
- direct stage-transition logic
- hardcoded role decisions inline

Why one controller:

- these endpoints belong to same approval interaction boundary

## 6.3 New approval module files

### `approval/ApprovalDtos.kt`

Purpose:

- DTOs for approval request flows

Should contain:

- submit approval request payload
- approval inbox item response
- approval detail response
- approve/reject/send-back request payload
- approval summary DTO for opportunity detail

Should not contain:

- business logic

### `approval/ApprovalService.kt`

Purpose:

- central application service for approval lifecycle

Should contain:

- submit approval request
- build approver inbox
- load approval detail
- approve step
- reject step
- send back step
- apply opportunity-side lifecycle consequences

Should not contain:

- metadata admin logic
- import/export logic
- reporting projection updates beyond minimal domain consistency hooks

### `approval/ApprovalRepository.kt`

Purpose:

- DB access for requests, steps, and history

Should contain:

- insert request
- insert steps
- load request with active step context
- load approver inbox items
- append decision history
- update request state

Must enforce:

- tenant consistency
- request/step linkage integrity

### `approval/ApprovalPolicyResolver.kt`

Purpose:

- determine applicable policy in limited MVP scope

Should contain:

- rule matching based on opportunity attributes available in Phase 3
- sequential step construction baseline
- fallback behavior when no applicable policy exists

Should not contain:

- generic rule engine
- arbitrary expression evaluator
- metadata-driven policy DSL

### `approval/ApprovalStatePolicy.kt`

Purpose:

- centralize allowed lifecycle transitions for approval request and steps

Should contain:

- allowed request transitions
- allowed decision transitions
- superseded / sent-back constraints

Why separate:

- keeps lifecycle invariants explicit and testable

### `approval/ApprovalVisibilityPolicy.kt`

Purpose:

- centralize who can see what in approval views

Should contain:

- sales rep visibility for own requests
- manager visibility for team requests
- approver visibility for assigned/historical steps
- admin support visibility baseline

Should not become:

- a generic whole-system access engine

### `approval/ApprovalTimelineAssembler.kt`

Purpose:

- build approval detail timeline / history response

Should contain:

- submission event mapping
- step activation mapping
- decision mapping
- send-back / superseded mapping

Why separate:

- detail UI needs domain timeline, not raw DB rows

## 7. CRM Bridge File

### `crm/opportunity/OpportunityApprovalBridge.kt`

Purpose:

- define narrow bridge between opportunity aggregate and approval module

Should contain:

- approval-relevant opportunity snapshot shape
- helper for lifecycle consequence mapping

Should not contain:

- repository code
- controller code
- full approval service logic

Why:

- opportunity and approval are separate modules, but Phase 3 needs an explicit seam between them

## 8. Migration File Plan

### `V4__phase3_approval_core.sql`

Purpose:

- introduce approval core relational model

Should include:

- `approval_requests`
- `approval_steps`
- `approval_decision_history`
- optional narrow table or JSON column for opportunity snapshot, depending chosen relational simplicity
- initial policy seed data in limited MVP form if represented in DB

Should not include:

- metadata config tables
- import job tables
- saved views
- reporting projections
- notification delivery tables unless absolutely minimal

## 9. Recommended Schema Shape Inside Phase 3

This file is not the schema draft itself, but Phase 3 file planning assumes the following table families:

- request-level table
- step-level table
- append-only decision history table
- optional policy reference table or limited policy seed representation

Important:

- do not collapse request + step + history into a single table
- do not model approval as one nullable field on opportunities

## 10. Frontend File Plan

## 10.1 New API file

### `api/approvals.ts`

Purpose:

- isolate approval transport logic

Should contain:

- submit approval request call
- fetch inbox call
- fetch approval detail call
- approve call
- reject call
- send-back call

## 10.2 New shared types

### `types/approvals.ts`

Purpose:

- TypeScript contracts for approval flows

Should contain:

- approval inbox item type
- approval detail type
- submit payload type
- decision payload type
- approval summary type for opportunity detail

## 10.3 New approval feature files

### `features/approvals/SubmitApprovalPanel.tsx`

Purpose:

- sales-side submit flow from opportunity detail

Should render:

- request type
- proposed commercial change
- business justification
- validation / policy feedback

Should not render:

- full workflow designer

### `features/approvals/ApproverInbox.tsx`

Purpose:

- queue of assigned approval tasks

Should render:

- request identity
- opportunity context summary
- active step status
- urgency/SLA hint only if minimal

### `features/approvals/ApprovalRequestDetail.tsx`

Purpose:

- full approval review page

Should render:

- request summary
- opportunity snapshot
- current step
- decision history
- available actions

### `features/approvals/DecisionActionPanel.tsx`

Purpose:

- explicit approve / reject / send back UI

Why separate:

- decision actions are critical and should not be hidden inside a generic detail component

### `features/approvals/ApprovalTimeline.tsx`

Purpose:

- render append-only approval history

### Existing file to modify: `features/crm/OpportunityDetail.tsx`

Phase 3 additions:

- approval strip / summary
- submit approval entry point
- current approval status visibility

Should not become:

- full approver workspace

## 11. File-Level Dependency Rules

### Backend rules

- `api/ApprovalController.kt` depends on `approval/*` and `auth/*`
- `approval/ApprovalService.kt` may depend on `ApprovalRepository` and narrow `crm/opportunity` bridge
- `approval/*` should not directly depend on account/contact/activity modules beyond opportunity snapshot needs
- `crm/opportunity/*` may reference approval summary boundary, but should not absorb approval internals

### Frontend rules

- `features/approvals/*` depends on `api/approvals.ts` and `types/approvals.ts`
- `OpportunityDetail.tsx` may embed `SubmitApprovalPanel` or approval summary section
- approver inbox must remain separate from CRM detail components

## 12. Recommended Implementation Order Inside Phase 3

### Step 1

Database:

- add `V4__phase3_approval_core.sql`

### Step 2

Backend:

- add `approval/ApprovalDtos.kt`
- add `approval/ApprovalRepository.kt`

### Step 3

Backend:

- add `approval/ApprovalPolicyResolver.kt`
- add `approval/ApprovalStatePolicy.kt`
- add `approval/ApprovalVisibilityPolicy.kt`

### Step 4

Backend:

- add `approval/ApprovalService.kt`
- add `crm/opportunity/OpportunityApprovalBridge.kt`

### Step 5

Backend:

- add `api/ApprovalController.kt`
- update `OpportunityController.kt` / `OpportunityService.kt` as needed for submission and summary

### Step 6

Frontend:

- add `types/approvals.ts`
- add `api/approvals.ts`

### Step 7

Frontend:

- add `SubmitApprovalPanel.tsx`
- add `ApproverInbox.tsx`
- add `ApprovalRequestDetail.tsx`
- add `DecisionActionPanel.tsx`
- add `ApprovalTimeline.tsx`

### Step 8

Frontend:

- update `OpportunityDetail.tsx` with approval strip / submit entry

### Step 9

Verification:

- backend integration tests for submit/decision flows
- approval access-sensitive tests
- frontend flow tests
- runtime verification later

## 13. What Must Not Be Introduced Yet

Do not create yet:

- `metadata/*` admin or custom field modules
- `import/*`
- `reporting/*`
- generic workflow graph editor
- universal notification framework
- broad automation engine

Do not do this in Phase 3:

- store approval as only one status column on opportunity
- let approvers browse full CRM scope by default
- mix approval history into generic comments only
- put policy matching inline into controller methods

## 14. Phase 3 File-Level Exit Condition

Phase 3 file structure is ready when:

- approval core has its own backend module;
- opportunity and approval are linked through explicit seam, not file-level tangling;
- approver inbox/detail have explicit frontend boundaries;
- decision history is modeled separately from current request state;
- no metadata/import/reporting concerns are prematurely mixed into approval core.
