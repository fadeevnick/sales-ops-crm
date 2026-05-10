# Phase 2 Third Coding Slice Planning Note

Этот документ фиксирует третий узкий coding slice внутри `Phase 2`.

Он нужен, чтобы после принятия account/contact baseline
не расползтись сразу в stage transitions, activities и frontend CRM.

## 1. Decision

Третий coding slice внутри `Phase 2`:

```text
backend opportunity baseline
```

Это означает:

- использовать уже существующие `accounts`, `contacts`, `opportunity_stages`, `opportunities` tables из `V3`;
- добавить только самый узкий usable backend path:
  `GET /api/opportunities`, `POST /api/opportunities`, `GET /api/opportunities/{id}`;
- не смешивать этот шаг с generic update, move-stage command, activities или frontend CRM screens.

## 2. Why This Slice Is Next

Этот slice выбран следующим, потому что:

- `opportunities` зависят от `accounts`, `contacts` и `opportunity_stages`;
- account baseline и contact baseline уже имеют narrow runtime proof;
- opportunity aggregate уже даёт реальный CRM loop, но ещё без lifecycle mutation complexity;
- если сейчас перескочить сразу в `move-stage`,
  то transition discipline начнёт строиться поверх ещё не закрытого create/detail path.

## 3. Exact Scope

В этот третий slice входят:

1. Зафиксировать отдельный planning note для opportunity baseline.
2. Реализовать backend opportunity baseline:
   - `GET /api/opportunities`
   - `POST /api/opportunities`
   - `GET /api/opportunities/{opportunityId}`
3. Реиспользовать существующий current-user / tenant context.
4. Валидировать linked account, optional primary contact and stage key on the server side.
5. Оставить lifecycle mutation отдельным следующим slice.

## 4. Explicitly In Scope

Должны появиться или быть добавлены:

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/OpportunityController.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityDtos.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityService.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityRepository.kt`

Допустимо тронуть:

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/account/AccountRepository.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/contact/ContactRepository.kt`

Но только для narrow lookup helpers.

## 5. Explicitly Out Of Scope

В этот slice не входят:

- `PATCH /api/opportunities/{id}`
- `POST /api/opportunities/{id}/move-stage`
- `POST /api/opportunities/{id}/activities`
- team scope expansion
- approval gate behavior
- frontend CRM work

Особенно важно:

- не превращать opportunity baseline в full lifecycle slice;
- не тащить сюда StageTransitionPolicy как пустышку без command path;
- не смешивать этот шаг с activities.

## 6. Recommended Change Order

1. Add this planning note.
2. Add opportunity DTOs.
3. Add repository helpers for stage/contact validation if needed.
4. Add opportunity repository.
5. Add opportunity service.
6. Add opportunity controller.
7. Update status artifacts without claiming deep runtime proof.

## 7. Exit Criteria For This Slice

Третий slice можно считать закрытым на implementation boundary, когда:

- `GET /api/opportunities` exists;
- `POST /api/opportunities` exists;
- `GET /api/opportunities/{id}` exists;
- create opportunity validates linked account/contact/stage server-side;
- approver roles are denied from general opportunity browse/create/detail;
- no stage-move or activity API leaked into the same pass.

## 8. What Becomes Easier After This Slice

После этого slice проще и чище делать:

- dedicated move-stage command slice;
- activity baseline on top of real opportunity records;
- later frontend opportunity list/detail screens against stable backend contracts.

## 9. Next Step After This Note

После этого planning note следующим логичным шагом становится:

```text
implement backend opportunity baseline
```
