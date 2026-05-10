# V3 Phase 2 CRM Core Acceptance Checklist

Этот документ фиксирует,
по каким признакам `V3__phase2_crm_core.sql`
нужно считать реализованной корректно.

Он не заменяет spec.

Связанные документы:

- `phase2_first_coding_slice_planning_note.md`
- `v3_phase2_crm_core_spec.md`
- `schema_draft_phase1_phase2.md`

## 1. Purpose

Checklist нужен, чтобы:

- не спорить после реализации, что именно входило в `V3`;
- не допустить scope drift inside the first `Phase 2` slice;
- отделить `migration exists` от `migration is acceptable by design`.

## 2. Migration Shape Checklist

`V3__phase2_crm_core.sql` считается приемлемой только если:

- это отдельная новая migration после `V2`;
- она не переписывает `V1` или `V2`;
- она остаётся `Phase 2` core migration, а не catch-all platform file;
- в ней нет approval tables;
- в ней нет metadata tables;
- в ней нет import/export/reporting tables;
- в ней нет frontend-driven assumptions.

## 3. Required Table Checklist

Проверить наличие:

- `accounts`
- `contacts`
- `opportunity_stages`
- `opportunities`
- `activities`

И проверить, что:

- все они tenant-aware;
- все business tables имеют audit-friendly created/updated columns;
- relationships между tables выражены через реальные FK, а не через loose text references only.

## 4. Required Constraint and Index Checklist

### 4.1 Accounts

Проверить:

- FK `tenant_id -> tenants(id)` exists;
- FK `owner_user_id -> app_users(id)` exists;
- index on `(tenant_id, owner_user_id)` exists;
- no uniqueness on account `name`.

### 4.2 Contacts

Проверить:

- FK `account_id -> accounts(id)` exists;
- index on `(tenant_id, account_id)` exists;
- index on `(tenant_id, owner_user_id)` exists;
- `email` is not over-constrained as unique.

### 4.3 Opportunity stages

Проверить:

- unique tenant stage key constraint exists;
- unique tenant sort order constraint exists;
- `is_closed` exists as explicit field.

### 4.4 Opportunities

Проверить:

- FK to `accounts(id)` exists;
- FK to `contacts(id)` for `primary_contact_id` exists;
- FK to `opportunity_stages(id)` exists;
- index on `(tenant_id, owner_user_id)` exists;
- index on `(tenant_id, stage_id)` exists;
- index on `(tenant_id, account_id)` exists;
- `global_status` and `approval_state` are no longer only conceptual in schema semantics.

### 4.5 Activities

Проверить:

- FK to `opportunities(id)` exists;
- index on `(tenant_id, opportunity_id)` exists;
- index on `(tenant_id, owner_user_id, status)` exists;
- `status` semantics are explicit rather than free-form.

## 5. Required Seed Checklist

### 5.1 Bootstrap tenant stage seeds

Проверить наличие stage seed rows for `tenant_orion`.

At minimum must exist:

- `qualification`
- `negotiation`
- `pending_approval`

И проверить, что:

- `stage_key` naming aligned with existing API contracts and prototypes;
- `sort_order` is explicit and stable;
- these baseline rows are not accidentally marked as closed;
- seed ids and naming remain business-readable and stable.

## 6. Scope Protection Checklist

Проверить, что `V3` **не делает** следующее:

- не добавляет approval lifecycle tables;
- не добавляет metadata publishing/config tables;
- не добавляет saved views;
- не добавляет import jobs;
- не добавляет duplicate/merge tables;
- не добавляет reporting projections;
- не начинает audit-event model beyond audit-friendly columns;
- не превращает migration в full `Phase 2` implementation on its own.

Если что-то из этого появляется,
`V3` уже вышла за пределы first `Phase 2` slice.

## 7. First-Slice Alignment Checklist

Даже если `V3` реализована,
она считается корректной только если одновременно остаётся правдой:

- migration still supports the chosen first slice:
  `V3 crm core migration + backend account baseline`;
- migration does not force frontend CRM work in the same slice;
- migration does not silently drag in contact/opportunity/activity controllers;
- first slice can still stay narrower than full Phase 2 implementation.

## 8. Artifact-Mode Checklist

Даже после реализации `V3` не считать автоматически закрытым:

- account backend baseline;
- contacts baseline;
- opportunity lifecycle baseline;
- activity baseline;
- full `Phase 2`;
- deep clean runtime verification.

Это важно, чтобы не перепутать:

- `V3 accepted`
и
- `Phase 2 done`

## 9. Acceptance Statement

`V3__phase2_crm_core.sql` считается принятой по design discipline только если одновременно верны все условия:

- spec выполнен;
- acceptance checklist выполнен;
- migration осталась в границах first `Phase 2` slice;
- account baseline still remains a separate implementation step on top of `V3`.
