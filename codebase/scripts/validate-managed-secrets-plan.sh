#!/usr/bin/env bash
set -euo pipefail

MAPPING_FILE="${1:-}"
ENV_FILE="${2:-}"

if [ -z "${MAPPING_FILE}" ] || [ -z "${ENV_FILE}" ]; then
  echo "Usage: scripts/validate-managed-secrets-plan.sh deploy/secrets.mapping.example /path/to/env-file" >&2
  exit 1
fi

if [ ! -f "${MAPPING_FILE}" ]; then
  echo "Missing secret mapping file: ${MAPPING_FILE}" >&2
  exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing env file: ${ENV_FILE}" >&2
  exit 1
fi

validated=0

while IFS='=' read -r key reference; do
  if [ -z "${key}" ] || [[ "${key}" == \#* ]]; then
    continue
  fi

  if [ -z "${reference}" ]; then
    echo "Missing secret reference for key: ${key}" >&2
    exit 1
  fi

  if ! grep -Eq "^${key}=.+" "${ENV_FILE}"; then
    echo "Mapped secret key missing from env file: ${key}" >&2
    exit 1
  fi

  value="$(grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 | cut -d '=' -f 2-)"

  if [ -z "${value}" ]; then
    echo "Mapped secret key is empty: ${key}" >&2
    exit 1
  fi

  if [[ "${value}" =~ ^(change-me|REPLACE_WITH_SECRET|example-secret|password)$ ]]; then
    echo "Mapped secret key still has placeholder value: ${key}" >&2
    exit 1
  fi

  validated=$((validated + 1))
done < "${MAPPING_FILE}"

if [ "${validated}" -eq 0 ]; then
  echo "No managed secret mappings found in ${MAPPING_FILE}" >&2
  exit 1
fi

echo "managed secrets plan validation passed: ${validated} mapped secret(s)"

