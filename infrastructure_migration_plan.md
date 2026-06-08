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

## Compact Target Architecture

### Backend

- backend живёт в Cloud Run service;
- backend обслуживает `/api/*`;
- backend получает runtime config и secrets извне.

### Migrations

- миграции выполняются отдельным Cloud Run Job;
- job запускается на backend release image;
- job работает против Cloud SQL.

### Database

- PostgreSQL живёт в Cloud SQL;
- backend service и migration job подключаются к Cloud SQL как к managed dependency.

### Secrets

- production secrets живут в Secret Manager;
- backend service и migration job читают secrets оттуда.

### Frontend

- frontend собирается в static build output `dist/`;
- `dist/` публикуется в Cloud Storage;
- frontend идёт по static hosting / CDN path.

### Public Ingress

- снаружи стоит external Application Load Balancer;
- он держит public domain и HTTPS;
- он маршрутизирует frontend и backend paths.

### CDN

- frontend static path обслуживается через Cloud CDN.

### Public Routing

- `/` -> frontend static hosting
- frontend asset paths -> frontend static hosting
- `/api/*` -> backend Cloud Run service

## Migration Principles

- не ломать текущий delivery model без необходимости;
- сохранять immutable image flow;
- менять runtime layer поэтапно;
- сначала делать reversible migration steps;
- отдельно проверять backend path и frontend path;
- не смешивать текущий production runbook и будущий target architecture.
- не вводить отдельный managed staging path на первом проходе.

## Environment Strategy

На текущем этапе принимаем:

- идём в один основной target path;
- отдельное managed staging-like environment не вводим на первом проходе;
- migration path строится сразу вокруг одного production-like managed environment.

## Main Migration Stages

### Stage 1. Define target runtime contract

Нужно зафиксировать:

- какие env vars останутся;
- какие secrets уйдут в Secret Manager;
- какие runtime assumptions VM-specific и должны исчезнуть;
- как будет выглядеть migration step без VM.

#### Target Backend Runtime Contract

Backend в целевой модели должен:

- оставаться stateless;
- слушать `$PORT`;
- не зависеть от локального постоянного диска;
- не хранить runtime state в filesystem;
- считать PostgreSQL внешней managed dependency;
- считать secrets внешней managed dependency;
- выдавать честный readiness signal.

#### Backend Cloud Run Readiness Checklist

Перед реальным переходом backend должен удовлетворять таким условиям:

- слушает `$PORT`;
- не требует VM-local filesystem state;
- не требует persistent local disk для runtime correctness;
- не зависит от `/home/nickf/.env` как от главного production contract;
- получает config и secrets извне;
- не смешивает migrations и app startup;
- readiness честно падает при недоступной PostgreSQL;
- не содержит compose-only network assumptions в production contract.

#### Target Runtime Config Split

Ожидаемое разделение:

- plain runtime config:
  - project/region identifiers
  - non-sensitive feature toggles
  - allowed origins
  - public base URLs
- secrets:
  - DB password
  - app secrets/tokens
  - third-party credentials

#### What Must Disappear From The VM Model

- `/home/nickf/.env` как production source of truth;
- SSH as central production deploy mechanism;
- VM-local Docker runtime as main orchestration layer;
- host-specific rollback/deploy assumptions.

### Stage 2. Move database to Cloud SQL

Нужно определить:

- provisioning path;
- connection strategy from app;
- backup/recovery model;
- migration path from current PostgreSQL state.

#### Target Choice

Целевой вариант:

- Cloud SQL for PostgreSQL;
- в том же регионе, что и Cloud Run service.

#### Why

- это прямой managed replacement для текущего PostgreSQL path;
- Cloud Run официально поддерживает подключение к Cloud SQL;
- уменьшается количество self-managed infra pieces.

#### Connection Model

Предпочтительный path:

- Cloud Run service подключается к Cloud SQL как managed dependency;
- app использует normal PostgreSQL connection settings;
- Cloud Run service конфигурируется с Cloud SQL connection;
- внутри app не должно быть VM-specific DB assumptions.

#### DB Migration Questions

Нужно отдельно определить:

