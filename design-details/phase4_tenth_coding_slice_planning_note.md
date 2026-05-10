# Phase 4 Tenth Coding Slice Planning Note

## Slice

```text
custom field value capture/rendering
```

## Goal

Make published opportunity custom fields usable in the CRM workspace by accepting values on create/update, storing them in `metadata_custom_field_values`, returning them in opportunity detail, rendering them in the frontend, and enforcing custom required-field rules during stage validation.

## Files

- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataRuntimeService.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityDtos.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityRepository.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityService.kt`
- update `codebase/frontend/src/types/crm.ts`
- update `codebase/frontend/src/features/crm/CrmReadWorkspace.tsx`
- update `codebase/frontend/src/features/crm/CrmCreatePanel.tsx`
- update `codebase/frontend/src/features/crm/OpportunityDetail.tsx`
- update project status docs after verification

## In Scope

- expose active published field definitions in metadata runtime snapshot
- accept `customFields` on opportunity create and update
- normalize custom values by published metadata field type
- store values in typed `metadata_custom_field_values` columns
- return `customFields` in opportunity detail
- validate custom required fields on create and move-stage
- render published custom fields in opportunity create and detail/edit UI

## Out of Scope

- custom fields in opportunity list rows and filters
- frontend metadata admin edit UI
- versioned migration/rollback UI for published metadata configs
- replacing backend `opportunity_stages` query joins

## Acceptance

- backend `compileKotlin` passes in the container
- frontend `npm run build` passes in the container
- backend restarts and `/readyz` returns ready
- published metadata has an active opportunity custom field
- API smoke confirms missing required custom field returns `422`
- API smoke confirms create stores custom field value and detail returns it
- API smoke confirms move-stage is blocked until the custom value is patched
- browser smoke confirms the CRM create/detail UI renders the custom field and creates an opportunity without an error box
