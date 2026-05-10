# Phase 1 Second Coding Slice Planning Note

Этот документ фиксирует второй узкий coding slice внутри `Phase 1`.

Он нужен, чтобы не превращать остаток `Phase 1`
в расплывчатое "добить всё понемногу".

## 1. Decision

Второй coding slice внутри `Phase 1`:

```text
schema and seed hardening
```

Этот slice идёт **после** `backend session/current-user hardening`
и **до** frontend shell/session refinement.

## 2. Why This Slice Is Second

Этот slice выбран вторым, потому что:

- первый slice уже стабилизировал shell/auth boundary на backend;
- review note показал, что главный следующий незакрытый backend gap теперь лежит в schema and seed baseline;
- Phase 1 ещё не нуждается в frontend restructuring раньше data/identity hardening;
- `V2` migration и seed growth лучше закрыть до того, как frontend начнёт опираться на более богатую роль/статусную модель.

Если сейчас пойти во frontend shell/session refinement, то:

- identity hardening останется недофиксированной;
- user status semantics останутся только документированными;
- approver role seeds будут по-прежнему отсутствовать;
- frontend может начать полагаться на временный backend baseline дольше, чем нужно.

## 3. Exact Scope

В этот второй slice входят:

1. Ввести `V2__phase1_identity_hardening.sql`.
2. Зафиксировать `app_users.status` semantics на уровне schema baseline.
3. Добавить отсутствующие Phase 1 seed roles:
   - `finance_approver`
   - `legal_approver`
4. Добавить seeded users для этих ролей.
5. Нормализовать role and seed naming так, чтобы они совпадали с docs/prototypes/planning artifacts.
6. Подготовить schema baseline для дальнейшего frontend shell refinement, но не реализовывать сам frontend slice.

## 4. Explicitly In Scope

### Migration scope

`V2__phase1_identity_hardening.sql` может включать:

- check constraint для `app_users.status`;
- optional indexes, уже предусмотренные `schema_draft_phase1_phase2.md`;
- inserts for missing roles;
- inserts for missing users;
- inserts for missing `user_role_assignments`;
- small corrective seed normalization if it не ломает `V1`.

### Seed scope

Должны появиться:

- role row for `finance_approver`
- role row for `legal_approver`
- one seeded `finance_approver` user
- one seeded `legal_approver` user

Допустимо:

- сохранить current one-tenant local baseline;
- сохранить globally unique emails for current MVP shell;
- сохранить simple text ids.

### Backend alignment scope

Допустимы только минимальные backend changes, если они строго нужны для согласования с new schema/seed baseline.

Например:

- small policy update if approver roles must no longer raise empty/unknown visibility path;
- minimal repository/service adjustments if new status rule must be enforced cleanly.

## 5. Explicitly Out Of Scope

В этот второй slice не входят:

- frontend shell/session refinement;
- component split on frontend;
- login UX cleanup;
- runtime verification;
- broader tests;
- multi-tenant identity redesign;
- Phase 2 tables;
- approval workflow implementation;
- generic auth provider integration.

Особенно важно:

- не смешивать этот slice с `frontend shell/session refinement`;
- не тащить сюда Phase 2 schema;
- не превращать `V2` в “сразу весь Phase 1 cleanup migration”.

## 6. Primary Files To Touch

### Required

- `codebase/backend/src/main/resources/db/migration/V2__phase1_identity_hardening.sql`
- `design-details/schema_draft_phase1_phase2.md`
- `implementation_status.md`

### Likely

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/auth/ShellModuleVisibilityPolicy.kt`

### Optional only if needed

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/service/SessionService.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/repository/UserShellRepository.kt`

Только если new status/seed baseline требует minimal alignment.

## 7. Recommended Change Order

1. Finalize exact `V2` migration scope from `schema_draft_phase1_phase2.md`.
2. Add missing roles and users in `V2`.
3. Add `status` hardening rule in `V2`.
4. Align backend policy only if the new seeds require it.
5. Update `implementation_status.md` to reflect that the second slice is schema/seed-oriented.

## 8. Exit Criteria For This Slice

Второй slice можно считать закрытым на artifact/implementation boundary, когда:

- `V2__phase1_identity_hardening.sql` exists;
- missing approver roles are no longer only conceptual;
- missing approver users are no longer only conceptual;
- `app_users.status` semantics are explicit in schema, not only in docs;
- Phase 1 shell identity baseline becomes more future-safe for frontend refinement;
- the slice still has not expanded into frontend work.

## 9. What Becomes Easier After This Slice

После этого slice проще и чище делать:

- `frontend shell/session refinement` as the third slice;
- clearer shell rendering for approver-like roles;
- stricter current-user handling around inactive users;
- later Phase 3 approval actor flows.

## 10. Deferred To The Third Slice

Сознательно откладывается:

```text
frontend shell/session refinement
```

Это будет отдельный следующий slice, а не хвост текущего.
