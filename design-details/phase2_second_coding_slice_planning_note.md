# Phase 2 Second Coding Slice Planning Note

Этот документ фиксирует второй узкий coding slice внутри `Phase 2`.

Он нужен, чтобы после принятия account baseline
не расползтись сразу в opportunities, activities и frontend CRM.

## 1. Decision

Второй coding slice внутри `Phase 2`:

```text
backend contact baseline
```

Это означает:

- использовать уже существующую `contacts` table из `V3`;
- добавить только самый узкий usable backend path:
  `GET /api/contacts` и `POST /api/contacts`;
- не смешивать этот шаг с `opportunities`, `activities`, team scope или frontend CRM screens.

## 2. Why This Slice Is Next

Этот slice выбран следующим, потому что:

- первый `Phase 2` slice уже доказал schema foundation and account baseline;
- `contacts` зависят от `accounts`, а значит sequencing уже корректный;
- `opportunities` зависят и от `accounts`, и от `contacts`;
- если сейчас перескочить сразу в opportunity aggregate,
  то validation and access boundary начнут строиться поверх ещё не закрытого contact path.

## 3. Exact Scope

В этот второй slice входят:

1. Зафиксировать отдельный planning note для contact baseline.
2. Реализовать backend contact baseline:
   - `GET /api/contacts`
   - `POST /api/contacts`
3. Реиспользовать существующий current-user / tenant context.
4. Реиспользовать уже существующую `accounts` visibility boundary
   для привязки контакта к account scope.
5. Проверять tenant consistency через linked account,
   а не через client-trusted tenant fields.

## 4. Explicitly In Scope

Должны появиться или быть добавлены:

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/ContactController.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/contact/ContactDtos.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/contact/ContactService.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/contact/ContactRepository.kt`

Допустимо тронуть:

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/account/AccountRepository.kt`

Но только как lookup helper для visible account resolution,
а не как повод расширять account slice.

## 5. Explicitly Out Of Scope

В этот slice не входят:

- новые migrations;
- contact update/delete;
- manager team visibility;
- opportunity endpoints;
- activity endpoints;
- approval-linked contact context;
- frontend CRM work.

Особенно важно:

- не превращать contact baseline в mixed account/contact/opportunity burst;
- не тащить сюда reassign-owner behavior;
- не подменять later deep runtime verification локальным optimism.

## 6. Recommended Change Order

1. Add this planning note.
2. Add contact DTOs.
3. Add contact repository.
4. Add contact service.
5. Add contact controller.
6. Add the smallest needed account visibility lookup helper.
7. Update status artifacts without claiming deep runtime proof.

## 7. Exit Criteria For This Slice

Второй slice можно считать закрытым на implementation boundary, когда:

- `GET /api/contacts` exists;
- `POST /api/contacts` exists;
- create contact path validates linked account visibility and tenant consistency;
- approver roles are denied from general contact browse/create;
- no opportunity or activity API leaked into the same pass.

## 8. What Becomes Easier After This Slice

После этого slice проще и чище делать:

- opportunity aggregate baseline;
- opportunity create flow with `primary_contact_id`;
- later CRM frontend screens against stable contact API contracts.

## 9. Next Step After This Note

После этого planning note следующим логичным шагом становится:

```text
implement backend contact baseline
```
