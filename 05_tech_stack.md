# 05 Tech Stack

Документ фиксирует выбранный стек для первого standalone product:

```text
B2B Sales Operations CRM with approvals
```

Стек выбирается как следствие уже принятых решений в:

- `01_business_requirements.md`
- `02_user_journeys.md`
- `03_functional_requirements.md`
- `04_architecture.md`

Это не список "модных технологий". Здесь важен ответ на вопрос:

```text
какой стек лучше всего обслуживает metadata-driven CRM/ERP MVP
с modular monolith архитектурой, approval workflows, sharing rules,
bulk jobs, reporting projections и audit trail
```

## 1. Stack Selection Principles

Стек должен:

- хорошо поддерживать modular monolith;
- позволять строить сложную domain logic без преждевременного service split;
- быть сильным в транзакционном OLTP и SQL-heavy access rules;
- выдерживать metadata-driven and reporting-heavy patterns;
- оставлять понятный growth path к production-like operational maturity;
- не тащить слишком рано тяжёлую distributed complexity.

## 2. Recommended Stack Overview

| Layer | Selected technology | Why it fits this project | Deferred / rejected now |
|---|---|---|---|
| Frontend | React + TypeScript + Vite | сильный стандарт для сложных B2B UIs, forms, grids, filters | Next.js не обязателен для first MVP admin-heavy app |
| Frontend state/data | TanStack Query | хорошо ложится на data-heavy CRM UI | глобальный state-heavy подход без нужды |
| Frontend forms/validation | React Hook Form + Zod | много форм, dynamic field configs, predictable validation | ad hoc form state |
| Backend | Kotlin + Spring Boot | сильный enterprise-grade modular monolith stack | ранний microservices split |
| Backend security | Spring Security | зрелая база для roles, permissions, OIDC boundary | самописный security layer |
| Data access | jOOQ | SQL-first подход лучше для sharing filters, dynamic queries, reporting projections | heavy ORM-first подход |
| Primary DB | PostgreSQL | лучший default choice для OLTP, metadata, JSONB, reporting-friendly SQL | NoSQL-first storage |
| Migrations | Flyway | простой и зрелый migration discipline | schema drift/manual SQL |
| Async jobs | app-managed background workers + PostgreSQL-backed job tables | bulk/import/export/jobs нужны, но внешний broker рано | Kafka/RabbitMQ как обязательная база MVP |
| Cache / ephemeral coordination | Redis later when justified | пока не обязателен, можно не тянуть сразу | premature cache-first architecture |
| Search | PostgreSQL full-text / trigram first | достаточно для MVP lists/search/dedup assist | Elasticsearch/OpenSearch too early |
| Reporting | PostgreSQL projections/materialized read tables | соответствует modular monolith и MVP dashboards | отдельный DWH/OLAP stack на старте |
| Auth boundary | OIDC-ready architecture, local users first, Keycloak later if needed | сохраняет enterprise path без лишней ранней тяжести | full enterprise IAM upfront |
| File/object storage | S3-compatible storage for imports/exports later in real runtime | хорошо стыкуется с backup/object storage practices | local-only file handling as long-term solution |
| API style | REST/JSON | лучше для predictable admin workflows и CRUD + commands | GraphQL как default without need |
| Backend testing | JUnit 5 + Spring tests + Testcontainers | хорошо для domain + integration testing | mock-heavy only strategy |
| Frontend/E2E testing | Vitest + Playwright | нужен confidence для core flows и forms | manual-only QA |

## 3. Backend Stack

### Selected backend stack

- Kotlin
- Spring Boot
- Spring Web
- Spring Security
- Bean Validation
- jOOQ
- Flyway

### Why Kotlin + Spring Boot

Этот проект не похож на "простой CRUD SaaS". Здесь много:

- state transitions;
- approval rules;
- access checks;
- metadata-driven validation;
- bulk operation orchestration;
- business audit semantics.

Kotlin + Spring Boot подходит лучше всего, потому что:

- даёт сильную типизацию для domain model;
- хорошо поддерживает modular monolith structure;
- зрел в транзакционной business logic;
- хорошо интегрируется с PostgreSQL, migrations и security;
- стандартен для enterprise-style backend thinking, что полезно для выбранной учебной цели.

