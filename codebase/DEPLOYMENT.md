# GCP Production Deployment

This file describes the real production path. Source of truth for operational quirks is [NOTES.md](/home/nickf/Documents/sre_projects/standalone-projects/sales-ops-crm/NOTES.md).

## What Matters

- `docker-compose.production.yml` is runtime-only. It runs already-built images from Artifact Registry.
- `.github/workflows/pr-main-ci.yml` keeps `main` releaseable.
- `.github/workflows/release-build.yml` builds and pushes the backend release image and uploads the frontend static release artifact.
- `scripts/core/production-migrate.sh` runs migrations on the VM against the remote backend image.
- `scripts/core/deployment-smoke.sh` runs smoke checks against the deployed URLs.
- `scripts/core/production-backup.sh` creates a PostgreSQL custom-format dump from the running VM stack.
- `scripts/core/production-restore-drill.sh` verifies that a dump can actually be restored.
- `scripts/core/production-rollback-dry-run.sh` remains an isolated rollback drill, but now follows the registry-first GCP model.

## Script Map

Read these first:

- `scripts/core/production-migrate.sh`
- `scripts/core/deployment-smoke.sh`
- `scripts/core/production-backup.sh`
- `scripts/core/production-restore-drill.sh`
- `scripts/core/production-rollback-dry-run.sh`

Folders:

- `scripts/core/`: actual GCP production operations and registry-first rollback verification
- `scripts/ci/`: CI-only integration checks; not part of the production deploy path

GitHub Actions entrypoints:

- `.github/workflows/pr-main-ci.yml`: verification CI for PRs and `main`
- `.github/workflows/release-build.yml`: build/push backend release image and upload frontend static release artifact
- `.github/workflows/deploy-backend-cloudrun.yml`: manual backend deploy for the target managed path

## Current Maturity Boundary

What already exists:

- PR / main CI for build, test, and compose sanity;
- release CI for backend image build/push plus frontend static release artifact;
- registry-first production runtime on the VM;
- separate migration step before runtime update;
- post-deploy smoke against the public route;
- backup, restore drill, and rollback drill.

What is still manual:

- creating the release tag;
- maintaining the legacy VM frontend image path while release CI already produces frontend static artifacts for the target managed path;
- running the deploy sequence on the VM (`migrate` -> `pull` -> `up -d` -> `smoke`);
- production rollback execution;
- DuckDNS update after VM IP change;
- cert renewal.

What this means:

- CI release artifact production is the primary release path;
- production deployment is still operator-driven;
- this is a controlled middle stage, not full CD.

## CI And Release Flow

### 1. PR / Main CI

GitHub Actions workflow:

```text
.github/workflows/pr-main-ci.yml
```

It runs on:

- pull requests;
- pushes to `main` / `master`.

It verifies:

- backend build and tests;
- frontend build;
- production compose config sanity.

### 2. Release Build

GitHub Actions workflow:

```text
.github/workflows/release-build.yml
```

It runs on:

- git tags matching `v*`;
- manual `workflow_dispatch`.

It does:

- resolve one release tag;
- build backend image;
- push backend image to Artifact Registry;
- build frontend `dist/` with build-time API URL;
- upload frontend `dist/` as a release artifact.

Required GitHub secrets:

- `GCP_SERVICE_ACCOUNT_KEY`

Required GitHub variable:

- `API_BASE_URL`

Quick-start auth model:

- create one GCP service account for release builds;
- grant it Artifact Registry push permissions;
- generate one JSON key for that service account;
- store that JSON as GitHub secret `GCP_SERVICE_ACCOUNT_KEY`.

### 3. Target Backend Deploy Workflow

GitHub Actions workflow:

```text
.github/workflows/deploy-backend-cloudrun.yml
```

It is a manual workflow for the target managed path.

It:

- takes `release_tag`;
- resolves backend image from Artifact Registry;
- runs the Cloud Run migration job on that image;
- deploys the backend Cloud Run service on that image.

Required GitHub variables:

- `CLOUD_RUN_MIGRATION_JOB`
- `CLOUD_RUN_SERVICE`

### 4. Release Standard

Current standard:

- backend image and frontend static build are produced by `release-build.yml`;
- semver git tags such as `v0.1.0` are the release anchor;
- local build/push is fallback only, not the default production path.

## Real Production Flow

### 1. Produce Release Images In CI

Preferred path: run `release-build.yml` from GitHub Actions.

Manual local build/push remains a fallback only.

Standard release cut:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Then:

