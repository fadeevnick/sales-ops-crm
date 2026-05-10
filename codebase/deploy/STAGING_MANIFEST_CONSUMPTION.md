# Staging Deploy Manifest Consumption

This baseline connects the CI release artifact to a staging deployment env file.

The release workflow produces `image-promotion.manifest` with promoted backend/frontend image refs. The staging operator keeps secrets and environment-specific settings in a protected base env file, then renders a deploy env that uses the promoted images from the manifest.

## Inputs

- base deploy env, for example `/opt/salesops/env/.env.staging.base`;
- image promotion manifest, for example `/opt/salesops/releases/image-promotion.manifest`;
- rendered output env, for example `/opt/salesops/env/.env.staging`.

The base env contains real staging secrets or provider-resolved secret values plus route settings. The manifest contains release image refs and no secrets.

If the base env still contains secret placeholders, render a secret-backed env first through `scripts/render-env-from-secret-provider.sh`; see `deploy/SECRET_PROVIDER_ADAPTERS.md`.

## Render Command

From `codebase/`:

```bash
scripts/render-deploy-env-from-manifest.sh \
  /opt/salesops/env/.env.staging.base \
  /opt/salesops/releases/image-promotion.manifest \
  /opt/salesops/env/.env.staging
```

The script:

- reads `BACKEND_IMAGE` and `FRONTEND_IMAGE` from the manifest;
- preserves all non-image values from the base env;
- replaces or appends `BACKEND_IMAGE` and `FRONTEND_IMAGE`;
- sets output permissions to `0600`;
- validates deploy env requirements;
- validates managed secret mapping coverage when `deploy/secrets.mapping.example` exists;
- validates image promotion rules against the manifest release tag.

## Deploy Order

1. Download or copy the retained `image-promotion.manifest` from CI.
2. Render provider-backed secrets into a protected base env when the selected provider exports env/dotenv values.
3. Render the staging deploy env from the protected base env and manifest.
4. Run host preflight against the rendered env.
5. Run explicit migration with the rendered env.
6. Start backend/frontend using the rendered env.
7. Run reverse proxy/TLS and deployment smoke checks.

Example:

```bash
scripts/render-deploy-env-from-manifest.sh /opt/salesops/env/.env.staging.base /opt/salesops/releases/image-promotion.manifest /opt/salesops/env/.env.staging
SALESOPS_BACKUP_DIR=/opt/salesops/backups scripts/host-preflight-check.sh /opt/salesops/env/.env.staging
PRODUCTION_ENV_FILE=/opt/salesops/env/.env.staging PRODUCTION_COMPOSE_PROJECT_NAME=salesops-staging scripts/production-migrate.sh
docker compose --project-name salesops-staging --env-file /opt/salesops/env/.env.staging -f docker-compose.production.yml up -d backend frontend
```

## Acceptance Gate

Do not accept manifest consumption until:

- render script passes for the target base env and manifest;
- rendered env keeps real secrets out of git;
- rendered env uses manifest backend/frontend image refs;
- deploy env, managed secret and image promotion validations pass;
- staging deploy gates pass from the rendered env.

## Limits

- This script does not fetch artifacts from GitHub Actions.
- This script does not decrypt or resolve secrets; use `scripts/render-env-from-secret-provider.sh` before manifest rendering when the selected provider exports env/dotenv values.
- This script does not push images.
- Provider-specific secret integration remains separate.