### Why not choose Node.js as primary backend here

Node.js хорош для многих продуктов, но для этого конкретного первого CRM/ERP проекта есть минусы:

- слабее pressure toward rigorous domain modeling;
- сложнее удерживать discipline в большом metadata/workflow codebase без deliberate architectural effort;
- SQL-heavy authorization/reporting logic часто получается менее элегантной в typical ORM-first JS stacks.

Это не значит, что Node.js здесь невозможен. Это значит, что для цели "прокачать enterprise-flexibility architecture thinking" Kotlin + Spring Boot даёт более сильную обучающую опору.

## 4. Data Access Strategy

### Selected approach

- PostgreSQL как primary transactional database
- jOOQ как SQL-first data access layer
- Flyway как migration mechanism

### Why jOOQ instead of ORM-first stack

Для этого продукта запросы будут быстро усложняться из-за:

- ownership/sharing filters;
- field-level visibility;
- saved views over custom fields;
- reporting projections;
- duplicate matching support;
- approval-related joins and snapshots.

Здесь выгоднее SQL-first подход, а не попытка спрятать всё за generic ORM abstraction.

jOOQ подходит, потому что:

- хорошо работает с сложным SQL;
- позволяет контролировать query shape;
- лучше держит связь между архитектурой и реальным data access behavior.

### Database usage principles

- transactional writes идут в primary relational model;
- metadata хранится как first-class config data, а не как хаотичный набор свободных JSON blobs без governance;
- custom field values могут использовать PostgreSQL capabilities, но не должны размывать core invariants;
- reporting и queues читают derived read models, а не бесконтрольно грузят primary write path.

## 5. Frontend Stack

### Selected frontend stack

- React
- TypeScript
- Vite
- TanStack Query
- React Hook Form
- Zod
- data-grid layer for admin/list-heavy UI

### Why this frontend shape fits

Продукту нужны:

- dense list views;
- filters;
- forms with standard and custom fields;
- approval task queues;
- admin configuration screens;
- dashboards and drill-downs.

React + TypeScript остаётся лучшим pragmatic default для такого B2B UI, а Vite keeps the setup lighter than a full meta-framework.

### Why not optimize for SSR-first

Это не контентный public product и не SEO-heavy website. Core value находится в authenticated operational UI.

Поэтому:

- SSR не является главным architectural driver;
- предсказуемый client-side application shell для CRM workspace полезнее на старте;
- при необходимости later можно добавить server-rendered edges отдельно.

## 6. Authentication and Authorization Technology

### Selected direction

- authentication boundary строится как OIDC-ready;
- Spring Security обслуживает authn/authz inside backend;
- MVP может стартовать с local users and roles;
- Keycloak подключается позже, если self-hosted SSO becomes a real need.

### Why not force full enterprise IAM on day one

Если тащить полноценный IAM stack слишком рано, он начнёт доминировать над главным учебным вопросом, а главный вопрос здесь другой:

- metadata-driven domain;
- workflows;
- sharing;
- reporting;
- business audit.

Поэтому MVP должен иметь:

- чёткую auth boundary;
- корректную role model;
- готовность к OIDC;

но не обязан начинаться с full-blown IAM platform.

## 7. Async Jobs and Bulk Processing

### Selected approach

- background workers внутри того же application boundary;
- job state хранится в PostgreSQL;
- bulk imports/exports/rebuilds выполняются как async jobs;
- retry/progress/result tracking входит в MVP platform layer приложения.

### Why no external broker first

Хотя Kafka и RabbitMQ являются уважаемыми стандартами для очередей, они не нужны как стартовый обязательный слой здесь, потому что:

- доменная сложность уже высокая;
- bulk jobs в MVP в основном task-oriented, а не event-stream centric;
- PostgreSQL-backed jobs достаточно для first scalable version;
- premature broker adoption ухудшит focus.

### When to add external queue later

Отдельный broker имеет смысл позже, если появятся:

- высокий объём событий;
- жёсткое разделение worker concerns;
- интеграционные fan-out сценарии;
- нагрузка, при которой DB-backed job model становится bottleneck.

## 8. Search and Dedup Support

### Selected approach

