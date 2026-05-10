# ADR-004 Approval Request vs Opportunity Separation

Статус:

```text
drafted
```

Дата:

```text
2026-05-07
```

## 1. Context

`Opportunity` и `approval request` тесно связаны, но создают разное доменное давление.

`Opportunity` отвечает за:

- pipeline movement;
- ownership;
- commercial context;
- customer/account context;
- daily sales execution.

`Approval request` отвечает за:

- governance around exceptions;
- policy selection;
- business snapshot at submit time;
- step-by-step decision flow;
- immutable decision history;
- final approval outcome.

Если не зафиксировать boundary явно, реализация почти неизбежно поползёт в один из плохих вариантов:

- approval lifecycle превратится в набор полей на `opportunity`;
- approval comments растворятся в generic activity stream;
- history решений станет mutable частью сделки;
- повторная отправка approval сломает traceability;
- race conditions между edit сделки и approval state начнут лечиться ad hoc.

Это уже противоречит зафиксированным решениям и требованиям:

- `FR-021`: approval request создаётся из opportunity, но является отдельным request;
- `FR-025`: approval must use snapshot of critical deal data;
- `FR-026`: conflicting active approvals must be controlled;
- `FR-028`: approval may be invalidated after approval-relevant changes;
- `FR-030`: approval outcome must change business state of opportunity consistently;
- architecture already states that approval request is separate from opportunity;
- Phase 3 file-level plan already introduced `OpportunityApprovalBridge.kt` specifically to avoid aggregate collapse.

## 2. Decision

Для MVP `approval request` является отдельным aggregate, связанным с `opportunity`, но не вложенным в неё как lifecycle sub-document.

Это значит:

1. `opportunity` остаётся primary sales aggregate;
2. `approval request` остаётся separate governance aggregate;
3. связь между ними осуществляется через explicit references and bridge logic;
4. approval history хранится на approval side, не на opportunity side;
5. opportunity хранит только минимальные approval-related markers, нужные для lifecycle constraints and workspace rendering.

Иными словами:

```text
opportunity owns the sales lifecycle,
approval request owns the approval lifecycle
```

## 3. What Lives on Opportunity

На `opportunity` в MVP должны жить:

- record identity;
- tenant ownership;
- account/contact linkage;
- owner and manager scope;
- commercial values in their current working state;
- tenant-specific stage;
- global business status;
- lightweight approval-related status marker;
- references to latest or active approval request when needed for navigation or gating.

### Opportunity must not own

На `opportunity` не должны жить как authoritative source:

- full approval step chain;
- approver decision history;
- approval comments as canonical record;
- policy version payload;
- submit-time deal snapshot;
- approval concurrency bookkeeping in flattened ad hoc fields.

## 4. What Lives on Approval Request

На `approval request` должны жить:

- request identity;
- linked `opportunityId`;
- request type;
- policy reference or policy version marker;
- submitter identity;
- submit-time snapshot of approval-relevant deal context;
- current approval state;
- sequential steps;
- step-level decisions;
- final decision record;
- invalidation / superseded / cancellation semantics;
- append-only decision history.

### Approval request must not own

`Approval request` не должен становиться владельцем:

- canonical opportunity stage;
- current commercial working values after later edits;
- account/contact record identity beyond references;
- daily sales activity stream;
- pipeline ownership model.

## 5. Relationship Model

### 5.1 Cardinality

В течение жизни одной opportunity может существовать несколько approval requests.

Причины:

- повторная отправка после `send back`;
- новое исключение по тому же deal;
- superseded request after critical business change;
- distinct policy-bound requests over time.

### 5.2 Active concurrency rule

При этом в MVP нельзя допускать несколько конфликтующих активных approval requests внутри одной policy scope без явного разрешающего правила.

Это rule живёт в approval aggregate boundary, а не как cosmetic UI warning.

### 5.3 Navigation implication

Opportunity detail может показывать:

- active approval summary;
- latest decision outcome;
- link to approval detail.

Но это projection of approval data, а не место хранения canonical approval history.

## 6. Snapshot Boundary

### 6.1 Core rule

Каждый approval request должен хранить snapshot approval-relevant deal data на момент submit.

### 6.2 Why

Без snapshot:

