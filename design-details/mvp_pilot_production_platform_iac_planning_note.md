# MVP Pilot Production Platform/IaC Planning Note

## Slice

Production platform and infrastructure-as-code planning.

## Outcome

```text
accepted as provider-neutral planning baseline; no runtime verification required
```

## Implemented

- Added `codebase/deploy/PRODUCTION_PLATFORM_IAC.md`.
- Updated `codebase/DEPLOYMENT.md`.
- Updated `codebase/README.md`.
- Updated `implementation_status.md`.
- Updated `design_status.md`.

## Planning Boundary

This slice defines the platform/IaC boundary after the current single-node Compose package.

It does not introduce:

- Terraform, Pulumi, Ansible or Kubernetes files;
- AWS/GCP/Azure/Vault/provider-specific resources;
- a new deployment runtime;
- a database provider change;
- application behavior changes.

## Platform Paths

The planning baseline keeps three valid paths open:

- single-node Compose with host IaC;
- managed container platform;
- Kubernetes only if operational requirements justify it.

The current recommendation is to keep the next buildable implementation on the single-node Compose with host IaC path unless a concrete provider/platform is selected.

## Acceptance Criteria For A Future Implementation

A future platform/IaC implementation should not be accepted until:

- infrastructure can be recreated from committed non-secret artifacts;
- secrets are resolved outside git and logs;
- explicit migration passes;
- backend readiness passes through the external route;
- frontend health passes through the external route;
- backup writes to durable external storage;
- restore drill succeeds;
- rollback dry run succeeds for promoted image tags;
- deploy, rollback and rotation ownership is documented.

## Verification

Documentation-only change. Runtime verification was not required.

Static sanity check:

```bash
rg -n "PRODUCTION_PLATFORM_IAC|production platform|IaC" codebase/DEPLOYMENT.md codebase/README.md implementation_status.md design_status.md design-details/mvp_pilot_production_platform_iac_planning_note.md
```

## Remaining Gaps

- no provider-specific secret integration exists;
- no provider-specific IaC implementation exists;
- no production platform has been selected;
- current deployment package remains single-node Compose.

## Next Step

Choose a concrete deployment maturity slice:

```text
provider-specific secret integration or single-node host IaC baseline
```
