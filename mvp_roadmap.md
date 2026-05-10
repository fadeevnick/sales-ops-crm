# MVP Roadmap

Документ фиксирует продуктовый roadmap для первого MVP:

```text
B2B Sales Operations CRM with approvals
```

Это не implementation guide и не status tracker.

Назначение документа:

- превратить business requirements, journeys, FR и architecture в реалистичный MVP sequencing;
- отделить `must-have wedge` от `good-to-have`;
- показать, что должно войти в первый релиз, а что можно сознательно отложить;
- подготовить основу для `06_implementation_guide.md`.

## 1. MVP Goal

Первый MVP должен доказать одну конкретную ценность:

```text
mid-market B2B sales team может вести сделки,
отправлять коммерческие исключения на согласование,
настраивать свой sales process под tenant,
импортировать стартовые данные
и получать базовую управленческую видимость
внутри одной системы
```

Если MVP не закрывает этот loop end-to-end, значит roadmap перегружен или неправильно приоритизирован.

## 2. MVP Wedge

Главный wedge продукта:

- sales pipeline как operational system of record;
- approval workflow как governance layer;
- metadata-driven configurability как enterprise-flexibility differentiator.

Именно это отличает продукт от:

- "просто CRM для ведения сделок";
- "просто approval tool";
- "просто configurable database app".

## 3. Roadmap Principles

Roadmap строится по следующим правилам:

1. Сначала закрыть `core transactional loop`, потом наращивать flexibility.
2. Не пытаться в первом релизе стать "CRM/ERP вообще".
3. Metadata-driven capability должна войти в MVP, но в контролируемом объёме.
4. Approval workflow должен быть first-class, а не post-MVP add-on.
5. Import/dedup/audit не являются второстепенными утилитами: они часть product value.
6. Reporting должен быть достаточно сильным для executive visibility, но не превращаться в BI-platform.

## 4. MVP Definition

MVP считается состоявшимся, если одновременно доступны следующие capability groups:

- tenant onboarding and setup;
- account/contact/opportunity/activity core loop;
- approval request lifecycle;
- basic access and sharing model;
- metadata-driven configuration for core process;
- CSV import and basic export;
- duplicate review and merge for core records;
- basic dashboards and approval bottleneck reporting;
- business-readable audit history.

## 5. Scope Layers

### 5.1 Must-have for MVP

- Accounts, Contacts, Opportunities, Activities
- Opportunity stages
- Configurable fields for core entities
- Required-field rules on relevant stages
- Sales rep create/update/move opportunity flow
- Approval request submit/review/decision flow
- Sequential approvals
- Owner-based access
- Manager visibility
- Saved views and filters
- CSV import preview + async execution + results
- CSV export by controlled views/filters
- Duplicate candidate review
- Merge for accounts and contacts
- Audit history for critical business changes
- Executive dashboard for pipeline and approval status

### 5.2 Important but can be narrowed inside MVP

- forecast depth;
- reporting slice richness on custom fields;
- approval escalations;
- field-level visibility;
- auto-approval rules;
- import upsert sophistication.

### 5.3 Explicitly deferred beyond MVP

- full CPQ;
- quote document generation engine;
- contract lifecycle management;
- invoicing/billing;
- accounting ledger;
- inventory/warehouse;
- multi-region legal/compliance specialization;
- advanced territory model;
- universal report builder;
- ecosystem marketplace / broad external integrations.

## 6. MVP Release Slices

## Slice 0. Product foundation and tenant shell

### Goal

Создать минимальный product shell, на котором вообще можно строить tenant-aware CRM.

### Includes

- tenant model;
- user model;
- role model;
- authenticated workspace shell;
- basic tenant isolation;
- navigation for main modules;
- initial audit/event recording foundation.

### Why it matters

Без этого нельзя честно строить ни sharing, ни approvals, ни metadata.

### Exit condition

Можно войти в систему под разными ролями и работать в отдельном tenant scope.

## Slice 1. Core sales loop

### Goal

Закрыть минимальный полезный transactional loop для sales rep and manager.

### Includes

- Accounts
- Contacts
- Opportunities
- Activities / next steps
- Opportunity stages
- create/edit/view opportunity
- stage changes with validation
- owner assignment
- manager team view
- basic saved views

### Out of scope in this slice

- approvals;
- import;
- dedup;
- executive dashboards;
- rich tenant customization.

### Exit condition

Sales rep может завести account/contact/opportunity, провести сделку по стадиям и manager может видеть pipeline команды.

## Slice 2. Approval governance loop

### Goal

Сделать approval-heavy commercial workflow core value proposition, а не дополнительной функцией.

### Includes

- approval request creation from opportunity;
- request types for discount / terms / exception;
- policy-based approval routing in MVP scope;
- sequential approval steps;
- approver work queue;
- approve / reject / send back decisions;
- opportunity state interaction with approval lifecycle;
- approval decision audit history.

### Narrowing decisions for MVP

- conditional branching в approval policies можно отложить;
- escalation можно сделать базовой или ограниченной;
- first version может поддерживать ограниченный набор request types.

### Exit condition

Sales rep может отправить исключение на согласование, approver может принять решение, а outcome влияет на lifecycle сделки.

## Slice 3. Tenant configurability for the core process

### Goal

Дать tenant-specific flexibility без превращения MVP в no-code platform.

### Includes

- configurable custom fields for core entities;
- configurable opportunity stages;
- required-field rules by stage;
- metadata draft/publish model;
- validation before publish;
- metadata-aware forms and views.

