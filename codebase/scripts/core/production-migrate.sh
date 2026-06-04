#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${PRODUCTION_ENV_FILE:-${CODEBASE_DIR}/.env}"
PROJECT_NAME="${PRODUCTION_COMPOSE_PROJECT_NAME:-salesops-production}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing production env file: ${ENV_FILE}" >&2
  echo "Create it from .env.production.example or set PRODUCTION_ENV_FILE." >&2
  exit 1
fi

cd "${CODEBASE_DIR}"

docker compose \
  --project-name "${PROJECT_NAME}" \
  --env-file "${ENV_FILE}" \
  -f docker-compose.production.yml \
  pull backend

docker compose \
  --project-name "${PROJECT_NAME}" \
  --env-file "${ENV_FILE}" \
  -f docker-compose.production.yml \
  up -d db

docker compose \
  --project-name "${PROJECT_NAME}" \
  --env-file "${ENV_FILE}" \
  -f docker-compose.production.yml \
  --profile tools \
  run --rm migrate
