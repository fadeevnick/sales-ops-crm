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

## Frontend verify (no running stack needed)
```
cd codebase/frontend
npx tsc -b
npx vite build --outDir /tmp/salesops-verify --emptyOutDir
```
`tsconfig` has no `noUnusedLocals`/`noUnusedParameters`.
