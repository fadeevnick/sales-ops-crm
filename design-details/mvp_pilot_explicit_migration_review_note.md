# MVP Pilot Explicit Migration Review Note

## Slice

Production deployment explicit migration command.

## Outcome

```text
accepted on isolated production migration sanity check
```

## Implemented

- Added `codebase/scripts/core/production-migrate.sh`.
- Added a `migrate` service to `codebase/docker-compose.production.yml`.
- Disabled implicit Flyway migrations for the production backend service by default through `SPRING_FLYWAY_ENABLED=false`.
- Updated `codebase/DEPLOYMENT.md` so deployment order is:
  1. create `.env.production`;
  2. run `scripts/core/production-migrate.sh`;
  3. start `backend` and `frontend`.
- Made `SecurityConfig` servlet-web-only so the backend artifact can run in non-web migration mode.

## Verification

Passed:

```bash
bash -n scripts/core/production-migrate.sh
docker compose --env-file .env.production.example -f docker-compose.production.yml config --quiet
docker compose --project-name salesops-migrate-check --env-file .env -f docker-compose.production.yml --profile tools config --quiet
PRODUCTION_ENV_FILE=/tmp/does-not-exist scripts/core/production-migrate.sh
PRODUCTION_ENV_FILE=.env PRODUCTION_COMPOSE_PROJECT_NAME=salesops-migrate-check scripts/core/production-migrate.sh
docker compose --project-name salesops-migrate-check --env-file .env -f docker-compose.production.yml down
curl -fsS http://127.0.0.1:8081/readyz
scripts/core/deployment-smoke.sh health
```

The isolated migration run:

- built `salesops-backend:local`;
- started an isolated `salesops-migrate-check` PostgreSQL service;
- waited for PostgreSQL health through Compose dependencies;
- validated 20 Flyway migrations;
- confirmed schema version `20`;
- exited successfully with no pending migration.

## Corrections Made During Verification

- The migration wrapper now refuses to use `.env.production.example` as a real runtime env.
- The wrapper uses an explicit Compose project name, defaulting to `salesops-production`, so it does not collide with the dev `codebase` Compose project.
- The wrapper builds the backend image before running the one-shot migration service.
- The migration service uses Compose dependency waiting; an earlier `--no-deps` attempt was removed because it could start before PostgreSQL accepted connections.

## Remaining Gaps

- no external staging host is provisioned;
- no managed secret store integration exists.
- production hardening remains single-node Compose, not Kubernetes/IaC/DR maturity.

## Next Step

Choose the next deployment hardening slice:

```text
external staging host handoff or managed secrets integration planning
```
