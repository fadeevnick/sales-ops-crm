# Deployment Packaging Baseline

This document covers the first production-oriented package for the local MVP pilot cut. It is still a single-node Docker Compose package, not a full production platform.

## Files

- `backend/Dockerfile` builds a Spring Boot jar and runs it on a JRE image.
- `frontend/Dockerfile` builds static Vite assets and serves them through nginx.
- `docker-compose.production.yml` runs PostgreSQL, backend and frontend from production-oriented images.
- `.env.production.example` lists required environment settings without real secrets.
- `scripts/production-migrate.sh` runs Flyway migrations as an explicit deployment step.
- `scripts/production-backup.sh` writes a PostgreSQL custom-format dump.
- `scripts/production-restore-drill.sh` restores a dump into an isolated drill database and verifies schema version.
- `scripts/production-rollback-dry-run.sh` verifies image rollback mechanics on an isolated Compose project.
- `scripts/validate-deploy-env.sh` validates staging/production env files before use.
- `scripts/validate-managed-secrets-plan.sh` validates provider-neutral secret mapping coverage.
- `scripts/render-env-from-secret-provider.sh` renders deploy env files from provider-adapter secret outputs.
- `scripts/staging-handoff-check.sh` verifies the local external staging handoff package.
- `deploy/STAGING_READINESS.md` defines the staging readiness and secrets baseline.
- `deploy/EXTERNAL_STAGING_HANDOFF.md` defines the external staging host handoff contract.
- `deploy/MANAGED_SECRETS.md` defines the provider-neutral managed secrets integration plan.
- `deploy/SECRET_PROVIDER_ADAPTERS.md` defines env/dotenv adapter contracts for selected secret providers.
- `deploy/PRODUCTION_PLATFORM_IAC.md` defines the provider-neutral production platform/IaC boundary.
- `deploy/SINGLE_NODE_HOST_IAC.md` defines the selected single-node host baseline.
- `deploy/REVERSE_PROXY_TLS_HANDOFF.md` defines external HTTPS routing requirements.
- `deploy/IMAGE_REGISTRY_PROMOTION.md` defines provider-neutral image tag promotion requirements.
- `deploy/CI_RELEASE_AUTOMATION.md` defines the provider-neutral CI release build baseline.
- `deploy/REGISTRY_PUSH_AUTOMATION.md` defines the provider-neutral registry push entrypoint.
- `deploy/STAGING_MANIFEST_CONSUMPTION.md` defines deploy env rendering from a release manifest.
- `deploy/STAGING_DEPLOY_AUTOMATION.md` defines the staging deploy orchestration entrypoint.
- `deploy/STAGING_DEPLOY_APPLY_DRILL.md` defines the isolated local apply drill.
- `deploy/STAGING_POST_DEPLOY_GATES.md` defines staging post-deploy gate orchestration.
- `deploy/STAGING_POST_DEPLOY_APPLY_DRILL.md` defines the isolated post-deploy apply drill.
- `deploy/PRODUCTION_READINESS_SUMMARY.md` summarizes current staging and production readiness.
- `deploy/EXTERNAL_STAGING_ACCEPTANCE.md` defines the external staging acceptance run.
- `deploy/image-promotion.manifest.example` defines the minimum release image manifest shape.
- `deploy/secrets.mapping.example` defines the current secret reference mapping contract.
- `scripts/host-preflight-check.sh` validates host readiness before a single-node deploy.
- `scripts/reverse-proxy-tls-check.sh` validates frontend/API routes after proxy/TLS setup.
- `scripts/validate-image-promotion.sh` validates backend/frontend image refs before deploy.
- `scripts/render-env-from-secret-provider.sh` renders a secret-backed env from a protected base env and provider adapter output.
- `scripts/ci-release-build.sh` builds and validates production images for CI release checks.
- `scripts/ci-registry-push.sh` validates or pushes release images from a promotion manifest.
- `scripts/render-deploy-env-from-manifest.sh` renders a deploy env from a protected base env and release manifest.
- `scripts/staging-deploy.sh` orchestrates staging deploy dry-runs and apply-mode gates.
- `scripts/staging-deploy-apply-drill.sh` verifies staging deploy apply mode on isolated local ports.
- `scripts/staging-post-deploy-gates.sh` orchestrates post-deploy smoke, backup, restore and rollback gates.
- `scripts/staging-post-deploy-apply-drill.sh` verifies post-deploy apply gates on an isolated local staging stack.
- `scripts/external-staging-acceptance.sh` runs external staging acceptance dry-run/apply gates and writes a report.
- `scripts/deployment-smoke.sh` runs smoke checks against configurable deployed URLs.

