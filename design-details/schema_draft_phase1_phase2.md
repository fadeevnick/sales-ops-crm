# Schema Draft — Phase 1 and Phase 2

Implementation-near schema draft для:

```text
Phase 1 — Tenant, auth, roles, workspace shell
Phase 2 — Core CRM records and pipeline
```

Цель документа:

- определить базовую relational model до кода;
- показать, какие таблицы и поля появляются в какой фазе;
- зафиксировать PK/FK/unique/index baseline;
- отделить Phase 1 shell identity schema от Phase 2 CRM schema;
- не тащить approval/metadata/import tables раньше времени.

Это draft schema, а не окончательная DDL.

## 1. Design Rules

Schema должна следовать таким правилам:

1. `tenant_id` is mandatory on every business table from Phase 2 onward.
2. Client never writes `tenant_id` directly.
3. Core CRM entities are relational first-class tables, not JSON blobs.
4. Business lifecycle transitions should not rely on free-form text statuses.
5. Tables for Phase 3+ must not leak into Phase 1–2 unless they are unavoidable forward-compatible placeholders.

## 2. Naming Conventions

### Table naming

- plural snake_case tables
- short, explicit names

Examples:

- `tenants`
- `app_users`
- `accounts`
- `opportunities`

### Primary keys

- text ids in MVP bootstrap are acceptable
- stable prefixed ids allowed:
  - `tenant_orion`
  - `user_anna`
  - `acc_001`
  - `opp_001`

Later migration to UUID is possible, but not required now.

### Audit columns baseline

Where relevant in Phase 2:

- `created_at`
- `updated_at`
- `created_by_user_id`
- `updated_by_user_id`

Not every table needs full audit columns immediately in Phase 1, but Phase 2 business tables should be ready for them.

## 3. Phase 1 Schema

Phase 1 covers:

- tenant shell
- users
- roles
- role assignments
- optional identity hardening for future shells

## 3.1 `tenants`

Purpose:

- top-level tenant boundary

Columns:

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | text | yes | PK |
| `name` | text | yes | business-readable tenant name |
| `slug` | text | yes | unique stable lookup key |
| `created_at` | timestamptz | yes | default now() |

Constraints:

- PK on `id`
- unique on `slug`

Indexes:

- unique index on `slug`

## 3.2 `roles`

Purpose:

- canonical role catalog

Columns:

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | text | yes | PK |
| `role_key` | text | yes | unique machine key |
| `display_name` | text | yes | UI label |

Constraints:

- PK on `id`
- unique on `role_key`

Recommended role keys in MVP:

- `sales_rep`
- `sales_manager`
- `revops_admin`
- `finance_approver`
- `legal_approver`
- `executive`

## 3.3 `app_users`

Purpose:

- tenant-bound user identities for MVP shell

Columns:

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | text | yes | PK |
| `tenant_id` | text | yes | FK -> tenants.id |
| `email` | text | yes | unique within current MVP scope |
| `display_name` | text | yes | UI name |
| `status` | text | yes | `active` / `disabled` baseline |
| `created_at` | timestamptz | yes | default now() |

Constraints:

- PK on `id`
- FK `tenant_id -> tenants(id)`
- unique on `email` in current MVP shell
- check on `status` if desired in hardening migration

Indexes:

- index on `tenant_id`
- unique index on `email`
- optional composite index on `(tenant_id, status)`

Note:

Current bootstrap uses globally unique email. This is acceptable for early MVP shell, though later multi-tenant identity strategy may evolve.

## 3.4 `user_role_assignments`

Purpose:

- many-to-many user-role mapping

Columns:

| Column | Type | Required | Notes |
|---|---|---|---|
| `user_id` | text | yes | FK -> app_users.id |
| `role_id` | text | yes | FK -> roles.id |

Constraints:

- composite PK `(user_id, role_id)`
- FK `user_id -> app_users(id)`
- FK `role_id -> roles(id)`

Indexes:

- PK index covers base lookup
- optional index on `role_id`

Why keep M:N now:

- even if MVP mostly uses one primary role per user, approvals and support cases may need multi-role users later

## 3.5 Phase 1 optional hardening table: `user_profiles` (deferred)

Decision:

- do not add now unless a concrete Phase 1 need appears

Why:

- avoid premature fragmentation of simple user shell data

## 4. Phase 2 Schema

Phase 2 covers:

- accounts
- contacts
- opportunities
- activities
- stage baseline for opportunities
- owner relationships
- audit-friendly created/updated fields

Phase 2 explicitly does not yet include:

