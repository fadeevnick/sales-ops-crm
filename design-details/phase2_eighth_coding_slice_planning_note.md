# Phase 2 Eighth Coding Slice Planning Note

Этот документ фиксирует восьмой узкий coding slice внутри `Phase 2`.

Он нужен, чтобы после принятия core opportunity commands
добавить минимальный manager/team opportunity scope без frontend CRM,
sharing model, org chart или новой schema.

## 1. Decision

Восьмой coding slice внутри `Phase 2`:

```text
backend manager/team opportunity scope baseline
```

Это означает:

- добавить minimal `TeamScopePolicy`;
- применить team scope только к opportunity read/action paths;
- не расширять accounts/contacts, saved views, sharing model or frontend CRM in the same pass.

## 2. Why This Slice Is Next

Этот slice выбран следующим, потому что:

- account/contact/opportunity/activity backend baseline уже имеет narrow runtime proof;
- opportunity lifecycle/update/reassign command boundaries уже существуют;
- Phase 2 requires manager team pipeline visibility;
- frontend CRM should not be built before rep vs manager backend scope is stable.

## 3. Exact Scope

В этот восьмой slice входят:

1. Зафиксировать отдельный planning note для manager/team opportunity scope.
2. Добавить `TeamScopePolicy.kt`.
3. Для current seed baseline считать `user_anna` team member of `user_michael`.
4. Применить opportunity owner scope к:
   - `GET /api/opportunities`
   - `GET /api/opportunities/{id}`
   - `PATCH /api/opportunities/{id}`
   - `POST /api/opportunities/{id}/move-stage`
   - `POST /api/opportunities/{id}/reassign-owner`
   - activity list/create visibility through opportunity lookup
5. Сохранить RevOps all-tenant scope.

## 4. Explicitly In Scope

Должны появиться или быть изменены:

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/TeamScopePolicy.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityService.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityRepository.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/activity/ActivityService.kt`

## 5. Explicitly Out Of Scope

В этот slice не входят:

- new migration for manager/team relationships
- team scope for accounts and contacts
- sharing model
- saved views
- org chart management
- dashboards
- frontend CRM work

## 6. Recommended Change Order

1. Add this planning note.
2. Add `TeamScopePolicy`.
3. Replace opportunity owner visibility from single-user scope to policy-resolved owner scope.
4. Apply the same scope to activity visibility through opportunity lookup.
5. Run narrow backend sanity check.
6. Update status artifacts without claiming full Phase 2 verification.

## 7. Exit Criteria For This Slice

Восьмой slice можно считать закрытым на implementation boundary, когда:

- Sales Rep still sees own opportunities only;
- Sales Manager can see and act on current seed team opportunity records;
- RevOps still sees all tenant opportunities;
- approver roles remain denied from general opportunity browse/actions;
- no schema, frontend or saved-view work leaks into this pass.

## 8. What Becomes Easier After This Slice

После этого slice проще и чище делать:

- frontend opportunity list/detail screens;
- manager pipeline UI;
- later proper team relationship schema without rewriting opportunity access call sites.
