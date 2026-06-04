# MVP Pilot Production Deployment Review Note

## Slice

Production deployment packaging baseline.

## Outcome

```text
accepted on production image build and deployment smoke sanity check
```

## Implemented

- Added backend production Docker packaging:
  - `codebase/backend/Dockerfile`
  - `codebase/backend/.dockerignore`
- Added frontend production Docker packaging:
  - `codebase/frontend/Dockerfile`
  - `codebase/frontend/.dockerignore`
  - `codebase/frontend/nginx.conf`
- Added production-oriented Compose package:
  - `codebase/docker-compose.production.yml`
  - `codebase/.env.production.example`
- Added deployment smoke wrapper:
  - `codebase/scripts/core/deployment-smoke.sh`
- Added deployment runbook:
  - `codebase/DEPLOYMENT.md`

## Verification

Passed:

```bash
docker compose --env-file .env.production.example -f docker-compose.production.yml config --quiet
docker compose -f docker-compose.yml config --quiet
bash -n scripts/core/deployment-smoke.sh
docker compose --env-file .env.production.example -f docker-compose.production.yml build
docker run --rm --entrypoint bash salesops-backend:local -lc 'echo ok'
scripts/core/deployment-smoke.sh health
```

The production image build completed successfully:

- frontend image built through `npm ci` and `npm run build`;
- backend image built through `gradle bootJar --no-daemon`;
- local image tags `salesops-frontend:local` and `salesops-backend:local` were produced.
- backend runtime image contains `bash`, which is used by the production Compose healthcheck.

The deployment smoke wrapper passed against the currently running local runtime:

- backend `http://127.0.0.1:8081/readyz` returned `ready`;
- frontend `http://localhost:5173` returned `200`.

## Runtime Note

Production Compose runtime was not started in this pass because the existing dev Compose stack was already running on backend port `8081` and frontend port `5173`. Starting the production stack on the same ports would have disturbed the active local runtime.

The first smoke attempt from the sandbox failed with `EPERM` on `127.0.0.1:8081`; rerunning the same command with local network permission passed.

## Remaining Gaps

- no external staging host is provisioned;
- no managed secret store integration exists.
- production hardening remains single-node Compose, not Kubernetes/IaC/DR maturity.

## Next Step

Choose the next deployment hardening slice:

```text
external staging host handoff or managed secrets integration planning
```
