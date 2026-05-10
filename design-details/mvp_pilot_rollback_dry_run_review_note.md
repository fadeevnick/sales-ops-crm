# MVP Pilot Rollback Dry Run Review Note

## Slice

Production deployment rollback dry run.

## Outcome

```text
accepted on isolated production Compose rollback dry run
```

## Implemented

- Added rollback drill env files:
  - `codebase/deploy/rollback-drill.previous.env`
  - `codebase/deploy/rollback-drill.candidate.env`
- Added `codebase/scripts/production-rollback-dry-run.sh`.
- Updated `codebase/DEPLOYMENT.md` with rollback dry-run usage and override knobs.

## Verification

Passed:

```bash
bash -n scripts/production-rollback-dry-run.sh scripts/production-migrate.sh scripts/production-backup.sh scripts/production-restore-drill.sh
docker compose --project-name salesops-rollback-drill --env-file deploy/rollback-drill.previous.env -f docker-compose.production.yml config --quiet
docker compose --project-name salesops-rollback-drill --env-file deploy/rollback-drill.candidate.env -f docker-compose.production.yml config --quiet
scripts/production-rollback-dry-run.sh
curl -fsS http://127.0.0.1:8081/readyz
scripts/deployment-smoke.sh health
```

The isolated rollback dry run:

- built `salesops-backend:rollback-previous`;
- built `salesops-frontend:rollback-previous`;
- built `salesops-backend:rollback-candidate`;
- built `salesops-frontend:rollback-candidate`;
- created an isolated `salesops-rollback-drill` Compose project on backend port `18081` and frontend port `15173`;
- started the previous image set and passed backend/frontend health;
- switched to the candidate image set and passed backend/frontend health;
- rolled back to the previous image set and passed backend/frontend health;
- removed the disposable rollback drill stack and volume;
- left the active dev runtime healthy.

## Remaining Gaps

- no managed secret store integration exists;
- production hardening remains single-node Compose, not Kubernetes/IaC/DR maturity.

## Next Step

Choose the next deployment maturity slice:

```text
managed secrets integration planning
```
