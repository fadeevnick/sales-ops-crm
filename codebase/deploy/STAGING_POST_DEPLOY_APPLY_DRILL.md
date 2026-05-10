# Staging Post-Deploy Apply Drill

This drill verifies post-deploy gates in apply mode against an isolated local staging deployment.

It first runs `scripts/staging-deploy.sh` in apply mode on disposable local ports, then runs `scripts/staging-post-deploy-gates.sh` in apply mode against that same stack.

## Entrypoint

From `codebase/`:

```bash
scripts/staging-post-deploy-apply-drill.sh
```

The drill uses:

- staging project `salesops-staging-post-deploy-drill` by default;
- backend port `19181`;
- frontend port `16273`;
- backup dir `/tmp/salesops-post-deploy-drill-backups`;
- local image refs using tag `staging-post-deploy-drill`;
- localhost/insecure route allowances only for this drill.

## What It Runs

1. staging deploy apply mode;
2. route check;
3. deployment health smoke;
4. backup to the drill backup directory;
5. restore drill from that backup;
6. rollback dry run;
7. cleanup of the staging drill stack and backup file unless kept for debugging.

## Overrides

```bash
STAGING_POST_DEPLOY_DRILL_PROJECT_NAME=salesops-staging-post-deploy-drill \
STAGING_POST_DEPLOY_DRILL_BACKEND_PORT=19181 \
STAGING_POST_DEPLOY_DRILL_FRONTEND_PORT=16273 \
scripts/staging-post-deploy-apply-drill.sh
```

Set `STAGING_POST_DEPLOY_DRILL_KEEP_STACK=1` only when debugging a failed drill.

Set `STAGING_POST_DEPLOY_DRILL_SKIP_ROLLBACK=1` only when rollback has already been verified separately for the same candidate.

## Acceptance Gate

Do not accept post-deploy apply orchestration until:

- this local drill passes;
- a backup file is created;
- restore drill succeeds from that backup;
- rollback dry run succeeds or an explicit skip is recorded;
- disposable Compose stacks are cleaned up after completion.

## Limits

- This does not prove external DNS/TLS.
- This does not use pushed registry images.
- This does not run on a real staging host.
- Provider-specific secret integration remains separate.