- PostgreSQL text search and trigram-style similarity first
- dedup assistance строится поверх DB queries and scoring logic

### Why no Elasticsearch first

Для MVP product search and dedup support:

- не требуют отдельного search cluster;
- не должны тащить дополнительную operational complexity слишком рано;
- могут быть закрыты PostgreSQL-first подходом.

Later expansion path:

- отдельный search/indexing layer появляется только когда поиск становится самостоятельной нагрузочной или relevance-задачей.

## 9. Reporting Technology

### Selected approach

- MVP dashboards строятся внутри продукта;
- projections и aggregate tables живут рядом с transactional core;
- PostgreSQL используется и для transactional data, и для first reporting projections.

### Why this is enough for MVP

Потому что первые отчёты:

- ограничены agreed MVP metrics;
- tightly coupled to access model;
- должны понимать approvals, ownership и tenant metadata;
- не требуют ещё отдельного OLAP stack.

### Deferred path

Следующие шаги откладываются до реальной необходимости:

- ClickHouse or external OLAP;
- dedicated BI warehouse;
- universal report builder beyond MVP scope.

## 10. API Style

### Selected style

- REST/JSON API
- command-oriented endpoints for actions like submit approval, approve, reject, merge, publish config
- query endpoints for lists, dashboards and drill-downs

### Why not GraphQL first

GraphQL здесь не решает главный architectural risk. Основная сложность в:

- access enforcement;
- metadata compatibility;
- workflow invariants;
- reporting consistency.

REST даёт:

- более предсказуемые boundaries для command and query paths;
- проще контроль permission-sensitive endpoints;
- проще evolution в first MVP.

## 11. Testing Stack

### Backend testing

- JUnit 5
- Spring integration tests
- Testcontainers

Что важно тестировать в первую очередь:

- approval policy resolution;
- stage transition rules;
- sharing/access enforcement;
- metadata publish validation;
- import validation and partial failure behavior;
- merge consistency;
- audit append behavior.

### Frontend testing

- Vitest for component and form logic
- Playwright for core end-to-end flows

E2E особенно нужны для:

- create opportunity;
- submit approval;
- approver decision path;
- import preview and result flow;
- admin metadata changes that affect forms/views.

## 12. Runtime and Production Alignment

Этот проект не опирается на внешний workspace layer как обязательную daily dependency.

Operational substrate должен опираться на baseline, зафиксированный в `00_substrate_reference.md`:

- containerized runtime;
- health/readiness;
- deploy/rollback;
- migrations;
- backup/restore;
- PgBouncer later if needed;
- replica later if reporting/read pressure requires it;
- observability;
- scaling;
- Kubernetes/IaC/DR later.

Важно:

- `05_tech_stack.md` не заменяет `00_substrate_reference.md`;
- он говорит, каким будет application stack поверх этого substrate.

## 13. What Is Explicitly Deferred

Ниже технологии, которые сознательно не включаются в first selected stack:

- microservices as default architecture;
- Kafka as mandatory backbone;
- RabbitMQ as mandatory baseline;
- Elasticsearch/OpenSearch as mandatory search tier;
- separate OLAP stack from day one;
- full enterprise IAM platform as a hard prerequisite;
- GraphQL as default API layer;
- NoSQL-first primary data model.

Причина везде одна:

- они могут понадобиться позже, но сейчас не являются лучшим first answer на metadata-driven CRM/ERP MVP.

## 14. Final Stack Decision

### Core application stack

- Backend: Kotlin + Spring Boot
- Security: Spring Security
- Data access: jOOQ
- Database: PostgreSQL
- Migrations: Flyway
- Async jobs: PostgreSQL-backed background workers inside modular monolith
- Frontend: React + TypeScript + Vite
- Client data layer: TanStack Query
- Forms/validation: React Hook Form + Zod
- API: REST/JSON
- Testing: JUnit 5 + Testcontainers + Vitest + Playwright

### Why this is the best first stack for this project

Потому что он:

- усиливает архитектурную дисциплину вместо размывания её;
- хорошо подходит для domain-heavy modular monolith;
- не ломается на metadata/workflow/sharing complexity слишком рано;
- остаётся достаточно прагматичным для реального MVP;
- совместим с локально зафиксированным operational maturity path.
