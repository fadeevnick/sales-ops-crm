# ADR-005 Access Enforcement Layer

Статус:

```text
drafted
```

Дата:

```text
2026-05-07
```

## 1. Context

Для этого продукта access model является не вторичной technical detail, а частью core domain architecture.

Причины:

- ownership-based visibility;
- manager team scope;
- approver-specific limited context;
- field-level restrictions;
- access-aware views, exports and dashboards;
- tenant isolation across all record and config data.

Мы уже зафиксировали:

- access matrix с role/record/field/action baseline;
- separate shell/auth boundary;
- separate opportunity and approval aggregates;
- requirement that approvers see limited context rather than broad CRM browse rights.

Если не определить enforcement boundary явно, implementation почти неизбежно расползётся в плохие формы:

- controller-level `if role == ...` everywhere;
- frontend-only hiding of modules or fields;
- repositories that return too much data and rely on callers to filter later;
- exports and dashboards that bypass normal scope checks;
- approver views that accidentally expose full opportunity payload.

Это противоречит already accepted architecture:

- `Sharing & Access` is a separate module;
- access rules affect queries, exports, approvals and dashboards;
- simple controller checks are explicitly insufficient;
- query layer must be access-aware.

## 2. Decision

Для MVP access enforcement строится как `centralized policy layer + access-aware query and command boundaries`.

Это значит:

1. controllers do not own access rules;
2. frontend does not own access rules;
3. access is enforced both on command path and on read/query path;
4. field visibility is enforced before projection leaves backend;
5. exports, dashboards and approval context must reuse the same access model, not invent their own.

Иными словами:

```text
access is server-owned,
centralized,
and applied before data leaves the trusted boundary
```

## 3. Access Decision Layers

Для каждого access decision в MVP действуют четыре уровня:

1. `Role permission`
2. `Record scope`
3. `Field visibility`
4. `Action permission`

### 3.1 Role permission

Отвечает на вопрос:

```text
может ли эта роль вообще работать с данным типом модуля или operation class
```

Примеры:

- `sales_rep` may create opportunity;
- `finance_approver` may decide approval when assigned;
- `executive` may see aggregates but not broad raw activity feed.

### 3.2 Record scope

Отвечает на вопрос:

```text
какие именно records внутри этого domain set доступны этому user context
```

Примеры:

- own opportunities;
- team opportunities;
- all tenant records for admin;
- approval-linked limited record set for approvers.

### 3.3 Field visibility

Отвечает на вопрос:

```text
какие поля внутри уже доступного record можно реально раскрыть этой роли
```

Примеры:

- amount visible;
- margin-sensitive field hidden;
- legal notes hidden;
- approval context reduced projection.

### 3.4 Action permission

Отвечает на вопрос:

```text
может ли user выполнить конкретный command над уже доступным record
```

Примеры:

- view opportunity allowed;
- reassign owner forbidden;
- approve request allowed only for assigned approver;
- publish metadata config admin-only.

## 4. Enforcement Boundary by Layer

### 4.1 Frontend layer

Frontend может:

- hide modules not present in shell context;
- hide unavailable buttons or actions;
- render reduced projections returned by backend.

Frontend не может:

- be source of truth for permissions;
- enforce tenant isolation;
- decide record scope;
- rely on UI hiding as real security boundary.

### 4.2 Controller layer

Controllers могут:

- require authenticated/resolved context;
- reject obviously unauthorized entrypoints;
- delegate to access-aware services.

Controllers не должны:

- содержать full access matrix inline;
- строить record-scope conditions вручную;
- manually strip sensitive fields post hoc;
- duplicate business access rules across endpoints.

### 4.3 Service / policy layer

Именно здесь должны жить:

- centralized permission decisions;
- action checks;
- high-level access orchestration;
- calls into scope-aware query/repository functions;
- selection of reduced projections for special contexts.

### 4.4 Query / repository layer

Именно здесь должно применяться:

- tenant boundary;
- record scope filters;
- reduced projections where full entity exposure is unsafe;
- drill-down scope for lists, exports and dashboards.

Ключевое правило:

```text
never fetch broad raw data and rely on callers to trim it later
```

### 4.5 Projection layer

Field visibility must be enforced in backend projections and DTO assembly.

То есть:

- approval context gets approval-specific projection;
- executive drill-down gets reporting-safe projection;
- export rows are filtered before file generation;
- hidden fields never leave the server response shape for that role.

## 5. Command Path vs Query Path

### 5.1 Command path

Command path должен проверять:

