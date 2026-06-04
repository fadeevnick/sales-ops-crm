# GCP Production Deployment

This file describes the real production path. Source of truth for operational quirks is [NOTES.md](/home/nickf/Documents/sre_projects/standalone-projects/sales-ops-crm/NOTES.md).

If you want the script tree first, read [scripts/README.md](/home/nickf/Documents/sre_projects/standalone-projects/sales-ops-crm/codebase/scripts/README.md).

## What Matters

- `docker-compose.production.yml` is runtime-only. It runs already-built images from Artifact Registry.
- `scripts/core/production-migrate.sh` runs migrations on the VM against the remote backend image.
- `scripts/core/deployment-smoke.sh` runs smoke checks against the deployed URLs.
- `scripts/core/production-backup.sh` creates a PostgreSQL custom-format dump from the running VM stack.
- `scripts/core/production-restore-drill.sh` verifies that a dump can actually be restored.
- `scripts/core/production-rollback-dry-run.sh` remains an isolated rollback drill, but now follows the registry-first GCP model.

## Real Production Flow

### 1. Build Images Locally

From the project root:

```bash
docker build -t salesops-backend:pilot ./codebase/backend
docker build --build-arg VITE_API_BASE_URL= -t salesops-frontend:pilot ./codebase/frontend
```

### 2. Tag And Push To Artifact Registry

```bash
docker tag salesops-backend:pilot europe-west1-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-backend:pilot
docker tag salesops-frontend:pilot europe-west1-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-frontend:pilot

docker push europe-west1-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-backend:pilot
docker push europe-west1-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-frontend:pilot
```

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

Run the full pilot suite:

```bash
DEPLOYMENT_SMOKE_API_BASE_URL=https://sales-ops-crm.duckdns.org \
DEPLOYMENT_SMOKE_FRONTEND_BASE_URL=https://sales-ops-crm.duckdns.org \
scripts/core/deployment-smoke.sh pilot
```

## VM Env File

The VM runtime env is `/home/nickf/.env` and should contain:

```dotenv
POSTGRES_PASSWORD=salesops_pilot_2026
POSTGRES_DB=salesops
POSTGRES_USER=salesops
BACKEND_IMAGE=europe-west1-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-backend:pilot
FRONTEND_IMAGE=europe-west1-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-frontend:pilot
APP_ALLOWED_ORIGIN=https://sales-ops-crm.duckdns.org
SPRING_FLYWAY_ENABLED=false
```

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
- registry: `europe-west1-docker.pkg.dev/salesops-crm-pilot/salesops-docker/`
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
