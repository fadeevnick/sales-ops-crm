# Phase 2 Twelfth Coding Slice Planning Note

Этот документ фиксирует двенадцатый узкий coding slice внутри `Phase 2`.

Он нужен, чтобы после frontend opportunity action controls
закрыть frontend activity loop inside opportunity detail
без approvals, audit timeline expansion or activity edit lifecycle.

## 1. Decision

Двенадцатый coding slice внутри `Phase 2`:

```text
frontend activity section on opportunity detail
```

Это означает:

- add activity list on opportunity detail;
- add minimal activity create form;
- use existing backend activity endpoints only.

## 2. Exact Scope

В этот slice входят:

1. Add frontend activity contracts/API clients for:
   - `GET /api/opportunities/{id}/activities`
   - `POST /api/opportunities/{id}/activities`
2. Render activity list inside opportunity detail.
3. Add minimal activity create form:
   - `type`
   - `title`
   - `dueDate`
4. Refresh activity list after create.

## 3. Explicitly Out Of Scope

В этот slice не входят:

- activity edit
- activity complete action
- activity delete
- approval UI
- audit timeline expansion
- backend changes unless a concrete contract gap appears

## 4. Exit Criteria

Slice можно считать закрытым, когда:

- frontend build passes;
- backend activity list/create API smoke passes;
- frontend dev server still responds;
- no approvals or activity lifecycle controls leak into this pass.
