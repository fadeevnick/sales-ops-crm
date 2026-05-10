# 06 Implementation Guide

Документ фиксирует фазовый implementation plan для продукта:

```text
B2B Sales Operations CRM with approvals
```

Это roadmap/checklist-документ, а не status tracker.

Назначение документа:

- перевести `mvp_roadmap.md` в execution-oriented phases;
- определить порядок реализации;
- зафиксировать `preconditions`, expected changes и `runtime verification`;
- удержать границу между design decisions и реальным implementation progress.

Реальный прогресс должен фиксироваться только в `implementation_status.md`.

## 1. Guide Principles

Implementation phases должны следовать таким правилам:

1. Каждая фаза закрывает конкретный capability slice.
2. Каждая фаза заканчивается runtime verification, а не только "код написан".
3. Каждая фаза должна иметь минимально достаточный scope.
4. Не добавлять later mechanisms раньше времени.
5. Не смешивать этот guide с фактическим статусом работ.

## 2. Relationship to Other Documents

- `mvp_roadmap.md` отвечает на вопрос: что входит в MVP и в каком продуктово-логическом порядке.
- `06_implementation_guide.md` отвечает на вопрос: как превращать этот MVP в последовательные implementation phases.
- `implementation_status.md` отвечает на вопрос: что реально уже сделано и что проверено runtime.

## 3. Phase Structure Contract

Для каждой implementation phase обязательно фиксировать:

- Goal
- Preconditions
- Schema / env changes
- API / service changes
- UI changes
- Runtime verification
- Done criteria

Если фаза не может быть доказана через runtime scenario, значит она описана слишком абстрактно.

## 4. MVP Implementation Order

Рекомендуемый implementation order:

1. Phase 0 — Product shell and codebase bootstrap
2. Phase 1 — Tenant, auth, roles, workspace shell
3. Phase 2 — Core CRM records and pipeline
4. Phase 3 — Approval workflow core
5. Phase 4 — Metadata-driven process configuration
6. Phase 5 — Views, sharing and manager visibility
7. Phase 6 — Import/export and bulk jobs
8. Phase 7 — Deduplication, merge and audit depth
9. Phase 8 — Executive dashboards and reporting projections
10. Phase 9 — MVP hardening and pilot cut

Этот порядок сознательно отличается от "сразу построим весь flexible platform core".

Сначала нужен работающий transaction loop, потом governance, потом flexibility, потом onboarding/data quality, потом executive visibility, потом hardening.

## 5. Phase 0 — Product shell and codebase bootstrap

### Goal

Создать минимальный runnable product shell и базовую структуру codebase.

### Preconditions

- согласованы `01_business_requirements.md`
- согласованы `02_user_journeys.md`
- согласованы `03_functional_requirements.md`
- согласованы `04_architecture.md`
- согласованы `05_tech_stack.md`
- согласован `mvp_roadmap.md`

### Schema / env changes

- начальная схема tenant/user/role baseline;
- базовые migration files;
- локальная runtime-конфигурация для app, DB и auth seed;
- базовые env vars для backend/frontend/database.

### API / service changes

- backend bootstrap;
- frontend workspace bootstrap;
- health/readiness endpoints;
- базовый authenticated API shell;
- app wiring для modular monolith boundaries.

### UI changes

- login screen или temporary auth entry;
- пустой workspace shell;
- basic navigation;
- layout for CRM modules.

### Runtime verification

- приложение поднимается локально end-to-end;
- backend health/readiness доступны;
- frontend загружается;
- пользователь может войти в систему под seeded account;
- tenant-aware session создаётся корректно;
- basic module navigation работает.

### Done criteria

- есть runnable full-stack shell;
- codebase split не противоречит принятым module boundaries;
- migrations применяются;
- local dev loop reproducible;
- phase results записаны в `implementation_status.md`.

## 6. Phase 1 — Tenant, auth, roles, workspace shell

### Goal

Ввести tenant isolation, user model и role-based workspace baseline.

### Preconditions

- Phase 0 verified

### Schema / env changes

- tenant tables;
- user tables;
- role/assignment tables;
- seed data for core roles;
- auth configuration baseline.

### API / service changes

- login/session/token flow in chosen MVP form;
- current user endpoint;
- tenant resolution in request context;
- role checks for module entrypoints.

### UI changes

- authenticated landing page;
- role-aware navigation;
- basic user/tenant context display;
- unauthorized-state handling.

### Runtime verification

- user from tenant A cannot access tenant B data;
- разные роли видят разный navigation scope;
- unauthorized access returns correct error behavior;
- session survives normal navigation flow.

### Done criteria

- tenant isolation работает в runtime;
- core roles wired end-to-end;
- app has usable authenticated shell for further phases.

## 7. Phase 2 — Core CRM records and pipeline

