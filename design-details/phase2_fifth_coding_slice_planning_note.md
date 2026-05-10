# Phase 2 Fifth Coding Slice Planning Note

Этот документ фиксирует пятый узкий coding slice внутри `Phase 2`.

Он нужен, чтобы после принятия activity baseline
не смешать lifecycle command с generic update flows или frontend CRM.

## 1. Decision

Пятый coding slice внутри `Phase 2`:

```text
backend opportunity move-stage command
```

Это означает:

- добавить только `POST /api/opportunities/{opportunityId}/move-stage`;
- централизовать rules inside `StageTransitionPolicy`;
- не добавлять `PATCH /api/opportunities/{id}` и `reassign-owner` в тот же pass.

## 2. Why This Slice Is Next

Этот slice выбран следующим, потому что:

- account/contact/opportunity/activity baseline уже дают usable CRM record loop;
- move-stage это high-risk lifecycle command, который должен жить отдельно;
- `StageTransitionPolicy` уже зафиксирован ADR и больше не должен оставаться чисто бумажным.

## 3. Exact Scope

В этот пятый slice входят:

1. Зафиксировать отдельный planning note для move-stage command.
2. Реализовать `POST /api/opportunities/{opportunityId}/move-stage`.
3. Добавить `StageTransitionPolicy`.
4. Валидировать target stage, closed-state protection and unsupported approval-gated transition path.
5. Обновлять `stage_id`, `global_status`, `updated_at`, `updated_by_user_id`.

## 4. Explicitly In Scope

Должны появиться или быть добавлены:

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/StageTransitionPolicy.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/OpportunityController.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityDtos.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityService.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityRepository.kt`

## 5. Explicitly Out Of Scope

В этот slice не входят:

- `PATCH /api/opportunities/{id}`
- `POST /api/opportunities/{id}/reassign-owner`
- approval request lifecycle
- audit event persistence
- frontend CRM work

## 6. Recommended Change Order

1. Add this planning note.
2. Add move-stage DTOs.
3. Add `StageTransitionPolicy`.
4. Add repository update path.
5. Wire service and controller.
6. Update status artifacts without claiming deep runtime proof.

## 7. Exit Criteria For This Slice

Пятый slice можно считать закрытым на implementation boundary, когда:

- `POST /api/opportunities/{id}/move-stage` exists;
- stage transition goes through centralized policy;
- closed-state protection is enforced;
- unsupported approval-gated transition path fails explicitly;
- no generic opportunity patch API leaked into the same pass.

## 8. What Becomes Easier After This Slice

После этого slice проще и чище делать:

- explicit opportunity patch/update slice;
- later approval gate integration on top of a real command boundary;
- frontend opportunity detail actions against stable backend contract.

## 9. Next Step After This Note

После этого planning note следующим логичным шагом становится:

```text
implement backend move-stage command
```
