#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

required_files=(
  docker-compose.production.yml
  backend/Dockerfile
  frontend/Dockerfile
  frontend/nginx.conf
  .env.staging.example
  deploy/MANAGED_SECRETS.md
  deploy/PRODUCTION_PLATFORM_IAC.md
  deploy/SINGLE_NODE_HOST_IAC.md
  deploy/REVERSE_PROXY_TLS_HANDOFF.md
  deploy/IMAGE_REGISTRY_PROMOTION.md
  deploy/CI_RELEASE_AUTOMATION.md
  deploy/REGISTRY_PUSH_AUTOMATION.md
  deploy/STAGING_MANIFEST_CONSUMPTION.md
  deploy/STAGING_DEPLOY_AUTOMATION.md
  deploy/STAGING_DEPLOY_APPLY_DRILL.md
  deploy/STAGING_POST_DEPLOY_GATES.md
  deploy/STAGING_POST_DEPLOY_APPLY_DRILL.md
  deploy/PRODUCTION_READINESS_SUMMARY.md
  deploy/EXTERNAL_STAGING_ACCEPTANCE.md
  deploy/image-promotion.manifest.example
  deploy/secrets.mapping.example
  deploy/STAGING_READINESS.md
  deploy/EXTERNAL_STAGING_HANDOFF.md
  scripts/validate/validate-deploy-env.sh
  scripts/validate/validate-managed-secrets-plan.sh
  scripts/deploy/host-preflight-check.sh
  scripts/deploy/reverse-proxy-tls-check.sh
  scripts/validate/validate-image-promotion.sh
  scripts/ci/ci-release-build.sh
  scripts/ci/ci-registry-push.sh
  scripts/env/render-deploy-env-from-manifest.sh
  scripts/deploy/staging-deploy.sh
  scripts/drills/staging-deploy-apply-drill.sh
  scripts/post-deploy/staging-post-deploy-gates.sh
  scripts/drills/staging-post-deploy-apply-drill.sh
  scripts/post-deploy/external-staging-acceptance.sh
  scripts/deploy/production-migrate.sh
  scripts/post-deploy/production-backup.sh
  scripts/post-deploy/production-restore-drill.sh
  scripts/post-deploy/production-rollback-dry-run.sh
  scripts/deploy/deployment-smoke.sh
)

cd "${CODEBASE_DIR}"

for file in "${required_files[@]}"; do
  if [ ! -f "${file}" ]; then
    echo "Missing handoff file: ${file}" >&2
    exit 1
  fi
done

required_executables=(
  scripts/validate/validate-deploy-env.sh
  scripts/validate/validate-managed-secrets-plan.sh
  scripts/deploy/host-preflight-check.sh
  scripts/deploy/reverse-proxy-tls-check.sh
  scripts/validate/validate-image-promotion.sh
  scripts/ci/ci-release-build.sh
  scripts/ci/ci-registry-push.sh
  scripts/env/render-deploy-env-from-manifest.sh
  scripts/deploy/staging-deploy.sh
  scripts/drills/staging-deploy-apply-drill.sh
  scripts/post-deploy/staging-post-deploy-gates.sh
  scripts/drills/staging-post-deploy-apply-drill.sh
  scripts/post-deploy/external-staging-acceptance.sh
  scripts/deploy/production-migrate.sh
  scripts/post-deploy/production-backup.sh
  scripts/post-deploy/production-restore-drill.sh
  scripts/post-deploy/production-rollback-dry-run.sh
  scripts/deploy/deployment-smoke.sh
)

for file in "${required_executables[@]}"; do
  if [ ! -x "${file}" ]; then
    echo "Deploy script is not executable: ${file}" >&2
    exit 1
  fi
done

if scripts/validate/validate-deploy-env.sh .env.staging.example >/dev/null 2>&1; then
  echo ".env.staging.example should fail validation because it contains placeholder secrets." >&2
  exit 1
fi

tmp_env="$(mktemp)"
trap 'rm -f "${tmp_env}"' EXIT

sed 's/REPLACE_WITH_SECRET/staging-secret-value/' .env.staging.example > "${tmp_env}"

scripts/validate/validate-deploy-env.sh "${tmp_env}" >/dev/null
scripts/validate/validate-managed-secrets-plan.sh deploy/secrets.mapping.example "${tmp_env}" >/dev/null
scripts/validate/validate-image-promotion.sh "${tmp_env}" >/dev/null
docker compose --project-name salesops-staging-handoff-check --env-file "${tmp_env}" -f docker-compose.production.yml config --quiet

echo "staging handoff check passed"
