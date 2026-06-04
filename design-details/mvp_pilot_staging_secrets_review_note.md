# MVP Pilot Staging Secrets Review Note

## Slice

Staging readiness and secrets handling baseline.

## Outcome

```text
accepted on env validation and staging compose config sanity check
```

## Implemented

- Added `codebase/.env.staging.example`.
- Added `codebase/scripts/checks/validate-deploy-env.sh`.
- Added `codebase/deploy/STAGING_READINESS.md`.
- Updated `codebase/.gitignore` to ignore real `.env.staging` and `.env.production`.
- Updated `codebase/DEPLOYMENT.md` with staging/secrets stance.

## Verification

Passed:

```bash
bash -n scripts/checks/validate-deploy-env.sh scripts/core/production-rollback-dry-run.sh scripts/core/production-migrate.sh
scripts/checks/validate-deploy-env.sh .env.staging.example
scripts/checks/validate-deploy-env.sh .env.production.example
scripts/checks/validate-deploy-env.sh /tmp/salesops-staging-valid.env
docker compose --project-name salesops-staging-check --env-file /tmp/salesops-staging-valid.env -f docker-compose.production.yml config --quiet
docker compose --project-name salesops-staging-check --env-file /tmp/salesops-staging-valid.env -f docker-compose.production.yml --profile tools config --services
curl -fsS http://127.0.0.1:8081/readyz
```

Expected negative checks:

- `.env.staging.example` fails validation because it contains `REPLACE_WITH_SECRET`.
- `.env.production.example` fails validation because it contains `change-me`.

Positive check:

- `/tmp/salesops-staging-valid.env`, created from `.env.staging.example` with a non-placeholder password, passed validation.
- Production Compose config resolved successfully for the sanitized staging env.
- The tools profile still exposes `db`, `backend`, `frontend`, and `migrate`.
- Active dev runtime remained healthy.

## Staging Readiness Boundary

This slice does not provision a real staging host. It makes a staging deploy package safer by requiring:

- real env files stay uncommitted;
- placeholder secrets fail validation;
- `SPRING_FLYWAY_ENABLED=false` remains required for production-like envs;
- remote origins/API URLs use `https://`;
- migrations, backup/restore and rollback dry run remain explicit preflight gates.

## Remaining Gaps

- no provider-specific managed secret integration exists;
- production hardening remains single-node Compose, not Kubernetes/IaC/DR maturity.

## Next Step

Choose the next maturity slice:

```text
provider-specific secret integration or production platform/IaC planning
```
