# Test Matrix — Phase 0, Phase 1, Phase 2

Implementation-near test matrix для:

```text
Phase 0 — Product shell and codebase bootstrap
Phase 1 — Tenant, auth, roles, workspace shell
Phase 2 — Core CRM records and pipeline
```

Цель документа:

- заранее определить, что именно должно быть доказано тестами;
- не смешивать unit/integration/E2E/runtime checks;
- подготовить disciplined verification path до активного runtime work.

Это не test code. Это matrix of required coverage.

## 1. Test Strategy Principles

1. Critical business invariants must have automated checks before broad feature growth.
2. Access behavior is as important as happy-path CRUD.
3. Runtime verification does not replace lower-level tests.
4. Explicit command flows should be tested separately from generic field updates.
5. Each phase needs:
   - static/build verification
   - automated test targets
   - runtime scenario verification later

## 2. Test Layers

### Unit tests

Purpose:

- validate isolated domain/policy/service logic

Examples:

- role-to-module visibility mapping
- stage transition validation
- error mapping behavior

### Integration tests

Purpose:

- validate Spring + DB + migration + repository/service/controller interaction

Examples:

- `GET /api/me`
- migration startup
- record creation with DB persistence

### Frontend component tests

Purpose:

- verify local UI logic and rendering states

Examples:

- login state
- workspace shell per role
- form state transitions

### E2E tests

Purpose:

- verify user-visible flows across frontend + backend

Examples:

- login to shell
- create account/contact/opportunity
- move stage

### Runtime verification

Purpose:

- verify actual local stack behavior after build/run

Examples:

- health/readiness
- DB connectivity
- end-to-end browser/API flow

## 3. Phase 0 Test Matrix

Phase 0 scope:

- codebase bootstrap
- container/runtime wiring
- DB baseline
- temporary demo login shell

### 3.1 Static / build checks

| Area | Check | Why |
|---|---|---|
| Backend | Gradle configuration parses | bootstrap must build at all |
| Backend | Kotlin compilation | detect wiring/syntax issues early |
| Frontend | TypeScript compile | shell UI must be structurally valid |
| Frontend | Vite build config valid | avoid runtime surprises from broken config |
| Runtime | `docker compose config --quiet` | validate compose wiring |

### 3.2 Backend integration targets

| ID | Scenario | Expected |
|---|---|---|
| P0-BE-01 | app starts with migrations | schema is created successfully |
| P0-BE-02 | `GET /healthz` | returns `200` and `status=ok` |
| P0-BE-03 | `GET /readyz` with DB available | returns `200` and `postgres=ok` |
| P0-BE-04 | `GET /api/session/demo-users` | returns seeded users |
| P0-BE-05 | `POST /api/session/demo-login` valid email | returns session payload |
| P0-BE-06 | `POST /api/session/demo-login` invalid email | returns `401` |
| P0-BE-07 | `GET /api/me` valid demo header | returns current user context |
| P0-BE-08 | `GET /api/me` missing header | returns `401` |

### 3.3 Frontend component / UI targets

| ID | Scenario | Expected |
|---|---|---|
| P0-FE-01 | shell loads demo users | select options rendered |
| P0-FE-02 | login success | workspace shell visible |
| P0-FE-03 | login failure | error state shown |
| P0-FE-04 | stored session restored | app enters authenticated state |
| P0-FE-05 | logout | local session cleared |

### 3.4 Runtime checks later

| ID | Scenario | Expected |
|---|---|---|
| P0-RT-01 | `docker compose up --build` | db/backend/frontend start |
| P0-RT-02 | readiness after startup | backend reaches ready state |
| P0-RT-03 | frontend can call backend | demo users load in browser |
| P0-RT-04 | seeded user login in browser | workspace shell appears |

## 4. Phase 1 Test Matrix

Phase 1 scope:

- tenant context
- role model
- shell-level access
- session/auth baseline

### 4.1 Unit targets

| ID | Scenario | Expected |
|---|---|---|
| P1-UT-01 | role-to-module mapping for sales rep | only rep shell modules returned |
| P1-UT-02 | role-to-module mapping for manager | only manager shell modules returned |
| P1-UT-03 | role-to-module mapping for revops | admin shell modules returned |
| P1-UT-04 | unknown role handling | safe fallback or explicit failure |
| P1-UT-05 | session resolver with missing context | unauthorized result |

### 4.2 Backend integration targets

| ID | Scenario | Expected |
|---|---|---|
| P1-BE-01 | valid seeded user resolved | correct tenant/user/role context |
| P1-BE-02 | user from tenant A | tenant A returned consistently |
| P1-BE-03 | stale/unknown user id | `401 unauthorized` |
| P1-BE-04 | disabled user | denied according to contract |
| P1-BE-05 | user without valid role assignment | explicit failure, not silent fallback |
| P1-BE-06 | `GET /api/me` | matches agreed API contract |
| P1-BE-07 | error contract for unauthorized | JSON error shape consistent |
| P1-BE-08 | error contract for forbidden | JSON error shape consistent |

### 4.3 Frontend component / UI targets

| ID | Scenario | Expected |
|---|---|---|
| P1-FE-01 | logged-out state | login screen visible |
| P1-FE-02 | loading state during `/api/me` | loading state visible |
| P1-FE-03 | sales rep login | rep workspace shell rendered |
| P1-FE-04 | manager login | manager workspace shell rendered |
| P1-FE-05 | revops login | admin workspace shell rendered |
| P1-FE-06 | stale stored session | forced logged-out or invalid-session state |
| P1-FE-07 | backend `401` from `/api/me` | authenticated shell not shown |

### 4.4 Access-sensitive tests

