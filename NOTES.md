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
- **VM:** `salesops-pilot`, zone `europe-west1-b`, `e2-medium`, 20GB disk
- **IP:** ephemeral — меняется при каждом рестарте VM
- **Реестр образов:** GCP Artifact Registry
  `europe-west1-docker.pkg.dev/salesops-crm-pilot/salesops-docker/`
- **Домен:** `sales-ops-crm.duckdns.org` (DuckDNS, бесплатный динамический DNS)
- **HTTPS:** nginx-proxy контейнер + Let's Encrypt сертификат (certbot)

### Полный deployment flow

**1. Сборка образов (локально, из корня проекта)**
```bash
# Backend
docker build -t salesops-backend:pilot ./codebase/backend

# Frontend — VITE_API_BASE_URL пустой, т.к. nginx-proxy роутит /api/* на бэкенд
docker build --build-arg VITE_API_BASE_URL= -t salesops-frontend:pilot ./codebase/frontend
```

**2. Тегирование и пуш в Artifact Registry**
```bash
docker tag salesops-backend:pilot europe-west1-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-backend:pilot
docker tag salesops-frontend:pilot europe-west1-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-frontend:pilot

docker push europe-west1-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-backend:pilot
docker push europe-west1-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-frontend:pilot
```

**3. Миграции БД (на VM)**
```bash
gcloud compute ssh salesops-pilot --project=salesops-crm-pilot --zone=europe-west1-b --command="
cd /home/nickf && docker compose -f docker-compose.production.yml --profile tools run --rm migrate
"
```

**4. Обновление образов и рестарт (на VM)**
```bash
gcloud compute ssh salesops-pilot --project=salesops-crm-pilot --zone=europe-west1-b --command="
cd /home/nickf && \
docker compose -f docker-compose.production.yml pull backend frontend && \
docker compose -f docker-compose.production.yml up -d
"
```

### При рестарте VM (IP меняется)
1. Узнать новый IP:
   ```bash
   gcloud compute instances describe salesops-pilot --project=salesops-crm-pilot --zone=europe-west1-b --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
   ```
2. Обновить DuckDNS: `https://www.duckdns.org/update?domains=sales-ops-crm&token=TOKEN&ip=NEW_IP`
3. На VM обновить `.env` (`nano /home/nickf/.env`) — только если меняли переменные
4. Поднять контейнеры: `docker compose -f docker-compose.production.yml up -d`

### Первичная авторизация Docker на VM (один раз)
```bash
gcloud compute ssh salesops-pilot ... --command="gcloud auth configure-docker europe-west1-docker.pkg.dev"
```

### Переменные окружения на VM (`/home/nickf/.env`)
```
POSTGRES_PASSWORD=salesops_pilot_2026
POSTGRES_DB=salesops
POSTGRES_USER=salesops
BACKEND_IMAGE=europe-west1-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-backend:pilot
FRONTEND_IMAGE=europe-west1-docker.pkg.dev/salesops-crm-pilot/salesops-docker/salesops-frontend:pilot
APP_ALLOWED_ORIGIN=https://sales-ops-crm.duckdns.org
SPRING_FLYWAY_ENABLED=false
```

### Пользователи для входа
| Email | Пароль | Роль |
|---|---|---|
| anna@orion.local | anna2026 | sales_rep |
| michael@orion.local | michael2026 | sales_manager |
| irina@orion.local | irina2026 | revops |
| daria@orion.local | daria2026 | finance |
| oleg@orion.local | oleg2026 | legal |

### nginx-proxy и сертификат
- Конфиги: `codebase/nginx/http-only.conf` (временный), `codebase/nginx/https.conf` (рабочий)
- Сертификат истекает **2026-09-01** — нужно обновить вручную через certbot
- Обновление сертификата:
  ```bash
  docker compose -f docker-compose.production.yml --profile tools run --rm certbot renew
  docker compose -f docker-compose.production.yml exec nginx-proxy nginx -s reload
  ```

## Frontend verify (no running stack needed)
```
cd codebase/frontend
npx tsc -b
npx vite build --outDir /tmp/salesops-verify --emptyOutDir
```
`tsconfig` has no `noUnusedLocals`/`noUnusedParameters`.
