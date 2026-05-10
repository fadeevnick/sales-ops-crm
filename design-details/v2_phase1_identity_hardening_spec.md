# V2 Phase 1 Identity Hardening Spec

Этот документ фиксирует точную спецификацию
для `V2__phase1_identity_hardening.sql`.

Он нужен, чтобы второй `Phase 1` slice
реализовывался не "из головы", а по заранее зафиксированному DDL/seed contract.

## 1. Goal

`V2__phase1_identity_hardening.sql` должен:

- укрепить текущий identity baseline из `V1__bootstrap_shell.sql`;
- добавить missing Phase 1 roles and users;
- сделать `app_users.status` semantics явной на уровне schema;
- не утащить в migration ничего из `Phase 2+`.

## 2. Source Baseline

Current baseline is:

- `db/migration/V1__bootstrap_shell.sql`

Current `V1` already contains:

- `tenants`
- `roles`
- `app_users`
- `user_role_assignments`
- one tenant
- three roles:
  - `sales_rep`
  - `sales_manager`
  - `revops_admin`
- three seeded users:
  - `user_anna`
  - `user_michael`
  - `user_irina`

## 3. Exact Scope For V2

`V2` should contain only these categories of change:

1. `app_users.status` hardening
2. optional supporting indexes already allowed by schema draft
3. missing role seeds
4. missing user seeds
5. missing role assignment seeds

## 4. Required DDL Changes

### 4.1 `app_users.status` check constraint

Add a check constraint to `app_users.status`.

Allowed values in MVP:

- `active`
- `disabled`

Intent:

- keep shell auth semantics explicit;
- prevent random free-form user statuses from leaking into runtime behavior.

### 4.2 Supporting index on `(tenant_id, status)`

Add a composite index on:

```text
(tenant_id, status)
```

Why:

- it is already allowed by `schema_draft_phase1_phase2.md`;
- it supports future shell queries and identity filtering;
- it is a low-risk hardening change inside Phase 1 scope.

No other new indexes should be introduced in `V2`.

## 5. Required Seed Changes

### 5.1 Add missing roles

Insert these role rows:

- `role_finance_approver` / `finance_approver` / `Finance Approver`
- `role_legal_approver` / `legal_approver` / `Legal Approver`

### 5.2 Add missing users

Insert these seeded users:

- `user_daria`
  - tenant: `tenant_orion`
  - email: `daria@orion.local`
  - display name: `Daria Orlova`
  - status: `active`

- `user_oleg`
  - tenant: `tenant_orion`
  - email: `oleg@orion.local`
  - display name: `Oleg Smirnov`
  - status: `active`

### 5.3 Add missing role assignments

Insert these mappings:

- `user_daria` -> `role_finance_approver`
- `user_oleg` -> `role_legal_approver`

## 6. Exact SQL Behavior Expectations

`V2` should be written so that:

- it is additive over `V1`;
- it does not rewrite `V1`;
- it does not rename existing ids;
- it does not modify existing seeded users unless absolutely necessary;
- it remains readable as a small hardening migration, not a catch-all cleanup dump.

If idempotent-style guards are needed for inserts, they should stay simple and local.

## 7. Naming Rules

Role naming must stay aligned with planning docs:

- role ids:
  - `role_sales_rep`
  - `role_sales_manager`
  - `role_revops_admin`
  - `role_finance_approver`
  - `role_legal_approver`

- user ids:
  - `user_anna`
  - `user_michael`
  - `user_irina`
  - `user_daria`
  - `user_oleg`

Display names should stay business-readable and stable.

## 8. Explicitly Out Of Scope

`V2` must not include:

- `executive` role seed
- new tables
- Phase 2 CRM tables
- approval request tables
- metadata tables
- import/export tables
- audit tables
- user profile split
- tenant redesign
- multi-tenant email strategy rewrite

Also out of scope:

- frontend changes
- runtime verification
- generic auth provider work

## 9. Expected Result After V2 Exists

После появления `V2` должно быть правдиво следующее:

- Phase 1 role catalog no longer has obvious missing approver gaps;
- Phase 1 seed catalog no longer has obvious missing approver users;
- user status is explicit in schema semantics, not only in docs;
- the project is ready for a later frontend shell refinement slice without backend identity ambiguity.

## 10. Follow-On Constraint

После этого spec следующий шаг может быть:

```text
implement V2__phase1_identity_hardening.sql
```

Но даже после этого не нужно автоматически прыгать в:

- frontend shell/session refinement
- runtime verification
- broader Phase 1 cleanup

Они должны оставаться отдельными следующими шагами.
