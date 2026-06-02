#!/usr/bin/env bash
set -euo pipefail

BASE_ENV_FILE="${1:-}"
MANIFEST_FILE="${2:-}"
OUTPUT_ENV_FILE="${3:-}"

fail() {
  echo "deploy env render failed: $*" >&2
  exit 1
}

manifest_value() {
  local key="$1"
  awk -F= -v key="${key}" '$1 == key {print substr($0, length(key) + 2); exit}' "${MANIFEST_FILE}"
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

if [ -z "${BASE_ENV_FILE}" ] || [ -z "${MANIFEST_FILE}" ] || [ -z "${OUTPUT_ENV_FILE}" ]; then
  echo "Usage: scripts/env/render-deploy-env-from-manifest.sh /path/base.env /path/image-promotion.manifest /path/output.env" >&2
  exit 1
fi

require_file "base env file" "${BASE_ENV_FILE}"
require_file "image promotion manifest" "${MANIFEST_FILE}"

backend_image="$(manifest_value BACKEND_IMAGE)"
frontend_image="$(manifest_value FRONTEND_IMAGE)"
release_tag="$(manifest_value RELEASE_TAG)"

if [ -z "${backend_image}" ]; then
  fail "BACKEND_IMAGE is missing from ${MANIFEST_FILE}"
fi

if [ -z "${frontend_image}" ]; then
  fail "FRONTEND_IMAGE is missing from ${MANIFEST_FILE}"
fi

output_dir="$(dirname "${OUTPUT_ENV_FILE}")"
if [ ! -d "${output_dir}" ]; then
  fail "output directory does not exist: ${output_dir}"
fi

tmp_env="$(mktemp "${output_dir}/.rendered-env.XXXXXX")"
trap 'rm -f "${tmp_env}"' EXIT

awk -F= '
  $1 == "BACKEND_IMAGE" { next }
  $1 == "FRONTEND_IMAGE" { next }
  { print }
' "${BASE_ENV_FILE}" > "${tmp_env}"

cat >> "${tmp_env}" <<ENV
BACKEND_IMAGE=${backend_image}
FRONTEND_IMAGE=${frontend_image}
ENV

chmod 600 "${tmp_env}"
mv "${tmp_env}" "${OUTPUT_ENV_FILE}"
trap - EXIT
chmod 600 "${OUTPUT_ENV_FILE}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
codebase_dir="$(cd "${script_dir}/.." && pwd)"

"${script_dir}/validate-deploy-env.sh" "${OUTPUT_ENV_FILE}" >/dev/null

if [ -f "${codebase_dir}/deploy/secrets.mapping.example" ]; then
  "${script_dir}/validate-managed-secrets-plan.sh" "${codebase_dir}/deploy/secrets.mapping.example" "${OUTPUT_ENV_FILE}" >/dev/null
fi

if [ -n "${release_tag}" ]; then
  IMAGE_PROMOTION_EXPECTED_TAG="${release_tag}" "${script_dir}/validate-image-promotion.sh" "${OUTPUT_ENV_FILE}" >/dev/null
else
  "${script_dir}/validate-image-promotion.sh" "${OUTPUT_ENV_FILE}" >/dev/null
fi

echo "deploy env rendered from manifest: ${OUTPUT_ENV_FILE}"
