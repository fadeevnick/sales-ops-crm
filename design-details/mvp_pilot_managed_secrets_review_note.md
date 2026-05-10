# MVP Pilot Managed Secrets Review Note

## Slice

Managed secrets integration planning.

## Outcome

```text
accepted on provider-neutral secret mapping validation
```

## Implemented

- Added `codebase/deploy/MANAGED_SECRETS.md`.
- Added `codebase/deploy/secrets.mapping.example`.
- Added `codebase/scripts/validate-managed-secrets-plan.sh`.
- Updated `codebase/deploy/STAGING_READINESS.md`.
- Updated `codebase/deploy/EXTERNAL_STAGING_HANDOFF.md`.
- Updated `codebase/DEPLOYMENT.md`.
- Updated `codebase/scripts/staging-handoff-check.sh` so handoff validation includes managed secret mapping coverage.

## Verification

Passed:

```bash
bash -n scripts/validate-managed-secrets-plan.sh scripts/staging-handoff-check.sh scripts/validate-deploy-env.sh
scripts/validate-managed-secrets-plan.sh deploy/secrets.mapping.example .env.staging.example
scripts/validate-managed-secrets-plan.sh deploy/secrets.mapping.example /tmp/salesops-staging-valid.env
scripts/staging-handoff-check.sh
curl -fsS http://127.0.0.1:8081/readyz
```

Expected negative check:

- `.env.staging.example` fails managed secret validation because mapped `POSTGRES_PASSWORD` is still `REPLACE_WITH_SECRET`.

Positive checks:

- `/tmp/salesops-staging-valid.env` passed managed secret mapping validation with one mapped secret.
- `scripts/staging-handoff-check.sh` still passed after adding managed secret mapping coverage.
- Active dev runtime remained healthy.

## Boundary

This slice is provider-neutral. It defines:

- current secret inventory;
- mapping contract;
- validation limits;
- provider selection criteria;
- rotation baseline.

It does not integrate a specific provider such as Vault, AWS Secrets Manager, SOPS, Doppler or Kubernetes Secrets.

## Remaining Gaps

- no provider-specific managed secret integration exists;
- production hardening remains single-node Compose, not Kubernetes/IaC/DR maturity.

## Next Step

Choose the next maturity slice:

```text
provider-specific secret integration or production platform/IaC planning
```

