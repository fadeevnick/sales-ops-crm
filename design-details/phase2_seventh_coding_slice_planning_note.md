# Phase 2 Seventh Coding Slice Planning Note

Этот документ фиксирует седьмой узкий coding slice внутри `Phase 2`.

Он нужен, чтобы после принятия opportunity patch/update baseline
не смешать owner reassignment с generic patch, team scope expansion,
approval workflow или frontend CRM.

## 1. Decision

Седьмой coding slice внутри `Phase 2`:

```text
backend opportunity reassign-owner command
```

Это означает:

- добавить только `POST /api/opportunities/{opportunityId}/reassign-owner`;
- менять owner only through explicit command;
- не добавлять manager team scope или frontend CRM в тот же pass.

## 2. Why This Slice Is Next

Этот slice выбран следующим, потому что:

- `PATCH /api/opportunities/{id}` уже ограничен простыми mutable fields;
- `move-stage` уже живёт как отдельная command boundary;
- owner reassignment is a business action, not a generic field update;
- frontend CRM screens should depend on stable backend command contracts.

## 3. Exact Scope

В этот седьмой slice входят:

1. Зафиксировать отдельный planning note для reassign-owner command.
2. Реализовать `POST /api/opportunities/{opportunityId}/reassign-owner`.
3. Валидировать target owner existence and tenant consistency.
4. Обновлять `owner_user_id`, `updated_at`, and `updated_by_user_id`.
5. Проверять opportunity through existing visible scope.

## 4. Explicitly In Scope

Должны появиться или быть изменены:

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/OpportunityController.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityDtos.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityService.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityRepository.kt`

## 5. Explicitly Out Of Scope

В этот slice не входят:

- manager team scope expansion
- owner mutation through `PATCH`
- stage mutation
- approval request lifecycle
- frontend CRM work
- audit event persistence

Important boundary:

- `sales_manager` can use this command only over the opportunity visibility already available in code.
  Full team reassignment policy remains a later dedicated scope slice.

## 6. Recommended Change Order

1. Add this planning note.
2. Add reassign-owner DTOs.
3. Add repository owner update path.
4. Wire service and controller.
5. Run narrow backend sanity check.
6. Update status artifacts without claiming full Phase 2 verification.

## 7. Exit Criteria For This Slice

Седьмой slice можно считать закрытым на implementation boundary, когда:

- `POST /api/opportunities/{id}/reassign-owner` exists;
- target owner is validated as same-tenant user;
- `owner_user_id`, `updated_at`, and `updated_by_user_id` are updated;
- Sales Rep and approver roles are denied;
- no team-scope expansion or frontend CRM work leaks into this pass.

## 8. What Becomes Easier After This Slice

После этого slice проще и чище делать:

- manager/team opportunity scope;
- frontend opportunity detail owner actions;
- later approval workflow visibility around ownership.
