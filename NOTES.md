# NOTES — setup gotchas & tooling quirks

## Local stack (docker compose, `codebase/docker-compose.yml`)
Bring up: from `codebase/`, `docker compose up -d db backend` (and `frontend`).

- **db** — postgres:16, volume `postgres_data`.
- **backend** — runs `gradle bootRun` (image `gradle:8.14.3-jdk21`) over the
  **mounted** `./backend` source. There is **no built image** and **no Kotlin
  hot-reload**. `bootRun` compiles **once at container start**.
- **frontend** — `node:22`, `npm run dev` over mounted `./frontend` (Vite HMR works).

### ⚠️ After changing backend Kotlin, you MUST restart the backend container
`docker compose up -d db backend` on an already-running container is a **no-op** —
Compose won't recreate it, so the old compiled code keeps running. Use:
```
cd codebase && docker compose restart backend     # bootRun recompiles mounted source
```
`--build` is pointless here (backend isn't a built image; it's bootRun on a volume).

### Symptom of a stale backend: misleading "Opportunity does not exist in visible scope"
If the running backend predates an endpoint the frontend already calls, Spring may
match the request against a path-variable route instead. Concretely:
`GET /api/opportunities/assignable-owners` on a backend without that mapping falls
through to `GET /api/opportunities/{opportunityId}` with id `"assignable-owners"` →
`OpportunityService.getOpportunity` → 422 **"Opportunity does not exist in visible
scope"**. The frontend `loadLists` now tolerates this (the call degrades to empty
owners), but the reassign dropdown stays empty until you **restart the backend** so
the real `assignable-owners` endpoint (and `GET /api/accounts/{id}`) come up.

## GCP Deployment

### Инфраструктура
- **Провайдер:** Google Cloud Platform
- **Проект:** `salesops-crm-pilot`
- **Region:** `europe-west3`
- **Artifact Registry:** `europe-west3-docker.pkg.dev/salesops-crm-pilot/salesops-docker/`
- **Backend runtime:** Cloud Run service `salesops-backend`
- **Migration runtime:** Cloud Run job `salesops-backend-migrate`
- **Database:** Cloud SQL `salesops-postgres`
- **Secrets:** Secret Manager
  - `salesops-db-password`
  - `salesops-app-token-secret`
- **Frontend hosting:** Cloud Storage + backend bucket + Cloud CDN
- **Ingress:** external HTTPS load balancer
- **Домен:** `sales-ops-crm.duckdns.org`

### Полный deployment flow

**1. Release build**
- `pr-main-ci.yml` держит `main` releaseable через build/test/config checks.
- `release-build.yml` собирает backend image и пушит его в Artifact Registry.
- `release-build.yml` собирает frontend `dist/` и публикует его как artifact `frontend-dist-<tag>`.
- `deploy-backend-cloudrun.yml` — ручной workflow для backend Cloud Run path: migration job + backend deploy.
- Standard release anchor: semver git tag (`v0.1.0`, `v0.1.1`, ...).
- Для быстрого старта release CI использует один GitHub secret: `GCP_SERVICE_ACCOUNT_KEY`.
- Для frontend build-time API URL используется GitHub variable `API_BASE_URL`.
- Для backend Cloud Run deploy workflow нужны GitHub variables:
  - `CLOUD_RUN_MIGRATION_JOB`
  - `CLOUD_RUN_SERVICE`

Пример release cut:
```bash
git tag v0.1.0
git push origin v0.1.0
```

Дальше:
- дождаться успешного `release-build.yml`;
- backend deploy идёт через `deploy-backend-cloudrun.yml`;
- frontend `dist/` публикуется в frontend bucket;
- публичный домен уже обслуживается через новый HTTPS load balancer;
- `/api/*` идёт в backend Cloud Run;
- `/` идёт во frontend static hosting.

### Пользователи для входа
| Email | Пароль | Роль |
|---|---|---|
| anna@orion.local | anna2026 | sales_rep |
| michael@orion.local | michael2026 | sales_manager |
| irina@orion.local | irina2026 | revops |
| daria@orion.local | daria2026 | finance |
| oleg@orion.local | oleg2026 | legal |

### Legacy VM path
- VM `salesops-pilot` больше не является primary production contract.

## Frontend verify (no running stack needed)
```
cd codebase/frontend
npx tsc -b
npx vite build --outDir /tmp/salesops-verify --emptyOutDir
```
`tsconfig` has no `noUnusedLocals`/`noUnusedParameters`.