- approval tables
- metadata tables
- saved views
- import jobs
- duplicate candidates
- dashboard projections

## 4.1 `accounts`

Purpose:

- tenant-scoped business customer organization

Columns:

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | text | yes | PK |
| `tenant_id` | text | yes | FK -> tenants.id |
| `name` | text | yes | account display name |
| `website` | text | no | optional MVP field |
| `owner_user_id` | text | yes | FK -> app_users.id |
| `created_at` | timestamptz | yes | default now() |
| `updated_at` | timestamptz | yes | default now() |
| `created_by_user_id` | text | yes | FK -> app_users.id |
| `updated_by_user_id` | text | yes | FK -> app_users.id |

Constraints:

- PK on `id`
- FK `tenant_id -> tenants(id)`
- FK `owner_user_id -> app_users(id)`
- FK `created_by_user_id -> app_users(id)`
- FK `updated_by_user_id -> app_users(id)`

Indexes:

- index on `(tenant_id, owner_user_id)`
- index on `(tenant_id, lower(name))` if search path needs it later

Important note:

- no unique constraint on account `name`, because duplicates are allowed and handled later via dedup workflow

## 4.2 `contacts`

Purpose:

- tenant-scoped business contact attached to account

Columns:

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | text | yes | PK |
| `tenant_id` | text | yes | FK -> tenants.id |
| `account_id` | text | yes | FK -> accounts.id |
| `full_name` | text | yes | display name |
| `email` | text | no | optional but important |
| `phone` | text | no | optional |
| `owner_user_id` | text | yes | FK -> app_users.id |
| `created_at` | timestamptz | yes | default now() |
| `updated_at` | timestamptz | yes | default now() |
| `created_by_user_id` | text | yes | FK -> app_users.id |
| `updated_by_user_id` | text | yes | FK -> app_users.id |

Constraints:

- PK on `id`
- FK `tenant_id -> tenants(id)`
- FK `account_id -> accounts(id)`
- FK `owner_user_id -> app_users(id)`
- FK `created_by_user_id -> app_users(id)`
- FK `updated_by_user_id -> app_users(id)`

Indexes:

- index on `(tenant_id, account_id)`
- index on `(tenant_id, owner_user_id)`
- optional index on `(tenant_id, email)`

Important note:

- do not make `email` unique globally or per tenant; duplicates are part of real CRM onboarding reality

## 4.3 `opportunity_stages`

Purpose:

- baseline stage catalog for opportunity pipeline before metadata-driven stage configuration arrives in Phase 4

Columns:

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | text | yes | PK |
| `tenant_id` | text | yes | FK -> tenants.id |
| `stage_key` | text | yes | stable machine key |
| `display_name` | text | yes | UI label |
| `sort_order` | integer | yes | stage order |
| `is_closed` | boolean | yes | closed stage marker |
| `created_at` | timestamptz | yes | default now() |

Constraints:

- PK on `id`
- FK `tenant_id -> tenants(id)`
- unique on `(tenant_id, stage_key)`
- unique on `(tenant_id, sort_order)`

Indexes:

- unique index on `(tenant_id, stage_key)`
- unique index on `(tenant_id, sort_order)`

Why this table exists before Phase 4:

- Phase 2 needs explicit pipeline transitions already
- later Phase 4 can evolve this into richer tenant stage configuration instead of inventing stages from scratch

## 4.4 `opportunities`

Purpose:

- core sales object

Columns:

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | text | yes | PK |
| `tenant_id` | text | yes | FK -> tenants.id |
| `account_id` | text | yes | FK -> accounts.id |
| `primary_contact_id` | text | no | FK -> contacts.id |
| `title` | text | yes | opportunity title |
| `owner_user_id` | text | yes | FK -> app_users.id |
| `stage_id` | text | yes | FK -> opportunity_stages.id |
| `expected_amount` | numeric(14,2) | no | commercial amount |
| `close_date` | date | no | expected close |
| `global_status` | text | yes | baseline status aligned to lifecycle |
| `approval_state` | text | yes | `none` in Phase 2 baseline, forward-compatible |
| `created_at` | timestamptz | yes | default now() |
| `updated_at` | timestamptz | yes | default now() |
| `created_by_user_id` | text | yes | FK -> app_users.id |
| `updated_by_user_id` | text | yes | FK -> app_users.id |

Constraints:

- PK on `id`
- FK `tenant_id -> tenants(id)`
- FK `account_id -> accounts(id)`
- FK `primary_contact_id -> contacts(id)`
- FK `owner_user_id -> app_users(id)`
- FK `stage_id -> opportunity_stages(id)`
- FK `created_by_user_id -> app_users(id)`
- FK `updated_by_user_id -> app_users(id)`

