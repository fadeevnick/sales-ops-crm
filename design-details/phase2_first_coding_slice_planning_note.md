# Phase 2 First Coding Slice Planning Note

Этот документ фиксирует первый узкий coding slice внутри `Phase 2`.

Он нужен, чтобы переход из shell/runtime baseline
в core CRM implementation
не превратился в расплывчатое "теперь делаем сразу весь CRM".

## 1. Decision

Первый coding slice внутри `Phase 2`:

```text
V3 crm core migration + backend account baseline
```

Это означает:

- сначала зафиксировать relational foundation для `Phase 2`;
- затем дать самый узкий usable business backend path:
  `GET /api/accounts` и `POST /api/accounts`;
- не заходить пока в contacts, opportunities, activities UI или approval-adjacent behavior.

## 2. Why This Slice Is First

Этот slice выбран первым, потому что:

- disposable smoke runtime gate уже доказал, что текущий shell не мёртв;
- `Phase 2` нельзя начинать с frontend CRM screens до фиксации schema foundation;
- `accounts` — самый узкий business aggregate, который уже даёт реальную CRM data boundary;
- `contacts` зависят от `accounts`;
- `opportunities` зависят от `accounts`, `contacts` и `opportunity_stages`;
- `activities` зависят от `opportunities`.

Если сейчас начать не с этого slice, а сразу с:

- opportunity lifecycle;
- frontend CRM screens;
- manager team pipeline;
- stage move command;

то schema sequencing и aggregate boundaries почти неизбежно расползутся,
а `Phase 2` быстро превратится в mixed backend/frontend/domain burst.

## 3. Exact Scope

В этот первый slice входят:

1. Ввести `V3__phase2_crm_core.sql`.
2. Зафиксировать `Phase 2` core tables:
   - `accounts`
   - `contacts`
   - `opportunity_stages`
   - `opportunities`
   - `activities`
3. Добавить initial stage seed baseline для bootstrap tenant.
4. Реализовать backend account baseline:
   - `GET /api/accounts`
   - `POST /api/accounts`
5. Опереться на уже существующий current-user / tenant context,
   а не заводить новый auth path.
6. Оставить все остальные `Phase 2` aggregates отдельными следующими slices.

## 4. Explicitly In Scope

### Migration scope

`V3__phase2_crm_core.sql` может включать:

- create table for all `Phase 2` core CRM tables;
- foreign keys to `tenants`, `app_users`, `accounts`, `contacts`, `opportunity_stages`, `opportunities`;
- required checks already allowed by `schema_draft_phase1_phase2.md`;
- indexes needed for owner/account/opportunity/stage baseline queries;
- initial stage seed rows for `tenant_orion`.

### Backend scope

Должны появиться или быть добавлены:

- `codebase/backend/src/main/resources/db/migration/V3__phase2_crm_core.sql`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/AccountController.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/account/AccountDtos.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/account/AccountService.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/account/AccountRepository.kt`

### Behavioral scope

Этот slice должен уже позволять:

- создать account в tenant scope текущего пользователя;
- читать account list в tenant scope текущего пользователя;
- сохранять owner and audit-friendly fields server-side;
- не принимать `tenantId` from client as authority signal.

## 5. Explicitly Out Of Scope

В этот первый slice не входят:

- frontend CRM screens;
- `types/crm.ts`;
- `api/accounts.ts` on frontend;
- contact endpoints;
- opportunity endpoints;
- activity endpoints;
- stage transition command;
- manager team pipeline read path;
- owner reassignment;
- approval workflow hooks;
- metadata-driven stage configuration;
- runtime verification beyond the already completed smoke gate.

Особенно важно:

- не смешивать этот slice с `Phase 2` frontend work;
- не превращать `V3` в Phase 3/4 migration dump;
- не тащить сюда approval, metadata, import, reporting or audit-event tables.

## 6. Primary Files To Touch

### Required

- `codebase/backend/src/main/resources/db/migration/V3__phase2_crm_core.sql`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/AccountController.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/account/AccountDtos.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/account/AccountService.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/account/AccountRepository.kt`
- `implementation_status.md`

### Likely

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/ApiExceptionHandler.kt`

### Optional only if needed

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/service/SessionService.kt`

Только если account baseline действительно обнаружит shell-contract gap,
а не как предлог для нового auth refactor.

## 7. Recommended Change Order

1. Finalize exact `V3` scope from `schema_draft_phase1_phase2.md`.
2. Add `V3__phase2_crm_core.sql`.
3. Add `crm/account/AccountDtos.kt`.
4. Add `crm/account/AccountRepository.kt`.
5. Add `crm/account/AccountService.kt`.
6. Add `api/AccountController.kt`.
7. Align error contract only if the new account path reveals a concrete gap.
8. Update `implementation_status.md` without claiming Phase 2 runtime proof.

## 8. Exit Criteria For This Slice

Первый slice можно считать закрытым на implementation boundary, когда:

- `V3__phase2_crm_core.sql` exists;
- `Phase 2` no longer depends on imaginary CRM tables;
- account create/list backend path exists on top of real schema;
- tenant-aware ownership and audit-friendly fields are written server-side;
- no contacts/opportunities/activities APIs have leaked into the same slice;
- no frontend CRM work has been silently pulled in.

## 9. What Becomes Easier After This Slice

После этого slice проще и чище делать:

- contact baseline as the second `Phase 2` slice;
- opportunity aggregate baseline as the next heavier slice;
- stage move command on top of a real schema rather than placeholders;
- later frontend CRM screens against stable backend contracts.

## 10. Deferred To The Next Slice

Сознательно откладывается:

```text
contact baseline
```

И только после него уже логично идти глубже в `opportunities` and `activities`,
а не пытаться в один прыжок закрыть весь transactional loop.

## 11. Next Step After This Note

После этого planning note следующим артефактом должен стать:

```text
v3_phase2_crm_core_spec.md
```

И только после него уже можно решать,
нужен ли ещё отдельный acceptance checklist before implementation.
