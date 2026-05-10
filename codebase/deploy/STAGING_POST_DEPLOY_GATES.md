# Staging Post-Deploy Gate Orchestration

This baseline groups the checks that must run after a staging deploy succeeds.

It is safe by default: `scripts/staging-post-deploy-gates.sh` runs in dry-run mode unless `STAGING_POST_DEPLOY_APPLY=1` is set.

## Entrypoint

Dry-run against a rendered staging env:

```bash
STAGING_POST_DEPLOY_ENV_FILE=/opt/salesops/env/.env.staging \
STAGING_POST_DEPLOY_BACKUP_DIR=/opt/salesops/backups \
scripts/staging-post-deploy-gates.sh
```

Dry-run validates:

- deploy env;
- managed secret mapping;
- image promotion refs;
- production Compose config;
- target backup directory;
- route settings that will be used by smoke checks.

## Apply Mode

Run post-deploy gates after staging is already up:

```bash
STAGING_POST_DEPLOY_APPLY=1 \
STAGING_POST_DEPLOY_ENV_FILE=/opt/salesops/env/.env.staging \
STAGING_POST_DEPLOY_PROJECT_NAME=salesops-staging \
STAGING_POST_DEPLOY_BACKUP_DIR=/opt/salesops/backups \
scripts/staging-post-deploy-gates.sh
```

Apply mode runs:

1. reverse proxy/TLS route check;
2. deployment health smoke;
3. production backup;
4. restore drill from the produced backup;
5. rollback dry run, unless `STAGING_POST_DEPLOY_SKIP_ROLLBACK=1`.

## Local Drill Overrides

For local drills with HTTP localhost routes:

```bash
REVERSE_PROXY_TLS_ALLOW_INSECURE=1 \
STAGING_POST_DEPLOY_APPLY=1 \
scripts/staging-post-deploy-gates.sh
```

For the maintained isolated apply drill, use:

```bash
scripts/staging-post-deploy-apply-drill.sh
```

Rollback dry-run uses its own isolated env files and ports. Override them with the existing rollback drill variables when needed:

```bash
ROLLBACK_PREVIOUS_ENV_FILE=/path/previous.env \
ROLLBACK_CANDIDATE_ENV_FILE=/path/candidate.env \
ROLLBACK_DRILL_COMPOSE_PROJECT_NAME=salesops-rollback-check \
scripts/staging-post-deploy-gates.sh
```

## Acceptance Gate

Do not accept a staging deploy as post-deploy complete until:

- route check passes;
- deployment health smoke passes;
- backup writes to durable storage;
- restore drill succeeds from that backup;
- rollback dry run succeeds for promoted refs or an explicit skip is recorded.

## Limits

- This script does not deploy the application.
- This script does not fetch CI artifacts.
- This script does not rotate or resolve secrets.
- This script does not replace provider-specific monitoring or alerting.
- The local apply drill is documented in `deploy/STAGING_POST_DEPLOY_APPLY_DRILL.md`.
