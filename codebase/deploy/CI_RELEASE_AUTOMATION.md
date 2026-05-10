# CI Release Automation Baseline

This baseline turns the provider-neutral image promotion contract into a repeatable CI build check.

It builds backend and frontend production images, renders a release manifest, validates image references and uploads the manifest as a CI artifact. It does not push images to a registry.

Registry push automation is documented separately in `deploy/REGISTRY_PUSH_AUTOMATION.md`.

## Workflow

The GitHub Actions workflow is `.github/workflows/release-build.yml`.

It runs on:

- manual `workflow_dispatch`;
- version tags matching `v*`;
- pull requests that change release packaging files.

## CI Entrypoint

Run locally from `codebase/`:

```bash
scripts/ci-release-build.sh
```

Optional overrides:

```bash
CI_RELEASE_TAG=2026-05-10T2145Z-gitabc123 \
CI_RELEASE_REGISTRY=registry.example.com \
CI_RELEASE_OUTPUT_DIR=/tmp/salesops-release \
scripts/ci-release-build.sh
```

## Output

The script writes:

```text
<output-dir>/
  release.env
  image-promotion.manifest
```

`release.env` is a CI validation env file. It is not a production secret file.

`image-promotion.manifest` is the provider-neutral release record:

```text
RELEASE_TAG=<tag>
BACKEND_IMAGE=<registry>/salesops-backend:<tag>
FRONTEND_IMAGE=<registry>/salesops-frontend:<tag>
```

## Validation

The CI release build verifies:

- production Compose config resolves;
- deploy env validation passes;
- image promotion validation passes for the release tag;
- backend/frontend production images build;
- built image refs exist in the local Docker image store.
- registry push dry-run passes, or real push passes when explicitly enabled.

## Promotion Boundary

Registry push is disabled by default and must be enabled explicitly.

Registry push requires:

- selected registry provider;
- registry credentials in CI secrets;
- immutable tag or digest policy;
- promotion target rules for staging/production;
- rollback manifest retention.

Use `scripts/ci-registry-push.sh` after the release build when those prerequisites exist.

## Acceptance Gate

Do not treat a CI release as deployable until:

- the release build workflow passes;
- the generated manifest is retained as an artifact;
- image refs are pushed to the selected registry by an approved follow-up process;
- deployment env files use the same promoted refs;
- staging deploy gates pass.
