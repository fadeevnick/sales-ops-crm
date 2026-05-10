#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env.staging}"

fail() {
  echo "reverse proxy/TLS check failed: $*" >&2
  exit 1
}

require_command() {
  local command_name="$1"
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    fail "missing required command: ${command_name}"
  fi
}

env_value() {
  local key="$1"
  awk -F= -v key="${key}" '$1 == key {print substr($0, length(key) + 2); exit}' "${ENV_FILE}"
}

trim_trailing_slash() {
  local value="$1"
  while [ "${value}" != "/" ] && [ "${value%/}" != "${value}" ]; do
    value="${value%/}"
  done
  printf '%s' "${value}"
}

require_command awk
require_command curl

if [ ! -f "${ENV_FILE}" ]; then
  fail "missing env file: ${ENV_FILE}"
fi

frontend_origin="$(trim_trailing_slash "$(env_value APP_ALLOWED_ORIGIN)")"
api_base_url="$(trim_trailing_slash "$(env_value VITE_API_BASE_URL)")"

if [ -z "${frontend_origin}" ]; then
  fail "APP_ALLOWED_ORIGIN is missing from ${ENV_FILE}"
fi

if [ -z "${api_base_url}" ]; then
  fail "VITE_API_BASE_URL is missing from ${ENV_FILE}"
fi

if [ "${REVERSE_PROXY_TLS_ALLOW_INSECURE:-0}" != "1" ]; then
  case "${frontend_origin}" in
    https://*) ;;
    *) fail "APP_ALLOWED_ORIGIN must use https:// for remote route checks" ;;
  esac
  case "${api_base_url}" in
    https://*) ;;
    *) fail "VITE_API_BASE_URL must use https:// for remote route checks" ;;
  esac
fi

if ! curl -fsS -o /dev/null "${frontend_origin}"; then
  fail "frontend route did not return a successful response: ${frontend_origin}"
fi

if ! curl -fsS -o /dev/null -H "Origin: ${frontend_origin}" "${api_base_url}/readyz"; then
  fail "API readiness route did not return a successful response: ${api_base_url}/readyz"
fi

echo "reverse proxy/TLS route check passed: frontend=${frontend_origin} api=${api_base_url}"
