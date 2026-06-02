#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENV_FILE="${EXTERNAL_STAGING_ACCEPTANCE_ENV_FILE:-${CODEBASE_DIR}/.env.staging}"
PROJECT_NAME="${EXTERNAL_STAGING_ACCEPTANCE_PROJECT_NAME:-salesops-staging}"
BACKUP_DIR="${EXTERNAL_STAGING_ACCEPTANCE_BACKUP_DIR:-${CODEBASE_DIR}/backups}"
REPORT_FILE="${EXTERNAL_STAGING_ACCEPTANCE_REPORT_FILE:-${CODEBASE_DIR}/build/external-staging-acceptance/acceptance-report.txt}"

fail() {
  echo "external staging acceptance failed: $*" >&2
  exit 1
}

env_value() {
  local key="$1"
  awk -F= -v key="${key}" '$1 == key {print substr($0, length(key) + 2); exit}' "${ENV_FILE}"
}

write_report_header() {
  mkdir -p "$(dirname "${REPORT_FILE}")"
  {
    echo "# External Staging Acceptance Report"
    echo
    echo "generated_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "env_file=${ENV_FILE}"
    echo "project=${PROJECT_NAME}"
    echo "backup_dir=${BACKUP_DIR}"
    echo
  } > "${REPORT_FILE}"
}

record_gate() {
  local gate="$1"
  shift

  echo "running gate: ${gate}"
  if "$@"; then
    echo "- ${gate}: passed" >> "${REPORT_FILE}"
  else
    echo "- ${gate}: failed" >> "${REPORT_FILE}"
    fail "gate failed: ${gate}"
  fi
}

cd "${CODEBASE_DIR}"

if [ -n "${EXTERNAL_STAGING_ACCEPTANCE_BASE_ENV_FILE:-}" ] || [ -n "${EXTERNAL_STAGING_ACCEPTANCE_MANIFEST_FILE:-}" ]; then
  if [ -z "${EXTERNAL_STAGING_ACCEPTANCE_BASE_ENV_FILE:-}" ]; then
    fail "EXTERNAL_STAGING_ACCEPTANCE_BASE_ENV_FILE is required when rendering from a manifest"
  fi
  if [ -z "${EXTERNAL_STAGING_ACCEPTANCE_MANIFEST_FILE:-}" ]; then
    fail "EXTERNAL_STAGING_ACCEPTANCE_MANIFEST_FILE is required when rendering from a manifest"
  fi
  "${SCRIPT_DIR}/render-deploy-env-from-manifest.sh" \
    "${EXTERNAL_STAGING_ACCEPTANCE_BASE_ENV_FILE}" \
    "${EXTERNAL_STAGING_ACCEPTANCE_MANIFEST_FILE}" \
    "${ENV_FILE}" >/dev/null
fi

if [ ! -f "${ENV_FILE}" ]; then
  fail "missing staging env file: ${ENV_FILE}"
fi

if [ ! -d "${BACKUP_DIR}" ]; then
  fail "backup directory does not exist: ${BACKUP_DIR}"
fi

if [ ! -w "${BACKUP_DIR}" ]; then
  fail "backup directory is not writable: ${BACKUP_DIR}"
fi

write_report_header

record_gate "handoff package validation" "${SCRIPT_DIR}/staging-handoff-check.sh"
record_gate "deploy env validation" "${SCRIPT_DIR}/validate-deploy-env.sh" "${ENV_FILE}"
record_gate "managed secret mapping validation" "${SCRIPT_DIR}/validate-managed-secrets-plan.sh" deploy/secrets.mapping.example "${ENV_FILE}"
record_gate "image promotion validation" "${SCRIPT_DIR}/validate-image-promotion.sh" "${ENV_FILE}"

record_gate "staging deploy dry-run" \
  env STAGING_DEPLOY_ENV_FILE="${ENV_FILE}" \
    STAGING_DEPLOY_PROJECT_NAME="${PROJECT_NAME}" \
    "${SCRIPT_DIR}/staging-deploy.sh"

record_gate "staging post-deploy dry-run" \
  env STAGING_POST_DEPLOY_ENV_FILE="${ENV_FILE}" \
    STAGING_POST_DEPLOY_PROJECT_NAME="${PROJECT_NAME}" \
    STAGING_POST_DEPLOY_BACKUP_DIR="${BACKUP_DIR}" \
    "${SCRIPT_DIR}/staging-post-deploy-gates.sh"

if [ "${EXTERNAL_STAGING_ACCEPTANCE_APPLY_DEPLOY:-0}" = "1" ]; then
  record_gate "staging deploy apply" \
    env STAGING_DEPLOY_APPLY=1 \
      STAGING_DEPLOY_ENV_FILE="${ENV_FILE}" \
      STAGING_DEPLOY_PROJECT_NAME="${PROJECT_NAME}" \
      SALESOPS_BACKUP_DIR="${BACKUP_DIR}" \
      "${SCRIPT_DIR}/staging-deploy.sh"
else
  echo "- staging deploy apply: skipped" >> "${REPORT_FILE}"
fi

if [ "${EXTERNAL_STAGING_ACCEPTANCE_APPLY_POST_DEPLOY:-0}" = "1" ]; then
  if [ "${EXTERNAL_STAGING_ACCEPTANCE_APPLY_DEPLOY:-0}" != "1" ]; then
    fail "EXTERNAL_STAGING_ACCEPTANCE_APPLY_POST_DEPLOY=1 requires EXTERNAL_STAGING_ACCEPTANCE_APPLY_DEPLOY=1"
  fi

  record_gate "staging post-deploy apply" \
    env STAGING_POST_DEPLOY_APPLY=1 \
      STAGING_POST_DEPLOY_ENV_FILE="${ENV_FILE}" \
      STAGING_POST_DEPLOY_PROJECT_NAME="${PROJECT_NAME}" \
      STAGING_POST_DEPLOY_BACKUP_DIR="${BACKUP_DIR}" \
      "${SCRIPT_DIR}/staging-post-deploy-gates.sh"
else
  echo "- staging post-deploy apply: skipped" >> "${REPORT_FILE}"
fi

{
  echo
  echo "frontend=$(env_value APP_ALLOWED_ORIGIN)"
  echo "api=$(env_value VITE_API_BASE_URL)"
  if [ "${EXTERNAL_STAGING_ACCEPTANCE_APPLY_DEPLOY:-0}" = "1" ] && [ "${EXTERNAL_STAGING_ACCEPTANCE_APPLY_POST_DEPLOY:-0}" = "1" ]; then
    echo "status=accepted-apply"
  else
    echo "status=accepted-dry-run"
  fi
} >> "${REPORT_FILE}"

echo "external staging acceptance completed: ${REPORT_FILE}"
