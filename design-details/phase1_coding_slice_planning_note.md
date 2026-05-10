# Phase 1 Coding Slice Planning Note

Этот документ фиксирует самый узкий и правильный переход
из implementation-near planning в реальный код.

Речь идёт не о всей `Phase 1`, а только о первом coding slice внутри неё.

## 1. Decision

Первый coding slice внутри `Phase 1`:

```text
backend session/current-user hardening
```

Это означает:

- стабилизировать backend-owned identity boundary;
- убрать inline current-user resolution из controller/service drift;
- вынести role-to-module visibility в policy layer;
- ввести единый `401/403` error contract;
- сохранить demo login только как temporary local-dev transport.

## 2. Why This Slice Is First

Этот slice выбран первым, потому что он:

- даёт самый сильный foundation для `Phase 1` и всех следующих фаз;
- уже лучше всего подготовлен `phase1_backlog.md`, `phase1_file_level_plan.md` и `adr-002` / `adr-005`;
- не зависит от CRM records, approvals, metadata, imports или reporting;
- убирает текущие самые очевидные bootstrap debt points:
  - `X-Demo-User-Id` resolve прямо в controller/service path;
  - inline role-to-module mapping;
  - SQL-heavy `SessionService`;
  - exception contract, зажатый в одном controller file.

Если начать не с этого slice, а, например, с frontend polish или `V2` migration, то auth/tenant/module boundary останется ad hoc, и Phase 2+ будут строиться на хрупкой основе.

## 3. Exact Scope

В этот первый slice входят:

1. Нормализовать `GET /api/me` как стабильный Phase 1 baseline.
2. Выделить server-side resolved context objects для current user и tenant.
3. Вынести request-to-user resolution в отдельный resolver layer.
4. Вынести role-to-module visibility в backend policy layer.
5. Ввести единый JSON error contract для `401` и `403`.
6. Сохранить существующий demo login transport, но перестать считать его центром auth semantics.

## 4. Explicitly In Scope

### Backend behavior

- `GET /api/me` остаётся главным source of truth для shell context.
- `POST /api/session/demo-login` остаётся временным локальным bootstrap path.
- backend остаётся authority для:
  - tenant resolution;
  - role resolution;
  - visible modules.

### Backend structure

Ожидаемые новые или переработанные элементы:

- `api/SessionController.kt`
- `service/SessionService.kt`
- `api/ApiExceptionHandler.kt`
- `auth/CurrentUserContext.kt`
- `auth/TenantContext.kt`
- `auth/SessionResolver.kt`
- `auth/ShellModuleVisibilityPolicy.kt`
- `repository/UserShellRepository.kt`

## 5. Explicitly Out Of Scope

В этот slice не входят:

- `V2__phase1_identity_hardening.sql`, если не появится реальная блокирующая причина;
- seeded `finance_approver` / `legal_approver`;
- frontend component split;
- frontend session persistence refinement beyond what already exists;
- new CRM entities and Phase 2 APIs;
- approval request model and Phase 3 files;
- runtime verification;
- real auth provider integration;
- full security hardening.

Отдельно важно:

- не трогать сейчас `accounts`, `contacts`, `opportunities`, `activities`;
- не добавлять generic permission framework;
- не расползаться в early cross-module refactor.

## 6. Concrete Files To Touch First

### 6.1 Modify first

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/SessionController.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/service/SessionService.kt`

Почему именно они сначала:

- здесь сейчас сосредоточен весь current auth/session drift;
- после чтения этих двух файлов видно, какие DTO и exceptions уже существуют и что можно сохранить без лишнего churn.

### 6.2 Add next

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/ApiExceptionHandler.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/auth/CurrentUserContext.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/auth/TenantContext.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/auth/SessionResolver.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/auth/ShellModuleVisibilityPolicy.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/repository/UserShellRepository.kt`

### 6.3 Optional only if needed

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/config/SecurityConfig.kt`

Это допустимо только если реализация явно требует сделать dev-mode shell boundary более прозрачным.

## 7. Recommended Change Order

1. Вынести DB reads из `SessionService` в `UserShellRepository`.
2. Ввести `CurrentUserContext` и `TenantContext`.
3. Ввести `SessionResolver` для `X-Demo-User-Id` path.
4. Ввести `ShellModuleVisibilityPolicy`.
5. Переписать `SessionService` на orchestration поверх repository/resolver/policy.
6. Переписать `SessionController` в thin boundary.
7. Ввести `ApiExceptionHandler` и единый `401/403` contract.

## 8. Exit Criteria For This Slice

Slice можно считать завершённым, когда:

- `GET /api/me` больше не зависит от inline header parsing + inline role mapping;
- `SessionService` больше не является SQL-heavy monolith for shell logic;
- role-to-module visibility идёт из отдельной policy boundary;
- demo login остаётся рабочим temporary path;
- `401` и `403` возвращаются в одном согласованном JSON shape;
- tenant identity не принимается как writable client authority;
- кодовая база готова ко второму Phase 1 slice без переписывания auth boundary заново.

## 9. What Becomes Easier After This Slice

После этого slice проще и безопаснее делать:

- `V2` hardening migration и extra seeded roles;
- frontend shell refinement;
- session persistence cleanup;
- Phase 2 tenant-scoped CRM APIs;
- Phase 3 approval access paths.

## 10. Next Step After This Note

После этого planning note следующий шаг уже не новый planning artifact.

Следующий шаг:

```text
implement the first Phase 1 coding slice:
backend session/current-user hardening
```
