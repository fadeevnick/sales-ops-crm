# 01 Business Requirements

## 1. Product Summary

Продукт: multi-tenant B2B Sales Operations CRM с согласованием скидок, коммерческих исключений и tenant-level customization.

Система предназначена для B2B sales teams, которые уже переросли spreadsheets и простую CRM, но ещё не хотят внедрять тяжёлый enterprise suite. Продукт должен объединить daily sales execution, approval governance, tenant customization, reporting и migration/import workflows в одной системе.

## 2. Business Problem

Во многих B2B-командах продажи и согласования живут в разных инструментах:

- CRM для pipeline;
- spreadsheets для pricing exceptions;
- email/chat для approvals;
- ручные exports для reporting.

Это приводит к следующим проблемам:

- сделки двигаются медленно и непрозрачно;
- согласования зависят от ручных коммуникаций;
- данные непоследовательны и плохо аудируются;
- forecast не вызывает доверия;
- RevOps тратит слишком много времени на ручные операции;
- миграция из legacy CRM или spreadsheet world болезненна.

Продукт существует, чтобы убрать фрагментацию sales workflow и дать настраиваемую, управляемую систему учёта и согласований.

## 3. Target Customers

Основные клиенты:

- mid-market B2B sales organizations;
- industrial distributors;
- equipment suppliers;
- wholesale/account-based sales teams;
- B2B service providers с approval-heavy deal process.

Типовые признаки клиента:

- 20-200 sales users;
- длинный или средний sales cycle;
- formal approval gates для discounts, terms, exceptions;
- разные требования к полям, стадиям и views между компаниями;
- высокий объём legacy data import.

## 4. Actors

- Sales Representative
- Sales Manager
- RevOps / CRM Administrator
- Finance Approver
- Commercial / Legal Approver
- VP Sales / Executive
- External Customer

## 5. Business Model and Monetization

Модель: B2B SaaS.

Монетизация:

- per-seat subscription;
- более дорогие планы за advanced approvals, reporting, audit history, customization;
- onboarding / migration services для enterprise customers.

Экономическая ценность продукта:

- сокращение deal cycle time;
- повышение управляемости discount governance;
- повышение точности и доверия к forecast;
- снижение ручной нагрузки на RevOps;
- упрощение перехода с legacy процессов.

## 6. Primary Product Loops

### 6.1 Sales execution loop

Account/contact создаётся или импортируется -> sales rep создаёт opportunity -> opportunity проходит стадии -> создаётся quote request или exception request -> сделка закрывается как won/lost.

### 6.2 Approval governance loop

Sales rep отправляет quote или exception на согласование -> approver review -> approve / reject / send back -> решение фиксируется в системе -> opportunity двигается дальше с прозрачным audit trail.

### 6.3 Tenant configuration loop

Admin создаёт custom fields, stages, views, rules, permissions -> sales team использует изменённый процесс без vendor-side code changes.

### 6.4 Data quality and reporting loop

Tenant импортирует данные -> duplicates и invalid records обрабатываются -> leadership смотрит dashboard/report -> принимает операционные решения на основе доверенных данных.

## 7. Business Goals

Продукт должен:

- централизовать коммерческий workflow;
- поддерживать tenant-specific customization;
- обеспечивать управляемые approvals без email-first процесса;
- поддерживать разграничение доступа и visibility rules;
- давать usable reporting поверх operational data;
- поддерживать import/export как first-class capability;
- хранить audit значимых business changes.

## 8. Critical Business Constraints

- Система должна поддерживать custom objects/fields или по крайней мере configurable domain model для tenant-specific sales process.
- Система должна поддерживать role-based и ownership-based visibility.
- Approval decisions и значимые изменения business records должны быть auditable.
- Reporting не должен ломаться от tenant customization.
- Import и bulk operations обязательны, а не вторичны.
- Deduplication для accounts/contacts/opportunities является частью core product value.
- MVP должен оставаться в области sales operations и approval governance, а не превращаться сразу в full ERP.

## 9. MVP Scope

В MVP входят:

- Accounts
- Contacts
- Opportunities
- Activities / Tasks
- Quote request / commercial exception request
- Approval request workflow
- Configurable fields
- Configurable opportunity stages
- Saved views and filters
- Ownership-based access
- Manager visibility
- Basic dashboards and reports
- CSV import/export
- Deduplication and merge for core entities
- Audit history for important business changes

## 10. Non-Goals

Не входят в MVP:

- full CPQ engine;
- contract lifecycle management;
- billing and invoicing;
- accounting ledger;
- inventory / warehouse management;
- marketing automation;
- support/helpdesk suite;
- external customer portal.

## 11. Success Metrics

Признаки успешного MVP:

- новый tenant может смоделировать core sales process через configuration, а не через custom development;
- sales rep может провести сделку от opportunity creation до approval submission внутри одной системы;
- approval turnaround time уменьшается по сравнению с ручным процессом;
- leadership получает usable pipeline and exception reporting;
- legacy data import возможен с приемлемым объёмом cleanup work;
- tenant начинает использовать систему как primary sales operations system of record.

## 12. Assumptions and Open Questions

### Assumptions

- Первый ICP — mid-market B2B teams, а не multi-country enterprise.
- Approval-heavy sales process — лучший wedge для первого продукта.
- Tenant admin готов настраивать систему, если customization достаточно мощная.
- External customer collaboration можно отложить за пределы MVP.

### Open Questions

- Нужен ли в MVP quote document generation или достаточно quote/exception approval workflow?
- Насколько глубокой должна быть forecasting functionality в первой версии?
- Нужны ли territory-based sharing rules уже в MVP или достаточно owner + manager visibility?
- Достаточно ли sequential approvals, или сразу нужен conditional routing?
