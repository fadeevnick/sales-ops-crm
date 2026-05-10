# Phase 2 Fourth Coding Slice Planning Note

Этот документ фиксирует четвёртый узкий coding slice внутри `Phase 2`.

Он нужен, чтобы после принятия opportunity baseline
не расползтись сразу в move-stage command, patch/update flows и frontend CRM.

## 1. Decision

Четвёртый coding slice внутри `Phase 2`:

```text
backend activity baseline
```

Это означает:

- использовать уже существующую `activities` table из `V3`;
- добавить только самый узкий usable backend path:
  `GET /api/opportunities/{id}/activities` и `POST /api/opportunities/{id}/activities`;
- не смешивать этот шаг с stage transition command или generic opportunity patching.

## 2. Why This Slice Is Next

Этот slice выбран следующим, потому что:

- `activities` зависят от `opportunities`, а opportunity baseline уже получил narrow runtime proof;
- activity baseline проще и уже даёт более живой CRM loop;
- `move-stage` остаётся отдельным high-risk lifecycle command и не должен сливаться с activity CRUD.

## 3. Exact Scope

В этот четвёртый slice входят:

1. Зафиксировать отдельный planning note для activity baseline.
2. Реализовать backend activity baseline:
   - `GET /api/opportunities/{id}/activities`
   - `POST /api/opportunities/{id}/activities`
3. Реиспользовать opportunity visibility boundary.
4. Писать activity status server-side как baseline `open`.
5. Оставить activity completion/update отдельным следующим шагом.

## 4. Explicitly In Scope

Должны появиться или быть добавлены:

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/ActivityController.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/activity/ActivityDtos.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/activity/ActivityService.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/activity/ActivityRepository.kt`

Допустимо тронуть:

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityRepository.kt`

Но только если нужен узкий visibility helper.

## 5. Explicitly Out Of Scope

В этот slice не входят:

- activity update/delete/complete commands;
- `PATCH /api/opportunities/{id}`;
- `POST /api/opportunities/{id}/move-stage`;
- frontend CRM work.

## 6. Recommended Change Order

1. Add this planning note.
2. Add activity DTOs.
3. Add repository.
4. Add service.
5. Add controller.
6. Update status artifacts without claiming deep runtime proof.

## 7. Exit Criteria For This Slice

Четвёртый slice можно считать закрытым на implementation boundary, когда:

- `GET /api/opportunities/{id}/activities` exists;
- `POST /api/opportunities/{id}/activities` exists;
- activity create/list validates visible opportunity scope;
- approver roles are denied from general activity browse/create;
- no stage-move command leaked into the same pass.

## 8. What Becomes Easier After This Slice

После этого slice проще и чище делать:

- dedicated move-stage command slice;
- opportunity detail screen with visible timeline sections;
- later completion/update actions on top of real activity records.

## 9. Next Step After This Note

После этого planning note следующим логичным шагом становится:

```text
implement backend activity baseline
```
