#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_NAME="${STAGING_POST_DEPLOY_DRILL_PROJECT_NAME:-salesops-staging-post-deploy-drill}"
BACKEND_PORT="${STAGING_POST_DEPLOY_DRILL_BACKEND_PORT:-19181}"
FRONTEND_PORT="${STAGING_POST_DEPLOY_DRILL_FRONTEND_PORT:-16273}"
IMAGE_TAG="${STAGING_POST_DEPLOY_DRILL_IMAGE_TAG:-staging-post-deploy-drill}"
BACKUP_DIR="${STAGING_POST_DEPLOY_DRILL_BACKUP_DIR:-/tmp/salesops-post-deploy-drill-backups}"
KEEP_STACK="${STAGING_POST_DEPLOY_DRILL_KEEP_STACK:-0}"
SKIP_ROLLBACK="${STAGING_POST_DEPLOY_DRILL_SKIP_ROLLBACK:-0}"

cd "${CODEBASE_DIR}"

tmp_env="$(mktemp /tmp/salesops-staging-post-deploy-drill.XXXXXX.env)"
chmod 600 "${tmp_env}"
mkdir -p "${BACKUP_DIR}"

cleanup() {
  if [ "${KEEP_STACK}" != "1" ]; then
    docker compose \
      --project-name "${PROJECT_NAME}" \
      --env-file "${tmp_env}" \
      -f docker-compose.production.yml \
      down -v >/dev/null 2>&1 || true
    rm -f "${BACKUP_DIR}"/salesops-post-deploy-drill-*.dump
  fi
  rm -f "${tmp_env}"
}
trap cleanup EXIT

cat > "${tmp_env}" <<ENV
POSTGRES_DB=salesops
POSTGRES_USER=salesops
POSTGRES_PASSWORD=staging-post-deploy-drill-secret

BACKEND_PORT=${BACKEND_PORT}
FRONTEND_PORT=${FRONTEND_PORT}

APP_ALLOWED_ORIGIN=http://localhost:${FRONTEND_PORT}
VITE_API_BASE_URL=http://localhost:${BACKEND_PORT}
SPRING_FLYWAY_ENABLED=false

BACKEND_IMAGE=salesops-backend:${IMAGE_TAG}
FRONTEND_IMAGE=salesops-frontend:${IMAGE_TAG}
ENV

IMAGE_PROMOTION_ALLOW_LOCAL=1 \
HOST_PREFLIGHT_ALLOW_LOCALHOST=1 \
REVERSE_PROXY_TLS_ALLOW_INSECURE=1 \
SALESOPS_BACKUP_DIR="${BACKUP_DIR}" \
STAGING_DEPLOY_APPLY=1 \
STAGING_DEPLOY_ENV_FILE="${tmp_env}" \
STAGING_DEPLOY_PROJECT_NAME="${PROJECT_NAME}" \
"${SCRIPT_DIR}/staging-deploy.sh"

IMAGE_PROMOTION_ALLOW_LOCAL=1 \
REVERSE_PROXY_TLS_ALLOW_INSECURE=1 \
STAGING_POST_DEPLOY_APPLY=1 \
STAGING_POST_DEPLOY_ENV_FILE="${tmp_env}" \
STAGING_POST_DEPLOY_PROJECT_NAME="${PROJECT_NAME}" \
STAGING_POST_DEPLOY_BACKUP_DIR="${BACKUP_DIR}" \
STAGING_POST_DEPLOY_BACKUP_FILE="${BACKUP_DIR}/salesops-post-deploy-drill-$(date -u +%Y%m%dT%H%M%SZ).dump" \
STAGING_POST_DEPLOY_SKIP_ROLLBACK="${SKIP_ROLLBACK}" \
"${SCRIPT_DIR}/staging-post-deploy-gates.sh"

echo "staging post-deploy apply drill passed: project=${PROJECT_NAME} backend=http://127.0.0.1:${BACKEND_PORT} frontend=http://localhost:${FRONTEND_PORT}"
