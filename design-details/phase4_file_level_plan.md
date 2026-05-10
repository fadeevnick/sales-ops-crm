# Phase 4 File-Level Plan

## Phase

```text
Metadata-driven process configuration
```

## Goal

Add tenant-level configurability for core CRM entities without replacing the fixed CRM domain model.

## Guardrails

- Follow `adr-001-metadata-storage-boundary.md`.
- Support only Account, Contact and Opportunity metadata in MVP.
- Keep Activity and ApprovalRequest custom fields out of scope.
- Keep custom objects, formula fields, workflow DSL and page-layout builder out of scope.
- Runtime must eventually read only published metadata, not draft edits.

## Planned Backend Files

- `backend/src/main/resources/db/migration/V5__phase4_metadata_core.sql`
- `backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataDtos.kt`
- `backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataRepository.kt`
- `backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataValidationPolicy.kt`
- `backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataService.kt`
- `backend/src/main/kotlin/com/salesops/bootstrap/api/MetadataController.kt`

## Planned Frontend Files

- `frontend/src/types/metadata.ts`
- `frontend/src/api/metadata.ts`
- `frontend/src/features/metadata/MetadataAdminWorkspace.tsx`
- focused updates to CRM create/detail forms once published metadata can be read safely

## Slice Order

1. Backend metadata schema foundation.
2. Backend metadata DTO/repository read baseline.
3. Backend draft/publish validation service.
4. Backend metadata admin endpoints.
5. Frontend metadata admin read/create draft UI.
6. Runtime published metadata read path.
7. Metadata-aware CRM forms/detail display.
8. Metadata-aware stage validation.

## First Slice Acceptance

- V5 migration applies on the running compose stack.
- Seeded tenant gets a current published metadata config version.
- Seeded metadata stages mirror the existing baseline opportunity stages.
- No Phase 2/3 CRM or approval runtime behavior changes yet.
