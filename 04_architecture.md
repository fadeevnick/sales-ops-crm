# 04 Architecture

Документ описывает архитектуру первого standalone product:

```text
B2B Sales Operations CRM with approvals
```

Это не tech stack документ. Здесь фиксируются:

- system context;
- architectural style;
- module boundaries;
- data and state model;
- integration boundaries;
- ключевые архитектурные решения, выведенные из business requirements, user journeys и functional requirements.

## 1. Architecture Goal

Нужна архитектура, которая одновременно поддерживает:

- tenant-specific customization;
- управляемый sales pipeline;
- approval-heavy commercial workflow;
- ownership/sharing visibility;
- import/export и bulk operations;
- deduplication and merge;
- reporting поверх кастомизируемых данных;
- business-readable audit trail.

Главный architectural pressure в этом продукте создаёт не масштаб трафика сам по себе, а сочетание:

- metadata-driven model;
- workflow/state management;
- access control;
- consistency between operational records, approvals, views, reports and audit.

## 2. Architecture Drivers

Архитектура должна прямо обслуживать следующие pressure points:

1. `Tenant customization without code fork`
2. `Approval governance without email-first control plane`
3. `Sharing and visibility rules beyond simple CRUD`
4. `Bulk imports and dedup without breaking operational consistency`
5. `Reporting under metadata variability`
6. `Auditability of business decisions and record changes`

Из этого следует, что MVP нельзя строить как набор независимых CRUD-таблиц с несколькими ad hoc сервисами вокруг них.

## 3. System Context

### Primary actors

- Sales Representative
- Sales Manager
- RevOps / CRM Administrator
- Finance Approver
- Commercial / Legal Approver
- VP Sales / Executive

### External inputs and outputs

- CSV import files from legacy systems
- CSV exports and report downloads
- Notification channels for approval tasks and overdue items
- Identity source for user accounts and roles

### System responsibility

Система является system of record для:

- accounts;
- contacts;
- opportunities;
- activities;
- approval requests;
- tenant-specific process configuration;
- audit history of business changes.

Система не является MVP system of record для:

- billing;
- invoicing;
- accounting ledger;
- inventory;
- contract lifecycle management.

## 4. Architectural Style

### Chosen style

Для MVP рекомендуется:

```text
modular monolith
+ single transactional source of truth
+ explicit domain modules
+ async workers for long-running jobs
+ derived read models for reporting and queues
```

### Why this is the right first architecture

Причины:

- metadata, approvals, sharing, merge и audit слишком тесно связаны, чтобы сразу дробить их на отдельные сервисы;
- consistency важнее ранней distribution complexity;
- первый standalone project должен тренировать domain architecture, а не prematurely pay microservice tax;
- product complexity здесь в правилах и состояниях, а не в необходимости раннего service decomposition.

### What this means concretely

- один основной deployable application boundary;
- внутри него несколько жёстко отделённых доменных модулей;
- тяжёлые процессы выносятся в background jobs, но не в отдельные продуктовые сервисы по умолчанию;
- reporting и task queues могут использовать отдельные read projections, но write authority остаётся в transactional core.

## 5. Implementation Stack Baseline

Выбранный implementation stack для этой архитектуры:

- Backend: Kotlin + Spring Boot
- Security: Spring Security
- Data access: jOOQ
- Database: PostgreSQL
- Migrations: Flyway
- Async jobs: PostgreSQL-backed background workers inside the modular monolith
- Frontend: React + TypeScript + Vite
- Client data layer: TanStack Query
- Forms/validation: React Hook Form + Zod
- API: REST/JSON
- Testing: JUnit 5 + Testcontainers + Vitest + Playwright

Почему именно такой baseline:

- он поддерживает domain-heavy modular monolith;
- он хорошо подходит для metadata, workflow, sharing и reporting pressure;
- он не тащит слишком рано distributed complexity;
- он совместим с production-like runtime discipline проекта.

## 6. High-Level Component Model

```text
Users
  ↓
Web UI / API boundary
  ↓
Application core
  ├─ Tenant Configuration module
  ├─ CRM Core module
  ├─ Sharing & Access module
  ├─ Approval & Policy module
  ├─ Views & Query module
  ├─ Import/Export & Bulk Jobs module
  ├─ Deduplication & Merge module
  ├─ Reporting Projection module
  ├─ Audit & Timeline module
  └─ Notification orchestration module
  ↓
Transactional data store + derived read models + async job execution
```

## 7. Module Boundaries

