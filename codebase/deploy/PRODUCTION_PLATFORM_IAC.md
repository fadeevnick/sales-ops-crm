# Production Platform And IaC Plan

The current deployment package is intentionally a single-node Docker Compose baseline. It is suitable for a controlled staging or pilot host, but it is not yet a full production platform.

This document defines the provider-neutral platform and infrastructure-as-code boundary for the next maturity step. It does not select AWS, GCP, Azure, Kubernetes, Terraform, Pulumi, Ansible or a managed PaaS.

## Current Baseline

- Backend and frontend are packaged as production-oriented containers.
- PostgreSQL runs as a Compose service with a named volume.
- Migrations are explicit through `scripts/production-migrate.sh`.
- Backup, restore drill and rollback dry-run scripts exist.
- Staging env validation and provider-neutral managed secret mapping checks exist.
- External TLS, routing, durable backups and host provisioning are outside the repository.

## Platform Target

The next platform layer should provide:

- repeatable host or runtime provisioning;
- image build and promotion path for backend/frontend images;
- durable PostgreSQL storage or managed PostgreSQL;
- protected secret injection into the runtime environment;
- external HTTP/TLS routing for frontend and backend;
- backup storage outside the runtime volume;
- operator runbooks for migration, smoke, rollback and restore drill;
- enough observability to detect failed deploys and unhealthy runtime.

## Supported Maturity Paths

### Path A: Single-Node Compose With Host IaC

Use when the near-term goal is a controlled pilot/staging host.

IaC owns:

- VM or bare-metal host provisioning;
- Docker Engine and Compose installation;
- firewall/security group rules;
- reverse proxy/TLS setup;
- backup target mount or bucket access;
- service directory layout and env-file permissions.

Repository-owned deployment remains:

- `docker-compose.production.yml`;
- deployment scripts under `scripts/`;
- env validation and managed secret mapping validation;
- explicit migration/smoke/backup/restore/rollback gates.

The current repository baseline for this path is `deploy/SINGLE_NODE_HOST_IAC.md`.

### Path B: Managed Container Platform

Use when the host should be replaced by a provider runtime such as ECS, Cloud Run, App Service, Fly, Render or similar.

IaC owns:

- container services;
- registry permissions;
- managed PostgreSQL attachment;
- secret references;
- ingress/TLS;
- health checks;
- backup policies.

Repository-owned deployment must keep the same behavioral gates:

- explicit migration step before backend replacement;
- readiness smoke after deploy;
- rollback path for image tags;
- restore drill against the selected database backup mechanism.

### Path C: Kubernetes

Use only if platform requirements justify it. Kubernetes should not be introduced just to replace the current Compose file.

Required before choosing this path:

- clear operator ownership;
- cluster lifecycle plan;
- ingress/TLS plan;
- database stance, preferably managed PostgreSQL;
- secret provider integration;
- migration job design;
- backup/restore and rollback runbooks.

## IaC Boundary

IaC should own infrastructure, not application behavior.

IaC should define:

- compute/runtime;
- network ingress;
- storage and database attachment;
- secret source references;
- backup target access;
- environment-specific deployment parameters;
- health check wiring;
- least-privilege runtime permissions.

IaC should not define:

- CRM product roles or demo users;
- database schema changes beyond invoking the migration step;
- seed data outside the existing Flyway migrations;
- metadata configuration edits;
- application authorization rules.

## Required Decisions Before Implementation

Select and document:

- platform path: single-node host IaC, managed container platform, or Kubernetes;
- database target: Compose PostgreSQL volume or managed PostgreSQL;
- secret provider and rendering/injection flow;
- image registry and tag promotion model;
- TLS/routing ownership;
- backup destination and retention policy;
- rollback strategy for app images and database changes;
- staging and production environment names.

## First Buildable Platform Slice

After a platform path is selected, the first implementation should be intentionally narrow:

- add the smallest IaC or provisioning artifact for one staging environment;
- keep the existing Compose package and scripts as the deployment contract unless the selected platform requires a different runtime format;
- wire secret references without committing resolved secret values;
- run the existing migration, smoke, backup/restore and rollback gates against the provisioned target.

## Acceptance Gate

A platform/IaC implementation is not accepted until:

- infrastructure can be recreated from committed non-secret artifacts;
- resolved secrets are absent from git and logs;
- explicit migration passes;
- deployed backend `/readyz` passes through the external route;
- deployed frontend returns a successful response through the external route;
- backup writes to durable external storage;
- restore drill succeeds from that backup;
- rollback dry run succeeds for promoted image tags;
- the selected platform runbook names ownership for deploy, rollback and rotation.

## Current Recommendation

Keep the default next implementation provider-neutral until a real target platform is selected.

For the current MVP pilot maturity, Path A is the selected baseline. It preserves the already verified deployment package while making host provisioning, TLS, backup target and permissions repeatable through `deploy/SINGLE_NODE_HOST_IAC.md` and `scripts/host-preflight-check.sh`.