- как переносить текущие данные;
- будет ли initial cutover через dump/restore;
- какой будет downtime window;
- как верифицировать консистентность после cutover.

#### Backup/Recovery Questions

Нужно зафиксировать:

- какой backup model у Cloud SQL будет считаться основным;
- нужен ли PITR на первом production-grade этапе;
- как restore проверяется уже в managed DB model.

### Stage 3. Move backend to Cloud Run

Нужно определить:

- deploy model;
- revision/rollback model;
- migration execution model;
- readiness/health model;
- post-deploy verification model;
- limits around startup time, statelessness and connection handling.

#### Target Choice

Целевой вариант:

- backend как Cloud Run service.

#### Why

- это прямое продолжение текущего immutable image flow;
- release CI уже умеет производить release images;
- Cloud Run убирает VM runtime layer, но не ломает container model.

#### Service Model

Cloud Run даёт три режима запуска кода:

- service;
- job;
- worker pool.

Для backend runtime нужен:

- **Cloud Run service**.

#### Backend Deploy Model

Целевая последовательность:

1. release CI публикует backend image;
2. deploy step создаёт новый Cloud Run revision;
3. service получает runtime config и secrets;
4. service получает Cloud SQL connection;
5. platform health/readiness подтверждают runtime startup;
6. короткий post-deploy verify подтверждает deploy outcome.

#### Readiness / Health Model

Нужно перейти к модели:

- Cloud Run revision считается deploy unit;
- app readiness должна отражать доступность PostgreSQL и критичных dependencies.
- platform probes подтверждают runtime health;
- отдельный минимальный post-deploy verify остаётся.

#### Rollback Model

Нужно отдельно проверить:

- как быстро возвращаться на previous revision;
- как rollback приложения соотносится с DB migration discipline.

#### Migration Job Path

На текущем этапе принимаем:

- migrations выполняются отдельным Cloud Run Job;
- job запускается на том же backend release image;
- job выполняется до deploy/update backend service;
- если migration job падает, backend deploy не продолжается.

#### Why This Path

- сохраняется текущая дисциплина `migrate -> deploy`;
- runtime и schema change не смешиваются;
- failure boundary остаётся понятной;
- migration code и runtime code используют один и тот же release image.

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

### Selected Direction

Для `sales-ops-crm` на текущем этапе выбираем этот branch как целевой.

Рабочий GCP-вариант:

- build frontend в static assets;
- хранить assets в Cloud Storage;
- отдавать их через external Application Load Balancer;
- включить Cloud CDN;
- backend API оставить отдельно в Cloud Run.

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

### Initial Working Assumptions

- custom domain and HTTPS для static frontend идут через load balancer path;
- Cloud Storage сам по себе не является конечным HTTPS custom-domain production path;
- CDN и custom domain story должны быть частью одной ingress model.
- frontend config подставляется на build-time, а не через отдельный runtime config file.

### Frontend Config Model

На текущем этапе принимаем:

- frontend получает public config на build-time;
- build становится environment-specific;
- backend API URL подставляется во время release/build step;
- отдельный runtime `config.json` path не используется.

### Explicit API URL Assumption

На текущем этапе принимаем:

- frontend получает полный backend API URL;
- build-time config задаёт явный `API_URL`;
- frontend не полагается на same-origin `/api` как обязательный contract;
- это оставляет возможность держать backend на отдельном домене или за отдельным API endpoint.

### Consequences Of This Choice

Плюсы:

- проще mental model;
- меньше moving parts;
- проще стартовая migration path.

Минусы:

- смена frontend config требует нового build;
- один и тот же frontend artifact нельзя считать environment-agnostic;
- release artifact сильнее привязан к конкретному environment.

### Static Publish Model

На текущем этапе принимаем:

- frontend publish model = **versioned publish**;
- каждый release публикуется в отдельный versioned path;
- frontend rollback должен опираться на предыдущий опубликованный static release set, а не на overwrite текущего bucket state.
- active public frontend path должен оставаться стабильным.

### Why Versioned Publish

- проще rollback;
- проще traceability;
- меньше риск случайно затереть предыдущий release;
- легче понимать, какой именно frontend release сейчас опубликован.

