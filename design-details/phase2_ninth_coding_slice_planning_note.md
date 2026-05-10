# Phase 2 Ninth Coding Slice Planning Note

Этот документ фиксирует девятый узкий coding slice внутри `Phase 2`.

Он нужен, чтобы после стабилизации backend CRM APIs
начать frontend CRM surface с read-only workspace,
не смешивая его с create/edit forms, stage actions or approvals.

## 1. Decision

Девятый coding slice внутри `Phase 2`:

```text
frontend CRM read shell
```

Это означает:

- добавить typed frontend CRM contracts;
- добавить API clients for read paths;
- добавить account list, opportunity list and opportunity detail read-only UI;
- встроить CRM read shell into authenticated workspace.

## 2. Why This Slice Is Next

Этот slice выбран следующим, потому что:

- backend core CRM records уже имеют narrow runtime proof;
- backend opportunity commands уже имеют narrow runtime proof;
- manager/team opportunity scope уже имеет narrow runtime proof;
- frontend should now consume stable read contracts before adding mutation controls.

## 3. Exact Scope

В этот девятый slice входят:

1. Зафиксировать отдельный planning note для frontend CRM read shell.
2. Добавить `frontend/src/types/crm.ts`.
3. Добавить read API clients:
   - `frontend/src/api/accounts.ts`
   - `frontend/src/api/opportunities.ts`
4. Добавить read-only CRM components:
   - account list
   - opportunity list
   - opportunity detail
5. Встроить read shell в authenticated workspace.

## 4. Explicitly In Scope

Должны появиться или быть изменены:

- `codebase/frontend/src/types/crm.ts`
- `codebase/frontend/src/api/accounts.ts`
- `codebase/frontend/src/api/opportunities.ts`
- `codebase/frontend/src/features/crm/CrmReadWorkspace.tsx`
- `codebase/frontend/src/features/crm/AccountList.tsx`
- `codebase/frontend/src/features/crm/OpportunityList.tsx`
- `codebase/frontend/src/features/crm/OpportunityDetail.tsx`
- `codebase/frontend/src/features/shell/WorkspaceShell.tsx`
- `codebase/frontend/src/App.tsx`
- `codebase/frontend/src/styles.css`

## 5. Explicitly Out Of Scope

В этот slice не входят:

- frontend create forms
- frontend patch/edit controls
- frontend move-stage control
- frontend reassign-owner control
- activity create UI
- approval UI
- frontend saved views
- dashboards

## 6. Recommended Change Order

1. Add this planning note.
2. Add frontend CRM types.
3. Export/reuse frontend request transport.
4. Add account/opportunity read API clients.
5. Add read-only CRM components.
6. Wire authenticated workspace.
7. Run frontend build and smoke current dev server.
8. Update status artifacts without claiming full Phase 2 verification.

## 7. Exit Criteria For This Slice

Девятый slice можно считать закрытым на implementation boundary, когда:

- authenticated frontend renders CRM read workspace;
- account list loads from backend;
- opportunity list loads from backend under current user scope;
- selecting an opportunity loads read-only detail;
- frontend build passes;
- no mutation controls leak into this pass.

## 8. What Becomes Easier After This Slice

После этого slice проще и чище делать:

- frontend create forms;
- frontend opportunity actions;
- frontend activity section;
- broader Phase 2 runtime walkthrough.
