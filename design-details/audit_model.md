# Audit Model

Документ фиксирует business audit baseline для MVP.

Цель:

- заранее отделить business audit от технических логов;
- определить, какие действия обязательно должны быть объяснимы постфактум;
- подготовить timeline model для opportunities, approvals, metadata and data quality actions.

## 1. Audit vs Operational Logs

### Operational logs answer

- what happened in runtime
- request failures
- system health
- dependency issues

### Business audit answers

- кто изменил запись
- кто сменил owner
- кто отправил approval request
- кто и почему согласовал исключение
- кто выполнил merge
- какая published config была активна в момент действия

Rule:

- business audit is a product feature
- operational logs are infrastructure/runtime feature

## 2. Audit Event Minimum Shape

Каждый critical audit event должен содержать:

- `eventId`
- `tenantId`
- `actorUserId`
- `actorDisplayName`
- `eventType`
- `targetType`
- `targetId`
- `occurredAt`
- `summary`
- `context`

### `summary`

Short business-readable line:

- `Owner changed from Anna Petrova to Michael Green`
- `Discount exception submitted for 14 percent`

### `context`

Structured details for deeper UI and forensic use:

- before/after fragments
- related approval request id
- related import job id
- related merge id
- metadata version id if relevant

## 3. Event Types Required in MVP

### Identity / access-sensitive

- user_logged_in_demo
- owner_reassigned
- export_requested

### Core records

- account_created
- account_updated
- contact_created
- contact_updated
- opportunity_created
- opportunity_updated
- opportunity_stage_changed
- activity_created

### Approval

- approval_request_submitted
- approval_step_approved
- approval_step_rejected
- approval_step_sent_back
- approval_request_superseded

### Metadata

- custom_field_created
- custom_field_updated
- stage_definition_updated
- config_validated
- config_published

### Import / data quality

- import_job_started
- import_job_completed
- duplicate_candidate_reviewed
- records_merged

## 4. Target Timelines in MVP

### Opportunity timeline

Must show:

- creation
- important updates
- stage changes
- owner changes
- linked approval events

### Approval timeline

Must show:

- submission
- current step activation
- decisions
- send back / rejection / superseded

### Configuration timeline

Must show:

- draft changes
- validation result
- publication event

### Data quality timeline

Must show:

- import start/completion
- duplicate review outcomes
- merge actions

## 5. Events That Must Be Append-Only

These cannot be silently rewritten:

- approval decisions
- owner reassignment history
- stage transition history
- config publish history
- merge history

UI may present corrected context later, but original historical event must remain traceable.

## 6. Events That Need Before/After Context

- owner_reassigned
- opportunity_stage_changed
- important opportunity field update
- metadata field update
- merge action

Minimal before/after should be stored as compact business-relevant deltas, not full entity snapshots by default.

## 7. Correlation Requirements

Audit must allow correlation between:

- opportunity and approval request
- opportunity and owner changes
- import job and created/updated records where feasible
- duplicate candidate and merge action
- business action and published metadata version

## 8. MVP UI Expectations

Audit should appear as:

- timeline on opportunity detail
- timeline on approval request detail
- history on admin configuration screens
- merge/import history in admin tools

MVP does not need:

- full audit query language
- universal cross-domain audit explorer
- compliance export suite

## 9. Implementation Consequences

From this model follow concrete design rules:

- timeline rendering should not depend on parsing raw application logs;
- audit append should happen close to transaction boundary of critical action;
- approval decisions need dedicated immutable records, not only status fields;
- metadata publish should store enough context to understand what changed and when.