### Active Public Path Model

На текущем этапе принимаем:

- наружу есть один стабильный public frontend URL;
- version не торчит в public URL;
- выбранный release promote-ится/copy-ится в active location;
- CDN/LB обслуживают именно active location.

### Why This Model

- проще mental model;
- проще migration path;
- проще rollback;
- не требует более сложного infra-level path switching.

### Consequences

- publish release и activate release становятся разными операциями;
- rollback frontend = повторный promote предыдущего release в active location;
- нужно отдельно продумать cache behavior при promote.

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
- как будет устроен readiness/health verification;
- как будет устроен post-deploy verify;
- как приложение подключается к Cloud SQL;
- какие настройки concurrency / min instances нужны.

#### Recommended Working Assumption

На первом проходе принимаем:

- backend deploy path строится вокруг Cloud Run revisions;
- database connection path строится вокруг Cloud SQL integration;
- custom domain path должен идти не через Cloud Run domain mapping preview, а через recommended managed path.
- migration step должен идти через отдельный Cloud Run Job до backend service deploy.

### Database / Cloud SQL

- как перенести текущие данные;
- как будет устроен backup/restore;
- нужен ли PITR;
- как разделять environments.

### Secrets

- что должно стать secret;
- что может остаться plain runtime config;
- как GitHub Actions получает доступ к deploy path.

#### Target Choice

Целевой вариант:

- Secret Manager.

#### Why

- это managed replacement для production secrets из VM `.env`;
- Cloud Run официально поддерживает использование Secret Manager;
- уменьшается зависимость от host-local secret storage.

#### Secret Delivery Model

Нужно различать два механизма:

- env vars from secrets;
- mounted secret files.

Рабочее правило:

- простые app secrets можно давать как env vars;
- file-like secrets использовать только если app реально этого требует.

#### IAM Questions

Нужно зафиксировать:

- какой service account будет у backend service;
- какой service account будет у migration job;
- какие Secret Manager permissions им нужны;
- какие deploy permissions нужны GitHub Actions identity.

### Frontend

- Cloud Run vs static hosting;
- как будет работать public domain;
- как будет устроен release artifact;
- как будет выглядеть rollback.
- как именно build-time config будет передаваться в frontend build.
- как versioned publish будет маппиться на active public frontend path.
- как cache invalidation будет вести себя после promote.

### Current Decision

На текущем этапе:

- frontend branch выбран: **static hosting / CDN**;
- Cloud Run branch остаётся как reference alternative, но не как target branch.

### Frontend Publish / Rollback Unit

На текущем этапе принимаем:

- frontend pipeline публикует static build output;
- practical artifact = `dist/`;
- publish, promote и rollback опираются именно на этот static build output.

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

### Experiment 2a. Backend config + secrets on Cloud Run

Минимальная цель:

- передать backend mandatory config без VM `.env`;
- передать хотя бы один реальный secret через Secret Manager;
- проверить, что service стартует с managed config path.

### Experiment 3. Frontend Branch A

Минимальная цель:

- задеплоить frontend container в Cloud Run;
- проверить routing и public access.

### Experiment 4. Frontend Branch B

Минимальная цель:

- опубликовать frontend как static artifact;
- проверить domain/routing/config story.

## Current Recommended Technical Assumptions

На текущем этапе как рабочие assumptions принимаем:

- backend runtime: Cloud Run service;
- migrations: отдельный Cloud Run job;
- database: Cloud SQL for PostgreSQL;
- secrets: Secret Manager;
- custom domain for Cloud Run path: через recommended managed ingress path, а не через preview-only Cloud Run domain mapping;
- frontend branch: static hosting / CDN;
- working static frontend path: Cloud Storage + external Application Load Balancer + Cloud CDN.

## Notes From Official Platform Guidance

