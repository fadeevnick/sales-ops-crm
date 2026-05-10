# MVP Pilot Single-Node Host IaC Review Note

## Slice

Single-node host IaC baseline.

## Outcome

```text
accepted on local host preflight sanity check
```

## Implemented

- Added `codebase/deploy/SINGLE_NODE_HOST_IAC.md`.
- Added `codebase/scripts/host-preflight-check.sh`.
- Updated `codebase/deploy/PRODUCTION_PLATFORM_IAC.md`.
- Updated `codebase/deploy/EXTERNAL_STAGING_HANDOFF.md`.
- Updated `codebase/DEPLOYMENT.md`.
- Updated `codebase/scripts/staging-handoff-check.sh`.
- Updated `codebase/README.md`.
- Updated `implementation_status.md`.
- Updated `design_status.md`.

## Boundary

This slice keeps the deployment package provider-neutral and single-node.

It does not add:

- cloud resources;
- Terraform, Pulumi or Ansible modules;
- Kubernetes manifests;
- managed PostgreSQL integration;
- reverse proxy or TLS automation;
- provider-specific secret resolution.

## Verification

Expected checks:

```bash
bash -n scripts/host-preflight-check.sh scripts/staging-handoff-check.sh
scripts/staging-handoff-check.sh
SALESOPS_BACKUP_DIR=/tmp HOST_PREFLIGHT_SKIP_PORT_CHECK=1 scripts/host-preflight-check.sh /tmp/salesops-host-preflight.env
curl -fsS http://127.0.0.1:8081/readyz
```

The host preflight local sanity check uses a port-check override because the active dev runtime already owns the default pilot ports. The env file still uses HTTPS staging URLs.

## Remaining Gaps

- no provider-specific secret integration exists;
- no cloud/provider-specific IaC exists;
- no reverse proxy/TLS config is committed;
- PostgreSQL still runs through Compose unless a managed database path is selected.

## Next Step

Choose the next deployment maturity slice:

```text
provider-specific secret integration, reverse proxy/TLS handoff, or image registry promotion baseline
```
