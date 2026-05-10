# V3 Phase 2 CRM Core Spec

Этот документ фиксирует точную спецификацию
для `V3__phase2_crm_core.sql`.

Он нужен, чтобы первый `Phase 2` coding slice
реализовывался не "по памяти из file plan",
а по отдельному migration contract.

## 1. Goal

`V3__phase2_crm_core.sql` должен:

- ввести relational foundation для `Phase 2` core CRM loop;
- добавить bootstrap tenant stage seeds;
- подготовить schema baseline для account/contact/opportunity/activity implementation;
- не утащить в migration ничего из `Phase 3+`.

## 2. Source Baseline

Current migration baseline is:

- `db/migration/V1__bootstrap_shell.sql`
- `db/migration/V2__phase1_identity_hardening.sql`

Current schema already contains:

- `tenants`
- `roles`
- `app_users`
- `user_role_assignments`
- Phase 1 role hardening and approver seeds

`V3` должен быть additive поверх этого baseline.

## 3. Exact Scope For V3

`V3` should contain only these categories of change:

1. `accounts`
2. `contacts`
3. `opportunity_stages`
4. `opportunities`
5. `activities`
6. initial tenant stage seeds

## 4. Required DDL Changes

### 4.1 `accounts`

Table must include:

- `id`
- `tenant_id`
- `name`
- `website`
- `owner_user_id`
- `created_at`
- `updated_at`
- `created_by_user_id`
- `updated_by_user_id`

Must include:

- PK on `id`
- FK to `tenants(id)`
- FK to `app_users(id)` for owner and audit columns
- index on `(tenant_id, owner_user_id)`

Must not include:

- uniqueness on business `name`

### 4.2 `contacts`

Table must include:

- `id`
- `tenant_id`
- `account_id`
- `full_name`
- `email`
- `phone`
- `owner_user_id`
- `created_at`
- `updated_at`
- `created_by_user_id`
- `updated_by_user_id`

Must include:

- PK on `id`
- FK to `tenants(id)`
- FK to `accounts(id)`
- FK to `app_users(id)` for owner and audit columns
- index on `(tenant_id, account_id)`
- index on `(tenant_id, owner_user_id)`

Must not include:

- global or tenant-level uniqueness on `email`

### 4.3 `opportunity_stages`

Table must include:

- `id`
- `tenant_id`
- `stage_key`
- `display_name`
- `sort_order`
- `is_closed`
- `created_at`

Must include:

- PK on `id`
- FK to `tenants(id)`
- unique on `(tenant_id, stage_key)`
- unique on `(tenant_id, sort_order)`

### 4.4 `opportunities`

Table must include:

- `id`
- `tenant_id`
- `account_id`
- `primary_contact_id`
- `title`
- `owner_user_id`
- `stage_id`
- `expected_amount`
- `close_date`
- `global_status`
- `approval_state`
- `created_at`
- `updated_at`
- `created_by_user_id`
- `updated_by_user_id`

Must include:

- PK on `id`
- FK to `tenants(id)`
- FK to `accounts(id)`
- FK to `contacts(id)` for `primary_contact_id`
- FK to `app_users(id)` for owner and audit columns
- FK to `opportunity_stages(id)`
- index on `(tenant_id, owner_user_id)`
- index on `(tenant_id, stage_id)`
- index on `(tenant_id, account_id)`
- index on `(tenant_id, close_date)`

Recommended checks:

- `global_status` in
  `active`, `pending_approval`, `approved_to_progress`, `blocked_by_rejection`, `closed_won`, `closed_lost`
- `approval_state` in
  `none`, `pending`, `approved`, `rejected`

### 4.5 `activities`

Table must include:

- `id`
- `tenant_id`
- `opportunity_id`
- `type`
- `title`
- `status`
- `due_date`
- `owner_user_id`
- `created_at`
- `updated_at`
- `created_by_user_id`
- `updated_by_user_id`

Must include:

- PK on `id`
- FK to `tenants(id)`
- FK to `opportunities(id)`
- FK to `app_users(id)` for owner and audit columns
- index on `(tenant_id, opportunity_id)`
- index on `(tenant_id, owner_user_id, status)`

Recommended checks:

- `status` in `open`, `completed`

## 5. Required Seed Changes

### 5.1 Bootstrap tenant stage seeds

`V3` must seed initial `opportunity_stages` rows for `tenant_orion`.

At minimum the seed baseline must include stage keys already referenced by existing project artifacts:

- `qualification`
- `negotiation`
- `pending_approval`

These rows must remain aligned with:

- `api_contracts_phase1_phase2.md`
- `prototypes/04_admin_process_config.html`

Recommended baseline shape:

- stable text ids
- tenant-scoped rows under `tenant_orion`
- explicit `sort_order`
- `is_closed = false` for the initial three baseline stages

If terminal closed stages are added in `V3`,
that must be an explicit follow-on decision,
not an accidental migration side effect.

## 6. Exact SQL Behavior Expectations

`V3` should be written so that:

- it is a separate new migration after `V2`;
- it does not rewrite `V1` or `V2`;
- it remains readable as a `Phase 2` core schema migration;
- it does not mix schema with API or frontend concerns;
- it does not try to solve later metadata-driven configuration already now.

## 7. Naming Rules

Table naming must stay exactly aligned with existing planning artifacts:

- `accounts`
- `contacts`
- `opportunity_stages`
- `opportunities`
- `activities`

Stage key naming must stay aligned with existing artifacts:

- `qualification`
- `negotiation`
- `pending_approval`

Column naming should remain audit-friendly and explicit:

- `owner_user_id`
- `created_by_user_id`
- `updated_by_user_id`

## 8. Explicitly Out Of Scope

`V3` must not include:

- `approval_requests`
- `approval_steps`
- `approval_decisions`
- metadata tables
- saved views
- import tables
- duplicate tables
- reporting projections
- audit event tables
- user profile redesign
- real auth/provider changes

Also out of scope:

- frontend changes
- controller/service implementation
- runtime verification

## 9. Expected Result After V3 Exists

После появления `V3` должно быть правдиво следующее:

- `Phase 2` code can build on explicit CRM tables;
- account baseline can be implemented without inventing fake storage;
- opportunity stage references in API contracts stop being conceptual only;
- migration sequencing from `Phase 1` into `Phase 2` becomes explicit.

## 10. Follow-On Constraint

После этого spec следующим артефактом должен стать:

```text
v3_phase2_crm_core_acceptance_checklist.md
```

Это нужно, чтобы implementation later не спорила о том,
что именно входило в `V3`
и где заканчивается `Phase 2` first-slice scope.