## Start

From `codebase/`:

```bash
cp .env.production.example .env.production
scripts/production-migrate.sh
docker compose --project-name salesops-production --env-file .env.production -f docker-compose.production.yml up -d --build backend frontend
```

Check readiness:

```bash
curl http://127.0.0.1:8081/readyz
curl http://localhost:5173
```

## Smoke

Run the default health smoke:

```bash
scripts/deployment-smoke.sh
```

Run the full pilot suite:

```bash
scripts/deployment-smoke.sh pilot
```

Target non-local deployment URLs:

```bash
DEPLOYMENT_SMOKE_API_BASE_URL=https://api.example.test \
DEPLOYMENT_SMOKE_FRONTEND_BASE_URL=https://app.example.test \
scripts/deployment-smoke.sh health
```

## Migration Stance

Production Compose disables backend startup migrations by default through `SPRING_FLYWAY_ENABLED=false`.

Run migrations before starting or replacing the backend:

```bash
scripts/production-migrate.sh
```

The migration command refuses to use `.env.production.example` as a real runtime env. It starts the production `db` service under the `salesops-production` Compose project, waits for PostgreSQL health, runs the backend artifact in non-web mode with Flyway enabled, then exits. Override the env file or Compose project name when needed:

```bash
PRODUCTION_ENV_FILE=/path/to/.env.production scripts/production-migrate.sh
PRODUCTION_COMPOSE_PROJECT_NAME=salesops-staging scripts/production-migrate.sh
```

Schema rollback is still manual. New migrations must remain backward-compatible until a rollback dry run and restore drill exist.

## Staging And Secrets Stance

Staging uses the same production-oriented Compose package with a separate env file. Start from `.env.staging.example`, create an uncommitted `.env.staging`, then validate it:

```bash
scripts/validate-deploy-env.sh .env.staging
scripts/validate-managed-secrets-plan.sh deploy/secrets.mapping.example .env.staging
```

Real staging secrets must not be committed. At minimum, `POSTGRES_PASSWORD` must be replaced with an operator-controlled value, and `SPRING_FLYWAY_ENABLED` must remain `false` so migrations run only through `scripts/production-migrate.sh`.

See `deploy/STAGING_READINESS.md` for the staging deploy order and readiness gate.

Before handing the package to an external staging host operator, run:

```bash
scripts/staging-handoff-check.sh
```

The external host requirements and first-deploy checklist are in `deploy/EXTERNAL_STAGING_HANDOFF.md`.

Managed secret boundaries and provider-selection criteria are in `deploy/MANAGED_SECRETS.md`.

Provider adapter contracts are in `deploy/SECRET_PROVIDER_ADAPTERS.md`. If the selected provider can export mapped secrets as environment variables or a protected dotenv file, render a secret-backed env before manifest rendering or deploy validation:

```bash
SECRET_PROVIDER_ADAPTER=dotenv \
SECRET_PROVIDER_SOURCE_FILE=/opt/salesops/secrets/staging.env \
scripts/render-env-from-secret-provider.sh /opt/salesops/env/.env.staging.base deploy/secrets.mapping.example /opt/salesops/env/.env.staging
```

Production platform and IaC boundaries are in `deploy/PRODUCTION_PLATFORM_IAC.md`. The current package remains single-node Compose until a concrete platform path is selected.

The selected single-node host baseline is in `deploy/SINGLE_NODE_HOST_IAC.md`. On a target host, run:

```bash
SALESOPS_BACKUP_DIR=/opt/salesops/backups scripts/host-preflight-check.sh /opt/salesops/env/.env.staging
```

External HTTPS routing requirements are in `deploy/REVERSE_PROXY_TLS_HANDOFF.md`. After the stack is running behind the proxy, run:

