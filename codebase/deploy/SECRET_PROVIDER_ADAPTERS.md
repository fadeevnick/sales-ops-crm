# Secret Provider Adapter Contract

This baseline defines how a selected secret provider plugs into the staging deploy env flow without committing provider credentials or resolved secret values.

The repository remains provider-neutral. A provider-specific command may be AWS Secrets Manager, Vault, Doppler, SOPS, Kubernetes Secrets, CI protected variables or another approved source, but its output must cross the repository boundary through one of the supported adapter shapes below.

## Inputs

- base deploy env, for example `/opt/salesops/env/.env.staging.base`;
- secret mapping, for example `deploy/secrets.mapping.example`;
- rendered output env, for example `/opt/salesops/env/.env.staging`;
- selected adapter via `SECRET_PROVIDER_ADAPTER`.

The base env may keep placeholder values for mapped secrets. The rendered output env must contain resolved values and must stay outside version control.

## Mapping

The mapping file uses deploy env keys on the left and provider references on the right:

```text
POSTGRES_PASSWORD=secret://salesops/staging/postgres-password
```

Provider references are not resolved directly by repository scripts. The selected provider workflow is responsible for turning those references into key/value values with the same left-hand keys.

## Supported Adapters

`env` adapter:

- reads mapped secret values from the current process environment;
- is suitable for CI protected variables or a provider CLI that exports environment variables before invoking the script;
- never prints secret values.

Example:

```bash
export POSTGRES_PASSWORD="$(provider-cli read secret://salesops/staging/postgres-password)"
SECRET_PROVIDER_ADAPTER=env \
  scripts/render-env-from-secret-provider.sh \
  /opt/salesops/env/.env.staging.base \
  deploy/secrets.mapping.example \
  /opt/salesops/env/.env.staging
```

`dotenv` adapter:

- reads mapped secret values from a protected local dotenv file;
- is suitable for a provider CLI that writes a temporary key/value file on the host;
- requires `SECRET_PROVIDER_SOURCE_FILE`;
- the source file and rendered output file must stay outside git.

Example:

```bash
provider-cli export --format dotenv --output /opt/salesops/secrets/staging.env
SECRET_PROVIDER_ADAPTER=dotenv \
SECRET_PROVIDER_SOURCE_FILE=/opt/salesops/secrets/staging.env \
  scripts/render-env-from-secret-provider.sh \
  /opt/salesops/env/.env.staging.base \
  deploy/secrets.mapping.example \
  /opt/salesops/env/.env.staging
```

## Render Guarantees

`scripts/render-env-from-secret-provider.sh`:

- validates the base env and mapping file exist;
- validates every mapping has an env-safe key and a `secret://` reference;
- replaces mapped secret keys in the base env with resolved values;
- preserves non-secret env values, including route settings and image refs;
- writes the rendered env with `0600` permissions;
- runs deploy env validation;
- runs managed secret mapping validation.

The script does not fetch secrets from a cloud or SaaS provider by itself. That remains an operator/provider-specific step until a provider is selected.

## Acceptance Gate

Do not accept a provider integration until:

- the provider command can resolve every mapping key;
- the provider command output uses either the `env` or `dotenv` adapter shape;
- rendered env validation passes;
- managed secret mapping validation passes;
- staging deploy dry-run passes with the rendered env;
- staging post-deploy gates pass after apply mode on the target host.

## Limits

- No provider credentials belong in this repository.
- No resolved secret values belong in this repository.
- This contract does not choose a provider.
- This contract does not prove provider audit logging, rotation or access policy; those are provider-selection acceptance items.
