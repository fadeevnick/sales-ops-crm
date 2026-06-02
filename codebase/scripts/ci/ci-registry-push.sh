#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
MANIFEST_FILE="${1:-${CODEBASE_DIR}/build/release/image-promotion.manifest}"

fail() {
  echo "registry push failed: $*" >&2
  exit 1
}

manifest_value() {
  local key="$1"
  awk -F= -v key="${key}" '$1 == key {print substr($0, length(key) + 2); exit}' "${MANIFEST_FILE}"
}

registry_host() {
  local image_ref="$1"
  printf '%s' "${image_ref%%/*}"
}

require_command() {
  local command_name="$1"
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    fail "missing required command: ${command_name}"
  fi
}

cd "${CODEBASE_DIR}"

require_command awk

if [ ! -f "${MANIFEST_FILE}" ]; then
  fail "missing image promotion manifest: ${MANIFEST_FILE}"
fi

backend_image="$(manifest_value BACKEND_IMAGE)"
frontend_image="$(manifest_value FRONTEND_IMAGE)"
release_tag="$(manifest_value RELEASE_TAG)"

if [ -z "${backend_image}" ]; then
  fail "BACKEND_IMAGE is missing from ${MANIFEST_FILE}"
fi

if [ -z "${frontend_image}" ]; then
  fail "FRONTEND_IMAGE is missing from ${MANIFEST_FILE}"
fi

validation_env="$(mktemp)"
trap 'rm -f "${validation_env}"' EXIT

cat > "${validation_env}" <<ENV
BACKEND_IMAGE=${backend_image}
FRONTEND_IMAGE=${frontend_image}
ENV

if [ -n "${release_tag}" ]; then
  IMAGE_PROMOTION_EXPECTED_TAG="${release_tag}" scripts/validate/validate-image-promotion.sh "${validation_env}" >/dev/null
else
  scripts/validate/validate-image-promotion.sh "${validation_env}" >/dev/null
fi

backend_registry="$(registry_host "${backend_image}")"
frontend_registry="$(registry_host "${frontend_image}")"

if [ "${backend_registry}" != "${frontend_registry}" ]; then
  fail "backend/frontend images must use the same registry host: backend=${backend_registry} frontend=${frontend_registry}"
fi

if [ -n "${CI_REGISTRY_USERNAME:-}" ] && [ -z "${CI_REGISTRY_PASSWORD:-}" ]; then
  fail "CI_REGISTRY_USERNAME is set but CI_REGISTRY_PASSWORD is missing"
fi

if [ -z "${CI_REGISTRY_USERNAME:-}" ] && [ -n "${CI_REGISTRY_PASSWORD:-}" ]; then
  fail "CI_REGISTRY_PASSWORD is set but CI_REGISTRY_USERNAME is missing"
fi

if [ "${CI_REGISTRY_PUSH_ENABLED:-0}" != "1" ]; then
  echo "registry push dry-run passed: backend=${backend_image} frontend=${frontend_image}"
  echo "set CI_REGISTRY_PUSH_ENABLED=1 to push these images to ${backend_registry}"
  exit 0
fi

require_command docker

if [ -n "${CI_REGISTRY_USERNAME:-}" ]; then
  printf '%s' "${CI_REGISTRY_PASSWORD}" | docker login "${backend_registry}" --username "${CI_REGISTRY_USERNAME}" --password-stdin >/dev/null
fi

docker image inspect "${backend_image}" >/dev/null 2>&1 || fail "local backend image is missing: ${backend_image}"
docker image inspect "${frontend_image}" >/dev/null 2>&1 || fail "local frontend image is missing: ${frontend_image}"

docker push "${backend_image}"
docker push "${frontend_image}"

echo "registry push passed: backend=${backend_image} frontend=${frontend_image}"
