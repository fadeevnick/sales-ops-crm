# V2 Phase 1 Identity Hardening Acceptance Checklist

Этот документ фиксирует,
по каким признакам `V2__phase1_identity_hardening.sql`
нужно считать реализованной корректно.

Он не заменяет spec.

Связанные документы:

- `v2_phase1_identity_hardening_spec.md`
- `phase1_second_coding_slice_planning_note.md`
- `schema_draft_phase1_phase2.md`

## 1. Purpose

Checklist нужен, чтобы:

- не спорить после реализации, что именно входило в `V2`;
- не допустить scope drift inside migration;
- отделить `migration exists` от `migration is acceptable by design`.

## 2. Migration Shape Checklist

`V2__phase1_identity_hardening.sql` считается приемлемой только если:

- это отдельная новая migration;
- она не переписывает `V1__bootstrap_shell.sql`;
- она остаётся небольшой hardening migration, а не catch-all cleanup file;
- в ней нет Phase 2 tables or columns;
- в ней нет approval tables;
- в ней нет frontend-driven assumptions.

## 3. Required DDL Checklist

### 3.1 Status constraint

Проверить:

- на `app_users.status` есть явное ограничение допустимых значений;
- допустимые значения:
  - `active`
  - `disabled`

### 3.2 Supporting index

Проверить:

- добавлен composite index на `(tenant_id, status)`;
- в `V2` не появляются лишние дополнительные индексы вне уже согласованного scope.

## 4. Required Seed Checklist

### 4.1 Roles

Проверить наличие:

- `role_finance_approver`
- `role_legal_approver`

И соответствие:

- `finance_approver`
- `legal_approver`

### 4.2 Users

Проверить наличие:

- `user_daria`
- `user_oleg`

И соответствие:

- `tenant_orion`
- business-readable display names
- unique local emails
- `status = active`

### 4.3 Role assignments

Проверить наличие:

- `user_daria -> role_finance_approver`
- `user_oleg -> role_legal_approver`

## 5. Naming Consistency Checklist

После `V2` naming должен оставаться согласованным между:

- migration
- `schema_draft_phase1_phase2.md`
- `access_matrix.md`
- `phase1_second_coding_slice_planning_note.md`

Проверить:

- role ids и role keys не расходятся;
- user ids стабильны и не переименованы постфактум;
- display names выглядят как реальные business identities, а не временные placeholders.

## 6. Scope Protection Checklist

Проверить, что `V2` **не делает** следующее:

- не добавляет `executive` seed;
- не добавляет новые таблицы;
- не меняет multi-tenant email strategy;
- не добавляет user profile split;
- не добавляет audit tables;
- не затрагивает CRM record schema;
- не начинает frontend-oriented data remodeling.

Если что-то из этого появляется, `V2` уже вышла за пределы второго slice.

## 7. Backend Alignment Checklist

Если migration требует backend alignment, он остаётся приемлемым только если:

- меняется минимум файлов;
- alignment нужен именно из-за нового seed/status baseline;
- не начинается новый auth refactor;
- не начинается frontend refinement через backend side-effects.

Практически допустимы только small updates в:

- `ShellModuleVisibilityPolicy.kt`
- `SessionService.kt`
- `UserShellRepository.kt`

И только если это действительно нужно.

## 8. Artifact-Mode Checklist

Даже после реализации `V2` не считать автоматически закрытым:

- frontend shell/session refinement;
- third Phase 1 slice planning;
- compile/runtime proof;
- full Phase 1 completion.

Это важно, чтобы не перепутать:

- `V2 implemented`
и
- `Phase 1 done`

## 9. Acceptance Statement

`V2__phase1_identity_hardening.sql` считается принятой по design discipline только если одновременно верны все условия:

- spec выполнен;
- acceptance checklist выполнен;
- migration осталась узкой;
- third slice still remains separate.
