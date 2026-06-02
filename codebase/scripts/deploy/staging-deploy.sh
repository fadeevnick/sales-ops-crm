#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENV_FILE="${STAGING_DEPLOY_ENV_FILE:-${CODEBASE_DIR}/.env.staging}"
PROJECT_NAME="${STAGING_DEPLOY_PROJECT_NAME:-salesops-staging}"
COMPOSE_FILE="${CODEBASE_DIR}/docker-compose.production.yml"

fail() {
  echo "staging deploy failed: $*" >&2
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

if [ -n "${STAGING_DEPLOY_BASE_ENV_FILE:-}" ] || [ -n "${STAGING_DEPLOY_MANIFEST_FILE:-}" ]; then
  if [ -z "${STAGING_DEPLOY_BASE_ENV_FILE:-}" ]; then
    fail "STAGING_DEPLOY_BASE_ENV_FILE is required when rendering from a manifest"
  fi
  if [ -z "${STAGING_DEPLOY_MANIFEST_FILE:-}" ]; then
    fail "STAGING_DEPLOY_MANIFEST_FILE is required when rendering from a manifest"
  fi
  "${SCRIPT_DIR}/render-deploy-env-from-manifest.sh" "${STAGING_DEPLOY_BASE_ENV_FILE}" "${STAGING_DEPLOY_MANIFEST_FILE}" "${ENV_FILE}" >/dev/null
fi

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

if [ "${STAGING_DEPLOY_APPLY:-0}" != "1" ]; then
  echo "staging deploy dry-run passed: env=${ENV_FILE} project=${PROJECT_NAME}"
  echo "frontend=${frontend_origin}"
  echo "api=${api_base_url}"
  echo "set STAGING_DEPLOY_APPLY=1 to run migration, compose up and route smoke"
  exit 0
fi

if [ "${STAGING_DEPLOY_SKIP_HOST_PREFLIGHT:-0}" != "1" ]; then
  "${SCRIPT_DIR}/host-preflight-check.sh" "${ENV_FILE}"
fi

PRODUCTION_ENV_FILE="${ENV_FILE}" \
PRODUCTION_COMPOSE_PROJECT_NAME="${PROJECT_NAME}" \
"${SCRIPT_DIR}/production-migrate.sh"

docker compose \
  --project-name "${PROJECT_NAME}" \
  --env-file "${ENV_FILE}" \
  -f "${COMPOSE_FILE}" \
  up -d backend frontend

run_with_retry "reverse proxy/TLS route check" "${SCRIPT_DIR}/reverse-proxy-tls-check.sh" "${ENV_FILE}"

DEPLOYMENT_SMOKE_API_BASE_URL="${api_base_url}" \
DEPLOYMENT_SMOKE_FRONTEND_BASE_URL="${frontend_origin}" \
run_with_retry "deployment health smoke" "${SCRIPT_DIR}/deployment-smoke.sh" health

echo "staging deploy passed: env=${ENV_FILE} project=${PROJECT_NAME}"
