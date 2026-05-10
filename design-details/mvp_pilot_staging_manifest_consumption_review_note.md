# MVP Pilot Staging Manifest Consumption Review Note

## Slice

Staging deploy manifest consumption.

## Outcome

```text
accepted on rendered deploy env validation
```

## Implemented

- Added `codebase/deploy/STAGING_MANIFEST_CONSUMPTION.md`.
- Added `codebase/scripts/render-deploy-env-from-manifest.sh`.
- Updated `codebase/deploy/REGISTRY_PUSH_AUTOMATION.md`.
- Updated `codebase/deploy/EXTERNAL_STAGING_HANDOFF.md`.
- Updated `codebase/DEPLOYMENT.md`.
- Updated `codebase/scripts/staging-handoff-check.sh`.
- Updated `codebase/README.md`.
- Updated `implementation_status.md`.
- Updated `design_status.md`.

## Boundary

This slice consumes a retained CI image promotion manifest and renders a deploy env.

It does not:

- fetch artifacts from GitHub Actions;
- decrypt or resolve secrets;
- push images;
- run staging deployment automatically;
- implement a provider-specific secret manager.

## Verification

Expected checks:

```bash
bash -n scripts/render-deploy-env-from-manifest.sh scripts/staging-handoff-check.sh
scripts/render-deploy-env-from-manifest.sh /tmp/salesops-staging-valid.env build/release/image-promotion.manifest /tmp/salesops-rendered-staging.env
scripts/validate-deploy-env.sh /tmp/salesops-rendered-staging.env
scripts/validate-image-promotion.sh /tmp/salesops-rendered-staging.env
scripts/staging-handoff-check.sh
curl -fsS http://127.0.0.1:8081/readyz
```

## Remaining Gaps

- no artifact download automation exists;
- no staging deploy automation consumes the rendered env automatically;
- no provider-specific secret integration exists.

## Next Step

Choose the next deployment maturity slice:

```text
provider-specific secret integration or staging deploy automation
```
