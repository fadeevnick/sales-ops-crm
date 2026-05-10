# Phase 1 Coding Slice Review Note

Этот документ фиксирует review уже начатого первого `Phase 1` coding slice
без runtime execution.

Его цель:

- проверить, что первый slice остался узким;
- отделить то, что уже закрыто, от того, что ещё только отложено;
- не дать `Phase 1` расползтись в schema/frontend/Phase 2 scope.

## 1. Slice Under Review

Reviewed slice:

```text
backend session/current-user hardening
```

Reference planning artifact:

- `phase1_coding_slice_planning_note.md`

## 2. What Was Actually Introduced

В кодовую базу уже добавлены или изменены:

- `api/SessionController.kt`
- `service/SessionService.kt`
- `api/ApiExceptionHandler.kt`
- `auth/CurrentUserContext.kt`
- `auth/TenantContext.kt`
- `auth/SessionResolver.kt`
- `auth/ShellModuleVisibilityPolicy.kt`
- `repository/UserShellRepository.kt`

## 3. What This Slice Successfully Closed

### 3.1 Current user resolution is no longer scattered

Сильное улучшение:

- `X-Demo-User-Id` resolution больше не сидит inline внутри `SessionService`;
- для него появился отдельный `SessionResolver`;
- `SessionController` остался thin boundary.

Это соответствует `adr-002-shell-auth-boundary.md`.

### 3.2 SQL-heavy shell logic was reduced

Сильное улучшение:

- `SessionService` больше не содержит raw SQL queries;
- DB reads вынесены в `UserShellRepository`;
- service layer стал ближе к orchestration role.

Это соответствует `phase1_file_level_plan.md`.

### 3.3 Role-to-module visibility is now backend-owned policy

Сильное улучшение:

- mapping role -> visible modules больше не inline в `SessionService`;
- он вынесен в `ShellModuleVisibilityPolicy`;
- frontend по-прежнему должен зависеть от backend truth, а не от hidden UI assumptions.

Это соответствует `adr-005-access-enforcement-layer.md`.

### 3.4 `401/403` JSON contract got a real boundary

Сильное улучшение:

- `ApiExceptionHandler` ввёл единый JSON shape для `unauthorized` и `forbidden`;
- error semantics отделены от controller logic.

Это соответствует цели первого slice.

## 4. What This Slice Did Not Close

Этот slice не закрывает всю `Phase 1`, и это нормально.

Пока ещё не закрыто:

- `V2__phase1_identity_hardening.sql`;
- seeded `finance_approver` / `legal_approver`;
- frontend shell split and cleanup;
- session persistence cleanup on frontend;
- full `404/422` contract beyond the narrow current handler;
- verification that the new backend boundary compiles cleanly in this environment;
- any runtime proof.

## 5. Non-Blocking Gaps Observed

### 5.1 User status semantics are still not enforced in shell auth path

Сейчас в schema есть `app_users.status`, но reviewed slice пока не показывает явного rule вроде:

- only `active` users may authenticate into shell.

Это не ломает первый slice как boundary move, но это остаётся Phase 1 gap.

### 5.2 Current context still stays shell-oriented, not yet future-ready enough for richer policy use

`CurrentUserContext` уже полезен, но пока минимален.

Для следующего Phase 1/Phase 2 growth позже могут понадобиться:

- assignment metadata;
- explicit role collection semantics;
- maybe more explicit scope vocabulary.

Сейчас это не надо расширять.

### 5.3 Verification is still documentary, not technical

Compile/runtime proof нет.

Это сейчас допустимо, потому что мы остаёмся в artifact mode, но нельзя перепутать это с “slice fully proven”.

## 6. Scope Discipline Check

Первый slice **не расползся** в:

- CRM entities;
- approval engine;
- metadata-driven model;
- frontend restructuring;
- Phase 2 access queries;
- migration expansion.

Это главный положительный вывод review.

## 7. Decision From This Review

Решение по reviewed slice:

```text
keep it as the accepted first boundary move;
do not expand it retroactively;
plan the second Phase 1 slice separately
```

Иначе `Phase 1` потеряет control over sequencing.

## 8. Recommended Next Artifact

Следующий правильный artifact:

```text
phase1_second_coding_slice_planning_note.md
```

Его задача:

- выбрать второй узкий slice внутри `Phase 1`;
- не смешивать его с already-started first slice;
- решить, что идёт следующим:
  - `V2` identity hardening migration + seed growth
  - или frontend shell/session refinement

## 9. Constraint For The Next Artifact

Следующий planning note не должен одновременно тащить:

- schema hardening;
- approver seed expansion;
- frontend shell restructuring;
- tests;
- runtime verification.

Нужно выбрать **один** второй slice, а не “закрыть остаток Phase 1 одним прыжком”.
