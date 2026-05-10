# Phase 2 Tenth Coding Slice Planning Note

Этот документ фиксирует десятый узкий coding slice внутри `Phase 2`.

Он нужен, чтобы после frontend CRM read shell
добавить минимальный create loop without mixing in edit actions,
stage movement, owner reassignment or approvals.

## 1. Decision

Десятый coding slice внутри `Phase 2`:

```text
frontend CRM create forms
```

Это означает:

- добавить create forms for accounts, contacts and opportunities;
- use existing backend create endpoints only;
- refresh read lists after successful create;
- keep opportunity action controls out of this pass.

## 2. Why This Slice Is Next

Этот slice выбран следующим, потому что:

- frontend read shell already consumes backend CRM read contracts;
- backend create paths already have narrow runtime proof;
- a sales rep needs to create the basic CRM loop from UI before lifecycle action controls matter;
- mixing create forms with edit/stage/reassign controls would make this slice too broad.

## 3. Exact Scope

В этот десятый slice входят:

1. Зафиксировать отдельный planning note для frontend CRM create forms.
2. Add typed create request/response contracts for:
   - account create
   - contact create
   - opportunity create
3. Add API clients for create paths.
4. Add UI forms:
   - account create
   - contact create linked to selected account
   - opportunity create linked to selected account and optional contact
5. Refresh read lists after successful create.

## 4. Explicitly In Scope

Должны появиться или быть изменены:

- `codebase/frontend/src/types/crm.ts`
- `codebase/frontend/src/api/accounts.ts`
- `codebase/frontend/src/api/contacts.ts`
- `codebase/frontend/src/api/opportunities.ts`
- `codebase/frontend/src/features/crm/CrmCreatePanel.tsx`
- `codebase/frontend/src/features/crm/AccountList.tsx`
- `codebase/frontend/src/features/crm/CrmReadWorkspace.tsx`
- `codebase/frontend/src/styles.css`

## 5. Explicitly Out Of Scope

В этот slice не входят:

- frontend patch/edit controls
- frontend move-stage controls
- frontend reassign-owner controls
- activity create UI
- approvals UI
- saved views
- dashboards

## 6. Recommended Change Order

1. Add this planning note.
2. Add CRM create types.
3. Add create API clients.
4. Add create panel forms.
5. Wire selected account/contact/opportunity refresh behavior.
6. Run frontend build and narrow dev/API smoke.
7. Update status artifacts without claiming full Phase 2 verification.

## 7. Exit Criteria For This Slice

Десятый slice можно считать закрытым на implementation boundary, когда:

- frontend build passes;
- account create form calls backend and refreshes account list;
- contact create form uses selected account and refreshes contact options;
- opportunity create form uses selected account/contact and refreshes opportunity list/detail;
- no opportunity action controls leak into this pass.
