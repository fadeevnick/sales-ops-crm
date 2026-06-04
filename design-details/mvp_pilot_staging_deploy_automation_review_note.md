# MVP Pilot Staging Deploy Automation Review Note

## Slice

Staging deploy automation.

## Outcome

```text
accepted on staging deploy dry-run validation
```

## Implemented

- Added `codebase/deploy/STAGING_DEPLOY_AUTOMATION.md`.
- Added `codebase/scripts/orchestration/staging-deploy.sh`.
- Updated `codebase/deploy/EXTERNAL_STAGING_HANDOFF.md`.
- Updated `codebase/DEPLOYMENT.md`.
- Updated `codebase/scripts/checks/staging-handoff-check.sh`.
- Updated `codebase/README.md`.
- Updated `implementation_status.md`.
- Updated `design_status.md`.

## Boundary

This slice orchestrates staging deploy gates and defaults to dry-run.

It does not:

- fetch CI artifacts;
- resolve secrets;
- push images;
- run backup/restore automatically;
- run rollback automatically;
- implement a provider-specific secret manager.

## Verification

Expected checks:

```bash
bash -n scripts/orchestration/staging-deploy.sh scripts/checks/staging-handoff-check.sh
STAGING_DEPLOY_ENV_FILE=/tmp/salesops-rendered-staging.env scripts/orchestration/staging-deploy.sh
scripts/checks/staging-handoff-check.sh
curl -fsS http://127.0.0.1:8081/readyz
```

The local verification uses dry-run because the current image refs point to `registry.example.com` and the active dev runtime owns the default local ports.

## Remaining Gaps

- no real staging host apply run has been executed;
- no artifact download automation exists;
- backup/restore and rollback gates remain separate scripts;
- no provider-specific secret integration exists.

## Next Step

Choose the next deployment maturity slice:

```text
provider-specific secret integration or staging deploy apply drill
```
