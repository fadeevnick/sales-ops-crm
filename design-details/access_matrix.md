# Access Matrix

Документ фиксирует implementation-ready access baseline для MVP.

Цель:

- отделить role model от business modules;
- заранее определить record scope и action scope;
- снизить риск access leaks в views, exports, dashboards и approvals.

## 1. Roles in MVP

- `Sales Representative`
- `Sales Manager`
- `RevOps / CRM Administrator`
- `Finance Approver`
- `Commercial / Legal Approver`
- `VP Sales / Executive`

## 2. Access Decision Layers

Каждое access decision должно проверяться на четырёх уровнях:

1. `Role permission`
2. `Record scope`
3. `Field visibility`
4. `Action permission`

Пример:

- роль может иметь право видеть opportunities;
- но только в owner/team scope;
- без части sensitive fields;
- и без права approve или reassign owner.

## 3. Record Scope Model

### Accounts

- Sales Representative: accounts, где пользователь является owner или имеет явную связку через свои opportunities/contacts.
- Sales Manager: accounts, связанные со сделками своей команды.
- RevOps Admin: весь tenant scope.
- Approver: только accounts, которые нужны для активных approval requests, в ограниченном контексте.
- VP Sales / Executive: aggregated visibility by default; record drill-down только по policy-defined scope.

### Contacts

- Sales Representative: contacts в пределах своих accounts/opportunities.
- Sales Manager: contacts в пределах team scope.
- RevOps Admin: весь tenant scope.
- Approver: minimal context only for approval-related contacts.
- Executive: usually no full contact browse in MVP.

### Opportunities

- Sales Representative: свои opportunities.
- Sales Manager: opportunities своей команды.
- RevOps Admin: весь tenant scope.
- Finance / Legal Approver: opportunities, связанные с assigned approval requests, но с ограниченным полевым контекстом.
- Executive: dashboard aggregates plus drill-down according to reporting scope.

### Activities

- Sales Representative: свои activities и activities на своих opportunities.
- Sales Manager: team activities.
- RevOps Admin: весь tenant scope.
- Approver: no general activity feed; only approval-relevant notes if explicitly included.
- Executive: no default raw activity browse in MVP.

### Approval Requests

- Sales Representative: requests, созданные из своих opportunities.
- Sales Manager: requests по opportunities своей команды.
- RevOps Admin: весь tenant scope.
- Finance / Legal Approver: requests, где они являются current or historical step actor.
- Executive: aggregate approval metrics; no broad raw queue access by default.

### Metadata Configuration

- Sales Representative: no write access.
- Sales Manager: no write access in MVP.
- RevOps Admin: full create/update/publish access within allowed validation rules.
- Approvers: no write access.
- Executive: read-only summary at most, not default.

## 4. Core Permission Matrix

| Action | Sales Rep | Sales Manager | RevOps Admin | Finance Approver | Legal Approver | Executive |
|---|---|---|---|---|---|---|
| View accounts | Own scope | Team scope | All tenant | Limited approval context | Limited approval context | No default browse |
| Create account | Yes | Yes | Yes | No | No | No |
| Edit account | Own scope | Team scope when allowed | Yes | No | No | No |
| View contacts | Own scope | Team scope | All tenant | Limited approval context | Limited approval context | No default browse |
| Create contact | Yes | Yes | Yes | No | No | No |
| Edit contact | Own scope | Team scope when allowed | Yes | No | No | No |
| View opportunities | Own scope | Team scope | All tenant | Assigned approval context | Assigned approval context | Aggregate + drill-down |
| Create opportunity | Yes | Yes | Yes | No | No | No |
| Edit opportunity | Own scope | Team scope when allowed | Yes | No direct edit | No direct edit | No |
| Move opportunity stage | Yes within rules | Yes within scope | Yes | No | No | No |
| Reassign owner | No | Yes within team policy | Yes | No | No | No |
| View activities | Own scope | Team scope | All tenant | Limited context only | Limited context only | No |
| Create activities | Yes | Yes | Yes | No | No | No |
| Submit approval request | Yes | Yes | Yes | No | No | No |
| View approval queue | Own requests | Team requests | All tenant | Assigned requests | Assigned requests | Aggregate only |
| Approve / reject / send back | No | No by default | No by default | Yes when assigned | Yes when assigned | No |
| View metadata config | No | Read only later if needed | Yes | No | No | No |
| Edit metadata config | No | No | Yes | No | No | No |
| Publish metadata config | No | No | Yes | No | No | No |
| Run import | No | No by default | Yes | No | No | No |
| Review duplicates | No | No | Yes | No | No | No |
| Merge records | No | No | Yes | No | No | No |
| View dashboards | Limited own/team later | Yes | Yes | No default | No default | Yes |
| Export controlled views | Own scope only if enabled | Team scope if enabled | Yes | No default | No default | Aggregate exports only |

## 5. Field Visibility Baseline

### Always visible in relevant record scope

- record id
- name/title
- owner
- stage/status
- account/contact links where relevant
- expected amount
- close date

### Potentially restricted fields in MVP

- discount percentage
- payment terms
- margin-sensitive values
- risk-related custom fields
- internal manager comments
- legal exception notes

### Rule

Если поле скрыто для роли, оно не должно утекать через:

- detail view;
- list columns;
- filters;
- exports;
- dashboard drill-down.

## 6. Approval-Specific Access Rules

### Sales Representative

- видит свои approval requests;
- не может решать request;
- может видеть status, comments and outcome according to policy;
- может resubmit if request was sent back and edit rules allow it.

### Finance / Legal Approver

- видит только requests, где назначен текущим или историческим actor;
- видит минимально достаточный opportunity snapshot;
- не получает broad CRM browsing rights через approval role.

### RevOps Admin

- может просматривать approval flows для support/debug reasons;
- не является default business approver;
- не должен silently override decision history in MVP.

## 7. Dashboard and Reporting Access Rules

- Executive видит aggregates first.
- Drill-down должен проходить через тот же access-aware query layer, что и обычные lists.
- Dashboard не должен быть backdoor к record data.
- Manager видит team-level summaries, не global tenant data by default.

## 8. Export and Import Access Rules

### Export

- export всегда строится от уже разрешённого view/filter scope;
- field restrictions применяются до генерации файла;
- export action auditится.

### Import

- import запускает только RevOps Admin в MVP;
- imported owner references должны мапиться только на валидных tenant users;
- import не должен bypass metadata validation.

## 9. Implementation Consequences

Из этой матрицы следуют implementation requirements:

- нужен centralized access policy layer;
- list and drill-down queries must be access-aware;
- exports cannot be implemented as direct DB dump from frontend filters;
- approval context rendering must use reduced projection, not full raw opportunity entity;
- future tests must include negative access cases as first-class scenarios.