### 7.1 Tenant Configuration Module

Отвечает за:

- custom fields;
- field types and validation rules;
- tenant-specific opportunity stages;
- required-field rules;
- metadata publication lifecycle;
- config audit trail.

Не отвечает за:

- хранение operational business records;
- исполнение approval workflow;
- reporting execution.

Почему это отдельный модуль:

- metadata является product-defining capability;
- именно он создаёт требования к views, imports, approvals и reports;
- его изменения должны проходить controlled publish path.

### 7.2 CRM Core Module

Отвечает за:

- `Account`;
- `Contact`;
- `Opportunity`;
- `Activity`;
- core lifecycle операций над этими сущностями.

Инварианты:

- record принадлежит одному tenant;
- opportunity имеет owner и pipeline context;
- stage transition проверяется через business rules;
- ключевые изменения попадают в audit timeline.

### 7.3 Sharing & Access Module

Отвечает за:

- role-based permissions;
- ownership-based visibility;
- manager visibility scope;
- approver-specific limited context;
- field-level visibility restrictions.

Это отдельный модуль, потому что:

- access rules влияют не только на UI, но и на query execution, exports, approvals и dashboards;
- simple controller-level permission checks здесь недостаточны.

### 7.4 Approval & Policy Module

Отвечает за:

- approval request lifecycle;
- policy selection;
- sequential approval steps;
- approval decisions;
- invalidation and resubmission rules;
- overdue/escalation logic.

Ключевая идея:

- approval request является отдельным доменным объектом;
- approval state не должен быть просто набором флагов в opportunity.

### 7.5 Views & Query Module

Отвечает за:

- saved views;
- filters;
- list queries for reps/managers/admins;
- validation of views against metadata and access rules.

Этот модуль нужен отдельно, потому что:

- filters должны работать по standard и custom fields;
- views должны переживать evolution of metadata;
- query layer должен быть access-aware.

### 7.6 Import/Export & Bulk Jobs Module

Отвечает за:

- CSV import preview and mapping;
- bulk create/update jobs;
- export jobs;
- partial failure reporting;
- job status and result tracking.

Принцип:

- long-running and high-volume operations не должны выполняться в inline request path.

### 7.7 Deduplication & Merge Module

Отвечает за:

- duplicate candidate detection;
- duplicate review queue;
- merge decision flow;
- relation rewiring after merge;
- merge audit trail.

Это отдельный модуль, потому что merge затрагивает:

- operational records;
- access model;
- approvals;
- reporting projections;
- import references.

### 6.8 Reporting Projection Module

Отвечает за:

- pipeline aggregates;
- forecast aggregates;
- approval turnaround and pending metrics;
- drill-down datasets for executive views.

Принцип:

- reporting читается из projection/read model слоя;
- transactional operational write path не должен зависеть от тяжёлых ad hoc dashboard queries.

### 6.9 Audit & Timeline Module

Отвечает за:

- business-readable audit history;
- record timelines;
- approval decision history;
- config change history;
- traceability between record, import, merge and approval actions.

Важно:

- audit здесь не равен техническому application log;
- audit model является частью product domain.

### 6.10 Notification Orchestration Module

Отвечает за:

- создание user-facing tasks and reminders;
- approval notifications;
- overdue escalation notifications;
- events to downstream channels.

Ограничение:

- уведомления являются side effect;
- source of truth для решения и статуса живёт в core modules, а не в notification layer.

## 7. Data Architecture

## 7.1 Core principle

Нужны два типа данных:

1. `Transactional domain data`
2. `Derived read/projection data`

Transactional layer хранит источник истины для:

- tenant config;
- business records;
- approvals;
- ownership;
- merges;
- audit actions;
- job state.

Projection layer хранит:

- dashboard aggregates;
- approval task queues;
- saved-view optimized read results;
- duplicate review candidates;
- import summaries.

### Why two-layer data model is necessary

- operational writes требуют consistency;
- reporting, review queues и heavy filtering требуют read optimization;
- metadata-driven product плохо живёт на одной наивной CRUD-модели.

## 7.2 Metadata-driven entity model

Архитектурное требование:

- standard fields остаются first-class;
- custom fields описываются metadata layer;
- runtime validation, views, imports, approvals и reporting должны читать одну и ту же опубликованную metadata version.

Принцип публикации:

```text
draft config
→ validation
→ publish
→ published version becomes active for runtime
```

Это нужно, чтобы:

- избежать partial config activation;
- удержать совместимость между forms, queries, approvals и reports.