### Deliberate constraints

- не строить generic custom objects в первом MVP;
- не строить arbitrary workflow designer;
- не строить full low-code layer.

### Why this cut is important

Именно здесь продукт становится CRM/ERP-like, а не просто sales tracker.

### Exit condition

Tenant admin может настроить свой sales process через поля и стадии, и эти изменения реально отражаются в daily workflows.

## Slice 4. Data onboarding and quality control

### Goal

Сделать продукт внедряемым в реальной B2B-команде, где уже есть legacy data.

### Includes

- CSV import preview and mapping;
- async import execution;
- row-level validation results;
- create-only and basic update/import modes;
- duplicate candidate detection;
- duplicate review queue;
- merge for accounts and contacts;
- export by controlled views/filters.

### Why it matters

Без этого MVP может красиво демонстрироваться, но плохо внедряться.

### Exit condition

Tenant admin может импортировать стартовые данные, увидеть ошибки, обработать duplicates и получить usable dataset для команды.

## Slice 5. Executive visibility and operational trust

### Goal

Дать руководству базовую картину pipeline и approval bottlenecks.

### Includes

- pipeline dashboard;
- approval pending volume;
- approval turnaround metrics;
- basic forecast-oriented aggregate view;
- drill-down into underlying records within access rules;
- business-readable audit timelines for key records.

### Deliberate constraints

- не строить universal report builder;
- не строить deep analytics platform;
- не пытаться в first release покрыть every KPI.

### Exit condition

Executive и manager могут увидеть pipeline health и узкие места согласований без ручного экспорта в spreadsheet.

## Slice 6. MVP hardening and cut line

### Goal

Сделать релиз пригодным для controlled pilot, а не просто feature demo.

### Includes

- permission and access audit pass;
- negative-case testing for approvals;
- metadata publish safety pass;
- import/merge consistency pass;
- dashboard/drill-down correctness pass;
- documentation for MVP scope;
- final cut of deferred items.

### Exit condition

Есть чёткий MVP scope, который:

- работает end-to-end;
- не течёт по access model;
- не ломается на базовом tenant onboarding scenario;
- можно использовать в pilot-like environment.

## 7. Recommended MVP Sequencing

Рекомендуемая последовательность такая:

1. Slice 0 — Product foundation and tenant shell
2. Slice 1 — Core sales loop
3. Slice 2 — Approval governance loop
4. Slice 3 — Tenant configurability for the core process
5. Slice 4 — Data onboarding and quality control
6. Slice 5 — Executive visibility and operational trust
7. Slice 6 — MVP hardening and cut line

Почему именно так:

- без core sales loop approvals не к чему привязывать;
- без approvals теряется product wedge;
- без metadata продукт не дотягивает до CRM/ERP overlay;
- без import/dedup продукт плохо внедряется;
- reporting имеет смысл только после появления реальных operational records and approval history.

## 8. MVP Cut Strategy

Если scope начнёт раздуваться, резать нужно в таком порядке:

### Cut last

- core records and pipeline;
- approval workflow;
- metadata-driven fields/stages;
- owner/manager visibility;
- import preview + async import;
- audit for critical actions.

### Can simplify

- approval escalations;
- reporting richness;
- custom-field coverage inside dashboards;
- merge sophistication;
- advanced exports;
- advanced permission matrix.

### Cut first

- quote document generation;
- advanced forecast modeling;
- territory model;
- external integrations;
- advanced notification channels;
- generalized report builder;
- advanced admin analytics.

## 9. MVP Success Criteria by Capability

### Sales execution

- rep может завести и вести сделку без spreadsheet side process;
- manager видит pipeline команды;
- stage rules реально enforced.

### Approval governance

- exception requests больше не живут как primary flow в email/chat;
- approver queue usable;
- decision history прозрачна.

### Flexibility

- tenant admin может адаптировать core process без code changes;
- published config не ломает runtime.

### Data onboarding

- новый tenant может импортировать рабочий стартовый dataset;
- duplicates можно обработать внутри системы.

### Visibility

- leadership видит pipeline and approval bottlenecks;
- key records имеют понятный audit trail.

## 10. Main Risks to Watch in MVP Planning

### Risk 1. Overbuilding the metadata layer

Плохой сценарий:

- попытка сразу построить full low-code platform.

Правильная граница:

- configurable fields + stages + rules for core entities, не больше.

### Risk 2. Underbuilding approvals

Плохой сценарий:

- approvals сведены к одному полю `status`.

Правильная граница:

- approval request как отдельный объект с history, queue и lifecycle.

### Risk 3. Treating import and dedup as post-MVP utilities

Плохой сценарий:

- MVP красив в demo, но не внедряем в реальный tenant.

Правильная граница:

- import/dedup входят в MVP wedge.

### Risk 4. Letting reporting become a platform project

Плохой сценарий:

- roadmap тонет в report builder and analytics ambitions.

Правильная граница:

- только executive operational visibility for agreed metrics.

## 11. Relationship to Implementation Guide

Следующий документ, `06_implementation_guide.md`, должен преобразовать этот roadmap в execution plan.

Разница между документами:

- `mvp_roadmap.md` отвечает на вопрос `что входит в MVP и в каком продуктово-логическом порядке`;
- `06_implementation_guide.md` должен ответить на вопрос `как именно это реализовывать фазами, с preconditions, runtime verification и done criteria`.
