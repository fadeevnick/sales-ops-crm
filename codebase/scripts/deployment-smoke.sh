#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRONTEND_DIR="${CODEBASE_DIR}/frontend"

export RUNTIME_SMOKE_API_BASE_URL="${DEPLOYMENT_SMOKE_API_BASE_URL:-${RUNTIME_SMOKE_API_BASE_URL:-http://127.0.0.1:8081}}"
export RUNTIME_SMOKE_FRONTEND_BASE_URL="${DEPLOYMENT_SMOKE_FRONTEND_BASE_URL:-${RUNTIME_SMOKE_FRONTEND_BASE_URL:-http://localhost:5173}}"

SCENARIO="${1:-health}"

cd "${FRONTEND_DIR}"

if [ "${SCENARIO}" = "pilot" ]; then
  npm run pilot:smoke
else
  npm run runtime:smoke -- "${SCENARIO}"
fi

