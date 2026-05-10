# Phase 1 File-Level Plan

Implementation-near plan для:

```text
Phase 1 — Tenant, auth, roles, workspace shell
```

Этот документ отвечает на вопрос:

```text
какие файлы должны быть созданы или изменены,
что именно в них должно жить,
и в каком порядке их трогать,
чтобы реализовать Phase 1 без лишнего scope drift
```

Это не код и не псевдокод. Это file-level execution map.

## 1. Current Baseline

Сейчас bootstrap уже содержит:

### Backend

- `SalesOpsApplication.kt`
- `api/HealthController.kt`
- `api/SessionController.kt`
- `config/SecurityConfig.kt`
- `config/WebConfig.kt`
- `service/SessionService.kt`
- `db/migration/V1__bootstrap_shell.sql`

### Frontend

- `src/App.tsx`
- `src/main.tsx`
- `src/styles.css`

### Runtime

- `docker-compose.yml`
- `.env.example`

Phase 1 не должен ломать этот bootstrap, а должен превратить его в более чистый shell/auth baseline.

## 2. Phase 1 Target Structure

### Backend target shape

```text
backend/src/main/kotlin/com/salesops/bootstrap/
├── SalesOpsApplication.kt
├── api/
│   ├── HealthController.kt
│   ├── SessionController.kt
│   └── ApiExceptionHandler.kt
├── config/
│   ├── SecurityConfig.kt
│   └── WebConfig.kt
├── auth/
│   ├── CurrentUserContext.kt
│   ├── TenantContext.kt
│   ├── SessionResolver.kt
│   └── ShellModuleVisibilityPolicy.kt
├── service/
│   └── SessionService.kt
└── repository/
    └── UserShellRepository.kt
```

### Frontend target shape

```text
frontend/src/
├── main.tsx
├── App.tsx
├── styles.css
├── api/
│   └── session.ts
├── types/
│   └── session.ts
├── features/
│   └── shell/
│       ├── LoginScreen.tsx
│       ├── WorkspaceShell.tsx
│       ├── ModuleGrid.tsx
│       └── SessionBanner.tsx
└── lib/
    └── sessionStorage.ts
```

### Migration target shape

```text
backend/src/main/resources/db/migration/
├── V1__bootstrap_shell.sql
└── V2__phase1_identity_hardening.sql
```

## 3. Backend File Plan

## 3.1 Files to keep with small changes

### `SalesOpsApplication.kt`

Role:

- Spring Boot entrypoint

Expected Phase 1 changes:

- no meaningful business changes
- keep stable

Why:

- this file should remain boring

### `config/WebConfig.kt`

Role:

- CORS and basic web config

Expected Phase 1 changes:

- probably minimal or none

Why:

- Phase 1 is not about web infra complexity

### `api/HealthController.kt`

Role:

- health/readiness shell checks

Expected Phase 1 changes:

- none unless response standardization is needed

Why:

- keep Phase 0 runtime signals stable

## 3.2 Files to modify significantly

### `api/SessionController.kt`

Current role:

- temporary demo session endpoints

Phase 1 target role:

- stable shell/session API boundary

Should contain:

- `GET /api/me`
- temporary local dev login endpoint
- no direct low-level auth logic
- thin controller delegating to service/resolver layer

Should not contain:

- inline SQL
- role-to-module logic
- tenant resolution logic
- handcrafted error branching everywhere

### `service/SessionService.kt`

Current role:

- demo login and current user loading

Phase 1 target role:

- orchestrate shell/session use cases

Should contain:

- current user retrieval orchestration
- login orchestration for local dev mode
- delegation to repository and policy components

Should not contain:

- hardcoded role-to-module mapping if it can live in separate policy class
- controller-style exception rendering

### `config/SecurityConfig.kt`

Current role:

- effectively open security shell

Phase 1 target role:

- still simple, but explicit about dev-mode shell behavior

Should contain:

- intentionally permissive or dev-oriented rules if needed
- clear future boundary for auth hardening

Should not become:

- fake full IAM implementation

## 3.3 Files to add

### `api/ApiExceptionHandler.kt`

Purpose:

- unify error contract for `401`, `403`, `404`, `422`

Should contain:

- common error response shape
- exception-to-status mapping

Why needed in Phase 1:

- shell and session flows need consistent failure semantics before domain APIs grow

### `auth/CurrentUserContext.kt`

Purpose:

- represent resolved authenticated user context

Should contain:

- user id
- email
- display name
- role key / role name
- tenant id / tenant name
- allowed shell modules

Why:

- Phase 1 needs a stable context object, not ad hoc maps and DTO fragments

### `auth/TenantContext.kt`

Purpose:

- represent current tenant boundary

Should contain:

- tenant id
- tenant slug or name if needed

Why:

- prepares clean tenant propagation into Phase 2 records

### `auth/SessionResolver.kt`

Purpose:

- centralize request-to-user resolution

Should contain:

- logic for dev session header or later token boundary
- validation of missing/invalid user context

Why:

- prevents current-user resolution from being scattered between controller and service

### `auth/ShellModuleVisibilityPolicy.kt`

