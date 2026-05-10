# MVP Pilot Local Runbook

## Scope

This runbook covers the local Docker Compose pilot cut for `sales-ops-crm`. It is not a production deployment guide.

## Project Paths

- Project root: `/home/nickf/Documents/sre_projects/standalone-projects/sales-ops-crm`
- Compose root: `/home/nickf/Documents/sre_projects/standalone-projects/sales-ops-crm/codebase`
- Frontend root: `/home/nickf/Documents/sre_projects/standalone-projects/sales-ops-crm/codebase/frontend`

## Ports

- Backend: `8081`
- Frontend: `5173`
- Browser URL: `http://localhost:5173`
- Backend readiness: `http://127.0.0.1:8081/readyz`

Do not change these ports for the current pilot cut.

## Start Runtime

From `codebase/`:

```bash
docker compose up -d
```

Check services:

```bash
docker compose ps
curl http://127.0.0.1:8081/readyz
```

Expected readiness response includes:

```text
"status" : "ready"
"postgres" : "ok"
```

## Build Checks

Backend compile:

```bash
docker compose exec -T backend gradle compileKotlin --no-daemon
```

Frontend build:

```bash
docker compose exec -T frontend npm run build
```

## Runtime Smoke Gates

Run from `codebase/frontend/`.

Full pilot gate suite:

```bash
npm run pilot:smoke
```

The full suite starts headless Chrome for reporting UI gates if `9223` is not already in use, then closes the Chrome instance it started.

Core pilot gate:

```bash
npm run runtime:smoke -- phase9-pilot-e2e
```

Metadata safety gate:

```bash
npm run runtime:smoke -- phase9-metadata-safety
```

Metadata rollback gate:

```bash
npm run runtime:smoke -- phase9-metadata-rollback
```

Import matrix gate:

```bash
npm run runtime:smoke -- phase9-import-matrix
```

Approval negative gate:

```bash
npm run runtime:smoke -- phase9-approval-negative
```

Reporting backend gates:

```bash
npm run runtime:smoke -- phase8-reporting-foundation
npm run runtime:smoke -- phase8-reporting-drilldown
```

Reporting UI gates require Chrome DevTools on port `9223`:

```bash
google-chrome --headless=new --remote-debugging-address=127.0.0.1 --remote-debugging-port=9223 --disable-gpu --no-sandbox about:blank
npm run runtime:smoke -- phase8-reporting-ui
npm run runtime:smoke -- phase8-reporting-drilldown-ui
```

After UI smoke, close Chrome through DevTools or confirm no process remains:

```bash
pgrep -af "chrome.*remote-debugging-port=9223"
```

For routine pilot validation, prefer `npm run pilot:smoke` over manually running each gate.

## CI Smoke Gate

The CI-compatible entrypoint is:

```bash
codebase/scripts/ci-pilot-smoke.sh
```

It writes deterministic pilot env values, starts Docker Compose, waits for `http://127.0.0.1:8081/readyz` and `http://127.0.0.1:5173`, runs backend compile, runs frontend build, and runs `npm run pilot:smoke`.

When the script is run locally, an existing `codebase/.env` is restored on exit. The pilot ports remain backend `8081` and frontend `5173`.

The GitHub Actions workflow is `.github/workflows/pilot-smoke.yml`. It runs the same entrypoint on pull requests and pushes to `main`/`master`.

If Chrome is installed at a non-default path in a CI runner, set:

```bash
RUNTIME_SMOKE_CHROME_BIN=/path/to/google-chrome
```

## Demo Personas

- Sales Rep: `anna@orion.local`
- Sales Manager: `michael@orion.local`
- RevOps Admin: `irina@orion.local`
- Finance Approver: `daria@orion.local`
- Legal Approver: `oleg@orion.local`

## Manual Pilot Walkthrough

1. Open `http://localhost:5173`.
2. Log in as Sales Rep and create account/contact/opportunity.
3. Submit a large-deal approval.
4. Log in as Finance Approver and approve the active step.
5. Log in as Legal Approver and approve the final step.
6. Log in as RevOps Admin and refresh reporting.
7. Log in as Sales Manager and check reporting dashboard/drill-down.
8. Log in as RevOps Admin and use duplicate review/merge flow if needed.

## Known Deferred Follow-Ups

- production deployment packaging;
- CI provider refinements;
- approval cancellation/supersede coverage;
- reporting approval-backlog drill-down;
- automatic reporting refresh after every write path;
- full browser walkthrough for all personas.

## Troubleshooting

If runtime smoke cannot connect to `127.0.0.1:8081`, first check:

```bash
docker compose ps
curl http://127.0.0.1:8081/readyz
```

If UI smoke cannot connect to Chrome, check:

```bash
pgrep -af "chrome.*remote-debugging-port=9223"
```

If frontend build fails on the host because `node_modules` is missing, use the frontend container build command from this runbook.

If a metadata smoke fails because a draft already exists, inspect the current draft before deleting anything. The smoke is designed to avoid deleting drafts it did not create.