- Cloud Run — managed compute for containers; code can run as services, jobs, or worker pools.
- Для Cloud SQL Google рекомендует располагать Cloud SQL instance в том же регионе, что и Cloud Run service.
- Cloud Run service можно конфигурировать с Cloud SQL connection.
- Cloud Run рекомендует хранить sensitive config в Secret Manager.
- Для custom domain у Cloud Run рекомендован global external Application Load Balancer; Cloud Run domain mapping находится в limited availability / preview и не рекомендуется как production default.
- Для static website в Cloud Storage custom domain over HTTPS требует external Application Load Balancer; сам Cloud Storage не даёт этот path как standalone HTTPS custom-domain serving model.
- Cloud CDN работает с global external Application Load Balancer и backend bucket/backend service model.

## Target Public Routing Model

На текущем этапе принимаем стандартную public routing model:

- один публичный домен;
- frontend живёт на `/`;
- frontend static assets живут на user-facing frontend paths;
- backend API живёт на `/api/*`;
- HTTPS терминируется на managed external ingress / load balancer.

### Why This Model

- это стандартная схема для SPA + backend API;
- frontend и backend остаются логически разделены;
- наружу система выглядит как одно приложение;
- упрощается CORS story и browser behavior.

### Public Routing Rules

- `/` -> frontend static hosting
- frontend asset paths -> frontend static hosting
- `/api/*` -> backend Cloud Run service

### Explicit Non-Goal

- technical endpoints не входят в user-facing public routing model как часть основного public URL contract.

### Selected Public API Contract

На текущем этапе принимаем:

- один публичный app domain;
- backend API публикуется под `/api/*` на том же домене;
- отдельный `api.<domain>` path не используется как целевой стандартный вариант.

## Target Release / Deploy Flow

### 1. Release Tag

Release по-прежнему начинается с ручного semver tag:

- `v0.1.0`
- `v0.1.1`
- `v0.2.0`

### 2. Release CI

Release CI должен:

- собрать backend image;
- запушить backend image в Artifact Registry;
- собрать frontend static build с build-time public config;
- сохранить frontend static build как release artifact;
- зафиксировать release metadata.

### 3. Backend Migration Step

Отдельный deploy step:

- запустить Cloud Run Job на backend release image;
- подключить job к Cloud SQL;
- прогнать миграции;
- остановить rollout, если job падает.

### 4. Backend Deploy Step

После успешных миграций:

- задеплоить backend release image в Cloud Run service;
- создать новый revision;
- подать runtime config и secrets;
- подать Cloud SQL connection.

### 5. Frontend Publish Step

После успешного backend deploy:

- взять frontend static release artifact;
- опубликовать его в versioned storage path;
- не переключать public path через overwrite предыдущего release set.

### 6. Frontend Activate Step

После publish:

- promote/copy выбранный static release в active location;
- active public frontend URL остаётся стабильным;
- CDN/LB продолжают обслуживать один и тот же public path.

### 7. Health And Verify Step

После backend deploy и frontend activate:

- platform health/readiness подтверждают, что runtime поднялся;
- отдельный минимальный post-deploy verify подтверждает, что release реально доступен и usable снаружи.

### 8. Rollback Step

Если release сломан:

- backend rollback идёт через previous Cloud Run revision / previous backend image;
- frontend rollback идёт через promote предыдущего static release set в active location;
- rollback не должен требовать rebuild.

## Target Release Artifacts

### Backend

- immutable backend image in Artifact Registry;
- release tag;
- commit SHA.

### Frontend

- static build artifact;
- release tag;
- build-time public config values;
- versioned publish path.

### Release Metadata

Нужно фиксировать как минимум:

- release tag;
- backend image ref;
- frontend release artifact reference;
- commit SHA;
- build timestamp.

## Target Operational Sequence

Если совсем коротко, целевой production sequence должен стать таким:

1. create release tag;
2. run release CI;
3. run backend migration job;
4. deploy backend service revision;
5. publish frontend static release;
6. promote frontend release to active location;
7. wait for health/readiness confirmation;
8. run minimal post-deploy verify;
9. rollback if needed.

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
- frontend hosting branch выбран: static hosting / CDN;
- backend / Cloud SQL / secrets baseline assumptions уже зафиксированы;
- backend port contract already aligned with Cloud Run `$PORT`;
- detailed migration design ещё не заполнен полностью.
