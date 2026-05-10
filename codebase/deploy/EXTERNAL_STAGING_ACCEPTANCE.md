# External Staging Acceptance Run

This runbook turns the handoff package into a concrete staging acceptance run on an external host.

The entrypoint is safe by default: it runs validation and dry-run gates unless apply flags are explicitly enabled.

## Entrypoint

Use an existing rendered staging env:

```bash
EXTERNAL_STAGING_ACCEPTANCE_ENV_FILE=/opt/salesops/env/.env.staging \
EXTERNAL_STAGING_ACCEPTANCE_BACKUP_DIR=/opt/salesops/backups \
scripts/external-staging-acceptance.sh
```

Or render the env from a protected base env and retained CI manifest first:

```bash
EXTERNAL_STAGING_ACCEPTANCE_BASE_ENV_FILE=/opt/salesops/env/.env.staging.base \
EXTERNAL_STAGING_ACCEPTANCE_MANIFEST_FILE=/opt/salesops/releases/image-promotion.manifest \
EXTERNAL_STAGING_ACCEPTANCE_ENV_FILE=/opt/salesops/env/.env.staging \
EXTERNAL_STAGING_ACCEPTANCE_BACKUP_DIR=/opt/salesops/backups \
scripts/external-staging-acceptance.sh
```

## What Dry-Run Covers

Dry-run mode runs:

- staging handoff package validation;
- deploy env validation;
- managed secret mapping validation;
- image promotion validation;
- staging deploy dry-run;
- post-deploy gate dry-run;
- acceptance report generation.

The report is written to:

```text
build/external-staging-acceptance/acceptance-report.txt
```

Override with `EXTERNAL_STAGING_ACCEPTANCE_REPORT_FILE`.

## Apply Mode

Run deploy apply after dry-run passes:

```bash
EXTERNAL_STAGING_ACCEPTANCE_APPLY_DEPLOY=1 scripts/external-staging-acceptance.sh
```

Run post-deploy apply after deploy apply passes:

```bash
EXTERNAL_STAGING_ACCEPTANCE_APPLY_DEPLOY=1 \
EXTERNAL_STAGING_ACCEPTANCE_APPLY_POST_DEPLOY=1 \
scripts/external-staging-acceptance.sh
```

Apply mode delegates to:

- `scripts/staging-deploy.sh`;
- `scripts/staging-post-deploy-gates.sh`.

## Acceptance Criteria

External staging is accepted only when:

- dry-run passes on the external host;
- deploy apply passes on the external host;
- post-deploy apply passes on the external host;
- backup file is written to durable storage;
- restore drill succeeds from that backup;
- rollback dry run succeeds for the promoted image refs;
- acceptance report is retained with the release manifest.

## Limits

- This does not provision the host.
- This does not fetch CI artifacts.
- This does not resolve secrets.
- This does not replace provider-specific monitoring or alerting.
- This does not make the package production-ready by itself.
