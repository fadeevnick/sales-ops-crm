#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FRONTEND_DIR="${CODEBASE_DIR}/frontend"
PUBLIC_BASE_URL="${SALESOPS_PUBLIC_BASE_URL:-https://sales-ops-crm.duckdns.org}"

export RUNTIME_SMOKE_API_BASE_URL="${DEPLOYMENT_SMOKE_API_BASE_URL:-${RUNTIME_SMOKE_API_BASE_URL:-${PUBLIC_BASE_URL}}}"
export RUNTIME_SMOKE_FRONTEND_BASE_URL="${DEPLOYMENT_SMOKE_FRONTEND_BASE_URL:-${RUNTIME_SMOKE_FRONTEND_BASE_URL:-${PUBLIC_BASE_URL}}}"

SCENARIO="${1:-health}"

cd "${FRONTEND_DIR}"

if [ "${SCENARIO}" = "pilot" ]; then
  npm run pilot:smoke
else
  npm run runtime:smoke -- "${SCENARIO}"
fi
