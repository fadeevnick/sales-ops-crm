# 00 Domain Reference

## Purpose

Этот документ фиксирует локальный domain snapshot для проекта `sales-ops-crm`.

Он нужен, чтобы проект сохранял CRM/ERP-specific framing внутри собственной папки и не зависел от внешнего domain catalog для базового понимания.

## Product Category

- CRM / ERP

## Concrete Product Direction

- B2B Sales Operations CRM with approvals

## What Substrate Does Not Cover

- metadata-driven CRM/ERP model;
- custom fields, configurable stages and tenant-specific process variation;
- approvals, sharing rules, reporting, import/export, deduplication and business audit semantics.

## Key Domain Entities

- accounts;
- contacts;
- opportunities;
- activities;
- approval requests;
- approval steps;
- configurable stages and custom field definitions.

## Critical Workflows

- sales rep manages account/contact/opportunity flow;
- commercial exception or quote request is submitted for approval;
- approvers review, approve, reject or send back;
- tenant admin configures fields/stages/views without custom code;
- legacy data is imported, validated, deduplicated and corrected.

## Policy / Compliance / Approval Pressure

- role-aware access and sharing are first-class requirements;
- approvals must be explicit, auditable and lifecycle-aware;
- important business changes must be attributable to a user and timestamp.

## Reporting / Audit / Data Pressure

- leadership needs pipeline and approval visibility from operational data;
- audit of business changes is mandatory, not optional logging;
- bulk operations, import/export and deduplication are part of core product value.

## Customization / Tenant Pressure

- tenants need configurable fields and stage definitions in MVP;
- product must support tenant variation without turning into a generic low-code platform;
- reporting and access model must remain coherent under customization.

## Explicit Non-Goals

- not a full ERP suite in MVP;
- not a generic custom-object platform in MVP;
- not a full CPQ, billing, inventory or accounting system in early phases.

## Impact On This Project

This domain baseline means:

- metadata, approvals, access and audit are architectural pressures, not later add-ons;
- CRM core, approval core and access model must stay separate but coordinated;
- scope must stay anchored to the sales-operations wedge and resist premature platform expansion.
