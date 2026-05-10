# Managed Secrets Integration Plan

This project currently supports staging through protected env files. The next maturity step is to replace operator-written secret values with values resolved from a managed secret source.

This document is provider-neutral. It does not require AWS Secrets Manager, Vault, Doppler, SOPS, Kubernetes Secrets or another specific implementation.

## Secret Inventory

Current required managed secrets:

- `POSTGRES_PASSWORD`

Expected future managed secrets:

- container registry credentials, if the staging host pulls from a private registry;
- TLS/reverse-proxy credentials, if the host manages TLS locally;
- auth provider client secrets when demo auth is replaced.

## Boundary

Managed secrets should produce a runtime env file or equivalent process environment for Compose. The application should continue to read:

- `POSTGRES_PASSWORD`
- future secret-backed env vars

The repository must contain only:

- example env files;
- secret reference mappings;
- validation scripts;
- documentation.

It must not contain resolved secret values.

## Mapping Contract

Use `deploy/secrets.mapping.example` as the minimum mapping contract:

```text
POSTGRES_PASSWORD=secret://salesops/staging/postgres-password
```

Provider-specific implementations can translate the right-hand side into real values and write an uncommitted `.env.staging`.

## Required Flow

1. Operator fetches secrets from the chosen managed secret source.
2. Operator renders `.env.staging` outside version control.
3. `scripts/validate-deploy-env.sh .env.staging` passes.
4. `scripts/validate-managed-secrets-plan.sh deploy/secrets.mapping.example .env.staging` passes.
5. Deploy continues through explicit migration, startup, smoke, backup/restore and rollback gates.

## Validation Limits

The current validation cannot prove that a value came from a real secret manager. It can prove:

- every required secret-backed env key has a mapping;
- every mapped key exists in the rendered env file;
- no mapped key uses a placeholder value;
- no mapped key is empty.

That is sufficient for provider-neutral readiness. Provider-specific proof should be added when a provider is selected.

## Adapter Contract

The repository now includes `deploy/SECRET_PROVIDER_ADAPTERS.md` and `scripts/render-env-from-secret-provider.sh` as the provider-neutral adapter boundary.

Supported adapter shapes:

- `env`: provider or CI exports mapped secret values as process environment variables;
- `dotenv`: provider writes a protected local dotenv file, then the script merges those values into the deploy env.

The script validates mapping shape, injects mapped secret values into a rendered env file, writes the result with `0600` permissions and reruns deploy/managed-secret validations. It does not fetch secrets directly from a provider.

## Provider Selection Criteria

Choose a provider based on:

- availability on the staging host;
- audit trail for secret reads/writes;
- easy rotation workflow;
- no plaintext secrets in git or CI logs;
- compatibility with Docker Compose or the chosen future runtime.

## Rotation Baseline

For each managed secret:

- define owner;
- define rotation trigger;
- define rollback procedure if the rotated value breaks startup;
- run env validation and staging health smoke after rotation.
