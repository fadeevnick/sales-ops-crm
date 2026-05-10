#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-}"

if [ -z "${ENV_FILE}" ]; then
  echo "Usage: scripts/validate-deploy-env.sh /path/to/env-file" >&2
  exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing env file: ${ENV_FILE}" >&2
  exit 1
fi

required_keys=(
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
  BACKEND_PORT
  FRONTEND_PORT
  APP_ALLOWED_ORIGIN
  VITE_API_BASE_URL
  SPRING_FLYWAY_ENABLED
  BACKEND_IMAGE
  FRONTEND_IMAGE
)

missing=0
for key in "${required_keys[@]}"; do
  if ! grep -Eq "^${key}=.+" "${ENV_FILE}"; then
    echo "Missing required env key: ${key}" >&2
    missing=1
  fi
done

if [ "${missing}" -ne 0 ]; then
  exit 1
fi

if grep -Eq '=(change-me|REPLACE_WITH_SECRET|example-secret|password)$' "${ENV_FILE}"; then
  echo "Env file still contains placeholder secret values." >&2
  exit 1
fi

if grep -Eq '^SPRING_FLYWAY_ENABLED=true$' "${ENV_FILE}"; then
  echo "Production-like env files must keep SPRING_FLYWAY_ENABLED=false; run migrations explicitly." >&2
  exit 1
fi

if ! grep -Eq '^APP_ALLOWED_ORIGIN=https://|^APP_ALLOWED_ORIGIN=http://localhost:' "${ENV_FILE}"; then
  echo "APP_ALLOWED_ORIGIN must be https:// for remote envs or http://localhost for local drills." >&2
  exit 1
fi

if ! grep -Eq '^VITE_API_BASE_URL=https://|^VITE_API_BASE_URL=http://localhost:' "${ENV_FILE}"; then
  echo "VITE_API_BASE_URL must be https:// for remote envs or http://localhost for local drills." >&2
  exit 1
fi

echo "deploy env validation passed: ${ENV_FILE}"

