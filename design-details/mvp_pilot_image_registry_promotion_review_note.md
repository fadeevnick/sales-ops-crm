# MVP Pilot Image Registry Promotion Review Note

## Slice

Image registry promotion baseline.

## Outcome

```text
accepted on image reference validation sanity check
```

## Implemented

- Added `codebase/deploy/IMAGE_REGISTRY_PROMOTION.md`.
- Added `codebase/deploy/image-promotion.manifest.example`.
- Added `codebase/scripts/validate-image-promotion.sh`.
- Updated `codebase/deploy/EXTERNAL_STAGING_HANDOFF.md`.
- Updated `codebase/DEPLOYMENT.md`.
- Updated `codebase/scripts/staging-handoff-check.sh`.
- Updated `codebase/README.md`.
- Updated `implementation_status.md`.
- Updated `design_status.md`.

## Boundary

This slice defines provider-neutral image reference and release tag promotion rules.

It does not add:

- registry authentication;
- `docker push` automation;
- CI release workflows;
- registry immutability enforcement;
- cloud/provider-specific registry resources.

## Verification

Expected checks:

```bash
bash -n scripts/validate-image-promotion.sh scripts/staging-handoff-check.sh
scripts/validate-image-promotion.sh .env.staging.example
IMAGE_PROMOTION_ALLOW_LOCAL=1 scripts/validate-image-promotion.sh .env.production.example
scripts/staging-handoff-check.sh
curl -fsS http://127.0.0.1:8081/readyz
```

## Remaining Gaps

- no registry provider has been selected;
- no CI release/push automation exists;
- no registry immutability policy is enforced from this repository;
- provider-specific secret integration remains open.

## Next Step

Choose the next deployment maturity slice:

```text
provider-specific secret integration or CI release automation
```
