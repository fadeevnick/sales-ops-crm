#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-}"

fail() {
  echo "image promotion validation failed: $*" >&2
  exit 1
}

env_value() {
  local key="$1"
  awk -F= -v key="${key}" '$1 == key {print substr($0, length(key) + 2); exit}' "${ENV_FILE}"
}

image_tag() {
  local image_ref="$1"

  if [[ "${image_ref}" == *@sha256:* ]]; then
    printf '%s' ""
    return
  fi

  local last_part="${image_ref##*/}"
  if [[ "${last_part}" != *:* ]]; then
    printf '%s' ""
    return
  fi

  printf '%s' "${last_part##*:}"
}

has_remote_registry_prefix() {
  local image_ref="$1"
  local first_part="${image_ref%%/*}"

  [[ "${first_part}" == *.* || "${first_part}" == *:* || "${first_part}" == "localhost" ]]
}

validate_ref() {
  local key="$1"
  local image_ref="$2"

  if [ -z "${image_ref}" ]; then
    fail "${key} is missing from ${ENV_FILE}"
  fi

  if [[ "${image_ref}" =~ [[:space:]] ]]; then
    fail "${key} contains whitespace: ${image_ref}"
  fi

  case "${image_ref}" in
    *REPLACE_WITH_SECRET*|*change-me*|*example-secret*|*password*) fail "${key} contains a placeholder value" ;;
  esac

  local tag
  tag="$(image_tag "${image_ref}")"

  if [ "${tag}" = "latest" ] && [ "${IMAGE_PROMOTION_ALLOW_LATEST:-0}" != "1" ]; then
    fail "${key} must not use the latest tag"
  fi

  if [[ "${image_ref}" != *@sha256:* ]] && [ -z "${tag}" ]; then
    fail "${key} must use an explicit tag or sha256 digest"
  fi

  if [ "${IMAGE_PROMOTION_ALLOW_LOCAL:-0}" != "1" ] && ! has_remote_registry_prefix "${image_ref}"; then
    fail "${key} must include a registry host for remote promotion: ${image_ref}"
  fi
}

if [ -z "${ENV_FILE}" ]; then
  echo "Usage: scripts/validate/validate-image-promotion.sh /path/to/env-file" >&2
  exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
  fail "missing env file: ${ENV_FILE}"
fi

backend_image="$(env_value BACKEND_IMAGE)"
frontend_image="$(env_value FRONTEND_IMAGE)"

validate_ref BACKEND_IMAGE "${backend_image}"
validate_ref FRONTEND_IMAGE "${frontend_image}"

backend_tag="$(image_tag "${backend_image}")"
frontend_tag="$(image_tag "${frontend_image}")"

if [ -n "${IMAGE_PROMOTION_EXPECTED_TAG:-}" ]; then
  if [ -n "${backend_tag}" ] && [ "${backend_tag}" != "${IMAGE_PROMOTION_EXPECTED_TAG}" ]; then
    fail "BACKEND_IMAGE tag ${backend_tag} does not match IMAGE_PROMOTION_EXPECTED_TAG=${IMAGE_PROMOTION_EXPECTED_TAG}"
  fi
  if [ -n "${frontend_tag}" ] && [ "${frontend_tag}" != "${IMAGE_PROMOTION_EXPECTED_TAG}" ]; then
    fail "FRONTEND_IMAGE tag ${frontend_tag} does not match IMAGE_PROMOTION_EXPECTED_TAG=${IMAGE_PROMOTION_EXPECTED_TAG}"
  fi
fi

if [ "${IMAGE_PROMOTION_ALLOW_MISMATCHED_TAGS:-0}" != "1" ] && [ -n "${backend_tag}" ] && [ -n "${frontend_tag}" ] && [ "${backend_tag}" != "${frontend_tag}" ]; then
  fail "backend/frontend image tags must match: backend=${backend_tag} frontend=${frontend_tag}"
fi

if [ "${IMAGE_PROMOTION_REQUIRE_LOCAL_IMAGES:-0}" = "1" ]; then
  if ! command -v docker >/dev/null 2>&1; then
    fail "docker is required when IMAGE_PROMOTION_REQUIRE_LOCAL_IMAGES=1"
  fi
  docker image inspect "${backend_image}" >/dev/null 2>&1 || fail "local backend image is missing: ${backend_image}"
  docker image inspect "${frontend_image}" >/dev/null 2>&1 || fail "local frontend image is missing: ${frontend_image}"
fi

echo "image promotion validation passed: backend=${backend_image} frontend=${frontend_image}"