Purpose:

- backend-driven role -> module visibility mapping

Should contain:

- mapping for `sales_rep`
- mapping for `sales_manager`
- mapping for `revops_admin`
- placeholder support for approver roles

Why:

- frontend should render shell from backend truth

### `repository/UserShellRepository.kt`

Purpose:

- isolate DB reads for current user, tenant and role shell data

Should contain:

- query by user id
- query by email for dev login

Why:

- keeps `SessionService` from becoming SQL-heavy orchestration soup

## 4. Migration File Plan

### `V1__bootstrap_shell.sql`

Status:

- keep as historical bootstrap

Should not be rewritten aggressively if avoidable.

### `V2__phase1_identity_hardening.sql`

Purpose:

- harden identity/role baseline without mixing in Phase 2 tables

Should contain:

- additional constraints if needed
- user status normalization if missing
- optional seeded finance/legal approver users
- any role data normalization needed for Phase 1 shell

Should not contain:

- accounts
- contacts
- opportunities
- approvals

## 5. Frontend File Plan

## 5.1 Files to keep with minimal change

### `main.tsx`

Role:

- app bootstrap

Expected change:

- minimal or none

### `styles.css`

Role:

- shell styling baseline

Expected change:

- split or extend only if structure becomes unwieldy

## 5.2 Files to refactor

### `App.tsx`

Current role:

- contains almost all shell logic

Phase 1 target role:

- composition root only

Should contain:

- top-level session state wiring
- choose between logged-out, loading, authenticated shell

Should not contain:

- raw fetch details
- all UI sections inline
- hardcoded module policy logic

## 5.3 Files to add

### `api/session.ts`

Purpose:

- isolate frontend calls to shell/session backend endpoints

Should contain:

- `fetchDemoUsers`
- `loginDemoUser`
- `fetchCurrentUser`

Why:

- keeps transport logic out of view components

### `types/session.ts`

Purpose:

- centralize TS contracts for session/current-user payloads

Should contain:

- `DemoUser`
- `CurrentUser`
- `ApiError`

Why:

- avoids contract drift inside UI

### `lib/sessionStorage.ts`

Purpose:

- isolate local session persistence behavior

Should contain:

- read current session id
- write current session id
- clear current session id

Why:

- Phase 1 needs explicit session persistence semantics

### `features/shell/LoginScreen.tsx`

Purpose:

- logged-out/dev-login screen

Should contain:

- seeded user chooser
- login action
- login error display

### `features/shell/WorkspaceShell.tsx`

Purpose:

- authenticated shell frame

Should contain:

- current identity header
- logout action
- module grid or nav shell

### `features/shell/ModuleGrid.tsx`

Purpose:

- render visible modules from backend response

Should contain:

- purely presentational role-aware cards/nav items

### `features/shell/SessionBanner.tsx`

Purpose:

- show current user / tenant / role summary

Why:

- keeps `WorkspaceShell` smaller and clearer

## 6. File-Level Dependency Rules

### Backend rules

- `api/*` may depend on `service/*` and `auth/*`
- `service/*` may depend on `repository/*` and `auth/*`
- `repository/*` should not depend on `api/*`
- `auth/*` should remain domain-light and shell-focused in Phase 1

### Frontend rules

- `App.tsx` may depend on `api/*`, `types/*`, `features/*`, `lib/*`
- `features/shell/*` may depend on `types/*`
- `features/shell/*` should not contain direct fetch calls if avoidable
- `lib/*` should remain UI-agnostic

## 7. Recommended Order of File Changes

### Step 1

Backend:

- add `auth/CurrentUserContext.kt`
- add `auth/TenantContext.kt`
- add `repository/UserShellRepository.kt`

### Step 2

Backend:

- add `auth/ShellModuleVisibilityPolicy.kt`
- add `auth/SessionResolver.kt`

### Step 3

Backend:

- refactor `SessionService.kt`
- refactor `SessionController.kt`
- add `api/ApiExceptionHandler.kt`

### Step 4

Database:

- add `V2__phase1_identity_hardening.sql`

### Step 5

Frontend:

- add `types/session.ts`
- add `api/session.ts`
- add `lib/sessionStorage.ts`

### Step 6

Frontend:

- add `features/shell/LoginScreen.tsx`
- add `features/shell/WorkspaceShell.tsx`
- add `features/shell/ModuleGrid.tsx`
- add `features/shell/SessionBanner.tsx`

### Step 7

Frontend:

- slim down `App.tsx`
- update `styles.css`

## 8. What Must Not Be Introduced in These Files Yet

- account/contact/opportunity repositories
- approval entities and controllers
- metadata admin APIs
- import job machinery
- dashboard-specific components
- generic shared platform abstractions "for the future" without Phase 1 need

## 9. Phase 1 File-Level Exit Condition

Phase 1 file structure is considered ready when:

- backend shell/auth concerns are clearly separated from future CRM modules;
- frontend shell is decomposed into role/session-focused components;
- migration path for identity hardening is explicit;
- no Phase 2+ domain files are prematurely mixed into Phase 1 work.