- authenticated user context;
- role permission;
- record scope;
- action permission;
- sometimes field-level business rule if action touches sensitive attributes.

Примеры:

- move opportunity stage;
- submit approval request;
- approve/reject/send back;
- reassign owner;
- publish metadata config.

### 5.2 Query path

Query path должен проверять:

- authenticated user context;
- role permission to browse/query this domain;
- record scope in SQL/query builder layer;
- field visibility in returned projection.

Примеры:

- list opportunities;
- approval inbox;
- manager pipeline;
- export generation;
- dashboard drill-down.

### 5.3 Why both matter

Если защищать только command path:

- record leaks произойдут через lists and exports.

Если защищать только query path:

- forbidden actions будут всё равно проходить.

## 6. Special Case: Approver Access

### 6.1 Decision

Approver access не должен implicitly grant full CRM browsing rights.

### 6.2 Enforcement rule

Approver получает:

- assigned approval requests;
- minimal linked opportunity/account context;
- only fields needed for decision;
- historical requests where user was actor, according to policy.

Approver не получает:

- broad account/contact browse;
- broad opportunity list beyond approval-linked context;
- full raw activity stream;
- hidden internal fields by default.

### 6.3 Consequence

Approval screens must use reduced projections,
not ordinary full opportunity detail queries.

## 7. Special Case: Exports, Dashboards and Drill-Down

### 7.1 Export

Export must be generated from already access-aware query scope.

Нельзя:

- дать frontend filter JSON and dump DB rows;
- export hidden fields and trust UI not to show them.

### 7.2 Dashboard drill-down

Dashboard aggregates may be broader than raw record browsing,
but drill-down must re-enter the same access-aware query layer as regular lists.

### 7.3 Consequence

Dashboards and exports are not exceptions to access rules.
They are high-risk consumers of the same access model.

## 8. Tenant Boundary Rule

Tenant isolation is not optional filtering.

Это hard rule:

- every command path resolves tenant server-side;
- every query path scopes to tenant before role or ownership logic;
- no client-supplied `tenantId` acts as authority input.

Access enforcement starts from tenant boundary, not after it.

## 9. Rejected Alternatives

### 9.1 Controller-only access checks

Отклонено потому что:

- слишком легко пропустить query path leaks;
- logic begins duplicating across endpoints;
- exports and dashboards bypass become likely.

### 9.2 Frontend-only hiding

Отклонено потому что:

- это UX convenience, not security;
- cannot protect APIs, exports or background jobs.

### 9.3 Fetch broad entity then trim later

Отклонено потому что:

- sensitive fields already crossed trust boundary;
- callers will forget to trim consistently;
- approval projections become unsafe.

### 9.4 One giant role enum switch everywhere

Отклонено потому что:

- creates duplication and drift;
- becomes unmaintainable once scopes differ by module and query path;
- mixes permission, scope and projection concerns.

## 10. Consequences

### Positive consequences

- access decisions become consistent across modules;
- approver visibility remains narrow by construction;
- exports and dashboards stop being likely backdoors;
- future coding has clearer ownership of access logic;
- tests can target one explicit enforcement model.

### Negative consequences

- requires dedicated policy layer early;
- repositories/queries become slightly more structured;
- some projections must be role-aware rather than one-size-fits-all.

Это acceptable complexity because access is part of the product, not a cosmetic add-on.

## 11. Guardrails for Future Phases

### 11.1 For Phase 1 coding

Разрешено:

- shell module visibility on backend;
- session-based resolved user context;
- unified `401/403` error contract.

Нельзя:

- trust frontend as authority on visibility;
- put role decisions inline across controllers.

### 11.2 For Phase 2 coding

Разрешено:

- owner/team scope queries;
- admin all-tenant scope under same tenant boundary;
- action checks for stage move and reassign.

Нельзя:

- build list endpoints without access-aware query scope;
- expose full entity and hope UI hides fields.

### 11.3 For Phase 3 coding

Разрешено:

- approval-specific reduced projections;
- assigned-approver queue scope;
- separate approval visibility policy.

Нельзя:

- reuse full opportunity detail endpoint as approver context by default;
- treat approval role as implicit broad CRM reader.

### 11.4 For later phases

Views, exports, dashboards, reporting and metadata-aware queries must plug into the same central access model rather than inventing parallel permission systems.

## 12. Result

Для MVP принято решение:

```text
access is enforced centrally in server-side policy, query and projection layers,
not scattered across controllers or delegated to the frontend
```

Это и есть boundary, который должен удержать RBAC/sharing from dissolving into inline conditions.
