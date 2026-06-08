#!/usr/bin/env bash
set -euo pipefail

PUBLIC_BASE_URL="${SALESOPS_PUBLIC_BASE_URL:-https://sales-ops-crm.duckdns.org}"
API_BASE_URL="${DEPLOYMENT_SMOKE_API_BASE_URL:-${PUBLIC_BASE_URL}}"
FRONTEND_BASE_URL="${DEPLOYMENT_SMOKE_FRONTEND_BASE_URL:-${PUBLIC_BASE_URL}}"

SCENARIO="${1:-health}"

if [ "${SCENARIO}" != "health" ]; then
  echo "unsupported deployment smoke scenario: ${SCENARIO}" >&2
  exit 1
fi

backend_body="$(mktemp)"
frontend_body="$(mktemp)"
trap 'rm -f "${backend_body}" "${frontend_body}"' EXIT

backend_status="$(
  curl -fsS \
    -o "${backend_body}" \
    -w '%{http_code}' \
    "${API_BASE_URL%/}/readyz"
)"

if [ "${backend_status}" != "200" ]; then
  echo "backend readiness failed: ${API_BASE_URL%/}/readyz returned ${backend_status}" >&2
  exit 1
fi

if ! grep -q '"status"[[:space:]]*:[[:space:]]*"ready"' "${backend_body}"; then
  echo "backend readiness failed: readyz response does not contain status=ready" >&2
  cat "${backend_body}" >&2
  exit 1
fi

frontend_status="$(
  curl -fsS \
    -o "${frontend_body}" \
    -w '%{http_code}' \
    "${FRONTEND_BASE_URL%/}/"
)"

if [ "${frontend_status}" != "200" ]; then
  echo "frontend availability failed: ${FRONTEND_BASE_URL%/}/ returned ${frontend_status}" >&2
  exit 1
fi

if ! grep -q '<div id="root"></div>' "${frontend_body}"; then
  echo "frontend availability failed: root app shell marker not found" >&2
  exit 1
fi

printf '{\n'
printf '  "scenario": "health",\n'
printf '  "ok": true,\n'
printf '  "result": {\n'
printf '    "backend": {\n'
printf '      "baseUrl": "%s",\n' "${API_BASE_URL}"
printf '      "status": "ready"\n'
printf '    },\n'
printf '    "frontend": {\n'
printf '      "baseUrl": "%s",\n' "${FRONTEND_BASE_URL}"
printf '      "status": 200\n'
printf '    }\n'
printf '  }\n'
printf '}\n'
