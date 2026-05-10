# Registry Push Automation Baseline

This baseline adds a provider-neutral push entrypoint after the CI release build.

The push step reads the generated image promotion manifest and either:

- validates the image refs in dry-run mode; or
- pushes the backend and frontend images when explicitly enabled.

It does not select a registry provider.

## Entrypoint

Run from `codebase/` after `scripts/ci-release-build.sh`:

```bash
scripts/ci-registry-push.sh build/release/image-promotion.manifest
```

Dry-run mode is the default. It validates refs and prints the images that would be pushed.

## Real Push

Enable real push explicitly:

```bash
CI_REGISTRY_PUSH_ENABLED=1 scripts/ci-registry-push.sh build/release/image-promotion.manifest
```

The script expects the local Docker image store to contain both refs from the manifest. In CI, this means `scripts/ci-release-build.sh` must run first in the same job.

## Optional Login

If the selected registry needs username/password login, provide:

```bash
CI_REGISTRY_USERNAME=<user>
CI_REGISTRY_PASSWORD=<secret>
```

The password is passed to `docker login` through stdin and must come from CI secrets or an operator secret store.

If the runner is already authenticated by a provider-specific action or host credential helper, leave both variables unset.

## GitHub Actions Wiring

`.github/workflows/release-build.yml` includes a manual `push_images` input.

- default `false`: build images, validate manifest, upload artifact, run push dry-run;
- `true`: run the push entrypoint with `CI_REGISTRY_PUSH_ENABLED=1`.

Registry credentials are intentionally not committed. Configure provider-specific secrets outside the repository before enabling real push.

## Validation

The push entrypoint checks:

- manifest file exists;
- `BACKEND_IMAGE` and `FRONTEND_IMAGE` are present;
- image refs pass `scripts/validate-image-promotion.sh`;
- both refs use the same registry host;
- real push mode has local images available before pushing;
- username/password are either both present or both absent.

## Acceptance Gate

Do not accept registry push automation for a real environment until:

- dry-run passes from the release workflow;
- provider credentials are configured in CI secrets;
- a real push run succeeds;
- pushed image refs match the generated manifest;
- staging deploy pulls the pushed refs and passes deployment gates.

## Limits

- This baseline does not configure provider credentials.
- This baseline does not enforce registry immutability.
- This baseline does not update staging or production env files automatically.
- Staging env rendering from a retained promotion manifest is documented in `deploy/STAGING_MANIFEST_CONSUMPTION.md`.
- Provider-specific secret integration remains separate.