Recommended checks:

- `global_status` in (`active`, `pending_approval`, `approved_to_progress`, `blocked_by_rejection`, `closed_won`, `closed_lost`)
- `approval_state` in (`none`, `pending`, `approved`, `rejected`) or narrower baseline in Phase 2

Indexes:

- index on `(tenant_id, owner_user_id)`
- index on `(tenant_id, stage_id)`
- index on `(tenant_id, account_id)`
- index on `(tenant_id, close_date)`
- optional index on `(tenant_id, global_status)`

Why keep both `stage_id` and `global_status`:

- tenant stage and global lifecycle are related but not identical
- approval and close-state constraints need global semantics

## 4.5 `activities`

Purpose:

- next steps and tasks attached to opportunities

Columns:

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | text | yes | PK |
| `tenant_id` | text | yes | FK -> tenants.id |
| `opportunity_id` | text | yes | FK -> opportunities.id |
| `type` | text | yes | task, note, call, meeting baseline |
| `title` | text | yes | activity title |
| `status` | text | yes | open / completed baseline |
| `due_date` | date | no | optional |
| `owner_user_id` | text | yes | FK -> app_users.id |
| `created_at` | timestamptz | yes | default now() |
| `updated_at` | timestamptz | yes | default now() |
| `created_by_user_id` | text | yes | FK -> app_users.id |
| `updated_by_user_id` | text | yes | FK -> app_users.id |

Constraints:

- PK on `id`
- FK `tenant_id -> tenants(id)`
- FK `opportunity_id -> opportunities(id)`
- FK `owner_user_id -> app_users(id)`
- FK `created_by_user_id -> app_users(id)`
- FK `updated_by_user_id -> app_users(id)`

Recommended checks:

- `status` in (`open`, `completed`)

Indexes:

- index on `(tenant_id, opportunity_id)`
- index on `(tenant_id, owner_user_id, status)`
- optional index on `(tenant_id, due_date)`

## 5. Audit-Adjacent Minimum in Phase 2

Do not create full audit tables yet if there is no concrete implementation path.

But schema must be ready for audit-friendly behavior through:

- `created_by_user_id`
- `updated_by_user_id`
- `created_at`
- `updated_at`

Later Phase 7 can add:

- dedicated audit event tables
- merge history
- richer timelines

## 6. Tables Explicitly Deferred Beyond Phase 2

Do not add yet:

- `approval_requests`
- `approval_steps`
- `approval_decisions`
- `custom_field_definitions`
- `config_versions`
- `saved_views`
- `import_jobs`
- `import_job_rows`
- `duplicate_candidates`
- `merge_history`
- `reporting_projections`

Why:

- Phase 1–2 should stay focused on shell + core CRM loop
- introducing later tables early creates design debt and confuses migration sequencing

## 7. Migration Sequencing Recommendation

### `V1__bootstrap_shell.sql`

Already exists:

- tenants
- roles
- app_users
- user_role_assignments

### `V2__phase1_identity_hardening.sql`

Should include:

- additional roles
- user status check hardening if needed
- approver/executive seed data
- optional indexes for current-user lookup

### `V3__phase2_crm_core.sql`

Should include:

- accounts
- contacts
- opportunity_stages
- opportunities
- activities
- initial tenant stage seeds

## 8. Query and Index Implications

### Phase 1

Must optimize:

- user lookup by email
- user lookup by id
- role lookup for current user

### Phase 2

Must optimize:

- opportunities by tenant + owner
- opportunities by tenant + stage
- contacts by tenant + account
- activities by tenant + opportunity
- manager/team pipeline reads later from owner-based scope

Do not over-index yet for reporting or full-text search.

## 9. Open Decisions Still Allowed

These decisions may still evolve later without breaking this draft:

- text ids vs UUID ids
- whether `email` remains globally unique or becomes tenant-scoped
- exact shape of `global_status` and `approval_state` checks
- whether `opportunity_stages` gets a richer model before Phase 4

But these are not reasons to postpone the schema baseline.

## 10. Implementation Consequences

From this schema draft follow concrete near-term rules:

- Phase 1 code should only touch identity-shell tables and migrations
- Phase 2 code should build on explicit CRM tables, not temporary in-memory models
- tenant isolation must be enforceable at query level from the start
- duplicates are product reality, so over-aggressive uniqueness on business entities is harmful
- stage transitions should be driven by relational stage references, not free-form strings alone
