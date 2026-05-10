# Staging Deploy Automation

This baseline provides a single staging deploy orchestration entrypoint around the existing deployment gates.

It is safe by default: `scripts/staging-deploy.sh` runs in dry-run mode unless `STAGING_DEPLOY_APPLY=1` is set.

## Entrypoint

Use an already rendered deploy env:

```bash
STAGING_DEPLOY_ENV_FILE=/opt/salesops/env/.env.staging scripts/staging-deploy.sh
```

Or render from a protected base env and retained CI manifest first:

```bash
STAGING_DEPLOY_BASE_ENV_FILE=/opt/salesops/env/.env.staging.base \
STAGING_DEPLOY_MANIFEST_FILE=/opt/salesops/releases/image-promotion.manifest \
STAGING_DEPLOY_ENV_FILE=/opt/salesops/env/.env.staging \
scripts/staging-deploy.sh
```

Dry-run validates:

- deploy env;
- managed secret mapping;
- image promotion refs;
- production Compose config;
- selected project name and route settings.

## Apply Mode

To run the actual staging deployment:

```bash
STAGING_DEPLOY_APPLY=1 \
STAGING_DEPLOY_ENV_FILE=/opt/salesops/env/.env.staging \
STAGING_DEPLOY_PROJECT_NAME=salesops-staging \
SALESOPS_BACKUP_DIR=/opt/salesops/backups \
scripts/staging-deploy.sh
```

Apply mode runs:

1. host preflight;
2. explicit migration;
3. `docker compose up -d backend frontend`;
4. reverse proxy/TLS route check;
5. deployment health smoke.

## Local Drill Overrides

For local dry-runs or occupied ports:

```bash
STAGING_DEPLOY_SKIP_HOST_PREFLIGHT=1 scripts/staging-deploy.sh
```

For local apply drills only:

```bash
HOST_PREFLIGHT_ALLOW_LOCALHOST=1 \
HOST_PREFLIGHT_SKIP_PORT_CHECK=1 \
REVERSE_PROXY_TLS_ALLOW_INSECURE=1 \
STAGING_DEPLOY_APPLY=1 \
scripts/staging-deploy.sh
```

For the maintained isolated apply drill, use:

```bash
scripts/staging-deploy-apply-drill.sh
```

## Acceptance Gate

Do not accept staging deploy automation until:

- dry-run passes for the intended staging env;
- apply mode passes on the staging host;
- explicit migration uses the same backend image ref as runtime;
- reverse proxy/TLS check passes against external URLs;
- deployment health smoke passes;
- backup/restore and rollback gates remain available for the promoted refs.

## Limits

- This script does not fetch CI artifacts.
- This script does not resolve secrets.
- This script does not push images.
- This script does not run backup/restore or rollback automatically.
- Provider-specific secret integration remains separate.
- The local apply drill is documented in `deploy/STAGING_DEPLOY_APPLY_DRILL.md`.
