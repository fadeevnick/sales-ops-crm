# Staging Deploy Apply Drill

This drill verifies that `scripts/staging-deploy.sh` can run its apply-mode orchestration against an isolated local Compose project.

It is not a real staging deployment. It uses local image names, localhost routes and disposable ports so the active development runtime can stay online.

## Entrypoint

From `codebase/`:

```bash
scripts/staging-deploy-apply-drill.sh
```

The drill creates a temporary env file with:

- project name `salesops-staging-apply-drill` by default;
- backend port `19081`;
- frontend port `16173`;
- local image refs using the same `staging-apply-drill` tag;
- localhost route settings allowed only for the drill.

## What It Runs

The drill executes:

1. staging deploy apply mode;
2. deploy env, managed secret and image promotion validation;
3. host preflight with localhost and port-check drill allowances;
4. explicit migration;
5. Compose startup for backend/frontend;
6. reverse proxy/TLS route check with insecure localhost allowance;
7. deployment health smoke against the drill ports;
8. cleanup of the disposable Compose project and volumes.

## Overrides

```bash
STAGING_DEPLOY_DRILL_PROJECT_NAME=salesops-staging-apply-drill \
STAGING_DEPLOY_DRILL_BACKEND_PORT=19081 \
STAGING_DEPLOY_DRILL_FRONTEND_PORT=16173 \
scripts/staging-deploy-apply-drill.sh
```

Keep the ports isolated from the active local runtime.

Set `STAGING_DEPLOY_DRILL_KEEP_STACK=1` only when debugging a failed drill.

## Acceptance Gate

Do not accept staging deploy apply automation until:

- this local apply drill passes;
- the active dev runtime remains healthy after cleanup;
- no disposable Compose stack is left running unless explicitly requested.

## Limits

- This does not pull pushed registry images.
- This does not prove external DNS/TLS.
- This does not run backup/restore or rollback gates.
- Post-deploy gate orchestration is documented in `deploy/STAGING_POST_DEPLOY_GATES.md`.
- A real staging-host apply run remains required before production readiness.
