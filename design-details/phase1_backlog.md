# Phase 1 Backlog

Implementation-ready backlog для:

```text
Phase 1 — Tenant, auth, roles, workspace shell
```

Цель этого документа:

- разложить `Phase 1` из `06_implementation_guide.md` на конкретные work items;
- подготовить реализацию без раннего расширения scope;
- удержать фокус на tenant/auth/role baseline, а не на CRM domain Phase 2.

## 1. Phase 1 Goal

В результате Phase 1 система должна:

- корректно определять текущего пользователя;
- корректно определять текущий tenant;
- корректно различать роли;
- корректно ограничивать module entrypoints и базовый workspace scope;
- давать role-aware shell для следующих фаз.

## 2. Out of Scope

В `Phase 1` не входят:

- accounts, contacts, opportunities, activities;
- approval requests;
- metadata configuration;
- import/export;
- dashboards;
- deduplication;
- full production IAM integration.

## 3. Backend Work Items

### 3.1 Identity and session boundary

- заменить purely temporary demo session flow на Phase 1-compatible auth boundary;
- сохранить возможность локального seeded login для dev mode;
- ввести единый current-user resolution path;
- нормализовать tenant/user/role loading from request context.

### 3.2 Tenant resolution

- выделить `TenantContext` abstraction;
- запретить клиенту передавать tenant id как writable business input;
- tenant должен определяться через session/auth context;
- все Phase 2+ read/write paths должны быть готовы опираться на этот context.

### 3.3 Role model baseline

- нормализовать role keys and display names;
- выделить role-check helper or policy boundary;
- подготовить server-side permission checks for shell/module access;
- зафиксировать mapping role -> visible shell modules.

### 3.4 Session and user APIs

Реализовать или довести до Phase 1 baseline:

- `GET /api/me`
- dev login path for local shell
- consistent unauthorized and forbidden responses
- stable response shape for current user and workspace context

### 3.5 Error handling baseline

- unified error response contract for `401`, `403`, `404`, `422`;
- human-readable error summary;
- machine-readable `error` code.

## 4. Database and Migration Work Items

### 4.1 Tenant and user schema hardening

- проверить tenant/user/role baseline schema against Phase 1 needs;
- ввести unique and foreign key constraints where still missing;
- зафиксировать status semantics for users;
- подготовить migration discipline for future role growth.

### 4.2 Seed data baseline

- зафиксировать one-tenant local baseline;
- seeded users for `sales_rep`, `sales_manager`, `revops_admin`;
- optional seeded `finance_approver` and `legal_approver` users for future phases;
- seed naming should match prototypes and docs where possible.

### 4.3 Audit baseline for Phase 1

- audit minimal login/session-sensitive events where appropriate;
- audit should not become full event model yet, but foundation must be aligned with `audit_model.md`.

## 5. Frontend Work Items

### 5.1 Authenticated shell

- role-aware landing state after login;
- current tenant/user identity card;
- graceful logged-out state;
- unauthorized state handling.

### 5.2 Navigation model

- left-nav or module-card shell based on role;
- no links to unavailable modules;
- clear placeholder boundaries for future modules.

### 5.3 Session persistence

- define local dev session storage strategy;
- restore last session on refresh;
- clear session on logout;
- fail gracefully when stored session becomes invalid.

### 5.4 UX guardrails

- explicit loading states;
- explicit error states for auth/session failures;
- no fake navigation into unimplemented product flows pretending they already exist.

## 6. Access and Policy Work Items

### 6.1 Shell-level access enforcement

- enforce role-based module visibility from backend-driven context;
- do not rely only on hidden frontend buttons;
- protected endpoints must reject unauthorized calls even if frontend is bypassed.

### 6.2 Baseline policy mapping

For Phase 1 only:

- `sales_rep` sees rep workspace shell
- `sales_manager` sees manager shell
- `revops_admin` sees admin shell
- approver roles may exist in seed but do not need full workflow screens yet

### 6.3 Future-safe access boundary

- structure access checks so Phase 2 records and Phase 3 approvals can plug in without rewrite;
- avoid hardcoding role logic deep inside controllers when a policy/service boundary is possible.

## 7. API Contract Checklist

Before Phase 1 is considered ready:

- `GET /api/me` matches agreed contract
- session/login path returns stable user/tenant/role context
- unauthorized responses are consistent
- role-aware visible modules are backend-driven
- frontend can render shell from API response without hardcoded tenant assumptions

## 8. Test Planning for Phase 1

### 8.1 Backend tests

- current user resolution with valid seeded user
- unauthorized when session header/token missing
- unauthorized when unknown user id is supplied
- tenant context returned correctly
- role mapping returned correctly

### 8.2 Frontend tests

- login flow renders available seeded users
- selecting user enters correct shell
- refresh restores session state
- logout clears session
- role change produces different visible workspace modules

### 8.3 Negative cases

- stale session id in local storage
- backend unavailable for `/api/me`
- user exists but has no valid role assignment
- invalid role-to-module mapping

## 9. Suggested Implementation Order Inside Phase 1

1. Harden tenant/user/role schema and seeds
2. Normalize backend current-user and tenant context loading
3. Standardize auth/session error contract
4. Finish backend `GET /api/me` contract
5. Refine frontend login/session persistence
6. Refine role-aware navigation shell
7. Add backend and frontend Phase 1 tests
8. Run first Phase 1 runtime verification later

## 10. Definition of Done for Phase 1

Phase 1 can be marked done only if all of the following are true:

- user can log in through local dev auth path;
- current tenant and role are resolved correctly;
- different roles see different workspace shell;
- unauthorized access path is explicit and consistent;
- no cross-tenant access path exists in shell baseline;
- `implementation_status.md` records runtime verification results, not assumptions.

## 11. Recommended Immediate Next Coding Slice

Если идти совсем маленькими шагами, лучший следующий coding slice внутри Phase 1:

1. normalize backend session/current-user contract
2. add finance/legal seeded users
3. add forbidden/unauthorized unified error contract
4. refine frontend role-aware shell rendering

Это даст хороший foundation без преждевременного перехода к core CRM entities.
