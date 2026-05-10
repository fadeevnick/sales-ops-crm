# MVP Pilot Staging Post-Deploy Apply Drill Review Note

## Slice

Staging post-deploy apply drill.

## Outcome

```text
accepted on isolated post-deploy apply drill
```

## Implemented

- Added `codebase/deploy/STAGING_POST_DEPLOY_APPLY_DRILL.md`.
- Added `codebase/scripts/staging-post-deploy-apply-drill.sh`.
- Updated `codebase/scripts/staging-post-deploy-gates.sh`.
- Updated `codebase/scripts/production-restore-drill.sh`.
- Updated `codebase/deploy/STAGING_POST_DEPLOY_GATES.md`.
- Updated `codebase/deploy/EXTERNAL_STAGING_HANDOFF.md`.
- Updated `codebase/DEPLOYMENT.md`.
- Updated `codebase/scripts/staging-handoff-check.sh`.
- Updated `codebase/README.md`.
- Updated `implementation_status.md`.
- Updated `design_status.md`.

## Boundary

This slice verifies post-deploy gates in apply mode against an isolated local staging deployment.

It does not:

- prove external DNS/TLS;
- use pushed registry images;
- run on a real staging host;
- implement provider-specific secret integration.

## Verification

Expected checks:

```bash
bash -n scripts/staging-post-deploy-apply-drill.sh scripts/staging-post-deploy-gates.sh
scripts/staging-post-deploy-apply-drill.sh
scripts/staging-handoff-check.sh
curl -fsS http://127.0.0.1:8081/readyz
```

Fixes made during verification:

- `scripts/staging-post-deploy-gates.sh` now treats the last backup script output line as the backup path, so Docker Compose progress output cannot corrupt restore input.
- `scripts/production-restore-drill.sh` now tolerates an already-created target database before `pg_restore`.

## Remaining Gaps

- no real staging host post-deploy apply run has been executed;
- no provider-specific secret integration exists;
- no provider-specific monitoring or alerting exists.

## Next Step

Choose the next deployment maturity slice:

```text
provider-specific secret integration or production readiness summary
```
