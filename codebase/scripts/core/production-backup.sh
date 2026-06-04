#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${PRODUCTION_ENV_FILE:-${CODEBASE_DIR}/.env}"
PROJECT_NAME="${PRODUCTION_COMPOSE_PROJECT_NAME:-salesops-production}"
BACKUP_DIR="${PRODUCTION_BACKUP_DIR:-${CODEBASE_DIR}/backups}"
BACKUP_FILE="${PRODUCTION_BACKUP_FILE:-${BACKUP_DIR}/salesops-$(date -u +%Y%m%dT%H%M%SZ).dump}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing production env file: ${ENV_FILE}" >&2
  echo "Create it from .env.production.example or set PRODUCTION_ENV_FILE." >&2
  exit 1
fi

mkdir -p "$(dirname "${BACKUP_FILE}")"

cd "${CODEBASE_DIR}"

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

TMP_BACKUP_FILE="${BACKUP_FILE}.tmp"

docker compose \
  --project-name "${PROJECT_NAME}" \
  --env-file "${ENV_FILE}" \
  -f docker-compose.production.yml \
  exec -T db sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
  > "${TMP_BACKUP_FILE}"

mv "${TMP_BACKUP_FILE}" "${BACKUP_FILE}"
echo "${BACKUP_FILE}"
