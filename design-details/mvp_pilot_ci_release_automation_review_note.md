# MVP Pilot CI Release Automation Review Note

## Slice

CI release automation baseline.

## Outcome

```text
accepted on production image build and release manifest validation
```

## Implemented

- Added `.github/workflows/release-build.yml`.
- Added `codebase/deploy/CI_RELEASE_AUTOMATION.md`.
- Added `codebase/scripts/ci/ci-release-build.sh`.
- Updated `codebase/deploy/IMAGE_REGISTRY_PROMOTION.md`.
- Updated `codebase/deploy/EXTERNAL_STAGING_HANDOFF.md`.
- Updated `codebase/DEPLOYMENT.md`.
- Updated `codebase/scripts/checks/staging-handoff-check.sh`.
- Updated `codebase/README.md`.
- Updated `implementation_status.md`.
- Updated `design_status.md`.

## Boundary

This slice builds and validates production images in CI without pushing to a registry.

It does not add:

- registry login;
- `docker push`;
- provider-specific registry configuration;
- production deploy automation;
- secret manager integration.

## Verification

Expected checks:

```bash
bash -n scripts/ci/ci-release-build.sh scripts/checks/staging-handoff-check.sh
CI_RELEASE_TAG=ci-release-smoke scripts/ci/ci-release-build.sh
scripts/checks/staging-handoff-check.sh
curl -fsS http://127.0.0.1:8081/readyz
```

## Remaining Gaps

- no registry provider has been selected;
- no registry push credentials are wired;
- no deployment environment consumes the generated manifest automatically;
- provider-specific secret integration remains open.

## Next Step

Choose the next deployment maturity slice:

```text
provider-specific secret integration or registry push automation
```