## 7.3 Opportunity and approval coupling

Opportunity и approval request должны быть связаны, но не слиты в один объект.

Opportunity хранит:

- sales pipeline context;
- ownership;
- commercial values;
- customer context;
- approval-related status marker.

Approval request хранит:

- request type;
- policy version/reference;
- snapshot relevant deal data;
- current state;
- step history;
- final decision record.

Это разделение нужно, чтобы:

- approval history не ломала основной lifecycle opportunity;
- можно было переотправлять approval без потери record identity сделки;
- audit и reporting были точными.

## 8. State Machines

## 8.1 Tenant configuration publish lifecycle

```text
draft
→ validated
→ published
→ superseded
→ archived
```

Инварианты:

- только `published` config участвует в runtime;
- нельзя публиковать конфигурацию с broken dependencies;
- destructive change требует explicit validation path.

## 8.2 Opportunity lifecycle

Opportunity stage model tenant-specific, но архитектурно есть общие правила:

- stage transition проходит через validation gate;
- некоторые stage transitions требуют approval gate;
- owner change и critical field change пишутся в audit;
- stage model не должна храниться в коде как фиксированный enum для всего продукта.

### Canonical business statuses around approval

```text
active
pending_approval
approved_to_progress
blocked_by_rejection
closed_won
closed_lost
```

Это не заменяет tenant-specific stages, а вводит глобальные lifecycle constraints вокруг approval process.

## 8.3 Approval request lifecycle

```text
draft
→ submitted
→ pending_step
→ approved
→ rejected
→ sent_back
→ cancelled
→ superseded
```

Инварианты:

- одновременно не должно быть нескольких конфликтующих active requests в одном policy scope;
- каждое решение append-only;
- существенное изменение сделки после submit может перевести request в `superseded` или потребовать resubmission.

## 8.4 Bulk job lifecycle

```text
created
→ validating
→ queued
→ running
→ partially_completed
→ completed
→ failed
→ cancelled
```

Инварианты:

- job result должен быть recoverable and inspectable;
- частичные ошибки не теряются;
- user получает итог по строкам и по всему job.

## 9. Access Architecture

### 9.1 Access decision layers

Доступ должен вычисляться на нескольких уровнях:

1. `Role permission`
2. `Record scope`
3. `Field visibility`
4. `Action permission`

Пример:

- пользователь может иметь право `view_opportunity`;
- но видеть только opportunities своего ownership scope;
- и при этом не видеть некоторые поля;
- и не иметь права `reassign_owner` или `approve_exception`.

### 9.2 Why access must be centralized

Если access logic размазать по UI и controller checks:

- views начнут возвращать лишние records;
- exports начнут утекать поля;
- dashboards и drill-down сломают security model;
- approval actors увидят больше, чем нужно.

Поэтому нужен единый access policy layer, который используется:

- command handlers;
- query builders;
- export jobs;
- approval context rendering;
- reporting drill-down.

## 10. Write Model and Async Boundaries

### Inline transactional commands

Inline в request path должны выполняться:

- create/update account/contact/opportunity/activity;
- stage transition;
- create approval request;
- approval decision;
- owner reassignment;
- metadata draft edit;
- config publish validation decision.

### Async boundaries

В background jobs должны уходить:

- bulk import processing;
- bulk export generation;
- duplicate candidate generation;
- merge side effects requiring recalculation;
- reporting projection refresh;
- overdue approval checks and escalations;
- notification delivery.

Принцип:

- всё, что долго выполняется, масштабируется по объёму или требует fan-out side effects, не должно блокировать основной пользовательский request path.

## 11. Reporting Architecture

### Architectural requirement

Reporting в этом продукте нельзя строить как "потом просто сделаем SQL поверх operational tables", потому что:

- tenant-specific fields делают схему вариативной;
- access rules влияют на drill-down;
- approvals и merges меняют interpretation of records;
- dashboard workloads могут конфликтовать с write-heavy operational path.

### Recommended reporting shape for MVP

- базовые executive dashboards строятся на projection layer;
- drill-down возвращает record sets через access-aware query module;
- projection refresh triggered by important business events and bulk jobs;
- reporting initially covers only agreed MVP metrics.

Это удерживает MVP в разумном scope и не заставляет сразу строить универсальный BI-конструктор.

## 12. Audit Architecture

### Two different signal types

Нужно различать:

1. `Operational telemetry`
2. `Business audit`

Operational telemetry нужна для production-like runtime baseline, зафиксированного в `00_domain_reference.md` и operational runbook.

