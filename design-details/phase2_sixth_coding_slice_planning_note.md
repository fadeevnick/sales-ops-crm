# Phase 2 Sixth Coding Slice Planning Note

Этот документ фиксирует шестой узкий coding slice внутри `Phase 2`.

Он нужен, чтобы после принятия move-stage command
не смешать обычное редактирование opportunity с owner reassignment,
manager team scope, approval workflow или frontend CRM.

## 1. Decision

Шестой coding slice внутри `Phase 2`:

```text
backend opportunity patch/update baseline
```

Это означает:

- добавить только `PATCH /api/opportunities/{opportunityId}`;
- разрешить менять только простые mutable поля opportunity;
- не добавлять `reassign-owner`, team scope или frontend CRM в тот же pass.

## 2. Why This Slice Is Next

Этот slice выбран следующим, потому что:

- account/contact/opportunity/activity baseline уже имеют narrow runtime proof;
- move-stage уже вынесен в отдельный command endpoint;
- generic update не должен быть способом менять lifecycle stage or owner;
- frontend CRM screens лучше строить после стабилизации backend update contract.

## 3. Exact Scope

В этот шестой slice входят:

1. Зафиксировать отдельный planning note для opportunity patch/update.
2. Реализовать `PATCH /api/opportunities/{opportunityId}`.
3. Разрешить изменять только:
   - `title`
   - `expectedAmount`
   - `closeDate`
4. Обновлять `updated_at` and `updated_by_user_id`.
5. Проверять visible opportunity scope through existing access boundary.

## 4. Explicitly In Scope

Должны появиться или быть изменены:

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/OpportunityController.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityDtos.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityService.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityRepository.kt`

## 5. Explicitly Out Of Scope

В этот slice не входят:

- `POST /api/opportunities/{id}/reassign-owner`
- stage mutation through `PATCH`
- `ownerId` mutation through `PATCH`
- approval request lifecycle
- manager team scope expansion
- frontend CRM work
- audit event persistence

## 6. Recommended Change Order

1. Add this planning note.
2. Add patch DTOs.
3. Add repository update path.
4. Wire service and controller.
5. Run narrow backend sanity check.
6. Update status artifacts without claiming full Phase 2 verification.

## 7. Exit Criteria For This Slice

Шестой slice можно считать закрытым на implementation boundary, когда:

- `PATCH /api/opportunities/{id}` exists;
- it updates only `title`, `expectedAmount`, `closeDate`;
- update path writes `updated_at` and `updated_by_user_id`;
- approver roles are denied;
- stage and owner mutation remain outside this endpoint.

## 8. What Becomes Easier After This Slice

После этого slice проще и чище делать:

- explicit owner reassignment command;
- manager/team opportunity scope;
- frontend opportunity detail and edit screens against stable backend contract.
