# Phase 5 Second Coding Slice Planning Note

## Slice

```text
saved view update/delete and shared manager/admin baseline
```

## Goal

Turn saved views from a create-only baseline into a manageable workspace feature and start the shared-view boundary needed for manager and RevOps workflows.

## Files

- update backend saved-view migration with additive columns if needed
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/savedview/SavedViewDtos.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/savedview/SavedViewRepository.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/savedview/SavedViewService.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/SavedViewController.kt`
- update frontend saved-view API/types
- update opportunity workspace saved-view UI
- update project status docs after verification

## In Scope

- rename/update an existing user-owned saved view
- update saved-view filters from current opportunity workspace filters
- delete a user-owned saved view
- add a narrow shared-view visibility model for manager/admin-owned views
- list user-owned views and visible shared views in the opportunity workspace
- preserve current access-aware opportunity list execution when a shared view is applied
- keep metadata validation on create/update/list

## Out of Scope

- role/permission matrix UI
- arbitrary record sharing
- field-level security
- dashboards and reports
- import/export saved view reuse
- full custom-field filter SQL execution if it needs a larger query layer change
- schema cleanup for the legacy `opportunities.stage_id` persistence bridge

## Acceptance

- backend migration/update applies on the current compose stack if schema changes are needed
- backend `gradle compileKotlin --no-daemon` passes in the container
- frontend `npm run build` passes in the container
- Sales Rep can update and delete their own saved view
- Sales Rep cannot update/delete another user's saved view
- Manager can see a shared manager/admin view but still only receives manager-visible opportunity records when applying it
- RevOps Admin can create a shared view without giving Sales Rep tenant-wide record access
- invalid metadata references remain visible as invalid saved views instead of executing silently