| ID | Scenario | Expected |
|---|---|---|
| P1-AC-01 | frontend role shell differs by role | module visibility differs |
| P1-AC-02 | hidden module not returned by backend | frontend cannot invent it |
| P1-AC-03 | direct call without valid session | backend rejects |
| P1-AC-04 | tenant id spoof attempt in request body/query | ignored or rejected |

### 4.5 Runtime checks later

| ID | Scenario | Expected |
|---|---|---|
| P1-RT-01 | seeded rep login | correct tenant and modules visible |
| P1-RT-02 | seeded manager login | different shell from rep |
| P1-RT-03 | seeded revops login | admin shell visible |
| P1-RT-04 | refresh session persists correctly | user remains logged in |
| P1-RT-05 | logout clears session | app returns to logged-out state |

## 5. Phase 2 Test Matrix

Phase 2 scope:

- accounts
- contacts
- opportunities
- activities
- stage transitions
- owner and manager visibility baseline

### 5.1 Unit targets

| ID | Scenario | Expected |
|---|---|---|
| P2-UT-01 | valid stage transition | allowed result |
| P2-UT-02 | invalid stage transition missing required data | validation failure |
| P2-UT-03 | owner reassignment policy | allowed/denied correctly |
| P2-UT-04 | manager scope evaluation | correct scope decision |
| P2-UT-05 | opportunity global status mapping | consistent lifecycle semantics |

### 5.2 Backend integration targets

| ID | Scenario | Expected |
|---|---|---|
| P2-BE-01 | create account | row persisted under tenant |
| P2-BE-02 | create contact | linked to account and tenant |
| P2-BE-03 | create opportunity | linked to account, owner and stage |
| P2-BE-04 | get opportunity detail | returns correct linked context |
| P2-BE-05 | move stage valid | updated successfully and audited |
| P2-BE-06 | move stage invalid | `422 validation_failed` |
| P2-BE-07 | create activity | linked to opportunity |
| P2-BE-08 | list team pipeline as manager | team scope visible |
| P2-BE-09 | list opportunity outside scope | denied or excluded |
| P2-BE-10 | reassign owner by manager | works only in allowed scope |

### 5.3 Data integrity targets

| ID | Scenario | Expected |
|---|---|---|
| P2-DI-01 | account and contact tenant mismatch attempt | blocked |
| P2-DI-02 | opportunity references stage from another tenant | blocked |
| P2-DI-03 | activity references opportunity from another tenant | blocked |
| P2-DI-04 | owner assigned from another tenant | blocked |

### 5.4 Access-sensitive tests

| ID | Scenario | Expected |
|---|---|---|
| P2-AC-01 | sales rep sees own opportunities only | true |
| P2-AC-02 | manager sees team opportunities | true |
| P2-AC-03 | rep cannot reassign owner | forbidden |
| P2-AC-04 | admin can access tenant-wide scope | true |
| P2-AC-05 | user cannot open direct URL/API to hidden record | denied |

### 5.5 Frontend component / UI targets

| ID | Scenario | Expected |
|---|---|---|
| P2-FE-01 | create account form | validation and submit flow works |
| P2-FE-02 | create contact form | account relation retained |
| P2-FE-03 | create opportunity form | required baseline fields enforced |
| P2-FE-04 | opportunity detail view | renders account/contact/owner/stage |
| P2-FE-05 | stage move UI | success and validation failure handled |
| P2-FE-06 | activity list on opportunity | renders correctly |
| P2-FE-07 | manager team list | differs from rep list |

### 5.6 Runtime checks later

| ID | Scenario | Expected |
|---|---|---|
| P2-RT-01 | rep creates account/contact/opportunity | end-to-end passes |
| P2-RT-02 | rep moves stage with valid data | success |
| P2-RT-03 | rep moves stage with missing required data | validation visible |
| P2-RT-04 | manager views team pipeline | correct scope |
| P2-RT-05 | manager reassigns owner in allowed scope | success |
| P2-RT-06 | rep tries forbidden action | blocked visibly |

## 6. Migration Tests

These are required across phases, especially before runtime:

| ID | Scenario | Expected |
|---|---|---|
| MIG-01 | apply migrations from empty DB | success |
| MIG-02 | restart app on already migrated DB | idempotent startup |
| MIG-03 | Phase 2 migration after Phase 1 schema | success |
| MIG-04 | seeded role data after hardening migration | correct role set available |

## 7. Error Contract Tests

Cross-phase contract tests:

| ID | Scenario | Expected |
|---|---|---|
| ERR-01 | unauthorized request | `401` with standard shape |
| ERR-02 | forbidden request | `403` with standard shape |
| ERR-03 | missing record | `404` with standard shape |
| ERR-04 | validation failure | `422` with standard shape and details |

## 8. Minimum Coverage Required Before Deeper Feature Growth

Before moving beyond Phase 2, the following must be covered:

- shell auth/session baseline
- tenant scoping baseline
- account/contact/opportunity creation
- stage transition validation
- manager visibility baseline
- forbidden action baseline
- migration path stability

Without this coverage, Phase 3 approvals will land on unstable foundations.

## 9. Suggested Test Implementation Order

1. Phase 0 backend integration tests
2. Phase 1 backend integration and error contract tests
3. Phase 1 frontend shell tests
4. migration tests
5. Phase 2 backend integration tests
6. Phase 2 access-sensitive tests
7. Phase 2 frontend flow tests
8. runtime checklists execution later

## 10. Relationship to Runtime Checklists

This matrix defines:

- what should be proven by automated tests

It does not replace:

- exact manual/runtime execution commands
- post-startup verification steps

Those should live in a separate runtime checklist artifact.
