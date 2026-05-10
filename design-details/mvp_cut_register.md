# MVP Cut Register

Implementation-near guardrail для:

```text
MVP scope discipline and cut decisions
```

Этот документ отвечает на вопрос:

```text
что нельзя резать из MVP wedge,
что можно безопасно сузить,
что надо резать первым при перегрузе,
и какие решения чаще всего раздувают CRM / ERP проект раньше времени
```

Это не roadmap и не status tracker.

## 1. Purpose

Назначение этого документа:

- защитить продукт от scope creep во время implementation phases;
- дать жёсткий порядок `cut last / narrow first / cut first`;
- не дать MVP расползтись в `CRM/ERP вообще`;
- помочь будущим coding sessions принимать решения без возврата к новым идеям.

## 2. MVP Wedge That Must Survive

MVP сохраняет смысл только если одновременно остаются три вещи:

1. `sales pipeline` как operational system of record;
2. `approval workflow` как governance layer;
3. `metadata-driven configurability` как enterprise-flexibility differentiator.

Если в какой-то момент одна из этих трёх частей выпадает, продукт перестаёт быть тем standalone project, который мы выбрали.

## 3. Cut-Last Capabilities

Эти capability groups нельзя вырезать из MVP без разрушения wedge.

### 3.1 Tenant-aware authenticated shell

Должно остаться:

- tenant context;
- user context;
- role baseline;
- role-aware workspace shell.

Почему cut-last:

- без этого невозможно честно строить sharing, approvals и admin configurability.

### 3.2 Core sales transactional loop

Должно остаться:

- accounts;
- contacts;
- opportunities;
- activities;
- explicit stage transitions.

Почему cut-last:

- без transactional loop approval workflow превращается в абстрактный workflow tool.

### 3.3 Approval workflow core

Должно остаться:

- approval request как отдельный domain object;
- submit from opportunity;
- sequential approval steps;
- approve / reject / send back;
- approver inbox;
- decision history;
- влияние outcome на opportunity lifecycle.

Почему cut-last:

- это главный governance differentiator продукта.

### 3.4 Minimal metadata-driven configurability

Должно остаться:

- configurable fields для core CRM entities;
- configurable opportunity stages;
- required-field rules by stage;
- draft/publish boundary для process config.

Почему cut-last:

- без этого проект деградирует в обычный fixed-process CRM.

### 3.5 Baseline access and business audit

Должно остаться:

- owner-based access;
- manager visibility baseline;
- audit history for critical business changes.

Почему cut-last:

- без этого approval-heavy CRM не будет enterprise-credible.

## 4. Safe Narrowing Inside MVP

Эти вещи должны остаться в MVP area, но их можно сознательно упрощать.

### 4.1 Approval scope narrowing

Можно сузить до:

- только sequential approvals;
- ограниченного набора request types;
- ограниченного policy matcher;
- без сложных escalations;
- без delegation chains;
- без parallel approval branches.

### 4.2 Metadata scope narrowing

Можно сузить до:

- custom fields только на core entities;
- ограниченного набора field types;
- без custom objects;
- без formula engine;
- без arbitrary validation DSL;
- без metadata-driven page builder.

### 4.3 Sharing scope narrowing

Можно сузить до:

- owner visibility;
- manager team visibility;
- admin override;
- без territory model;
- без field-level visibility;
- без record-sharing exceptions matrix.

### 4.4 Import/export scope narrowing

Можно сузить до:

- CSV only;
- one import path per entity;
- create-only plus minimal update mode;
- basic async execution and result report;
- limited export paths from controlled lists/views.

### 4.5 Reporting scope narrowing

Можно сузить до:

- fixed executive widgets;
- pipeline summary;
- approval bottleneck summary;
- without universal report builder;
- without arbitrary drilldowns on every custom field.

### 4.6 Deduplication scope narrowing

Можно сузить до:

- duplicate candidates for accounts and contacts;
- manual review queue;
- limited merge model;
- без full fuzzy-matching tuning UI;
- без automatic merge.

## 5. Cut-First Order If Scope Slips

Если сроки или implementation complexity начинают расползаться, резать нужно в таком порядке.

### 5.1 First cuts

Резать первым:

1. richness of executive dashboards;
2. advanced export variants;
3. advanced import upsert modes;
4. approval escalations and timers;
5. reporting on every custom-field dimension;
6. field-level visibility;
7. sophisticated dedup scoring/tuning;
8. non-essential audit presentation polish.

