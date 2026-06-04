#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${PRODUCTION_ENV_FILE:-${CODEBASE_DIR}/.env}"
PROJECT_NAME="${RESTORE_DRILL_COMPOSE_PROJECT_NAME:-salesops-restore-drill-$(date -u +%Y%m%d%H%M%S)}"
BACKUP_FILE="${1:-${RESTORE_DRILL_BACKUP_FILE:-}}"
KEEP_STACK="${RESTORE_DRILL_KEEP_STACK:-0}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: scripts/core/production-restore-drill.sh /path/to/backup.dump" >&2
  echo "Or set RESTORE_DRILL_BACKUP_FILE." >&2
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Missing backup file: ${BACKUP_FILE}" >&2
  exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing production env file: ${ENV_FILE}" >&2
  echo "Create it from .env.production.example or set PRODUCTION_ENV_FILE." >&2
  exit 1
fi

cd "${CODEBASE_DIR}"

cleanup() {
  if [ "${KEEP_STACK}" != "1" ]; then
    docker compose \
      --project-name "${PROJECT_NAME}" \
      --env-file "${ENV_FILE}" \
      -f docker-compose.production.yml \
      down -v >/dev/null
  fi
}
trap cleanup EXIT

docker compose \
  --project-name "${PROJECT_NAME}" \
  --env-file "${ENV_FILE}" \
  -f docker-compose.production.yml \
  up -d db

docker compose \
  --project-name "${PROJECT_NAME}" \
  --env-file "${ENV_FILE}" \
  -f docker-compose.production.yml \
  exec -T db sh -lc 'until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do sleep 1; done' >/dev/null

docker compose \
  --project-name "${PROJECT_NAME}" \
  --env-file "${ENV_FILE}" \
  -f docker-compose.production.yml \
  exec -T db sh -lc 'createdb -U "$POSTGRES_USER" "$POSTGRES_DB" 2>/tmp/createdb.err || grep -q "already exists" /tmp/createdb.err'

docker compose \
  --project-name "${PROJECT_NAME}" \
  --env-file "${ENV_FILE}" \
  -f docker-compose.production.yml \
  exec -T db sh -lc 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-acl --exit-on-error' \
  < "${BACKUP_FILE}"

docker compose \
  --project-name "${PROJECT_NAME}" \
  --env-file "${ENV_FILE}" \
  -f docker-compose.production.yml \
  exec -T db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -tAc "select version from flyway_schema_history where success order by installed_rank desc limit 1"'
