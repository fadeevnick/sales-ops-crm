# GCP Production Deployment

This file describes the real production path. Source of truth for operational quirks is [NOTES.md](/home/nickf/Documents/sre_projects/standalone-projects/sales-ops-crm/NOTES.md).

## What Matters

- `.github/workflows/pr-main-ci.yml` keeps `main` releaseable.
- `.github/workflows/release-build.yml` builds and pushes the backend release image and uploads the frontend static release artifact.
- `.github/workflows/deploy-backend-cloudrun.yml` deploys backend to Cloud Run and runs migrations through a Cloud Run job.
- frontend is served from Cloud Storage through backend bucket + Cloud CDN.
- public ingress is an external HTTPS load balancer:
  - `/` -> frontend
  - `/api/*` -> backend
- `scripts/ci/`: CI-only integration checks

GitHub Actions entrypoints:

- `.github/workflows/pr-main-ci.yml`: verification CI for PRs and `main`
- `.github/workflows/release-build.yml`: build/push backend release image and upload frontend static release artifact
- `.github/workflows/deploy-backend-cloudrun.yml`: manual backend deploy for the target managed path

## Current Production Model

What already exists:

- PR / main CI for build, test, and compose sanity;
- release CI for backend image build/push plus frontend static release artifact;
- backend runtime on Cloud Run;
- migration job on Cloud Run;
- Cloud SQL for PostgreSQL;
- Secret Manager for runtime secrets;
- frontend static hosting on Cloud Storage + CDN;
- external HTTPS load balancer with one public domain.

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

### 1. Produce release artifacts in CI

Standard release cut:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Then:

1. wait for `release-build.yml` to finish;
2. backend image is available at `europe-west3-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-backend:<release-tag>`;
3. frontend artifact is uploaded as `frontend-dist-<release-tag>`.

### 2. Deploy backend

Run manual workflow:

```text
.github/workflows/deploy-backend-cloudrun.yml
```

It:

1. resolves backend image by release tag;
2. deploys Cloud Run migration job on that image;
3. executes migrations against Cloud SQL;
4. deploys backend Cloud Run service on that image.

### 3. Publish frontend

1. download `frontend-dist-<release-tag>`;
2. upload `dist/` to the frontend Cloud Storage bucket;
3. frontend becomes available through the external HTTPS load balancer and CDN.

### 4. Verify

Public checks:

```bash
curl https://sales-ops-crm.duckdns.org/api/readyz
curl -I https://sales-ops-crm.duckdns.org
```

Expected:

- `/api/readyz` returns backend readiness;
- `/` returns frontend HTML.

## Managed runtime inventory

- Cloud Run service: `salesops-backend`
- Cloud Run job: `salesops-backend-migrate`
- Cloud SQL instance: `salesops-postgres`
- Secret Manager:
  - `salesops-db-password`
  - `salesops-app-token-secret`
- Artifact Registry:
  - `europe-west3-docker.pkg.dev/salesops-crm-pilot/salesops-docker`
- Public domain:
  - `https://sales-ops-crm.duckdns.org`

## Rollback

Production rollback is operationally simple:

- redeploy previous backend image tag to Cloud Run
- republish previous frontend `dist/`

## GCP Ops Notes

- project: `salesops-crm-pilot`
- region: `europe-west3`
- registry: `europe-west3-docker.pkg.dev/salesops-crm-pilot/salesops-docker/`
- public domain: `https://sales-ops-crm.duckdns.org`