Business audit нужна для продукта и должна отвечать на вопросы:

- кто изменил owner сделки;
- кто отправил request на approval;
- кто и почему согласовал исключение;
- когда был выполнен merge;
- какая metadata version была активна в момент действия.

### Audit model principle

Каждое критичное business action должно иметь:

- actor;
- timestamp;
- action type;
- target object;
- relevant before/after summary или decision summary;
- correlation to upstream business context.

## 13. Integration Boundaries

### MVP integrations

В первой архитектуре должны быть предусмотрены boundary points для:

- identity and role source;
- notification delivery channels;
- CSV file ingestion/export;
- future ecosystem integrations.

### Why boundaries matter early

Даже если интеграции MVP простые, без явных boundaries потом будет трудно:

- расширять approvals во внешние каналы;
- принимать legacy imports из разных источников;
- подключать downstream analytics or ecosystem connectors.

## 14. Consistency Rules

### Strong consistency required for

- record mutation;
- ownership reassignment;
- approval submit/decision;
- metadata publish;
- merge execution;
- audit append for critical actions.

### Eventual consistency acceptable for

- dashboards;
- duplicate candidate refresh;
- notifications;
- overdue reminders;
- bulk summaries after large jobs.

Это ключевое архитектурное разграничение MVP.

## 15. Failure-Sensitive Areas

Ниже области, где ошибка архитектуры особенно дорога:

### 15.1 Metadata drift

Риск:

- published metadata несовместима с views, imports, approvals или reports.

Ответ:

- config validation + publish lifecycle + dependency checks.

### 15.2 Approval race conditions

Риск:

- сделка изменена после submit;
- два approval request конфликтуют;
- решение принято на устаревшем snapshot.

Ответ:

- approval snapshot;
- active request constraints;
- resubmission / superseded rules.

### 15.3 Sharing leaks

Риск:

- данные утекают через filters, exports, dashboards или approval views.

Ответ:

- centralized access layer across commands and queries.

### 15.4 Merge inconsistency

Риск:

- после merge остаются dangling references или искажается reporting.

Ответ:

- controlled merge workflow + relation rewiring + projection refresh + audit trail.

## 16. Evolution Path

### MVP phase

Архитектура остаётся modular monolith, пока:

- основной риск в domain correctness;
- product model ещё меняется;
- boundaries ещё уточняются на практике.

### Later evolution candidates

Только после подтверждения реальной нагрузки и организационной сложности можно отдельно выделять:

- reporting pipeline;
- notification delivery;
- heavy import/export workers;
- search/indexing layer;
- external integration adapters.

Но не approval core и не metadata core на раннем этапе.

## 17. Relationship to Domain Reference

Этот документ описывает domain architecture.

Практическая связка:

- `00_domain_reference.md` фиксирует domain pressure и engineering baseline assumptions;
- этот документ раскладывает их в конкретные module boundaries и architectural decisions;
- operational runbook живёт отдельно в `codebase/DEPLOYMENT.md`.

## 18. ADR-Style Decisions

### ADR-001. MVP is a modular monolith

Decision:

- строить MVP как modular monolith, а не microservices.

Reason:

- сильная связанность metadata, approvals, sharing, merge и audit;
- важнее consistency и скорость архитектурного обучения, чем ранняя distribution.

### ADR-002. Metadata is a first-class subsystem

Decision:

- custom fields, stages and validation rules являются отдельным архитектурным слоем.

Reason:

- product value зависит от tenant-specific flexibility;
- ad hoc JSON-расширения без publish/validation модели быстро разрушат consistency.

### ADR-003. Approval is a separate domain object

Decision:

- approval request живёт отдельно от opportunity.

Reason:

- нужен decision history, snapshot context, multi-step flow и invalidation logic.

### ADR-004. Access is enforced centrally

Decision:

- access model используется одинаково в commands, queries, exports and drill-down.

Reason:

- CRM/ERP-like sharing leaks чаще всего происходят не в основном CRUD, а в списках, отчётах и bulk paths.

### ADR-005. Reporting uses derived projections

Decision:

- executive dashboards и approval metrics читаются из projection layer, а не из наивных прямых operational queries.

Reason:

- metadata variability, drill-down security и нагрузка на operational path требуют разделения read concerns.

### ADR-006. Bulk operations are job-based

Decision:

- imports/exports и тяжёлые recalculation flows выполняются как jobs.

Reason:

- bulk operations требуют retryability, progress tracking, partial failure handling и auditability.
