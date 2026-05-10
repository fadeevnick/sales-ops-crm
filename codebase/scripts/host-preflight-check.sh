#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${1:-.env.staging}"

fail() {
  echo "host preflight failed: $*" >&2
  exit 1
}

warn() {
  echo "host preflight warning: $*" >&2
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

port_is_listening() {
  local port="$1"

  if command -v ss >/dev/null 2>&1; then
    ss -ltn | awk '{print $4}' | grep -Eq "[:.]${port}$"
    return $?
  fi

  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi

  warn "cannot check port ${port}; neither ss nor lsof is available"
  return 1
}

file_mode() {
  local file="$1"
  stat -c "%a" "${file}" 2>/dev/null || stat -f "%Lp" "${file}" 2>/dev/null || true
}

cd "${CODEBASE_DIR}"

require_command docker
require_command curl
require_command awk
require_command grep
require_command stat

if [ ! -f "${ENV_FILE}" ]; then
  fail "missing env file: ${ENV_FILE}"
fi

if ! docker info >/dev/null 2>&1; then
  fail "docker daemon is not accessible for the current user"
fi

if ! docker compose version >/dev/null 2>&1; then
  fail "Docker Compose v2 is not available through 'docker compose'"
fi

scripts/validate-deploy-env.sh "${ENV_FILE}" >/dev/null
scripts/validate-managed-secrets-plan.sh deploy/secrets.mapping.example "${ENV_FILE}" >/dev/null
docker compose --project-name salesops-host-preflight --env-file "${ENV_FILE}" -f docker-compose.production.yml config --quiet

mode="$(file_mode "${ENV_FILE}")"
if [ -n "${mode}" ]; then
  if [ $((8#${mode} & 0007)) -ne 0 ]; then
    fail "env file must not be readable, writable or executable by other users: ${ENV_FILE} mode ${mode}"
  fi
else
  warn "could not inspect env file permissions: ${ENV_FILE}"
fi

app_allowed_origin="$(env_value APP_ALLOWED_ORIGIN)"
vite_api_base_url="$(env_value VITE_API_BASE_URL)"

if [ "${HOST_PREFLIGHT_ALLOW_LOCALHOST:-0}" != "1" ]; then
  case "${app_allowed_origin}" in
    http://localhost:*|http://127.0.0.1:*) fail "APP_ALLOWED_ORIGIN uses localhost; set HOST_PREFLIGHT_ALLOW_LOCALHOST=1 only for local drills" ;;
  esac
  case "${vite_api_base_url}" in
    http://localhost:*|http://127.0.0.1:*) fail "VITE_API_BASE_URL uses localhost; set HOST_PREFLIGHT_ALLOW_LOCALHOST=1 only for local drills" ;;
  esac
fi

if [ "${HOST_PREFLIGHT_SKIP_PORT_CHECK:-0}" != "1" ]; then
  backend_port="$(env_value BACKEND_PORT)"
  frontend_port="$(env_value FRONTEND_PORT)"

  if port_is_listening "${backend_port}"; then
    fail "backend port is already listening: ${backend_port}"
  fi
  if port_is_listening "${frontend_port}"; then
    fail "frontend port is already listening: ${frontend_port}"
  fi
fi

if [ -n "${SALESOPS_BACKUP_DIR:-}" ]; then
  if [ ! -d "${SALESOPS_BACKUP_DIR}" ]; then
    fail "SALESOPS_BACKUP_DIR does not exist: ${SALESOPS_BACKUP_DIR}"
  fi
  if [ ! -w "${SALESOPS_BACKUP_DIR}" ]; then
    fail "SALESOPS_BACKUP_DIR is not writable by the current user: ${SALESOPS_BACKUP_DIR}"
  fi
else
  warn "SALESOPS_BACKUP_DIR is not set; backup durability target was not checked"
fi

echo "host preflight check passed: ${ENV_FILE}"