### 5.2 Second cuts

Если перегруз продолжается, резать следующим слоем:

1. merge breadth beyond accounts and contacts;
2. approval request type variety;
3. optional activity variants;
4. saved-view richness;
5. metadata support for less critical entities.

### 5.3 Cuts that should happen only under strong pressure

Резать только если иначе MVP не доживает:

1. import complexity beyond create-only;
2. dashboard slice count;
3. manager visibility richness beyond baseline;
4. audit detail on lower-value actions.

### 5.4 Do not cut

Не резать:

1. opportunity-centric transactional loop;
2. approval request as separate aggregate;
3. configurable stages;
4. configurable fields baseline;
5. owner/manager visibility baseline;
6. append-only decision history;
7. tenant-aware shell.

## 6. Phase-Specific Cut Guidance

## 6.1 Phase 1

Сохранять:

- tenant/user/role baseline;
- server-side tenant resolution;
- role-aware shell;
- stable `/api/me`.

Можно не добавлять:

- real SSO;
- advanced auth provider integration;
- rich profile/preferences layer.

## 6.2 Phase 2

Сохранять:

- accounts, contacts, opportunities, activities;
- explicit stage move command;
- manager baseline visibility.

Можно не добавлять:

- rich list customization;
- mass-edit;
- advanced search;
- complex reassignment automation.

## 6.3 Phase 3

Сохранять:

- approval request boundary;
- sequential steps;
- approver inbox;
- approve/reject/send back;
- lifecycle linkage to opportunity.

Можно не добавлять:

- parallel branches;
- escalations;
- delegation;
- generic policy builder UI;
- multi-object approvals.

## 6.4 Phase 4 and Phase 5

Сохранять:

- custom fields baseline;
- configurable opportunity stages;
- required-field rules;
- owner/manager access semantics.

Можно не добавлять:

- custom objects;
- formula fields;
- territory engine;
- field-level ACL;
- metadata-driven page layout designer.

## 6.5 Phase 6 and Phase 7

Сохранять:

- CSV import baseline;
- async execution;
- error report;
- duplicate review;
- merge baseline for accounts/contacts;
- audit for critical business changes.

Можно не добавлять:

- complex upsert strategies;
- fuzzy-matching tuning UI;
- opportunity merge;
- import templates marketplace;
- bulk API.

## 6.6 Phase 8

Сохранять:

- fixed pipeline summary;
- fixed approval bottleneck summary.

Можно не добавлять:

- report builder;
- ad hoc analytics;
- custom dashboard designer;
- broad metric catalog.

## 7. Common Scope Expansion Triggers

Если в обсуждении появляются следующие формулировки, почти наверняка начинается premature expansion:

- `давайте сразу сделаем generic workflow engine`
- `раз уж есть metadata, давайте добавим custom objects`
- `раз уж есть approvals, давайте ещё contract workflow`
- `раз уж есть import, давайте bulk API и integrations framework`
- `раз уж есть reporting, давайте universal report builder`
- `раз уж есть roles, давайте full territory/sharing engine прямо сейчас`

Это не “полезные улучшения”, а типичный путь в platform sprawl.

## 8. Decision Rules Under Pressure

Если implementation pressure растёт, применять такие правила:

1. `Narrow before cut`:
   сначала упрощать capability, а не удалять core wedge.
2. `Fixed flows before builders`:
   сначала готовые workflows, потом designers/builders.
3. `One good path before many modes`:
   один надёжный import path лучше, чем три полуготовых.
4. `Policy subset before policy platform`:
   ограниченный approval matcher лучше, чем generic DSL.
5. `Executive read models before BI ambitions`:
   фиксированные summaries лучше, чем универсальный analytics layer.

## 9. What Future Coding Sessions Should Use This For

Этот документ должен использоваться в coding sessions как decision filter.

Перед тем как добавлять новую capability, нужно проверить:

1. усиливает ли она wedge;
2. относится ли она к `cut-last`, `safe narrowing` или `cut-first`;
3. не переводит ли она продукт из `Sales Ops CRM with approvals` в generic enterprise platform.

## 10. Exit Condition

Документ считается достаточно хорошим, если по нему можно быстро ответить на три вопроса:

1. что нельзя вырезать из MVP;
2. что можно сузить без разрушения продукта;
3. что нужно резать первым при scope pressure.
