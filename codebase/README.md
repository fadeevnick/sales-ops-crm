# Sales Ops CRM Codebase

This codebase is no longer a Phase 0 shell. It is the current implementation of the MVP/pilot path.

## What Lives Here

- `backend/` — Kotlin + Spring Boot application
- `frontend/` — React + Vite application
- `docker-compose.yml` — local development runtime
- `docker-compose.production.yml` — GCP production runtime
- `DEPLOYMENT.md` — current production runbook
- `scripts/core/` — production operations
- `scripts/ci/` — CI-only smoke helpers

## Current Reality

Implemented at a meaningful level:

- tenant-aware CRM core;
- approval workflow;
- metadata-driven configuration baseline;
- import/export and duplicate handling baseline;
- executive visibility baseline;
- pilot hardening slices;
- production deploy, migrate, backup, restore, and rollback drill mechanics.

## Source Of Truth

Use these docs first:

1. [DEPLOYMENT.md](DEPLOYMENT.md)
2. [../NOTES.md](../NOTES.md)

Do not treat old phase-by-phase notes as current codebase documentation.

## Local Runtime

Start locally:

```bash
cd codebase
docker compose up --build
```

Default local URLs:

- frontend: `http://localhost:5173`
- backend: `http://localhost:8080`

## Production Runtime

Production now follows a concrete GCP flow:

- release images are built and pushed through GitHub Actions;
- the VM pulls images from Artifact Registry;
- migrations run through `scripts/core/production-migrate.sh`;
- runtime smoke runs through `scripts/core/deployment-smoke.sh`;
- backup/restore use `scripts/core/production-backup.sh` and `scripts/core/production-restore-drill.sh`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the actual runbook.
