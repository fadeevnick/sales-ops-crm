#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PROJECT_NAME="${ROLLBACK_DRILL_COMPOSE_PROJECT_NAME:-salesops-rollback-drill}"
PREVIOUS_ENV_FILE="${ROLLBACK_PREVIOUS_ENV_FILE:-${CODEBASE_DIR}/deploy/rollback-drill.previous.env}"
CANDIDATE_ENV_FILE="${ROLLBACK_CANDIDATE_ENV_FILE:-${CODEBASE_DIR}/deploy/rollback-drill.candidate.env}"
PUBLIC_URL="${ROLLBACK_DRILL_PUBLIC_URL:-http://127.0.0.1:18080}"
KEEP_STACK="${ROLLBACK_DRILL_KEEP_STACK:-0}"

if [ ! -f "${PREVIOUS_ENV_FILE}" ]; then
  echo "Missing previous env file: ${PREVIOUS_ENV_FILE}" >&2
  exit 1
fi

if [ ! -f "${CANDIDATE_ENV_FILE}" ]; then
  echo "Missing candidate env file: ${CANDIDATE_ENV_FILE}" >&2
  exit 1
fi

cd "${CODEBASE_DIR}"

env_value() {
  local env_file="$1"
  local key="$2"
  awk -F= -v key="${key}" '$1 == key {print substr($0, length(key) + 2); exit}' "${env_file}"
}

cleanup() {
  if [ "${KEEP_STACK}" != "1" ]; then
    docker compose \
      --project-name "${PROJECT_NAME}" \
      --env-file "${PREVIOUS_ENV_FILE}" \
      -f docker-compose.production.yml \
      down -v >/dev/null
  fi
}
trap cleanup EXIT

run_smoke() {
  for _ in $(seq 1 60); do
    if DEPLOYMENT_SMOKE_API_BASE_URL="${PUBLIC_URL}" \
      DEPLOYMENT_SMOKE_FRONTEND_BASE_URL="${PUBLIC_URL}" \
      "${CODEBASE_DIR}/scripts/core/deployment-smoke.sh" health >/dev/null; then
      return 0
    fi
    sleep 1
  done

  echo "Timed out waiting for rollback drill smoke: ${PUBLIC_URL}" >&2
  return 1
}

pull_images() {
  local env_file="$1"
  docker compose \
    --project-name "${PROJECT_NAME}" \
    --env-file "${env_file}" \
    -f docker-compose.production.yml \
    pull backend frontend
}

start_runtime() {
  local env_file="$1"
  PRODUCTION_ENV_FILE="${env_file}" \
  PRODUCTION_COMPOSE_PROJECT_NAME="${PROJECT_NAME}" \
  "${CODEBASE_DIR}/scripts/core/production-migrate.sh"

  docker compose \
    --project-name "${PROJECT_NAME}" \
    --env-file "${env_file}" \
    -f docker-compose.production.yml \
    up -d --force-recreate backend frontend nginx-proxy

  run_smoke
}

pull_images "${PREVIOUS_ENV_FILE}"
pull_images "${CANDIDATE_ENV_FILE}"

start_runtime "${PREVIOUS_ENV_FILE}"
start_runtime "${CANDIDATE_ENV_FILE}"
start_runtime "${PREVIOUS_ENV_FILE}"

echo "rollback dry run passed: ${PROJECT_NAME}"