1. wait for `release-build.yml` to finish;
2. use backend image tag `europe-west3-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-backend:<release-tag>` on the VM;
3. treat uploaded `frontend-dist-<release-tag>` as the frontend release artifact for the target managed path.

### 2. Set Release Images On The VM

Current VM runtime still expects image refs:

```dotenv
BACKEND_IMAGE=europe-west3-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-backend:<release-tag>
FRONTEND_IMAGE=europe-west3-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-frontend:<release-tag>
```

Important:

- backend image is still produced by the current release CI;
- frontend `dist/` artifact is produced for the target managed path;
- until the frontend hosting migration is implemented, the VM path still requires a separate legacy frontend image strategy.

Practical meaning:

- current release CI is already aligned with the target managed architecture;
- current VM runtime is now only partially aligned with that release model.

### 3. Run Migrations On The VM

`production-migrate.sh` now assumes `BACKEND_IMAGE` already points to the pushed Artifact Registry image.

```bash
gcloud compute ssh salesops-pilot --project=salesops-crm-pilot --zone=europe-west1-b --command="
cd /home/nickf && scripts/core/production-migrate.sh
"
```

### 4. Pull And Restart Runtime On The VM

```bash
gcloud compute ssh salesops-pilot --project=salesops-crm-pilot --zone=europe-west1-b --command="
cd /home/nickf && \
docker compose --env-file /home/nickf/.env -f docker-compose.production.yml pull backend frontend && \
docker compose --env-file /home/nickf/.env -f docker-compose.production.yml up -d backend frontend nginx-proxy
"
```

## Smoke

Default smoke now assumes the public GCP endpoint:

```bash
scripts/core/deployment-smoke.sh
```

Override URLs when needed:

```bash
DEPLOYMENT_SMOKE_API_BASE_URL=https://sales-ops-crm.duckdns.org \
DEPLOYMENT_SMOKE_FRONTEND_BASE_URL=https://sales-ops-crm.duckdns.org \
scripts/core/deployment-smoke.sh health
```

## VM Env File

The VM runtime env is `/home/nickf/.env` and should contain:

```dotenv
POSTGRES_PASSWORD=salesops_pilot_2026
POSTGRES_DB=salesops
POSTGRES_USER=salesops
BACKEND_IMAGE=europe-west3-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-backend:<release-tag>
FRONTEND_IMAGE=europe-west3-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-frontend:<release-tag>
APP_ALLOWED_ORIGIN=https://sales-ops-crm.duckdns.org
SPRING_FLYWAY_ENABLED=false
```

Note:

- `FRONTEND_IMAGE` remains part of the legacy VM runtime contract only.

## Backup And Restore

Create a backup from the VM stack:

```bash
cd /home/nickf && scripts/core/production-backup.sh
```

Restore drill from a produced dump:

```bash
cd /home/nickf && scripts/core/production-restore-drill.sh /safe/path/salesops.dump
```

What to remember:

- a backup is not trusted until restore drill passes
- restore drill uses an isolated Compose project

## Rollback

Production rollback is operationally simple:

- keep the previous backend/frontend image tags
- change `BACKEND_IMAGE` and `FRONTEND_IMAGE` in `/home/nickf/.env`
- run `docker compose ... up -d backend frontend nginx-proxy`

Local rollback verification still exists:

```bash
scripts/core/production-rollback-dry-run.sh
```

What it does:

- pulls `previous` and `candidate` images from Artifact Registry;
- runs migrations through `scripts/core/production-migrate.sh`;
- starts an isolated rollback stack with `nginx/proxy-http.conf` on port `18080`;
- verifies `previous -> candidate -> previous` through `scripts/core/deployment-smoke.sh`.

The drill env files are:

- `deploy/rollback-drill.previous.env`
- `deploy/rollback-drill.candidate.env`

They must point to real Artifact Registry tags before the drill is meaningful.

## GCP Ops Notes

- VM: `salesops-pilot`
- project: `salesops-crm-pilot`
- zone: `europe-west1-b`
- registry: `europe-west3-docker.pkg.dev/salesops-crm-pilot/salesops-docker/`
- public domain: `https://sales-ops-crm.duckdns.org`

After VM restart:

1. get the new IP
2. update DuckDNS
3. if needed, review `/home/nickf/.env`
4. run `docker compose ... up -d`

Cert renewal:

```bash
docker compose --env-file /home/nickf/.env -f docker-compose.production.yml --profile tools run --rm certbot renew
docker compose --env-file /home/nickf/.env -f docker-compose.production.yml exec nginx-proxy nginx -s reload
```
