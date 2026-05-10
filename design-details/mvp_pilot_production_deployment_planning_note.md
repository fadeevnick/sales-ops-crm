# MVP Pilot Production Deployment Planning Note

## Slice

Post-pilot production deployment planning baseline.

## Goal

Define the next implementation workstream after the local MVP pilot cut: turn the proven Docker Compose pilot baseline into a deployable production package plan without adding broad product behavior.

The local pilot cut is accepted, but the project is still explicitly not a production deployment package. This slice starts that transition by naming the deployment shape, blocking gaps and first buildable deployment artifacts.

## Current Baseline

- Runtime is a modular monolith backend, React frontend and PostgreSQL through `codebase/docker-compose.yml`.
- MVP pilot smoke gates run through `codebase/frontend/scripts/pilot-smoke-suite.mjs`.
- CI can call `codebase/scripts/ci-pilot-smoke.sh` through `.github/workflows/pilot-smoke.yml`.
- Local pilot ports are backend `8081` and frontend `5173`.
- Backend already exposes `/healthz` and `/readyz`.
- PostgreSQL is the authoritative store for CRM records, approvals, metadata, imports, merges, audit and reporting projections.

## Production Deployment Target For The Next Workstream

Use a conservative single-application deployment boundary:

```text
browser
  -> frontend static assets
  -> backend API container
  -> PostgreSQL
```

The first production package should support at least:

- immutable backend and frontend build artifacts;
- environment-specific configuration through env vars;
- explicit database migration execution;
- health/readiness checks for runtime orchestration;
- rollback-aware deployment order;
- backup/restore assumptions for PostgreSQL;
- pilot smoke gate execution against a deployed environment.

## Out Of Scope For The First Production Package

- microservice split;
- external broker introduction;
- universal Kubernetes platform;
- multi-region DR;
- full observability stack;
- approval cancellation/supersede product behavior;
- reporting freshness automation beyond the current manual refresh path.

Those remain valid follow-ups, but they should not block a first deployable package plan.

## Deployment Gaps To Close

1. Backend image packaging is still dev-container oriented through the Gradle image and `bootRun`.
2. Frontend runtime is still Vite dev server oriented.
3. Database migrations run implicitly on backend startup; the deployment plan needs an explicit migration/rollback stance.
4. There is no production env example separating app config from local pilot ports.
5. There is no deployment runbook beyond local Docker Compose.
6. Backup/restore and data durability expectations are referenced, but not bound to a concrete pilot deployment checklist.
7. Smoke scripts assume local URLs unless environment overrides are formalized.

## First Buildable Slice

Create a deployment packaging baseline:

- add production-oriented backend Dockerfile or build target;
- add production-oriented frontend build/server packaging;
- add a production compose profile or separate compose file that uses built images rather than dev servers;
- add `.env.production.example` with required settings and no secrets;
- add a deployment smoke command that can target configurable backend/frontend base URLs;
- add a production deployment runbook draft.

## Acceptance

- production package plan names the deployment topology and excluded maturity work;
- first implementation slice is small enough to verify locally;
- local pilot smoke workflow remains unchanged;
- status docs point to deployment packaging as the next implementation step;
- no new product behavior is introduced before the deployment packaging baseline exists.

