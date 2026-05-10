# External Staging Host Handoff

This handoff describes what an operator needs to run the current Sales Ops CRM MVP package on an external staging host.

It does not provision the host. It defines the minimum host contract, files to transfer, secrets to provide, and checks to run after handoff.

## Host Contract

The staging host must provide:

- Docker Engine with Compose v2;
- outbound access to pull `postgres:16`, `node:22`, `nginx:1.27-alpine`, `gradle:8.14.3-jdk21`, and `eclipse-temurin:21-jre`, or preloaded equivalent images;
- enough disk for PostgreSQL named volume, image layers, backups and restore drill artifacts;
- inbound HTTP/TLS routing to frontend and backend URLs;
- a protected location for an uncommitted `.env.staging`;
- a backup target outside the container volume;
- operator access to run the scripts under `codebase/scripts/`.

## Handoff Files

Transfer the repository or at least the `codebase/` directory with:

- `docker-compose.production.yml`;
- `backend/Dockerfile`;
- `frontend/Dockerfile`;
- `frontend/nginx.conf`;
- `.env.staging.example`;
- `deploy/MANAGED_SECRETS.md`;
- `deploy/PRODUCTION_PLATFORM_IAC.md`;
- `deploy/SINGLE_NODE_HOST_IAC.md`;
- `deploy/REVERSE_PROXY_TLS_HANDOFF.md`;
- `deploy/IMAGE_REGISTRY_PROMOTION.md`;
- `deploy/CI_RELEASE_AUTOMATION.md`;
- `deploy/REGISTRY_PUSH_AUTOMATION.md`;
- `deploy/STAGING_MANIFEST_CONSUMPTION.md`;
- `deploy/STAGING_DEPLOY_AUTOMATION.md`;
- `deploy/STAGING_DEPLOY_APPLY_DRILL.md`;
- `deploy/STAGING_POST_DEPLOY_GATES.md`;
- `deploy/STAGING_POST_DEPLOY_APPLY_DRILL.md`;
- `deploy/PRODUCTION_READINESS_SUMMARY.md`;
- `deploy/EXTERNAL_STAGING_ACCEPTANCE.md`;
- `deploy/image-promotion.manifest.example`;
- `deploy/secrets.mapping.example`;
- `deploy/STAGING_READINESS.md`;
- `deploy/EXTERNAL_STAGING_HANDOFF.md`;
- `scripts/validate-deploy-env.sh`;
- `scripts/validate-managed-secrets-plan.sh`;
- `scripts/host-preflight-check.sh`;
- `scripts/reverse-proxy-tls-check.sh`;
- `scripts/validate-image-promotion.sh`;
- `scripts/ci-release-build.sh`;
- `scripts/ci-registry-push.sh`;
- `scripts/render-deploy-env-from-manifest.sh`;
- `scripts/staging-deploy.sh`;
- `scripts/staging-deploy-apply-drill.sh`;
- `scripts/staging-post-deploy-gates.sh`;
- `scripts/staging-post-deploy-apply-drill.sh`;
- `scripts/external-staging-acceptance.sh`;
- `scripts/production-migrate.sh`;
- `scripts/production-backup.sh`;
- `scripts/production-restore-drill.sh`;
- `scripts/production-rollback-dry-run.sh`;
- `scripts/deployment-smoke.sh`.

## Secret Inputs

The operator must create `.env.staging` outside version control with:

- real `POSTGRES_PASSWORD`;
- staging `APP_ALLOWED_ORIGIN`;
- staging `VITE_API_BASE_URL`;
- staging image tags in `BACKEND_IMAGE` and `FRONTEND_IMAGE`;
- `SPRING_FLYWAY_ENABLED=false`.

Do not use `.env.staging.example` directly. It intentionally contains placeholder values and must fail validation.

## Preflight

Run locally before handoff:

```bash
scripts/staging-handoff-check.sh
```

Run on the staging host after creating `.env.staging`:

```bash
scripts/validate-deploy-env.sh .env.staging
scripts/validate-managed-secrets-plan.sh deploy/secrets.mapping.example .env.staging
scripts/validate-image-promotion.sh .env.staging
SALESOPS_BACKUP_DIR=/opt/salesops/backups scripts/host-preflight-check.sh .env.staging
docker compose --project-name salesops-staging --env-file .env.staging -f docker-compose.production.yml config --quiet
```

