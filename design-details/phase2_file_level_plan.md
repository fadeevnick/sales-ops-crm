# Phase 2 File-Level Plan

Implementation-near plan для:

```text
Phase 2 — Core CRM records and pipeline
```

Этот документ отвечает на вопрос:

```text
какие файлы должны появиться или измениться,
что в них должно жить,
и как разложить core CRM loop по backend/frontend слоям
без преждевременного захода в approvals, metadata и import
```

Это file-level execution map для Phase 2.

## 1. Phase 2 Goal

В конце Phase 2 система должна уметь:

- создавать и читать accounts;
- создавать и читать contacts;
- создавать и читать opportunities;
- создавать activities;
- переводить opportunity по стадиям через explicit command;
- показывать rep scope и manager team scope;
- делать это tenant-aware и access-aware.

## 2. Explicit Out of Scope

Не включать в Phase 2:

- approval requests and approver inbox;
- metadata-driven custom fields and stage publishing;
- saved views;
- import/export jobs;
- duplicates and merge;
- dashboards and reporting projections.

Если эти вещи начинают просачиваться в файл-план Phase 2, scope уже едет.

## 3. Target Backend Structure After Phase 2

```text
backend/src/main/kotlin/com/salesops/bootstrap/
├── api/
│   ├── AccountController.kt
│   ├── ContactController.kt
│   ├── OpportunityController.kt
│   ├── ActivityController.kt
│   └── ApiExceptionHandler.kt
├── auth/
│   ├── CurrentUserContext.kt
│   ├── TenantContext.kt
│   ├── SessionResolver.kt
│   └── ShellModuleVisibilityPolicy.kt
├── crm/
│   ├── account/
│   │   ├── AccountDtos.kt
│   │   ├── AccountService.kt
│   │   └── AccountRepository.kt
│   ├── contact/
│   │   ├── ContactDtos.kt
│   │   ├── ContactService.kt
│   │   └── ContactRepository.kt
│   ├── opportunity/
│   │   ├── OpportunityDtos.kt
│   │   ├── OpportunityService.kt
│   │   ├── OpportunityRepository.kt
│   │   ├── StageTransitionPolicy.kt
│   │   └── TeamScopePolicy.kt
│   └── activity/
│       ├── ActivityDtos.kt
│       ├── ActivityService.kt
│       └── ActivityRepository.kt
├── repository/
│   └── UserShellRepository.kt
└── service/
    └── SessionService.kt
```

## 4. Target Frontend Structure After Phase 2

```text
frontend/src/
├── api/
│   ├── session.ts
│   ├── accounts.ts
│   ├── contacts.ts
│   ├── opportunities.ts
│   └── activities.ts
├── types/
│   ├── session.ts
│   └── crm.ts
├── features/
│   ├── shell/
│   │   ├── LoginScreen.tsx
│   │   ├── WorkspaceShell.tsx
│   │   ├── ModuleGrid.tsx
│   │   └── SessionBanner.tsx
│   └── crm/
│       ├── AccountList.tsx
│       ├── AccountCreateForm.tsx
│       ├── ContactCreateForm.tsx
│       ├── OpportunityList.tsx
│       ├── OpportunityCreateForm.tsx
│       ├── OpportunityDetail.tsx
│       ├── StageMovePanel.tsx
│       ├── ActivityList.tsx
│       └── ActivityCreateForm.tsx
└── lib/
    └── sessionStorage.ts
```

## 5. Backend File Plan

## 5.1 Existing files to keep mostly stable

### `api/HealthController.kt`

Role:

- keep runtime health baseline unchanged

Phase 2 changes:

- none expected

### `api/SessionController.kt`

Role:

- shell/session identity boundary

Phase 2 changes:

- only minor updates if shell modules expand

### `auth/*`

Role:

- remain the main identity/tenant context boundary

Phase 2 changes:

- should be reused, not bypassed

## 5.2 New controllers

### `api/AccountController.kt`

Purpose:

- expose account list/create endpoints

Should contain:

- `GET /api/accounts`
- `POST /api/accounts`

