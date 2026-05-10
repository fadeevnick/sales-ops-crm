# State Machines

Документ фиксирует state machine baseline для ключевых lifecycle areas.

Цель:

- заранее ограничить хаос в domain transitions;
- не позволить важным состояниям вырасти как случайный набор статусов;
- подготовить explicit command handling in implementation.

## 1. Tenant Configuration Lifecycle

```text
draft
→ validated
→ published
→ superseded
→ archived
```

### Meanings

- `draft`: config edit in progress, not active in runtime
- `validated`: draft passed validation, still not active
- `published`: active runtime config
- `superseded`: old previously published config replaced by newer published config
- `archived`: no longer used, kept for history

### Allowed transitions

- `draft -> validated`
- `validated -> published`
- `draft -> archived`
- `published -> superseded`
- `superseded -> archived`

### Forbidden transitions

- `draft -> published` without validation
- `published -> draft`
- `archived -> published`

### Implementation consequence

- publish must be explicit command
- validation result must be persisted or reproducible
- runtime must only read `published` config

## 2. Opportunity Lifecycle

Tenant stages remain configurable, but there is a global business status layer:

```text
active
→ pending_approval
→ approved_to_progress
→ blocked_by_rejection
→ closed_won
→ closed_lost
```

### Meanings

- `active`: normal pipeline work
- `pending_approval`: opportunity cannot progress without current approval resolution
- `approved_to_progress`: approval gate passed, can continue pipeline
- `blocked_by_rejection`: request rejected and business action required before progress
- `closed_won`: deal won
- `closed_lost`: deal lost

### Rules

- tenant-specific `stageKey` and global status are related but not identical
- stage change may trigger global status change
- global status may constrain stage transitions

### Example constraints

- stage that requires approval cannot be entered without active approval request
- rejected approval can force `blocked_by_rejection`
- closed states are terminal in MVP unless later explicit reopen feature is introduced

## 3. Opportunity Stage Transition Gate

For every stage transition:

```text
requested transition
→ access check
→ required field validation
→ approval gate validation
→ transition applied
→ audit append
```

### Failure reasons

- no access
- missing required field
- approval request missing
- invalid target stage
- opportunity already closed

## 4. Approval Request Lifecycle

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

### Meanings

- `draft`: request prepared but not submitted
- `submitted`: request created and waiting for workflow activation
- `pending_step`: current approver action required
- `approved`: all required steps passed
- `rejected`: one required step rejected the request
- `sent_back`: request returned for revision
- `cancelled`: request cancelled before completion
- `superseded`: request invalidated by newer business context or replacement request

### Allowed transitions

- `draft -> submitted`
- `submitted -> pending_step`
- `pending_step -> approved`
- `pending_step -> rejected`
- `pending_step -> sent_back`
- `pending_step -> cancelled`
- `pending_step -> superseded`
- `sent_back -> submitted`

### Important invariants

- only one active conflicting request per policy scope
- each decision is append-only
- approval uses business snapshot taken at submit time
- if relevant opportunity data changes, request may become `superseded`

## 5. Approval Step Lifecycle

Each step inside approval request:

```text
inactive
→ active
→ approved
→ rejected
→ skipped
→ expired
```

### Rules

- sequential flow activates next step only after previous required step resolves
- `skipped` allowed for conditional or non-required step when policy says so
- `expired` only if escalation/timeout logic is included

## 6. Bulk Job Lifecycle

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

### Rules

- imports/exports should not remain in ambiguous "processing" state without progress semantics
- partial success is first-class, especially for CSV import
- terminal states in MVP: `completed`, `partially_completed`, `failed`, `cancelled`

## 7. Duplicate Candidate Lifecycle

```text
detected
→ under_review
→ dismissed
→ merged
```

### Meanings

- `detected`: candidate created by matching logic
- `under_review`: admin actively reviewing
- `dismissed`: false positive or no merge decision
- `merged`: candidate resolved by merge action

### Rule

- a merge must also create separate merge history record; candidate state alone is not enough for audit

## 8. Merge Action Lifecycle

```text
prepared
→ validated
→ applied
→ completed
```

### Rule

- merge should not jump directly from UI click to irreversible data mutation without validation
- validation must check relation rewiring feasibility and access authority

## 9. Audit Event Lifecycle

For critical business actions:

```text
action_requested
→ action_applied
→ audit_record_appended
```

### Rule

- audit append must happen in same logical operation boundary for critical actions
- no silent successful business mutation without timeline entry

## 10. Implementation Consequences

From these state machines follow concrete implementation rules:

- use explicit commands for lifecycle transitions;
- avoid generic free-form `status` mutation APIs;
- validate transitions centrally;
- test allowed and forbidden transitions early;
- record audit entries as part of critical state change flow.
