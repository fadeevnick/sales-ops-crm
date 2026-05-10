# Phase 4 Thirteenth Coding Slice Planning Note

## Slice

```text
replace opportunity read joins with published metadata stage runtime
```

## Goal

Stop opportunity list/detail/approval read queries from joining `opportunity_stages` for stage labels/keys. Keep the legacy stage table only as a persistence bridge for `opportunities.stage_id` until a later schema migration can remove that column boundary.

## Files

- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityRepository.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityService.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityApprovalBridge.kt`
- update project status docs after verification

## In Scope

- return `stage_id` from opportunity list/detail/approval repository reads instead of joining `opportunity_stages`
- add a narrow legacy stage-id to stage-key bridge lookup
- resolve response/approval stage keys against the currently published metadata snapshot
- validate stage filters against published metadata before querying
- keep create/move-stage writes using legacy `stage_id` as the current persistence bridge

## Out of Scope

- database migration
- removing `opportunities.stage_id`
- removing `opportunity_stages`
- changing frontend contracts
- custom field list/filter support
- metadata config diff UI

## Acceptance

- backend `gradle compileKotlin --no-daemon` passes in the container
- opportunity list/detail no longer join `opportunity_stages`
- approval context read no longer joins `opportunity_stages`
- opportunity stage filter still works for published stage keys
- invalid/unpublished stage filters are rejected before query execution
- create and move-stage still work through the existing persistence bridge
