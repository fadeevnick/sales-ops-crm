#!/usr/bin/env bash
set -euo pipefail

BASE_ENV_FILE="${1:-}"
MAPPING_FILE="${2:-}"
OUTPUT_ENV_FILE="${3:-}"
SECRET_PROVIDER_ADAPTER="${SECRET_PROVIDER_ADAPTER:-}"
SECRET_PROVIDER_SOURCE_FILE="${SECRET_PROVIDER_SOURCE_FILE:-}"

fail() {
  echo "secret provider env render failed: $*" >&2
  exit 1
}

usage() {
  cat >&2 <<'USAGE'
Usage:
  SECRET_PROVIDER_ADAPTER=env scripts/render-env-from-secret-provider.sh /path/base.env deploy/secrets.mapping.example /path/output.env

  SECRET_PROVIDER_ADAPTER=dotenv SECRET_PROVIDER_SOURCE_FILE=/path/secrets.env \
    scripts/render-env-from-secret-provider.sh /path/base.env deploy/secrets.mapping.example /path/output.env

Supported adapters:
  env     Read mapped secret values from current process environment variables.
  dotenv  Read mapped secret values from SECRET_PROVIDER_SOURCE_FILE.
USAGE
}

require_file() {
  local label="$1"
  local file="$2"
  if [ -z "${file}" ]; then
    fail "missing ${label}"
  fi
  if [ ! -f "${file}" ]; then
    fail "${label} does not exist: ${file}"
  fi
}

dotenv_value() {
  local key="$1"
  awk -F= -v key="${key}" '
    $0 ~ /^[[:space:]]*#/ { next }
    $1 == key { print substr($0, length(key) + 2); found = 1; exit }
    END { if (!found) exit 1 }
  ' "${SECRET_PROVIDER_SOURCE_FILE}"
}

resolved_secret_value() {
  local key="$1"

  case "${SECRET_PROVIDER_ADAPTER}" in
    env)
      if [ -z "${!key+x}" ]; then
        fail "mapped secret is not present in process environment: ${key}"
      fi
      printf '%s' "${!key}"
      ;;
    dotenv)
      if [ -z "${SECRET_PROVIDER_SOURCE_FILE}" ]; then
        fail "SECRET_PROVIDER_SOURCE_FILE is required for dotenv adapter"
      fi
      require_file "secret provider source file" "${SECRET_PROVIDER_SOURCE_FILE}"
      if ! value="$(dotenv_value "${key}")"; then
        fail "mapped secret is not present in dotenv source: ${key}"
      fi
      printf '%s' "${value}"
      ;;
    *)
      fail "unsupported or missing SECRET_PROVIDER_ADAPTER: ${SECRET_PROVIDER_ADAPTER:-<empty>}"
      ;;
  esac
}

if [ -z "${BASE_ENV_FILE}" ] || [ -z "${MAPPING_FILE}" ] || [ -z "${OUTPUT_ENV_FILE}" ]; then
  usage
  exit 1
fi

require_file "base env file" "${BASE_ENV_FILE}"
require_file "secret mapping file" "${MAPPING_FILE}"

output_dir="$(dirname "${OUTPUT_ENV_FILE}")"
if [ ! -d "${output_dir}" ]; then
  fail "output directory does not exist: ${output_dir}"
fi

tmp_env="$(mktemp "${output_dir}/.secret-rendered-env.XXXXXX")"
tmp_secret_values="$(mktemp "${output_dir}/.secret-values.XXXXXX")"
trap 'rm -f "${tmp_env}" "${tmp_secret_values}"' EXIT
chmod 600 "${tmp_env}" "${tmp_secret_values}"

validated=0

while IFS='=' read -r key reference; do
  if [ -z "${key}" ] || [[ "${key}" == \#* ]]; then
    continue
  fi

  if ! [[ "${key}" =~ ^[A-Z_][A-Z0-9_]*$ ]]; then
    fail "invalid mapped env key: ${key}"
  fi

  if [ -z "${reference}" ]; then
    fail "missing secret reference for key: ${key}"
  fi

  if ! [[ "${reference}" =~ ^secret:// ]]; then
    fail "secret reference must use secret:// scheme for key: ${key}"
  fi

  value="$(resolved_secret_value "${key}")"

  if [ -z "${value}" ]; then
    fail "resolved secret value is empty for key: ${key}"
  fi

  if [[ "${value}" =~ ^(change-me|REPLACE_WITH_SECRET|example-secret|password)$ ]]; then
    fail "resolved secret value still looks like a placeholder for key: ${key}"
  fi

  printf '%s=%s\n' "${key}" "${value}" >> "${tmp_secret_values}"
  validated=$((validated + 1))
done < "${MAPPING_FILE}"

if [ "${validated}" -eq 0 ]; then
  fail "no managed secret mappings found in ${MAPPING_FILE}"
fi

awk -F= -v key_file="${tmp_secret_values}" '
  BEGIN {
    while ((getline line < key_file) > 0) {
      split(line, parts, "=")
      secret_keys[parts[1]] = 1
    }
  }
  !($1 in secret_keys) { print }
' "${BASE_ENV_FILE}" > "${tmp_env}"

cat "${tmp_secret_values}" >> "${tmp_env}"

chmod 600 "${tmp_env}"
mv "${tmp_env}" "${OUTPUT_ENV_FILE}"
trap 'rm -f "${tmp_secret_values}"' EXIT
chmod 600 "${OUTPUT_ENV_FILE}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"${script_dir}/validate-deploy-env.sh" "${OUTPUT_ENV_FILE}" >/dev/null
"${script_dir}/validate-managed-secrets-plan.sh" "${MAPPING_FILE}" "${OUTPUT_ENV_FILE}" >/dev/null

echo "secret-backed deploy env rendered: ${OUTPUT_ENV_FILE}"
