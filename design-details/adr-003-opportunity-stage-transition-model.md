# ADR-003 Opportunity Stage Transition Model

Статус:

```text
drafted
```

Дата:

```text
2026-05-07
```

## 1. Context

`Opportunity` является главным operational business object в MVP.

При этом у неё есть два разных, но связанных измерения состояния:

- tenant-specific `stageKey` внутри pipeline;
- global business status around approval and closure.

Если не зафиксировать boundary сейчас, реализация почти неизбежно скатится в один из плохих вариантов:

- free-form update arbitrary `status` field;
- direct `PATCH` stage without business command semantics;
- смешение tenant pipeline stage и approval outcome в одном плоском списке статусов;
- controller-level ad hoc validation for every move.

Это противоречит уже зафиксированным требованиям:

- `FR-010`: stage transitions must pass business validation rules;
- `FR-011`: stages requiring approval cannot be entered without required approval path;
- `FR-030`: approval outcome must affect business state consistently;
- state machine baseline already defines explicit transition gate and terminal closed states.

Нужен явный business contract, который удержит lifecycle от деградации в generic status CRUD.

## 2. Decision

Для MVP stage change является `explicit business command`, а не свободным полевым апдейтом.

Это значит:

1. opportunity stage меняется только через dedicated transition command;
2. transition проходит через централизованный policy/validation gate;
3. tenant-specific stage и global business status хранятся как разные, но связанные части модели;
4. approval gates не реализуются как “ещё один optional validation if” внутри UI;
5. closed states считаются terminal в MVP, если не появится отдельный reopen decision later.

Иными словами:

```text
opportunity stage is a controlled lifecycle transition,
not a generic mutable attribute
```

## 3. Stage Model Boundary

### 3.1 Tenant-specific stage layer

Tenant управляет:

- stage definitions;
- stage order;
- stage labels;
- required fields by stage;
- metadata flags around approval-relevant entry if allowed by future config model.

### 3.2 Global business status layer

Независимо от tenant stage model, opportunity имеет canonical business status around approval and closure:

- `active`
- `pending_approval`
- `approved_to_progress`
- `blocked_by_rejection`
- `closed_won`
- `closed_lost`

### 3.3 Decision

Tenant stage и global status не должны сливаться в один field.

Причина:

- tenant stage отражает pipeline semantics;
- global status отражает approval/closure constraints;
- один список статусов быстро создаёт путаницу и ломает later validation/reporting logic.

## 4. Transition Command Boundary

### 4.1 Allowed write path

Stage transition выполняется через explicit command вида:

```text
move opportunity to target stage
```

А не через generic:

```text
update opportunity payload with stage=status
```

### 4.2 Required gate sequence

Каждый transition проходит один и тот же logical pipeline:

1. load current opportunity in tenant scope;
2. check access to modify this opportunity;
3. validate target stage exists and is allowed in published config;
4. validate opportunity is not in terminal closed state;
5. validate required fields for target stage;
6. validate approval gate if target stage requires it;
7. apply stage transition;
8. update global business status if needed;
9. append audit record.

### 4.3 Consequence

Нельзя давать отдельным контроллерам или UI flows напрямую мутировать stage bypassing this sequence.

## 5. Approval Gate Interaction

### 5.1 Core rule

Некоторые transitions допускаются только при наличии соответствующего approval state.

### 5.2 MVP semantics

В MVP должны поддерживаться как минимум такие случаи:

- transition allowed with no approval gate;
- transition blocked because required approval request is missing;
- transition blocked because approval is pending;
- transition allowed after approval gate passed;
- transition blocked after rejection until business action is taken.

### 5.3 Boundary

Stage transition model не владеет full approval lifecycle, но обязан уметь спрашивать:

- requires approval?
- is there valid active approval state for this move?
- does current approval outcome allow progression?

### 5.4 Consequence

Approval logic и stage logic связаны, но не должны сливаться в одну flat status machine.

## 6. Terminal and Restricted States

### 6.1 Terminal states

В MVP terminal states:

- `closed_won`
- `closed_lost`

После входа в terminal state:

- обычные stage transitions запрещены;
- обычные approval submissions не запускаются;
- reopen не поддерживается без отдельного будущего решения.

### 6.2 Restricted states

Restricted, but not terminal:

- `pending_approval`
- `blocked_by_rejection`

Они ограничивают движение сделки, но не делают record immutable.

### 6.3 Consequence

UI и API не должны трактовать `pending_approval` как просто cosmetic badge. Это lifecycle constraint.

## 7. Validation Boundary

### 7.1 Required field validation

Stage move обязан проверять required fields for target stage centrally, а не только на create/edit form.

### 7.2 Why

- form validation можно обойти;
- import/bulk/future automation paths тоже будут менять business records;
- lifecycle invariants должны жить в application/domain boundary.

### 7.3 Additional invariants

Также transition layer должен быть готов проверять:

- owner/scope permission;
- close-specific field completeness;
- approval-relevant field stability when appropriate;
- incompatibility with closed state.

## 8. Audit Boundary

Каждый успешный transition обязан создавать business-readable audit entry.

Минимум должно фиксироваться:

- actor;
- previous stage;
- target stage;
- previous global status if changed;
- new global status if changed;
- timestamp;
- reason/comment when applicable.

Не допускается silent lifecycle mutation without timeline entry.

## 9. Rejected Alternatives

### 9.1 Generic PATCH of stage field

Отклонено потому что:

- не даёт гарантированного gate sequence;
- распыляет validation по разным слоям;
- делает audit и invariants случайными.

### 9.2 One flat status field for everything

Отклонено потому что:

- смешивает pipeline semantics, approval state и terminal closure;
- усложняет reasoning about allowed transitions;
- делает reporting и UI explanation хуже.

### 9.3 Hardcoded global enum-only pipeline

Отклонено потому что:

- противоречит tenant-specific stage configurability;
- разрушает CRM/ERP overlay value.

### 9.4 Fully dynamic workflow graph in MVP

Отклонено потому что:

- это premature workflow-platform expansion;
- не нужно для first CRM transactional loop.

## 10. Consequences

### Positive consequences

- `Phase 2` получает чёткий business command model;
- stage movement, validation and audit связываются в один contract;
- Phase 3 approvals можно подключать через explicit gate, а не переписывать lifecycle;
- metadata-driven stages later can evolve without ломки базового transition discipline.

### Negative consequences

- нужен отдельный transition policy layer вместо простого CRUD;
- часть seemingly simple updates станет command-driven;
- потребуется явно держать два связанных измерения состояния:
  - tenant stage
  - global business status

Это acceptable complexity, потому что она отражает реальную доменную сложность.

## 11. Guardrails for Future Phases

### 11.1 For Phase 2 coding

Разрешено:

- dedicated move-stage endpoint/command;
- centralized `StageTransitionPolicy`;
- required field checks;
- closed-state protection;
- audit append on move.

Нельзя:

- разрешать generic stage mutation через `PATCH opportunity`;
- делать validation only in frontend;
- трактовать closed records как normally editable pipeline records.

### 11.2 For Phase 3 coding

Approval module может влиять на global business status и gate decisions, но не должен забирать на себя ownership of tenant stage movement.

### 11.3 For Phase 4 coding

Metadata-driven stage configurability может менять available stage definitions, но не должна убирать centralized transition contract.

## 12. Result

Для MVP принято решение:

```text
opportunity stage movement is a command-driven lifecycle transition
guarded by validation, approval gate checks and audit
```

Это и есть boundary, который должен удержать CRM core от деградации в status CRUD.
