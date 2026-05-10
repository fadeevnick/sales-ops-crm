# Staging Readiness And Secrets Baseline

This baseline keeps staging deploys on the current single-node Compose package. It does not introduce Kubernetes, managed secret stores or external CI deployment.

## Env Files

- Commit only examples such as `.env.staging.example`.
- Do not commit real `.env.staging`, `.env.production`, copied secrets, dumps or backup files.
- Validate real env files before use:

```bash
scripts/validate-deploy-env.sh .env.staging
```

## Required Secret Handling

Real staging values must come from an operator-controlled secret source, not from committed files:

- `POSTGRES_PASSWORD`
- registry credentials used outside this repo;
- host-level TLS material or reverse-proxy credentials, if present;
- any future auth provider client secrets.

For this local package, the app still receives secrets through env vars. That is acceptable for the staging readiness baseline only if the env file is stored outside git and protected by host permissions.

For the managed secrets integration plan, see `deploy/MANAGED_SECRETS.md`.

## Staging Deploy Order

From `codebase/`:

```bash
scripts/validate-deploy-env.sh .env.staging
scripts/validate-managed-secrets-plan.sh deploy/secrets.mapping.example .env.staging
PRODUCTION_ENV_FILE=.env.staging PRODUCTION_COMPOSE_PROJECT_NAME=salesops-staging scripts/production-migrate.sh
docker compose --project-name salesops-staging --env-file .env.staging -f docker-compose.production.yml up -d backend frontend
DEPLOYMENT_SMOKE_API_BASE_URL=https://api.crm-staging.example.com DEPLOYMENT_SMOKE_FRONTEND_BASE_URL=https://crm-staging.example.com scripts/deployment-smoke.sh health
```

For external-host handoff details, use `deploy/EXTERNAL_STAGING_HANDOFF.md`.

## Staging Readiness Gate

Before a staging deploy is considered ready:

- env validation passes;
- migrations run explicitly and exit successfully;
- backend `/readyz` passes through the staging URL;
- frontend returns `200` through the staging URL;
- a fresh backup is produced with `scripts/production-backup.sh`;
- restore drill has passed recently for the same schema version;
- rollback dry run has passed for the image pair being promoted.

## Known Limits

- This is still a single-node Compose package.
- Secrets are injected through env vars rather than a managed secret store.
- TLS/reverse proxy is assumed to be handled outside this compose file.
- No external staging host is provisioned by this repository.
