# Infrastructure Migration Plan

```text
sales-ops-crm: VM/docker-compose -> managed GCP runtime
```

## Purpose

Этот документ фиксирует план перехода текущего production path на managed GCP infrastructure.

Он нужен, чтобы:

- держать целевую инфраструктуру в одном месте;
- разложить миграцию по этапам;
- отдельно разобрать инфраструктурные развилки;
- не смешивать текущий runbook и исследовательский migration plan.

## Current Baseline

Текущий production path:

- GitHub Actions для PR/main CI;
- GitHub Actions для release build;
- Artifact Registry для release images;
- VM `salesops-pilot`;
- `docker compose` runtime на VM;
- PostgreSQL на VM;
- runtime config через `/home/nickf/.env`;
- manual operator-driven deploy;
- DuckDNS и manual cert renewal.

## Target Direction

Целевое направление:

- GitHub Actions остаётся release entrypoint;
- Artifact Registry остаётся image registry;
- backend уходит в managed runtime;
- database уходит в managed PostgreSQL;
- secrets уходят в managed secret store;
- ingress / HTTPS / logs / metrics становятся managed;
- VM path перестаёт быть главным production path.

## Target GCP Stack

Базовый целевой стек:

- compute: Cloud Run
- database: Cloud SQL for PostgreSQL
- secrets: Secret Manager
- images: Artifact Registry
- logs/metrics: Cloud Logging + Cloud Monitoring
- domain/HTTPS: managed custom domain path in GCP

## Migration Principles

- не ломать текущий delivery model без необходимости;
- сохранять immutable image flow;
- менять runtime layer поэтапно;
- сначала делать reversible migration steps;
- отдельно проверять backend path и frontend path;
- не смешивать текущий production runbook и будущий target architecture.

## Main Migration Stages

### Stage 1. Define target runtime contract

Нужно зафиксировать:

- какие env vars останутся;
- какие secrets уйдут в Secret Manager;
- какие runtime assumptions VM-specific и должны исчезнуть;
- как будет выглядеть migration step без VM.

### Stage 2. Move database to Cloud SQL

Нужно определить:

- provisioning path;
- connection strategy from app;
- backup/recovery model;
- migration path from current PostgreSQL state.

### Stage 3. Move backend to Cloud Run

Нужно определить:

- deploy model;
- revision/rollback model;
- migration execution model;
- readiness/smoke model;
- limits around startup time, statelessness and connection handling.

### Stage 4. Choose frontend hosting model

Здесь есть развилка:

1. frontend тоже в Cloud Run;
2. frontend в static hosting / CDN path.

Оба варианта нужно разобрать отдельно.

### Stage 5. Replace VM-centric production runbook

После проверки нового path:

- обновить `codebase/DEPLOYMENT.md`;
- перевести release/deploy ritual на новый runtime;
- перевести rollback/recovery thinking на managed path;
- VM path перевести в legacy/fallback или убрать.

## Branch A. Frontend On Cloud Run

### Idea

Frontend runtime остаётся containerized и деплоится так же, как backend.

### Pros

- один и тот же runtime type;
- один и тот же deploy mental model;
- проще стартовая миграция;
- меньше разных платформенных концепций одновременно.

### Cons

- для SPA это обычно тяжелее, чем нужно;
- статика обслуживается через container runtime;
- архитектурно менее чисто, чем static hosting;
- можно платить и operationally думать о лишнем compute path.

### What To Validate

- нужен ли frontend вообще как runtime container;
- насколько простым будет custom domain path;
- есть ли practical benefit от одинакового backend/frontend deploy model.

## Branch B. Frontend On Static Hosting / CDN

### Idea

Frontend собирается в static assets и публикуется в static hosting path behind CDN.

### Pros

- чище для SPA;
- меньше runtime complexity;
- обычно лучше для отдачи статики;
- frontend отделяется от server compute.

### Cons

- появляется второй deploy model;
- backend и frontend будут жить в разных runtime paradigms;
- migration plan становится чуть сложнее;
- нужно отдельно продумать routing, cache invalidation и env/config strategy.

### What To Validate

- где именно хостить статический frontend в GCP;
- как будет работать custom domain;
- как прокинуть frontend config без VM `.env`;
- как синхронизировать frontend release с backend release.

## Decision Criteria For Frontend Branch

При выборе между Branch A и Branch B сравниваем:

- conceptual simplicity;
- operational simplicity;
- cost shape;
- rollout/rollback clarity;
- suitability specifically for SPA;
- сколько новых GCP concepts добавляет каждый вариант.

## Migration Questions To Answer

### Backend / Cloud Run

- как запускаются миграции;
- где будет rollback boundary;
- как будет устроен deploy sequence;
- как будет устроен smoke;
- как приложение подключается к Cloud SQL;
- какие настройки concurrency / min instances нужны.

### Database / Cloud SQL

- как перенести текущие данные;
- как будет устроен backup/restore;
- нужен ли PITR;
- как разделять environments.

### Secrets

- что должно стать secret;
- что может остаться plain runtime config;
- как GitHub Actions получает доступ к deploy path.

### Frontend

- Cloud Run vs static hosting;
- как будет работать public domain;
- как будет устроен release artifact;
- как будет выглядеть rollback.

## Experiments To Run

### Experiment 1. Backend on Cloud Run

Минимальная цель:

- взять текущий backend image;
- задеплоить в Cloud Run non-production env;
- проверить readiness и connectivity.

### Experiment 2. Cloud SQL connectivity

Минимальная цель:

- поднять Cloud SQL PostgreSQL;
- проверить app connection;
- проверить migration path.

### Experiment 3. Frontend Branch A

Минимальная цель:

- задеплоить frontend container в Cloud Run;
- проверить routing и public access.

### Experiment 4. Frontend Branch B

Минимальная цель:

- опубликовать frontend как static artifact;
- проверить domain/routing/config story.

## Exit Criteria For Migration

Можно считать migration plan закрытым, когда:

- release artifacts остаются immutable;
- backend production path работает без VM;
- database работает в Cloud SQL;
- secrets вынесены из VM `.env` path;
- deploy runbook не зависит от SSH into VM;
- rollback path понятен;
- backup/recovery model определён;
- frontend hosting branch выбран осознанно.

## Current Status

Сейчас:

- документ создан;
- target direction зафиксирован;
- frontend hosting branch ещё не выбран;
- detailed migration design ещё не заполнен.

