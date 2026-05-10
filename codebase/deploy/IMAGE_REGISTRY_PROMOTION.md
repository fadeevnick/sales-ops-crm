# Image Registry Promotion Baseline

The production Compose package deploys images through:

```text
BACKEND_IMAGE=registry.example.com/salesops-backend:staging
FRONTEND_IMAGE=registry.example.com/salesops-frontend:staging
```

This baseline defines how backend and frontend image references move from build output to staging or production env files. It is provider-neutral and does not require Docker Hub, GHCR, ECR, GCR, ACR or another registry.

## Promotion Contract

Every deployable release must have:

- one backend image reference;
- one frontend image reference;
- a shared release tag, or immutable digests for both images;
- a rendered env file that uses those promoted references;
- validation before migration/startup;
- smoke verification after deploy.

Do not deploy `latest` tags to staging or production.

## Recommended Tag Shape

Use one shared release tag across backend and frontend:

```text
registry.example.com/salesops-backend:2026-05-10T2145Z-gitabc123
registry.example.com/salesops-frontend:2026-05-10T2145Z-gitabc123
```

If the registry supports immutable digests, production promotion may use digest-pinned references:

```text
registry.example.com/salesops-backend@sha256:...
registry.example.com/salesops-frontend@sha256:...
```

## Build And Push

Provider-neutral local build shape:

```bash
docker compose --env-file .env.staging -f docker-compose.production.yml build backend frontend
docker push "${BACKEND_IMAGE}"
docker push "${FRONTEND_IMAGE}"
```

The actual push command may be handled by CI, a registry-specific login step or a release operator. Registry credentials are secrets and must not be committed.

The provider-neutral CI build baseline is documented in `deploy/CI_RELEASE_AUTOMATION.md`. Provider-neutral push automation is documented in `deploy/REGISTRY_PUSH_AUTOMATION.md`.

## Promotion Manifest

Use `deploy/image-promotion.manifest.example` as the minimum release record shape:

```text
RELEASE_TAG=2026-05-10T2145Z-gitabc123
BACKEND_IMAGE=registry.example.com/salesops-backend:2026-05-10T2145Z-gitabc123
FRONTEND_IMAGE=registry.example.com/salesops-frontend:2026-05-10T2145Z-gitabc123
```

The manifest is a release artifact template, not a secret file.

## Validation

Validate the rendered deployment env before migration:

```bash
scripts/validate-image-promotion.sh .env.staging
```

For local drills that intentionally use non-registry image names:

```bash
IMAGE_PROMOTION_ALLOW_LOCAL=1 scripts/validate-image-promotion.sh .env.production
```

The validation checks:

- backend/frontend image refs exist;
- refs do not contain placeholder values;
- refs do not use `latest`;
- refs are remote registry refs unless local mode is explicitly allowed;
- tag-based refs use the same tag unless explicitly overridden;
- optional `IMAGE_PROMOTION_EXPECTED_TAG` matches both tag-based refs.

## Deploy Order

Promotion acceptance order:

1. Build backend/frontend images.
2. Push images to the selected registry.
3. Render env file with promoted image refs.
4. Run deploy env, managed secret and image promotion validation.
5. Run explicit migration.
6. Start backend/frontend from promoted image refs.
7. Run reverse proxy/TLS check and deployment smoke.
8. Run backup/restore and rollback gates for the promoted refs.

## Acceptance Gate

Do not accept image promotion until:

- `scripts/validate-image-promotion.sh` passes for the target env file;
- the deploy env file references promoted backend/frontend images;
- the migration step uses the same promoted backend image as runtime;
- rollback env files identify the previous and candidate image refs;
- deployment smoke passes after startup.

## Limits

- This baseline does not authenticate to a registry.
- This baseline does not push images by itself.
- This baseline does not enforce registry immutability; that must be configured in the selected registry.
- CI release build validation exists, and registry push automation is available behind an explicit push flag.
