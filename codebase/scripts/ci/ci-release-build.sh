#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

short_sha() {
  if [ -n "${GITHUB_SHA:-}" ]; then
    printf '%s' "${GITHUB_SHA:0:12}"
    return
  fi

  if command -v git >/dev/null 2>&1 && git -C "${CODEBASE_DIR}" rev-parse --short=12 HEAD >/dev/null 2>&1; then
    git -C "${CODEBASE_DIR}" rev-parse --short=12 HEAD
    return
  fi

  printf 'local'
}

release_tag() {
  if [ -n "${CI_RELEASE_TAG:-}" ]; then
    printf '%s' "${CI_RELEASE_TAG}"
    return
  fi

  if [ -n "${GITHUB_REF_TYPE:-}" ] && [ "${GITHUB_REF_TYPE}" = "tag" ] && [ -n "${GITHUB_REF_NAME:-}" ]; then
    printf '%s' "${GITHUB_REF_NAME}"
    return
  fi

  printf '%s-git%s' "$(date -u +%Y%m%dT%H%M%SZ)" "$(short_sha)"
}

fail() {
  echo "CI release build failed: $*" >&2
  exit 1
}

cd "${CODEBASE_DIR}"

RELEASE_TAG="$(release_tag)"
CI_RELEASE_REGISTRY="${CI_RELEASE_REGISTRY:-registry.example.com}"
CI_RELEASE_BACKEND_REPOSITORY="${CI_RELEASE_BACKEND_REPOSITORY:-salesops-backend}"
CI_RELEASE_FRONTEND_REPOSITORY="${CI_RELEASE_FRONTEND_REPOSITORY:-salesops-frontend}"
CI_RELEASE_OUTPUT_DIR="${CI_RELEASE_OUTPUT_DIR:-${CODEBASE_DIR}/build/release}"

BACKEND_IMAGE="${CI_RELEASE_REGISTRY}/${CI_RELEASE_BACKEND_REPOSITORY}:${RELEASE_TAG}"
FRONTEND_IMAGE="${CI_RELEASE_REGISTRY}/${CI_RELEASE_FRONTEND_REPOSITORY}:${RELEASE_TAG}"
RELEASE_ENV_FILE="${CI_RELEASE_OUTPUT_DIR}/release.env"
RELEASE_MANIFEST_FILE="${CI_RELEASE_OUTPUT_DIR}/image-promotion.manifest"

mkdir -p "${CI_RELEASE_OUTPUT_DIR}"

cat > "${RELEASE_ENV_FILE}" <<ENV
POSTGRES_DB=salesops
POSTGRES_USER=salesops
POSTGRES_PASSWORD=ci-release-validation-secret

BACKEND_PORT=8081
FRONTEND_PORT=5173

APP_ALLOWED_ORIGIN=https://crm-ci-release.example.com
VITE_API_BASE_URL=https://api.crm-ci-release.example.com
SPRING_FLYWAY_ENABLED=false

BACKEND_IMAGE=${BACKEND_IMAGE}
FRONTEND_IMAGE=${FRONTEND_IMAGE}
ENV

cat > "${RELEASE_MANIFEST_FILE}" <<ENV
RELEASE_TAG=${RELEASE_TAG}
BACKEND_IMAGE=${BACKEND_IMAGE}
FRONTEND_IMAGE=${FRONTEND_IMAGE}
ENV

scripts/validate/validate-deploy-env.sh "${RELEASE_ENV_FILE}" >/dev/null
IMAGE_PROMOTION_EXPECTED_TAG="${RELEASE_TAG}" scripts/validate/validate-image-promotion.sh "${RELEASE_ENV_FILE}" >/dev/null
docker compose --env-file "${RELEASE_ENV_FILE}" -f docker-compose.production.yml config --quiet
docker compose --env-file "${RELEASE_ENV_FILE}" -f docker-compose.production.yml build backend frontend
docker image inspect "${BACKEND_IMAGE}" >/dev/null 2>&1 || fail "built backend image missing: ${BACKEND_IMAGE}"
docker image inspect "${FRONTEND_IMAGE}" >/dev/null 2>&1 || fail "built frontend image missing: ${FRONTEND_IMAGE}"

echo "CI release build passed: ${RELEASE_TAG}"
echo "manifest: ${RELEASE_MANIFEST_FILE}"