### Goal

Закрыть минимальный sales execution loop.

### Preconditions

- Phase 1 verified

### Schema / env changes

- tables for accounts, contacts, opportunities, activities;
- opportunity stage baseline;
- owner references;
- audit foundation for core record changes.

### API / service changes

- create/read/update flows for core entities;
- opportunity stage transition handling;
- owner assignment;
- activity creation and listing;
- manager team pipeline read path.

### UI changes

- account/contact/opportunity create/edit forms;
- opportunity detail page;
- activity section;
- pipeline/team list views;
- stage update interactions.

### Runtime verification

- sales rep can create account, contact and opportunity;
- sales rep can move opportunity through baseline stages;
- required validations trigger correctly;
- manager can see team pipeline;
- owner reassignment basics work;
- core record changes appear in audit timeline.

### Done criteria

- core sales loop is usable in runtime;
- pipeline records are not just CRUD rows but business objects with lifecycle;
- manager visibility basic path works.

## 8. Phase 3 — Approval workflow core

### Goal

Сделать approvals first-class частью сделки.

### Preconditions

- Phase 2 verified

### Schema / env changes

- approval request tables;
- approval step tables;
- decision history tables;
- request type and policy baseline structures;
- state model support for pending approval.

### API / service changes

- submit approval request command;
- approver task queue query;
- approve/reject/send-back commands;
- opportunity state interaction with approval outcome;
- active request constraints.

### UI changes

- submit-for-approval flow in opportunity UI;
- approval request detail screen;
- approver inbox/queue;
- decision action UI;
- opportunity status indicators for pending/approved/rejected states.

### Runtime verification

- sales rep can submit discount/exception request from opportunity;
- approver sees assigned request in queue;
- approver can approve/reject/send back;
- opportunity state changes accordingly;
- duplicate active request rule is enforced;
- decision history remains visible and append-only in runtime behavior.

### Done criteria

- approval lifecycle works end-to-end;
- decision path is auditable;
- approval is no longer simulated by manual status edits.

## 9. Phase 4 — Metadata-driven process configuration

### Goal

Добавить tenant-level configurability для core process.

### Preconditions

- Phase 3 verified

### Schema / env changes

- metadata tables for custom fields;
- metadata tables for stage definitions;
- config draft/publish structures;
- validation rule storage;
- config audit tables or extensions.

### API / service changes

- create/update custom field definitions;
- create/update stage definitions;
- publish config workflow;
- metadata-aware validation at runtime;
- version-aware config loading.

### UI changes

- admin screens for custom fields;
- admin screens for opportunity stages;
- publish/validation UI;
- metadata-aware rendering in core forms and lists.

### Runtime verification

- tenant admin can add a custom field and publish config;
- new field appears in relevant forms and detail views;
- tenant admin can change stage definitions within allowed rules;
- invalid config is blocked before publish;
- published config affects runtime behavior without code changes.

### Done criteria

- product demonstrates real tenant-specific process configuration;
- runtime consistently uses published metadata version;
- config changes do not silently break core workflows.

## 10. Phase 5 — Views, sharing and manager visibility

### Goal

Сделать access model и daily workspace operationally usable.

### Preconditions

- Phase 4 verified

### Schema / env changes

- saved views storage;
- sharing/access policy structures;
- manager visibility relationships;
- optional field visibility support if included in narrowed MVP.

### API / service changes

- access-aware query layer for lists and drill-downs;
- saved view create/update/load endpoints;
- owner/manager scope enforcement;
- restricted record access behavior;
- field-level filtering where included.

### UI changes

- saved views UI;
- filters for stage, owner, approval status, due date and selected custom fields;
- manager team workspace improvements;
- permission-aware empty/error states.

### Runtime verification

- sales rep sees only allowed opportunities;
- manager sees team scope but not whole tenant by default;
- saved views persist and reload;
- filters work on standard and supported custom fields;
- unauthorized records cannot be opened via direct URL or query manipulation.

### Done criteria

- access rules work in runtime, not only in controller annotations;
- views are usable for daily work;
- manager visibility is operationally meaningful.

## 11. Phase 6 — Import/export and bulk jobs

### Goal

Сделать продукт пригодным для tenant onboarding and bulk data operations.

### Preconditions

- Phase 5 verified

### Schema / env changes

- import job tables;
- import row/result tables;
- export job tables;
- job progress/error tracking structures;
- file reference storage strategy.

### API / service changes

- CSV upload and mapping preview;
- import job creation;
- async import processing;
- row-level validation reporting;
- controlled export job flow;
- job status/result endpoints.

### UI changes

- import wizard;
- mapping preview screen;
- import job status screen;
- row error review UI;
- export trigger and download flow.

### Runtime verification