```bash
scripts/reverse-proxy-tls-check.sh /opt/salesops/env/.env.staging
```

Image registry promotion rules are in `deploy/IMAGE_REGISTRY_PROMOTION.md`. Validate image refs before migration/startup:

```bash
scripts/validate-image-promotion.sh /opt/salesops/env/.env.staging
```

CI release build automation is in `deploy/CI_RELEASE_AUTOMATION.md` and `.github/workflows/release-build.yml`. Registry push automation is in `deploy/REGISTRY_PUSH_AUTOMATION.md`; it stays in dry-run mode unless explicitly enabled.

Staging manifest consumption is in `deploy/STAGING_MANIFEST_CONSUMPTION.md`. Render a deploy env from a protected base env plus retained release manifest:

```bash
scripts/render-deploy-env-from-manifest.sh /opt/salesops/env/.env.staging.base /opt/salesops/releases/image-promotion.manifest /opt/salesops/env/.env.staging
```

Staging deploy orchestration is in `deploy/STAGING_DEPLOY_AUTOMATION.md`. Dry-run first:

```bash
STAGING_DEPLOY_ENV_FILE=/opt/salesops/env/.env.staging scripts/staging-deploy.sh
```

Run the isolated local apply drill with:

```bash
scripts/staging-deploy-apply-drill.sh
```

Run staging post-deploy gates in dry-run mode first:

```bash
STAGING_POST_DEPLOY_ENV_FILE=/opt/salesops/env/.env.staging STAGING_POST_DEPLOY_BACKUP_DIR=/opt/salesops/backups scripts/staging-post-deploy-gates.sh
```

Run the isolated post-deploy apply drill with:

```bash
scripts/staging-post-deploy-apply-drill.sh
```

Current readiness and production blockers are summarized in `deploy/PRODUCTION_READINESS_SUMMARY.md`.

External staging acceptance is documented in `deploy/EXTERNAL_STAGING_ACCEPTANCE.md`. Dry-run first:

```bash
EXTERNAL_STAGING_ACCEPTANCE_ENV_FILE=/opt/salesops/env/.env.staging EXTERNAL_STAGING_ACCEPTANCE_BACKUP_DIR=/opt/salesops/backups scripts/external-staging-acceptance.sh
```

## Backup Stance

PostgreSQL data is stored in the `postgres_data` named volume. Create a custom-format backup with:

```bash
scripts/production-backup.sh
```

The backup script refuses to use `.env.production.example` as a real runtime env. Override output or project when needed:

```bash
PRODUCTION_BACKUP_FILE=/safe/path/salesops.dump scripts/production-backup.sh
PRODUCTION_COMPOSE_PROJECT_NAME=salesops-staging scripts/production-backup.sh
```

Run a restore drill into an isolated Compose project:

```bash
scripts/production-restore-drill.sh /safe/path/salesops.dump
```

The restore drill creates a disposable `salesops-restore-drill-*` Compose project, restores the dump into its own PostgreSQL volume, verifies the latest successful Flyway schema version, and removes the drill stack unless `RESTORE_DRILL_KEEP_STACK=1` is set.

Do not treat a backup as valid until a restore drill has passed.

## Rollback Stance

This package supports image rollback by changing `BACKEND_IMAGE` and `FRONTEND_IMAGE` in the env file and restarting services. Run the local rollback dry run with:

```bash
scripts/production-rollback-dry-run.sh
```

The dry run uses `deploy/rollback-drill.previous.env` and `deploy/rollback-drill.candidate.env` on backend port `18081` and frontend port `15173`, so it does not collide with the default pilot runtime. It starts the previous image set, switches to the candidate image set, then rolls back to previous and checks backend/frontend health after each step.

Override drill inputs when needed:

```bash
ROLLBACK_PREVIOUS_ENV_FILE=/path/to/previous.env \
ROLLBACK_CANDIDATE_ENV_FILE=/path/to/candidate.env \
ROLLBACK_DRILL_COMPOSE_PROJECT_NAME=salesops-rollback-check \
scripts/production-rollback-dry-run.sh
```

Schema rollback is not automatic. Migrations must remain backward-compatible unless a restore-based rollback procedure is explicitly selected for that release.
