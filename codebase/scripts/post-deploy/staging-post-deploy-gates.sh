#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENV_FILE="${STAGING_POST_DEPLOY_ENV_FILE:-${CODEBASE_DIR}/.env.staging}"
PROJECT_NAME="${STAGING_POST_DEPLOY_PROJECT_NAME:-salesops-staging}"
BACKUP_DIR="${STAGING_POST_DEPLOY_BACKUP_DIR:-${CODEBASE_DIR}/backups}"
BACKUP_FILE="${STAGING_POST_DEPLOY_BACKUP_FILE:-${BACKUP_DIR}/salesops-post-deploy-$(date -u +%Y%m%dT%H%M%SZ).dump}"
COMPOSE_FILE="${CODEBASE_DIR}/docker-compose.production.yml"

fail() {
  echo "staging post-deploy gates failed: $*" >&2
  exit 1
}

env_value() {
  local key="$1"
  awk -F= -v key="${key}" '$1 == key {print substr($0, length(key) + 2); exit}' "${ENV_FILE}"
}

run_with_retry() {
  local label="$1"
  shift

  for attempt in $(seq 1 30); do
    if "$@"; then
      return 0
    fi

    if [ "${attempt}" -eq 30 ]; then
      fail "timed out waiting for ${label}"
    fi

    sleep 2
  done
}

if [ ! -f "${ENV_FILE}" ]; then
  fail "missing staging env file: ${ENV_FILE}"
fi

cd "${CODEBASE_DIR}"

"${SCRIPT_DIR}/validate-deploy-env.sh" "${ENV_FILE}" >/dev/null
"${SCRIPT_DIR}/validate-managed-secrets-plan.sh" deploy/secrets.mapping.example "${ENV_FILE}" >/dev/null
"${SCRIPT_DIR}/validate-image-promotion.sh" "${ENV_FILE}" >/dev/null
docker compose --project-name "${PROJECT_NAME}" --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" config --quiet

frontend_origin="$(env_value APP_ALLOWED_ORIGIN)"
api_base_url="$(env_value VITE_API_BASE_URL)"

if [ ! -d "${BACKUP_DIR}" ]; then
  if [ "${STAGING_POST_DEPLOY_APPLY:-0}" = "1" ]; then
    mkdir -p "${BACKUP_DIR}"
  else
    fail "backup directory does not exist: ${BACKUP_DIR}"
  fi
fi

if [ ! -w "${BACKUP_DIR}" ]; then
  fail "backup directory is not writable: ${BACKUP_DIR}"
fi

if [ "${STAGING_POST_DEPLOY_APPLY:-0}" != "1" ]; then
  echo "staging post-deploy gates dry-run passed: env=${ENV_FILE} project=${PROJECT_NAME}"
  echo "frontend=${frontend_origin}"
  echo "api=${api_base_url}"
  echo "backup=${BACKUP_FILE}"
  echo "set STAGING_POST_DEPLOY_APPLY=1 to run route smoke, backup, restore drill and rollback dry run"
  exit 0
fi

run_with_retry "reverse proxy/TLS route check" "${SCRIPT_DIR}/reverse-proxy-tls-check.sh" "${ENV_FILE}"

DEPLOYMENT_SMOKE_API_BASE_URL="${api_base_url}" \
DEPLOYMENT_SMOKE_FRONTEND_BASE_URL="${frontend_origin}" \
run_with_retry "deployment health smoke" "${SCRIPT_DIR}/deployment-smoke.sh" health

backup_output="$(
  PRODUCTION_ENV_FILE="${ENV_FILE}" \
  PRODUCTION_COMPOSE_PROJECT_NAME="${PROJECT_NAME}" \
  PRODUCTION_BACKUP_FILE="${BACKUP_FILE}" \
  "${SCRIPT_DIR}/production-backup.sh"
)"
backup_path="$(printf '%s\n' "${backup_output}" | tail -n 1)"

if [ ! -f "${backup_path}" ]; then
  fail "backup file was not created: ${backup_path}"
fi

PRODUCTION_ENV_FILE="${ENV_FILE}" \
RESTORE_DRILL_BACKUP_FILE="${backup_path}" \
"${SCRIPT_DIR}/production-restore-drill.sh" "${backup_path}" >/dev/null

if [ "${STAGING_POST_DEPLOY_SKIP_ROLLBACK:-0}" != "1" ]; then
  "${SCRIPT_DIR}/production-rollback-dry-run.sh"
else
  echo "rollback dry run skipped by STAGING_POST_DEPLOY_SKIP_ROLLBACK=1"
fi

echo "staging post-deploy gates passed: env=${ENV_FILE} project=${PROJECT_NAME} backup=${backup_path}"
