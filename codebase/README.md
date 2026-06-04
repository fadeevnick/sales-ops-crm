# Sales Ops CRM Codebase

Phase 0 bootstrap для standalone проекта:

```text
B2B Sales Operations CRM with approvals
```

Это не полный MVP. Здесь собран минимальный full-stack shell, который нужен перед переходом к продуктовым phase implementation:

- backend shell на Kotlin + Spring Boot;
- frontend workspace shell на React + Vite;
- PostgreSQL baseline;
- Flyway migrations;
- demo tenant / users / roles seed;
- temporary demo login flow;
- health/readiness endpoints.

Текущее состояние codebase уже чуть шире чистого Phase 0 shell:

- `V3__phase2_crm_core.sql` added in repo;
- first `Phase 2` backend account baseline passed a narrow runtime sanity check;
- second `Phase 2` backend contact baseline passed a narrow runtime sanity check;
- third `Phase 2` backend opportunity baseline passed a narrow runtime sanity check;
- fourth `Phase 2` backend activity baseline passed a narrow runtime sanity check;
- fifth `Phase 2` backend move-stage command passed a narrow runtime sanity check;
- sixth `Phase 2` backend opportunity patch/update baseline passed a narrow runtime sanity check;
- seventh `Phase 2` backend opportunity reassign-owner command passed a narrow runtime sanity check;
- eighth `Phase 2` backend manager/team opportunity scope baseline passed a narrow runtime sanity check;
- ninth `Phase 2` frontend CRM read shell passed a narrow build/dev sanity check;
- tenth `Phase 2` frontend CRM create forms passed a narrow build/API sanity check;
- eleventh `Phase 2` frontend opportunity action controls passed a narrow build/API sanity check;
- twelfth `Phase 2` frontend activity section passed a narrow build/API sanity check;
- broader `Phase 2` API/build/dev verification passed on the current running compose stack;
- clean restart and browser-level Sales Rep CRM walkthrough for `Phase 2` passed.
- `V4__phase3_approval_core.sql` added in repo and applied successfully;
- first `Phase 3` backend approval database foundation passed a migration/runtime sanity check.
- second `Phase 3` backend approval DTO/repository baseline passed a compile/runtime sanity check.
- third `Phase 3` backend approval policy/state/visibility baseline passed a compile/runtime sanity check.
- fourth `Phase 3` backend approval service/opportunity bridge baseline passed a compile/restart sanity check.
- fifth `Phase 3` backend approval controller endpoints passed an API/runtime sanity check.
- sixth `Phase 3` frontend approval API/type contracts passed a build/API sanity check.
- seventh `Phase 3` frontend opportunity approval submit strip passed a build/browser sanity check.
- eighth `Phase 3` frontend approver inbox passed a build/API/browser sanity check.
- ninth `Phase 3` frontend approval detail/decision UI passed a build/API/browser sanity check.
- final `Phase 3` Legal Approver approval and Sales Rep outcome verification passed a browser sanity check.
- `V5__phase4_metadata_core.sql` added in repo and applied successfully.
- first `Phase 4` backend metadata schema foundation passed a migration/runtime sanity check.

## Structure

```text
codebase/
├── backend/
├── frontend/
├── docker-compose.yml
├── docker-compose.production.yml
├── DEPLOYMENT.md
├── .env.example
├── .env.production.example
└── README.md
```

## What Phase 0 includes

- tenant-aware seed data;
- minimal authenticated shell through demo login;
- `/healthz` and `/readyz`;
- `GET /api/session/demo-users`;
- `POST /api/session/demo-login`;
- `GET /api/me`;
- frontend workspace shell with role-aware module cards.

## What remains outside the current CRM core

- approval notifications;
- metadata admin API and UI;
- metadata-aware CRM runtime forms;
- saved views;
- import/export;
- deduplication;
- dashboards.

Это приходит в следующих phase slices из `06_implementation_guide.md`.

Важно:

- repository now contains the implemented `Phase 2` CRM core path across backend and frontend;
- Phase 2 has clean-restart and browser-level proof for the primary Sales Rep CRM path;
- manager, RevOps and approver Phase 2 coverage is currently API-level rather than a full browser-per-persona walkthrough.
- Phase 3 backend approval endpoints are implemented and have a narrow API sanity check;
- Phase 3 frontend can submit approval from opportunity detail;
- Phase 3 frontend can render an approver inbox for finance/legal approvers;
- Phase 3 frontend can render approval detail and submit approval decisions;
- Phase 3 final Legal Approver approval and Sales Rep outcome browser verification passed.
- Phase 4 metadata storage foundation exists with a seeded published config for `tenant_orion`;
- Phase 4 runtime still does not consume metadata in CRM forms or validation.
- Production deployment is now treated as a concrete GCP flow: local image build, push to Artifact Registry, migration on the VM through `scripts/core/production-migrate.sh`, runtime restart through `docker compose`, smoke through `scripts/core/deployment-smoke.sh`, and backup/restore through `scripts/core/production-backup.sh` plus `scripts/core/production-restore-drill.sh`. The concise runbook is in `DEPLOYMENT.md`, and setup quirks remain in `../NOTES.md`.

## Run locally

1. Copy `.env.example` to `.env` if you want to override defaults.
2. Start the stack:

```bash
cd codebase
docker compose up --build
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:8080
```

## Demo users

Seeded demo identities:

- `anna@orion.local` — Sales Representative
- `michael@orion.local` — Sales Manager
- `irina@orion.local` — RevOps Administrator
- `daria@orion.local` — Finance Approver
- `oleg@orion.local` — Legal Approver

Current Phase 0 demo auth is intentionally temporary:

- choose a seeded user in UI;
- frontend calls `POST /api/session/demo-login`;
- frontend stores returned `userId`;
- subsequent requests send `X-Demo-User-Id`.

This is only a bootstrap path before Phase 1 auth hardening.

## Runtime checks

Basic shell verification:

```bash
curl -f http://localhost:8080/healthz
curl -f http://localhost:8080/readyz
curl -s http://localhost:8080/api/session/demo-users
```

If local port overrides are present in `.env`,
use those host ports instead of the defaults above.

## Notes

- First run downloads Gradle and npm dependencies inside containers.
- Local build tools are intentionally containerized because `gradle` and `mvn` are not installed on the host.
- Runtime maturity should continue to follow the local substrate baseline from `../00_substrate_reference.md`.
