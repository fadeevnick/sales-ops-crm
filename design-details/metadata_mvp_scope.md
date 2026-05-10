# Metadata MVP Scope

Документ фиксирует границу metadata-driven flexibility для MVP.

Цель:

- дать tenant-specific configurability;
- не скатиться в premature low-code platform;
- заранее определить, что именно configurable in MVP and what is deferred.

## 1. What metadata must support in MVP

### Supported entities

- `Account`
- `Contact`
- `Opportunity`

### Supported configurable capabilities

- custom fields
- field labels
- field requiredness for target stages
- opportunity stage definitions
- saved view compatibility with fields and stages

## 2. Supported Custom Field Types

Для MVP поддерживать только такой controlled set:

- `text`
- `long_text`
- `number`
- `currency`
- `date`
- `boolean`
- `single_select`

### Deliberately deferred

- multi-select
- formula fields
- rollups
- computed cross-object fields
- file fields as metadata-defined field type
- dynamic reference fields to arbitrary objects

## 3. Scope of Configurability

### Opportunity

MVP allows:

- add custom fields
- define stage list
- define stage order
- set required fields per stage

MVP does not allow:

- arbitrary stage graph editor
- complex branching workflow designer
- custom object creation

### Account and Contact

MVP allows:

- add custom fields
- use those fields in forms and lists where supported

MVP does not allow:

- separate custom lifecycle engines for accounts/contacts

## 4. Metadata Publication Model

MVP configuration model:

```text
draft config
→ validate
→ publish
→ runtime uses published config
```

### Why this matters

- prevents partial activation
- keeps views/forms/validation consistent
- supports auditability of configuration changes

## 5. Required Validation Before Publish

### Must check

- field keys are unique within entity scope
- field types are supported
- required fields referenced by stages exist
- stages have valid order and stable keys
- fields referenced by saved views still exist
- fields referenced by approval or import mappings are not silently broken

### Should block publish

- deleting field used by active saved view
- deleting field used in approval-relevant logic
- stage removal that strands existing opportunities without migration rule

## 6. Runtime Behavior Requirements

Published metadata must drive:

- create/edit forms
- stage validation
- list column availability
- filter availability where supported
- import mapping targets
- opportunity workspace display

MVP may defer full use of custom fields in:

- advanced dashboard slices
- all export variants
- every future automation hook

## 7. Stable Keys vs Display Labels

Rule:

- metadata entities need stable keys for runtime and integration logic
- labels may change for UI

Example:

- stage key: `pending_approval`
- stage label: `Pending Finance Review`

This prevents runtime breakage from cosmetic label changes.

## 8. Naming Rules

### Custom fields

- stable machine key required
- human label required
- entity scope required
- type required

### Stages

- stable stage key required
- display label required
- order index required

## 9. What Not to Build in MVP

Do not build yet:

- generic metadata language
- expression engine
- arbitrary workflow triggers
- custom objects
- full admin studio for every domain concept
- universal schema composer

This MVP needs configurable process support, not a platform product.

## 10. Implementation Consequences

From this scope follow concrete implementation boundaries:

- forms can be metadata-aware without being fully generated from arbitrary schema trees;
- DB design can remain controlled around core entities;
- validation engine can stay focused on stage + field rules;
- approval system can consume limited metadata references instead of full rules DSL.
