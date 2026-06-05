#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FRONTEND_DIR="${CODEBASE_DIR}/frontend"
PROJECT_NAME="${CI_PILOT_SMOKE_PROJECT_NAME:-salesops-ci-smoke}"
ENV_FILE="$(mktemp /tmp/salesops-ci-smoke.XXXXXX.env)"
BACKEND_PORT="${CI_PILOT_SMOKE_BACKEND_PORT:-8081}"
FRONTEND_PORT="${CI_PILOT_SMOKE_FRONTEND_PORT:-5173}"
COMPOSE=(docker compose --project-name "${PROJECT_NAME}" --env-file "${ENV_FILE}")

cd "${CODEBASE_DIR}"

cleanup() {
  "${COMPOSE[@]}" down --remove-orphans -v >/dev/null 2>&1 || true
  rm -f "${ENV_FILE}"
}
trap cleanup EXIT

cat > "${ENV_FILE}" <<'ENV'
POSTGRES_DB=salesops
POSTGRES_USER=salesops
POSTGRES_PASSWORD=salesops
ENV
printf 'BACKEND_PORT=%s\nFRONTEND_PORT=%s\n' "${BACKEND_PORT}" "${FRONTEND_PORT}" >> "${ENV_FILE}"

"${COMPOSE[@]}" up -d db backend frontend

for attempt in $(seq 1 80); do
  if curl -fsS "http://127.0.0.1:${BACKEND_PORT}/readyz" >/dev/null; then
    break
  fi

  if [ "${attempt}" -eq 80 ]; then
    "${COMPOSE[@]}" logs backend
    exit 1
  fi

  sleep 2
done

for attempt in $(seq 1 80); do
  if curl -fsS "http://127.0.0.1:${FRONTEND_PORT}" >/dev/null; then
    break
  fi

  if [ "${attempt}" -eq 80 ]; then
    "${COMPOSE[@]}" logs frontend
    exit 1
  fi

  sleep 2
done

cd "${FRONTEND_DIR}"
RUNTIME_SMOKE_API_BASE_URL="http://127.0.0.1:${BACKEND_PORT}" \
RUNTIME_SMOKE_FRONTEND_BASE_URL="http://127.0.0.1:${FRONTEND_PORT}" \
npm run runtime:smoke -- health
