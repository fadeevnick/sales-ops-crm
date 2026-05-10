# Single-Node Host IaC Baseline

This baseline keeps the current production Compose package as the deployment contract and makes the external host requirements repeatable.

It is provider-neutral. It does not provision a VM, DNS, TLS certificates, registry, backup bucket or managed secret store by itself.

## Scope

The single-node host path is appropriate for a controlled staging or pilot host where one machine runs:

- Docker Engine and Compose v2;
- the Sales Ops backend container;
- the Sales Ops frontend container;
- PostgreSQL through the current Compose package;
- an external reverse proxy/TLS layer;
- backups stored outside the PostgreSQL container volume.

## Host-Owned Resources

The host operator or future host-level IaC must provide:

- a dedicated service user or operator account;
- Docker Engine and Compose v2;
- inbound routing for frontend and backend URLs;
- TLS termination before traffic reaches the Compose ports;
- a protected deployment directory;
- an uncommitted env file such as `.env.staging`;
- a durable backup directory, mount or bucket sync target;
- access to the image registry used by `BACKEND_IMAGE` and `FRONTEND_IMAGE`;
- a secret rendering flow that produces env values without committing secrets.

## Repository-Owned Contract

This repository owns:

- `docker-compose.production.yml`;
- `.env.staging.example` and `.env.production.example`;
- `deploy/secrets.mapping.example`;
- `scripts/validate-deploy-env.sh`;
- `scripts/validate-managed-secrets-plan.sh`;
- `scripts/host-preflight-check.sh`;
- `scripts/reverse-proxy-tls-check.sh`;
- `scripts/production-migrate.sh`;
- `scripts/deployment-smoke.sh`;
- `scripts/production-backup.sh`;
- `scripts/production-restore-drill.sh`;
- `scripts/production-rollback-dry-run.sh`.

## Directory Layout

Recommended host layout:

```text
/opt/salesops/
  app/                 # repository checkout or released codebase directory
  env/.env.staging     # protected rendered env file, never committed
  backups/             # durable local mount or sync source
  logs/                # reverse proxy or host-level logs, if used
```

The repository does not enforce this exact path. If the host uses a different layout, keep the same ownership boundaries:

- code and scripts are replaceable release artifacts;
- env files are protected runtime configuration;
- backups are outside the database container volume;
- logs and proxy config are host/platform owned.

## Preflight

Run from `codebase/` on the target host:

```bash
SALESOPS_BACKUP_DIR=/opt/salesops/backups scripts/host-preflight-check.sh /opt/salesops/env/.env.staging
```

For a local drill that intentionally uses localhost URLs or occupied ports:

```bash
HOST_PREFLIGHT_ALLOW_LOCALHOST=1 HOST_PREFLIGHT_SKIP_PORT_CHECK=1 scripts/host-preflight-check.sh .env.staging
```

The preflight checks:

- required command availability;
- Docker daemon accessibility;
- Docker Compose v2 availability;
- deploy env validation;
- managed secret mapping coverage;
- Compose config resolution;
- env file permissions;
- remote URL stance unless localhost drills are explicitly allowed;
- frontend/backend port availability unless skipped;
- backup directory presence and write access when `SALESOPS_BACKUP_DIR` is set.

Reverse proxy and TLS routing are covered by `deploy/REVERSE_PROXY_TLS_HANDOFF.md` and `scripts/reverse-proxy-tls-check.sh` after the stack is running.

## Deploy Order

After preflight passes:

```bash
PRODUCTION_ENV_FILE=/opt/salesops/env/.env.staging \
PRODUCTION_COMPOSE_PROJECT_NAME=salesops-staging \
scripts/production-migrate.sh

docker compose \
  --project-name salesops-staging \
  --env-file /opt/salesops/env/.env.staging \
  -f docker-compose.production.yml \
  up -d backend frontend

DEPLOYMENT_SMOKE_API_BASE_URL=https://api.crm-staging.example.com \
DEPLOYMENT_SMOKE_FRONTEND_BASE_URL=https://crm-staging.example.com \
scripts/deployment-smoke.sh health
```

Replace the URLs and env path with the real host values.

Then validate the external proxy/TLS route:

```bash
scripts/reverse-proxy-tls-check.sh /opt/salesops/env/.env.staging
```

## Acceptance Gate

Do not accept a host as deployment-ready until:

- `scripts/host-preflight-check.sh` passes on the target host;
- explicit migration passes;
- deployed backend readiness passes through the external route;
- deployed frontend passes through the external route;
- reverse proxy/TLS route check passes;
- backup writes to durable storage;
- restore drill succeeds from that backup;
- rollback dry run succeeds for the promoted image tags;
- the host owner can rotate `POSTGRES_PASSWORD` without committing the resolved value.

## Limits

- This is not a cloud-specific IaC module.
- This is not a Kubernetes or managed container platform implementation.
- PostgreSQL still runs through the Compose package unless a managed database path is selected later.
- TLS and reverse proxy configuration remain host/platform owned.
- The preflight can detect common host issues, but it cannot prove disaster recovery maturity by itself.
