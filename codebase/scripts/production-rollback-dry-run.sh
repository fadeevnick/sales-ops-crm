#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_NAME="${ROLLBACK_DRILL_COMPOSE_PROJECT_NAME:-salesops-rollback-drill}"
PREVIOUS_ENV_FILE="${ROLLBACK_PREVIOUS_ENV_FILE:-${CODEBASE_DIR}/deploy/rollback-drill.previous.env}"
CANDIDATE_ENV_FILE="${ROLLBACK_CANDIDATE_ENV_FILE:-${CODEBASE_DIR}/deploy/rollback-drill.candidate.env}"
BACKEND_URL="${ROLLBACK_DRILL_BACKEND_URL:-http://127.0.0.1:18081}"
FRONTEND_URL="${ROLLBACK_DRILL_FRONTEND_URL:-http://localhost:15173}"
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

wait_for_url() {
  local url="$1"
  local label="$2"

  for _ in $(seq 1 60); do
    if curl -fsS "${url}" >/dev/null; then
      return 0
    fi
    sleep 1
  done

  echo "Timed out waiting for ${label}: ${url}" >&2
  return 1
}

build_images() {
  local env_file="$1"
  docker compose \
    --project-name "${PROJECT_NAME}" \
    --env-file "${env_file}" \
    -f docker-compose.production.yml \
    build backend frontend
}

start_runtime() {
  local env_file="$1"
  docker compose \
    --project-name "${PROJECT_NAME}" \
    --env-file "${env_file}" \
    -f docker-compose.production.yml \
    up -d db

  docker compose \
    --project-name "${PROJECT_NAME}" \
    --env-file "${env_file}" \
    -f docker-compose.production.yml \
    run --rm migrate

  docker compose \
    --project-name "${PROJECT_NAME}" \
    --env-file "${env_file}" \
    -f docker-compose.production.yml \
    up -d --force-recreate backend frontend

  wait_for_url "${BACKEND_URL}/readyz" "backend readiness"
  wait_for_url "${FRONTEND_URL}" "frontend"
}

build_images "${PREVIOUS_ENV_FILE}"
build_images "${CANDIDATE_ENV_FILE}"

start_runtime "${PREVIOUS_ENV_FILE}"
start_runtime "${CANDIDATE_ENV_FILE}"
start_runtime "${PREVIOUS_ENV_FILE}"

echo "rollback dry run passed: ${PROJECT_NAME}"
