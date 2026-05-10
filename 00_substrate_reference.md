# 00 Substrate Reference

## Purpose

Этот документ фиксирует локальный snapshot production-like инженерной основы, на которую опирается проект `sales-ops-crm`.

Он нужен, чтобы проект можно было читать и продолжать как самостоятельный instance без обязательной зависимости от внешнего substrate layer.

## Expected Runtime Shape

- modular monolith backend plus separate SPA frontend;
- containerized local runtime through `docker compose`;
- primary system of record: PostgreSQL;
- asynchronous/background work initially stays DB-backed, not broker-first.

## Deployment Assumptions

- runtime starts from container images, not host-installed build tools;
- environments are expected to separate at least `local`, `staging`, `production`;
- deployment baseline assumes reproducible startup, explicit migrations and rollback-aware changes.

## Persistence And State Assumptions

- PostgreSQL is the authoritative store for identity, CRM records, approvals and audit data;
- schema changes must go through versioned migrations;
- stateful dependencies should remain minimal in early phases;
- data durability and recovery matter from the start, even before full production hardening.

## Health And Readiness Expectations

- backend must expose liveness and readiness separately;
- readiness must fail when critical dependencies such as PostgreSQL are unavailable;
- frontend availability alone does not count as system readiness.

## Observability Expectations Later

- application logs are mandatory baseline;
- metrics and structured operational signals are expected as the runtime matures;
- business audit stays separate from operational telemetry.

## Backup And Recovery Expectations Later

- backup/restore must be treated as a real requirement, not a future nice-to-have;
- recovery posture should eventually include PITR-capable discipline;
- runtime verification later must include not only business flows but runtime operability.

## Security And Access Baseline

- auth and authorization are server-owned boundaries;
- tenant/user/role context must be resolved server-side;
- secrets and environment-specific settings should stay outside committed source.

## Explicit Non-Goals For Bootstrap

- no early microservices split;
- no early external broker requirement;
- no assumption that full Kubernetes/IaC/DR maturity is already implemented in Phase 0.

## Impact On This Project

This substrate baseline means:

- the product can assume a serious production-like runtime shape without re-explaining infra basics in every design doc;
- domain architecture must build on top of this baseline, not try to replace it;
- implementation phases should grow runtime maturity in parallel with domain slices, but the project remains readable even outside the original workspace.
