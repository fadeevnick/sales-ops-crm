# Phase 2 Eleventh Coding Slice Planning Note

Этот документ фиксирует одиннадцатый узкий coding slice внутри `Phase 2`.

Он нужен, чтобы после frontend CRM create forms
добавить frontend controls for already-stable opportunity commands
без activity create UI, approvals or new backend scope.

## 1. Decision

Одиннадцатый coding slice внутри `Phase 2`:

```text
frontend opportunity action controls
```

Это означает:

- add UI controls for existing backend opportunity commands;
- refresh read state after command success;
- keep activity UI and approval UI out of this pass.

## 2. Exact Scope

В этот slice входят:

1. Add frontend contracts/API clients for:
   - `PATCH /api/opportunities/{id}`
   - `POST /api/opportunities/{id}/move-stage`
   - `POST /api/opportunities/{id}/reassign-owner`
2. Add opportunity detail controls:
   - edit title / expected amount / close date
   - move between baseline stages
   - reassign owner by user id
3. Refresh opportunity list/detail after action success.

## 3. Explicitly Out Of Scope

В этот slice не входят:

- activity create UI
- approval UI
- stage catalog UI
- user picker/autocomplete
- new backend work unless a concrete contract gap appears

## 4. Exit Criteria

Slice можно считать закрытым, когда:

- frontend build passes;
- backend command API smoke passes for patch/move/reassign;
- frontend dev server still responds;
- no activity or approval controls leak into the pass.
