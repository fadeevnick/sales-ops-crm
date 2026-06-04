# MVP Pilot Backup Restore Review Note

## Slice

Production deployment backup/restore drill.

## Outcome

```text
accepted on isolated PostgreSQL backup/restore drill
```

## Implemented

- Added `codebase/scripts/core/production-backup.sh`.
- Added `codebase/scripts/core/production-restore-drill.sh`.
- Added `codebase/backups/` to `.gitignore`.
- Updated `codebase/DEPLOYMENT.md` with backup and restore drill commands.

## Verification

Passed:

```bash
bash -n scripts/core/production-backup.sh scripts/core/production-restore-drill.sh scripts/core/production-migrate.sh
docker compose --env-file .env.production.example -f docker-compose.production.yml config --quiet
PRODUCTION_ENV_FILE=/tmp/does-not-exist scripts/core/production-backup.sh
scripts/core/production-restore-drill.sh /tmp/does-not-exist.dump
docker compose --project-name salesops-backup-source --env-file .env -f docker-compose.production.yml build backend
docker compose --project-name salesops-backup-source --env-file .env -f docker-compose.production.yml up -d db
docker compose --project-name salesops-backup-source --env-file .env -f docker-compose.production.yml run --rm migrate
docker compose --project-name salesops-backup-source --env-file .env -f docker-compose.production.yml exec -T db sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl > /tmp/salesops-backup-source.dump'
docker compose --project-name salesops-backup-source --env-file .env -f docker-compose.production.yml cp db:/tmp/salesops-backup-source.dump /tmp/salesops-backup-source.dump
docker compose --project-name salesops-restore-drill-check --env-file .env -f docker-compose.production.yml up -d db
docker compose --project-name salesops-restore-drill-check --env-file .env -f docker-compose.production.yml cp /tmp/salesops-backup-source.dump db:/tmp/salesops-backup-source.dump
docker compose --project-name salesops-restore-drill-check --env-file .env -f docker-compose.production.yml exec -T db sh -lc 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-acl /tmp/salesops-backup-source.dump'
docker compose --project-name salesops-restore-drill-check --env-file .env -f docker-compose.production.yml exec -T db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -tAc "select version from flyway_schema_history where success order by installed_rank desc limit 1"'
docker compose --project-name salesops-restore-drill-check --env-file .env -f docker-compose.production.yml exec -T db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -tAc "select count(*) from flyway_schema_history where success"'
docker compose --project-name salesops-restore-drill-check --env-file .env -f docker-compose.production.yml exec -T db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -tAc "select count(*) from tenants"'
docker compose --project-name salesops-backup-source --env-file .env -f docker-compose.production.yml down -v
docker compose --project-name salesops-restore-drill-check --env-file .env -f docker-compose.production.yml down -v
curl -fsS http://127.0.0.1:8081/readyz
scripts/core/deployment-smoke.sh health
```

The isolated drill:

- created a disposable `salesops-backup-source` database;
- applied all 20 migrations;
- produced `/tmp/salesops-backup-source.dump` as a PostgreSQL custom-format dump;
- restored the dump into a separate `salesops-restore-drill-check` database;
- verified latest successful Flyway version `20`;
- verified 20 successful Flyway records;
- verified restored tenant seed count `1`;
- removed both disposable Compose projects and volumes.

## Corrections Made During Verification

- `production-restore-drill.sh` now verifies latest schema version by Flyway `installed_rank`, not text `max(version)`.
- `production-restore-drill.sh` now runs `pg_restore` with `--exit-on-error`.

## Remaining Gaps

- no external staging host is provisioned;
- no managed secret store integration exists.
- production hardening remains single-node Compose, not Kubernetes/IaC/DR maturity.

## Next Step

Choose the next deployment hardening slice:

```text
external staging host handoff or managed secrets integration planning
```