Should not contain:

- raw SQL
- access policy logic inline

### `api/ContactController.kt`

Purpose:

- expose contact list/create endpoints

Should contain:

- `GET /api/contacts`
- `POST /api/contacts`

### `api/OpportunityController.kt`

Purpose:

- expose opportunity list/detail/create/update/stage-move/reassign baseline

Should contain:

- `GET /api/opportunities`
- `POST /api/opportunities`
- `GET /api/opportunities/{id}`
- `PATCH /api/opportunities/{id}`
- `POST /api/opportunities/{id}/move-stage`
- optionally `POST /api/opportunities/{id}/reassign-owner`

Why one controller:

- all these actions belong to same aggregate boundary in Phase 2

### `api/ActivityController.kt`

Purpose:

- expose activity list/create for opportunity context

Should contain:

- `GET /api/opportunities/{id}/activities`
- `POST /api/opportunities/{id}/activities`

## 5.3 CRM module files

### `crm/account/AccountDtos.kt`

Purpose:

- request/response DTOs for account list/create

Should contain:

- create request
- list item DTO
- list response envelope if shared locally

Should not contain:

- business logic

### `crm/account/AccountService.kt`

Purpose:

- orchestrate account use cases

Should contain:

- create account
- list visible accounts

Should not contain:

- inline access SQL if repository can own it

### `crm/account/AccountRepository.kt`

Purpose:

- DB access for accounts

Should contain:

- insert account
- query visible accounts by tenant/scope
- minimal lookup helpers

### `crm/contact/ContactDtos.kt`

Purpose:

- request/response DTOs for contacts

### `crm/contact/ContactService.kt`

Purpose:

- create contact
- list contacts by scope/account

### `crm/contact/ContactRepository.kt`

Purpose:

- DB access for contacts

Must enforce:

- tenant consistency with linked account

### `crm/opportunity/OpportunityDtos.kt`

Purpose:

- all request/response DTOs for opportunity flows

Should contain:

- create request
- patch request
- stage move request
- detail response
- list item response

### `crm/opportunity/OpportunityService.kt`

Purpose:

- central application service for opportunity aggregate

Should contain:

- create opportunity
- load opportunity detail
- list opportunities
- update mutable fields
- move stage
- reassign owner if included

Should not contain:

- approval logic
- metadata publish logic
- import logic

### `crm/opportunity/OpportunityRepository.kt`

Purpose:

- DB access for opportunities and stage-linked reads

Should contain:

- insert/update
- list by tenant/scope
- detail query
- stage lookup joins

### `crm/opportunity/StageTransitionPolicy.kt`

Purpose:

- centralize stage move validation and lifecycle guard rules

Should contain:

- target stage validation
- required baseline checks
- closed-state protection

Should not contain:

- metadata engine or approval policy yet

### `crm/opportunity/TeamScopePolicy.kt`

Purpose:

- centralize manager vs rep scope decision rules

Why separate file:

- scope logic is high-risk and will expand later for sharing model

### `crm/activity/ActivityDtos.kt`

Purpose:

- DTOs for create/list activities

### `crm/activity/ActivityService.kt`

Purpose:

- create activity
- list activities by opportunity in visible scope

### `crm/activity/ActivityRepository.kt`

Purpose:

- DB access for activities

Must enforce:

- tenant consistency with opportunity

## 6. Migration File Plan

### `V3__phase2_crm_core.sql`

Purpose:

- introduce core CRM relational model

Should include:

- `accounts`
- `contacts`
- `opportunity_stages`
- `opportunities`
- `activities`
- initial stage seed data for bootstrap tenant

Should not include:

- approvals
- metadata config
- saved views
- imports
- audit event tables

### Existing migrations

- `V1__bootstrap_shell.sql` remains historical bootstrap
- `V2__phase1_identity_hardening.sql` should complete identity hardening before `V3`

## 7. Frontend File Plan

## 7.1 New API files

### `api/accounts.ts`

Purpose:

- fetch/create account endpoints

### `api/contacts.ts`

Purpose:

- fetch/create contact endpoints

