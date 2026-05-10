# Production Readiness Summary

This project now has a production-oriented deployment package and a verified local staging drill path.

It is not yet production-ready for live external users. The package is ready for an external staging host acceptance run, then provider-specific production hardening.

## Current Readiness Level

```text
staging-package-ready; production-readiness-blocked
```

The repository provides:

- production backend/frontend container packaging;
- single-node Docker Compose production package;
- explicit Flyway migration command;
- staging env validation;
- provider-neutral managed secret mapping validation;
- secret provider env/dotenv adapter rendering contract;
- host preflight validation;
- reverse proxy/TLS route validation;
- CI release image build and manifest generation;
- registry push entrypoint with dry-run default;
- deploy env rendering from a retained release manifest;
- staging deploy orchestration;
- local staging apply drill;
- post-deploy smoke, backup, restore and rollback gate orchestration;
- local post-deploy apply drill.

## Verified Gates

Accepted local gates:

- production image build;
- explicit migration apply to schema version `20`;
- backup and restore drill;
- rollback dry run;
- staging env validation;
- managed secret mapping validation;
- secret provider adapter render validation;
- external staging handoff package validation;
- image promotion validation;
- CI release image build and manifest validation;
- registry push dry-run validation;
- staging deploy env rendering from release manifest;
- staging deploy dry-run;
- isolated staging deploy apply drill;
- staging post-deploy gate dry-run;
- isolated staging post-deploy apply drill.

The isolated post-deploy apply drill covers:

- deploy apply mode;
- explicit migration;
- backend/frontend startup;
- route check;
- deployment health smoke;
- backup creation;
- restore drill from the produced backup;
- rollback dry run;
- cleanup of disposable drill stacks.

## Production Blockers

Before production acceptance, the following must be resolved outside the current local package:

- selected registry provider and real image push;
- selected provider-specific secret source, access policy and audit proof;
- external staging host acceptance run;
- real DNS/TLS/reverse proxy configuration;
- durable backup target and retention policy;
- real restore drill from durable backup storage;
- real rollback dry run using promoted registry images;
- production auth replacement for temporary demo auth;
- monitoring, alerting and log ownership;
- incident, rollback and rotation ownership.

## Staging Acceptance Path

Use this order for the next real environment:

1. Select staging host and registry provider.
2. Configure registry credentials outside the repository.
3. Run CI release build and retain `image-promotion.manifest`.
4. Push images with `scripts/ci-registry-push.sh` or provider-specific equivalent.
5. Render or inject secret-backed `.env.staging` through the selected provider adapter.
6. Render release image refs from the retained manifest when needed.
7. Run `scripts/staging-deploy.sh` dry-run.
8. Run `STAGING_DEPLOY_APPLY=1 scripts/staging-deploy.sh`.
9. Run `scripts/staging-post-deploy-gates.sh` dry-run.
10. Run `STAGING_POST_DEPLOY_APPLY=1 scripts/staging-post-deploy-gates.sh`.
11. Record backup, restore and rollback outputs.

## Production Acceptance Path

Production should not start until the staging path has passed on an external host.

After staging acceptance:

- decide whether single-node Compose remains acceptable for first production;
- replace demo auth with production identity provider integration;
- choose provider-specific secret manager or approved secret rendering flow;
- configure registry immutability or digest-pinned deploys;
- configure durable backups and retention;
- configure monitoring and alerting;
- run a production deploy rehearsal using production-like URLs and backup storage;
- document final go/no-go with named owners.

## Current Recommendation

Do not add Kubernetes, managed database migration, or cloud-specific IaC before an external staging acceptance run proves the current package.

The next highest-value deployment slice is selecting the actual secret provider or running real external staging acceptance using the current handoff package.

External staging acceptance automation is documented in `deploy/EXTERNAL_STAGING_ACCEPTANCE.md`.