If deploying from a retained CI release manifest, render `.env.staging` from a protected base env first:

```bash
scripts/render-deploy-env-from-manifest.sh /opt/salesops/env/.env.staging.base /opt/salesops/releases/image-promotion.manifest .env.staging
```

The same gates can be orchestrated through a dry-run first:

```bash
STAGING_DEPLOY_ENV_FILE=.env.staging scripts/staging-deploy.sh
```

After the stack and external routes are available:

```bash
scripts/reverse-proxy-tls-check.sh .env.staging
```

## First Deploy

From `codebase/` on the staging host:

```bash
scripts/validate-deploy-env.sh .env.staging
scripts/validate-managed-secrets-plan.sh deploy/secrets.mapping.example .env.staging
scripts/validate-image-promotion.sh .env.staging
PRODUCTION_ENV_FILE=.env.staging PRODUCTION_COMPOSE_PROJECT_NAME=salesops-staging scripts/production-migrate.sh
docker compose --project-name salesops-staging --env-file .env.staging -f docker-compose.production.yml up -d backend frontend
scripts/reverse-proxy-tls-check.sh .env.staging
DEPLOYMENT_SMOKE_API_BASE_URL=https://api.crm-staging.example.com DEPLOYMENT_SMOKE_FRONTEND_BASE_URL=https://crm-staging.example.com scripts/deployment-smoke.sh health
```

Or use the staging deploy entrypoint:

```bash
STAGING_DEPLOY_APPLY=1 STAGING_DEPLOY_ENV_FILE=.env.staging scripts/staging-deploy.sh
```

After deploy, run post-deploy gates:

```bash
STAGING_POST_DEPLOY_ENV_FILE=.env.staging STAGING_POST_DEPLOY_BACKUP_DIR=/opt/salesops/backups scripts/staging-post-deploy-gates.sh
```

Or run the acceptance wrapper:

```bash
EXTERNAL_STAGING_ACCEPTANCE_ENV_FILE=.env.staging EXTERNAL_STAGING_ACCEPTANCE_BACKUP_DIR=/opt/salesops/backups scripts/external-staging-acceptance.sh
```

Replace the example URLs with the actual staging routes.

## Operational Gates

Before considering staging accepted:

- env validation passes;
- image promotion validation passes;
- host preflight passes;
- explicit migrations pass;
- backend readiness passes through the external route;
- frontend returns `200` through the external route;
- reverse proxy/TLS route check passes;
- backup command writes a dump to a durable location;
- restore drill passes using that dump;
- rollback dry run passes for the promoted image tags.

## Handoff Limits

- This package is single-node Compose.
- TLS/reverse proxy setup is external to this repository.
- Secrets are provided through env files, not a managed secret store.
- There is no Kubernetes/IaC/DR automation in this handoff.
- Platform/IaC boundaries are documented in `deploy/PRODUCTION_PLATFORM_IAC.md`, but no provider-specific implementation is included.
- Single-node host readiness is documented in `deploy/SINGLE_NODE_HOST_IAC.md` and checked by `scripts/host-preflight-check.sh`.
- Reverse proxy/TLS routing is documented in `deploy/REVERSE_PROXY_TLS_HANDOFF.md` and checked by `scripts/reverse-proxy-tls-check.sh`.
- Image registry promotion is documented in `deploy/IMAGE_REGISTRY_PROMOTION.md` and checked by `scripts/validate-image-promotion.sh`.
- CI release build validation is documented in `deploy/CI_RELEASE_AUTOMATION.md`.
- Registry push automation is documented in `deploy/REGISTRY_PUSH_AUTOMATION.md`.
- Staging deploy manifest consumption is documented in `deploy/STAGING_MANIFEST_CONSUMPTION.md`.
- Staging deploy automation is documented in `deploy/STAGING_DEPLOY_AUTOMATION.md`.
- The isolated local staging deploy apply drill is documented in `deploy/STAGING_DEPLOY_APPLY_DRILL.md`.
- Staging post-deploy gates are documented in `deploy/STAGING_POST_DEPLOY_GATES.md`.
- The isolated local staging post-deploy apply drill is documented in `deploy/STAGING_POST_DEPLOY_APPLY_DRILL.md`.
- Current readiness and production blockers are summarized in `deploy/PRODUCTION_READINESS_SUMMARY.md`.
- External staging acceptance is documented in `deploy/EXTERNAL_STAGING_ACCEPTANCE.md`.