- admin uploads CSV and maps source columns;
- import job runs asynchronously;
- valid rows are imported;
- invalid rows are reported with row-level details;
- user can export records from controlled views/filters;
- access restrictions apply to export results.

### Done criteria

- product supports realistic onboarding path for new tenant;
- bulk operations do not block request path;
- import/export results are inspectable and auditable.

## 12. Phase 7 — Deduplication, merge and audit depth

### Goal

Добавить data quality control и сделать critical business traceability убедительной.

### Preconditions

- Phase 6 verified

### Schema / env changes

- duplicate candidate storage;
- merge history structures;
- relation rewiring support;
- richer audit timeline structures if still minimal.

### API / service changes

- duplicate candidate generation flow;
- duplicate review queue;
- merge command;
- merge-safe relation reassignment;
- audit timeline enrichment.

### UI changes

- duplicate review UI;
- compare records screen;
- master-record selection flow;
- merge result display;
- richer timeline view for key records.

### Runtime verification

- duplicate candidates appear after relevant data scenarios;
- admin can review and reject false positives;
- admin can merge account/contact records;
- linked relations remain usable after merge;
- audit trail explains who merged what and why;
- key record timelines remain readable.

### Done criteria

- duplicates can be resolved inside the product;
- merge does not corrupt record graph;
- audit depth is sufficient for operational investigation.

## 13. Phase 8 — Executive dashboards and reporting projections

### Goal

Дать базовую руководительскую видимость поверх operational data.

### Preconditions

- Phase 7 verified

### Schema / env changes

- reporting projection tables or materialized read structures;
- aggregate refresh support;
- dashboard query indexes/boundaries as needed.

### API / service changes

- pipeline dashboard queries;
- approval backlog and turnaround queries;
- forecast-oriented aggregate queries in MVP scope;
- drill-down endpoints using access-aware query layer.

### UI changes

- executive dashboard;
- manager summary widgets;
- drill-down navigation from aggregate to record list;
- approval bottleneck views.

### Runtime verification

- executive sees pipeline summary and approval metrics;
- drill-down opens only permitted record sets;
- dashboard reflects recent operational changes after projection refresh cycle;
- manager and executive views differ appropriately by role.

### Done criteria

- MVP provides operational trust, not only raw record screens;
- reporting is useful and does not bypass access model;
- projections remain consistent enough for agreed MVP usage.

## 14. Phase 9 — MVP hardening and pilot cut

### Goal

Подготовить MVP к controlled pilot, а не только к feature demo.

### Preconditions

- Phase 8 verified

### Schema / env changes

- only minimal corrective schema/env changes allowed;
- no new large product capabilities should enter here.

### API / service changes

- fix access leaks;
- fix approval edge cases;
- fix metadata publish safety gaps;
- fix import/merge consistency gaps;
- add missing guardrails required for pilot.

### UI changes

- polish only for critical usability blockers;
- improve empty/error states;
- close high-risk workflow confusion points.

### Runtime verification

- end-to-end tenant onboarding scenario passes;
- sales rep to approval to manager to executive loop passes;
- negative approval cases are tested in runtime;
- metadata publish invalid-case protection is proven;
- import followed by duplicate review and merge passes;
- pilot users can complete core scenarios without spreadsheet fallback for the defined wedge.

### Done criteria

- MVP scope is stable;
- pilot cut excludes consciously deferred items;
- core flows are verified in runtime;
- remaining gaps are explicitly documented in `implementation_status.md`.

## 15. Relationship to Local Substrate Reference

Этот implementation guide описывает продуктовые и доменные фазы.

Operational substrate должен расти вместе с baseline, зафиксированным в `00_substrate_reference.md`:

- health/readiness;
- deploy/rollback;
- migrations;
- backup/restore;
- PgBouncer when justified;
- replica when justified;
- PITR when justified;
- observability;
- scaling;
- Kubernetes/IaC/DR later.

Практическое правило:

- продуктовые фазы из этого документа реализуются в `codebase/`;
- operational maturity practices применяются по sequencing из `00_substrate_reference.md`;
- каждая существенная implementation phase должна завершаться runtime verification не только бизнес-флоу, но и работоспособности runtime-системы.

## 16. What Should Not Happen

Неправильные implementation moves:

- строить full custom-object platform в ранних фазах;
- вводить external broker раньше, чем DB-backed jobs доказали предел;
- делать dashboards раньше core operational loop;
- строить universal report builder до executive visibility baseline;
- вводить microservices до появления real modular pressure;
- смешивать guide и implementation status.

## 17. Next Execution Step

После согласования этого guide правильный следующий шаг:

- подготовить core flow design / prototypes для самых критичных экранов;
- затем сделать codebase bootstrap;
- затем идти по фазам сверху вниз, обновляя `implementation_status.md` только по факту runtime-проверок.