- approver decision становится привязан к moving target;
- audit теряет смысл;
- policy evaluation потом невозможно объяснить;
- later edits silently rewrite historical meaning of approval.

### 6.3 Consequence

Opportunity current values и approval snapshot могут расходиться.

Это не баг.
Это доменно правильное поведение.

## 7. Outcome Propagation Boundary

### 7.1 Core rule

Approval outcome может влиять на `opportunity`, но не должен переписывать её историю как будто approval “всегда был частью opportunity”.

### 7.2 What may propagate to opportunity

На opportunity side допустимо отражать:

- `pending_approval`
- `approved_to_progress`
- `blocked_by_rejection`
- active approval reference
- latest approval summary strip for UI

### 7.3 What must remain on approval side

На approval side должны оставаться:

- detailed step history;
- approver comments;
- approval timestamps;
- step transitions;
- superseded/cancelled lineage.

## 8. Activity Stream vs Approval History

### 8.1 Decision

Approval history не должна схлопываться в generic opportunity activity stream.

### 8.2 Why

- activities отражают daily execution;
- approval decisions отражают governance record;
- mutable comments/tasks и immutable decisions — это разный класс данных;
- later reporting and audit need the difference.

### 8.3 Consequence

Opportunity timeline может показывать derived approval events,
но canonical approval decision history живёт в approval aggregate.

## 9. Access Boundary

### 9.1 Opportunity access

Opportunity access живёт по sales ownership / manager / admin semantics.

### 9.2 Approval access

Approval access может быть уже и специальнее:

- submitter;
- active approver;
- manager/admin under explicit rules;
- limited context for approvers.

### 9.3 Consequence

Если approval history хранить просто внутри opportunity body, access model почти неизбежно начнёт течь.

Поэтому separate aggregate здесь не только про lifecycle, но и про безопасность.

## 10. Rejected Alternatives

### 10.1 Store approval as a few fields on opportunity

Отклонено потому что:

- не поддерживает step history как first-class record;
- ломает повторные submissions;
- делает snapshot и concurrency rules уродливыми;
- приводит к status-field explosion.

### 10.2 Put approval comments into generic activities

Отклонено потому что:

- activities mutable and operational;
- approval decisions must be immutable and auditable;
- теряется distinction between execution and governance.

### 10.3 Embed approval sub-document inside opportunity

Отклонено потому что:

- multiple approvals over lifetime становятся awkward;
- access boundary размывается;
- superseded/cancelled lineage становится запутанным.

### 10.4 Make approval aggregate own opportunity progression

Отклонено потому что:

- pipeline remains CRM core responsibility;
- approval only gates or influences progression;
- иначе approval module начнёт владеть продажной lifecycle model.

## 11. Consequences

### Positive consequences

- approval core остаётся объяснимым и auditable;
- repeated submissions и superseded flows становятся нормальной частью модели;
- opportunity lifecycle не загрязняется step-level approval details;
- access model can stay narrower for approvers;
- reporting later can distinguish sales activity from governance activity.

### Negative consequences

- нужен explicit bridge between aggregates;
- часть UI должна собирать composite view from two sources;
- потребуется отдельно думать о invalidation and propagation rules.

Это правильная цена за доменную точность.

## 12. Guardrails for Future Phases

### 12.1 For Phase 3 coding

Разрешено:

- `ApprovalRequest` as separate tables and services;
- `OpportunityApprovalBridge`;
- approval summary on opportunity detail;
- business status propagation to opportunity;
- active-request concurrency checks.

Нельзя:

- складывать approval steps into opportunity JSON/blob/columns;
- хранить canonical decision history in activities/comments;
- давать approval controller напрямую мутировать arbitrary opportunity fields.

### 12.2 For Phase 4 and Phase 5

Metadata and access layers могут влиять на forms, policy evaluation and visibility, но не должны уничтожать aggregate separation.

### 12.3 For reporting later

Executive/reporting projections должны уметь связывать opportunity и approval data, но не должны подменять их один другим.

## 13. Result

Для MVP принято решение:

```text
approval request is a separate governance aggregate linked to opportunity,
not an embedded extension of the opportunity record
```

Это и есть boundary, который должен удержать Phase 3 от collapse into opportunity fields and comments.
