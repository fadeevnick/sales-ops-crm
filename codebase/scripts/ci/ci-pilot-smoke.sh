#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FRONTEND_DIR="${CODEBASE_DIR}/frontend"
ENV_FILE="${CODEBASE_DIR}/.env"
ENV_BACKUP=""
HAD_ENV=0

cd "${CODEBASE_DIR}"

if [ -f "${ENV_FILE}" ]; then
  HAD_ENV=1
  ENV_BACKUP="$(mktemp)"
  cp "${ENV_FILE}" "${ENV_BACKUP}"
fi

cleanup() {
  docker compose down --remove-orphans

  if [ "${HAD_ENV}" -eq 1 ] && [ -n "${ENV_BACKUP}" ] && [ -f "${ENV_BACKUP}" ]; then
    cp "${ENV_BACKUP}" "${ENV_FILE}"
    rm -f "${ENV_BACKUP}"
  elif [ "${HAD_ENV}" -eq 0 ]; then
    rm -f "${ENV_FILE}"
  fi
}
trap cleanup EXIT

cat > "${ENV_FILE}" <<'ENV'
POSTGRES_DB=salesops
POSTGRES_USER=salesops
POSTGRES_PASSWORD=salesops
BACKEND_PORT=8081
FRONTEND_PORT=5173
ENV

docker compose up -d --build

for attempt in $(seq 1 80); do
  if curl -fsS http://127.0.0.1:8081/readyz >/dev/null; then
    break
  fi

  if [ "${attempt}" -eq 80 ]; then
    docker compose logs backend
    exit 1
  fi

  sleep 2
done

for attempt in $(seq 1 80); do
  if curl -fsS http://127.0.0.1:5173 >/dev/null; then
    break
  fi

  if [ "${attempt}" -eq 80 ]; then
    docker compose logs frontend
    exit 1
  fi

  sleep 2
done

docker compose exec -T backend gradle compileKotlin --no-daemon
docker compose exec -T frontend npm run build

cd "${FRONTEND_DIR}"
npm run pilot:smoke