### `api/opportunities.ts`

Purpose:

- fetch/create/update/move-stage opportunity endpoints

### `api/activities.ts`

Purpose:

- fetch/create activity endpoints

Rule:

- frontend transport logic must stay out of UI components

## 7.2 New shared types

### `types/crm.ts`

Purpose:

- TypeScript contracts for accounts, contacts, opportunities, activities

Should contain:

- entity list item types
- create payload types
- opportunity detail type
- stage move payload type

## 7.3 CRM feature files

### `features/crm/AccountList.tsx`

Purpose:

- render visible accounts list

### `features/crm/AccountCreateForm.tsx`

Purpose:

- create account flow

### `features/crm/ContactCreateForm.tsx`

Purpose:

- create contact flow in relevant context

### `features/crm/OpportunityList.tsx`

Purpose:

- list visible opportunities for rep/manager

### `features/crm/OpportunityCreateForm.tsx`

Purpose:

- create opportunity

### `features/crm/OpportunityDetail.tsx`

Purpose:

- central Phase 2 detail screen

Should render:

- account/contact references
- owner
- stage
- expected amount
- close date
- activities section
- stage move controls

Should not render yet:

- approval strip
- metadata-driven custom fields
- dashboards

### `features/crm/StageMovePanel.tsx`

Purpose:

- explicit UI for stage transition command

Why separate:

- stage move is business action, not generic inline edit

### `features/crm/ActivityList.tsx`

Purpose:

- render linked activities on opportunity detail

### `features/crm/ActivityCreateForm.tsx`

Purpose:

- add activity in opportunity context

## 8. File-Level Dependency Rules

### Backend rules

- `api/*` depends on `crm/*`, `auth/*`, and shared error handling
- `crm/*/Service` may depend on matching `crm/*/Repository` and `auth/*`
- `crm/account/*` should not depend on `crm/opportunity/*`
- `crm/contact/*` may depend on account existence boundary, but not vice versa
- `crm/opportunity/*` may depend on account/contact lookup boundaries
- `StageTransitionPolicy` and `TeamScopePolicy` should remain small and explicit

### Frontend rules

- `features/crm/*` depends on `api/*`, `types/*`, and shell session context
- feature components should not embed raw fetch URLs
- opportunity detail may compose account/contact/activity subviews, but not Phase 3 approval screens yet

## 9. Recommended Implementation Order Inside Phase 2

### Step 1

Database:

- add `V3__phase2_crm_core.sql`

### Step 2

Backend:

- add `crm/account/*`
- add `api/AccountController.kt`

### Step 3

Backend:

- add `crm/contact/*`
- add `api/ContactController.kt`

### Step 4

Backend:

- add `crm/opportunity/*`
- add `api/OpportunityController.kt`

### Step 5

Backend:

- add `crm/activity/*`
- add `api/ActivityController.kt`

### Step 6

Frontend:

- add `types/crm.ts`
- add `api/accounts.ts`
- add `api/contacts.ts`
- add `api/opportunities.ts`
- add `api/activities.ts`

### Step 7

Frontend:

- add account/contact/opportunity/activity components
- integrate them into shell navigation

### Step 8

Verification:

- backend integration tests
- frontend flow tests
- access-sensitive tests
- runtime verification later

## 10. What Must Not Be Introduced Yet

Do not create yet:

- `approval/*` package
- `metadata/*` package
- `import/*` package
- `reporting/*` package
- generic `shared/domain/platform/framework` mega-packages without concrete need

Do not do this in Phase 2:

- collapse all CRM logic into one huge `CrmService`
- store stage transitions as arbitrary strings only
- bypass access rules in repository queries

## 11. Phase 2 File-Level Exit Condition

Phase 2 file structure is ready when:

- each CRM aggregate has explicit backend boundary;
- frontend has explicit Phase 2 screens instead of one oversized `App.tsx`;
- stage transition has separate policy and UI handling;
- rep vs manager scope can be enforced without later rewrite;
- no Phase 3+ modules are prematurely mixed into Phase 2 structure.
