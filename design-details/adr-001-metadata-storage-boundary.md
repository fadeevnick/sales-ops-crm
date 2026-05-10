# ADR-001 Metadata Storage Boundary

Статус:

```text
drafted
```

Дата:

```text
2026-05-07
```

## 1. Context

Для этого standalone project metadata-driven flexibility является частью MVP wedge, но не самоцелью.

Продукту действительно нужны:

- configurable fields for core CRM entities;
- configurable opportunity stages;
- required-field rules by stage;
- draft/publish boundary for configuration.

При этом проект нельзя рано уводить в:

- custom-object platform;
- low-code schema composer;
- formula/expression engine;
- arbitrary workflow DSL;
- metadata-driven page builder.

Архитектурное давление здесь реальное:

- metadata должна влиять на forms, validation, views, import mapping и approval-relevant checks;
- runtime должен опираться на published config, а не на ad hoc admin edits;
- core CRM records и approval domain не должны раствориться в “универсальной платформенной модели”.

Без явного ADR высок риск, что в `Phase 4` и позже metadata слой начнёт разрастаться быстрее, чем transactional core и governance model.

## 2. Decision

Для MVP metadata хранится как `controlled extension layer` поверх фиксированной core domain model.

Это значит:

- core business entities `Account`, `Contact`, `Opportunity`, `Activity`, `ApprovalRequest` остаются явно моделируемыми доменными сущностями;
- metadata расширяет только заранее разрешённые части этих сущностей;
- metadata не становится универсальным runtime schema engine;
- published metadata используется приложением как конфигурация поведения, а не как замена доменной модели.

На storage boundary это означает:

1. core standard fields хранятся как обычные columns в контролируемой relational schema;
2. metadata definitions хранятся отдельно от operational records;
3. values custom fields хранятся как extension data для конкретной core entity;
4. opportunity stages хранятся как tenant-scoped config records, а не как hardcoded enum;
5. required-field-by-stage rules хранятся как metadata rules limited to supported entities and field keys.

## 3. Allowed Metadata Scope in MVP

В MVP разрешено хранить только такой metadata scope.

### 3.1 Supported entity scope

- `Account`
- `Contact`
- `Opportunity`

`Activity` и `ApprovalRequest` не получают arbitrary custom fields в MVP.

### 3.2 Supported metadata capabilities

- custom fields;
- field labels;
- field requiredness by stage where applicable;
- opportunity stage definitions;
- stable stage order;
- draft/publish lifecycle;
- references from saved views, import mappings and limited approval-relevant validation.

### 3.3 Supported field types

- `text`
- `long_text`
- `number`
- `currency`
- `date`
- `boolean`
- `single_select`

### 3.4 Supported runtime effects

Published metadata может влиять на:

- create/edit forms for supported entities;
- list column availability where supported;
- filter availability where supported;
- stage validation;
- import mapping targets;
- opportunity workspace rendering;
- selected approval pre-submit checks that depend on field presence or requiredness.

## 4. Explicit Storage Boundary

### 4.1 Core principle

Metadata definitions и metadata values должны храниться отдельно от core schema definitions, но не должны уничтожать типизированную доменную модель.

### 4.2 Boundary rules

1. Нельзя превращать standard fields `Account`, `Contact`, `Opportunity` в generic key-value storage.
2. Нельзя хранить весь domain object только как opaque JSON document ради “гибкости”.
3. Нельзя делать custom fields главным способом моделирования базовых CRM concepts.
4. Нельзя подменять approval or access rules arbitrary metadata DSL.
5. Нельзя требовать dynamic code generation or runtime schema rebuild для каждой publish operation.

### 4.3 Practical implication

Storage design должен поддерживать такую форму:

- standard relational columns for core records;
- separate metadata definition tables;
- separate custom value storage keyed by:
  - tenant
  - entity type
  - entity record id
  - field key
- separate stage configuration storage;
- separate rule storage for required fields by stage.

Этот ADR фиксирует boundary, но не навязывает prematurely exact physical schema для всех metadata tables. Это будет детализация `Phase 4`.

## 5. Rejected Alternatives

### 5.1 Fully generic EAV-first platform model

Отклонено потому что:

- слишком рано размывает domain boundaries;
- усложняет queries, validation, reporting и audit;
- провоцирует строить “platform first”, а не product first.

### 5.2 JSON-document-per-record model

Отклонено потому что:

- ухудшает контроль над standard fields;
- делает access-aware queries и reporting сложнее;
- ослабляет дисциплину вокруг business invariants.

### 5.3 Custom objects already in MVP

Отклонено потому что:

- резко расширяет surface area продукта;
- тянет за собой generic relations, layouts, permissions, reporting и import semantics;
- ломает наш выбранный wedge как first standalone project.

### 5.4 Formula / expression engine in MVP

Отклонено потому что:

- создаёт отдельную platform problem space;
- требует dependency graph, recomputation semantics и richer validation model;
- не нужно для MVP proof.

### 5.5 Metadata-driven workflow platform

Отклонено потому что:

- approval core и stage transitions должны оставаться controlled domain flows;
- generic workflow design слишком быстро уводит проект из `Sales Ops CRM with approvals` в enterprise builder suite.

## 6. Consequences

### Positive consequences

- core CRM model остаётся сильной и читаемой;
- forms and validation могут быть metadata-aware без ухода в full low-code;
- query, reporting и audit design остаются реалистичными для MVP;
- approval and sharing boundaries не растворяются в generic metadata engine;
- Phase 4 остаётся product feature phase, а не platform rewrite.

### Negative consequences

- metadata flexibility сознательно ограничена;
- некоторые future asks будут откладываться даже если “кажутся естественными”;
- придётся поддерживать dual model:
  - standard fields
  - custom fields

Это допустимая цена за управляемый MVP.

## 7. Guardrails for Future Phases

### 7.1 For Phase 4

Разрешено:

- metadata definitions for supported entities;
- stage config storage;
- draft/validate/publish model;
- required-field-by-stage rules;
- metadata-aware forms and validation.

Запрещено:

- custom objects;
- arbitrary relation builder;
- formula engine;
- generic automation DSL;
- page-layout platform.

### 7.2 For Phase 5

Views and sharing должны читать published metadata, но не должны требовать universal schema abstraction для каждого query path.

### 7.3 For Phase 6 and 7

Import/export and dedup должны поддерживать custom fields только в узком контролируемом объёме, без превращения metadata layer в universal bulk mapping platform.

### 7.4 For Phase 8

Reporting должен сначала поддерживать fixed executive read models и only limited metadata-aware aggregations. Не строить universal analytics layer вокруг custom fields.

## 8. Decision Rules for Future Changes

Если в будущей сессии предлагается расширение metadata scope, нужно проверить:

1. усиливает ли это текущий wedge, а не generic platform ambition;
2. можно ли это выразить внутри controlled extension layer;
3. не требует ли это custom objects, formula engine или workflow DSL;
4. не ломает ли это query/audit/access discipline;
5. не переводит ли это `Phase 4` в самостоятельную platform program.

Если хотя бы на два пункта ответ негативный, change не должен входить в MVP path.

## 9. Result

Для MVP принято решение:

```text
metadata is an extension layer over a fixed core CRM model,
not a generic runtime schema platform
```

Это и есть boundary, который должен защищать следующие planning и coding steps.
