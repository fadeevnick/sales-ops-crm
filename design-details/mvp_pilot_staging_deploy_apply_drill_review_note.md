# MVP Pilot Staging Deploy Apply Drill Review Note

## Slice

Staging deploy apply drill.

## Outcome

```text
accepted on isolated staging deploy apply drill
```

## Implemented

- Added `codebase/deploy/STAGING_DEPLOY_APPLY_DRILL.md`.
- Added `codebase/scripts/drills/staging-deploy-apply-drill.sh`.
- Updated `codebase/deploy/STAGING_DEPLOY_AUTOMATION.md`.
- Updated `codebase/deploy/EXTERNAL_STAGING_HANDOFF.md`.
- Updated `codebase/DEPLOYMENT.md`.
- Updated `codebase/scripts/checks/staging-handoff-check.sh`.
- Updated `codebase/README.md`.
- Updated `implementation_status.md`.
- Updated `design_status.md`.

## Boundary

This slice verifies apply-mode orchestration on an isolated local Compose project.

It does not:

- pull pushed registry images;
- prove external DNS/TLS;
- run a real staging host deploy;
- run backup/restore or rollback gates automatically;
- implement provider-specific secret integration.

## Verification

Expected checks:

```bash
bash -n scripts/drills/staging-deploy-apply-drill.sh scripts/orchestration/staging-deploy.sh
scripts/drills/staging-deploy-apply-drill.sh
scripts/checks/staging-handoff-check.sh
curl -fsS http://127.0.0.1:8081/readyz
```

## Remaining Gaps

- no real staging host apply run has been executed;
- no provider-specific secret integration exists;
- backup/restore and rollback remain explicit follow-up gates after deploy.

## Next Step

Choose the next deployment maturity slice:

```text
provider-specific secret integration or staging post-deploy gate orchestration
```
