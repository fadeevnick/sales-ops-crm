# Sales Ops CRM

```text
B2B Sales Operations CRM with approvals
```

This repository now has two active documentation layers:

1. **Current operating truth**
   - `CURRENT.md`
   - `NOTES.md`
   - `codebase/DEPLOYMENT.md`
2. **Product and architecture reference**
   - `00_*`
   - `01_business_requirements.md` ... `06_implementation_guide.md`
   - `mvp_roadmap.md`
   - ADRs and core design docs under `design-details/`
## Read First

For a new session, read in this order:

1. [README.md](README.md)
2. [CURRENT.md](CURRENT.md)
3. [NOTES.md](NOTES.md)
4. [codebase/DEPLOYMENT.md](codebase/DEPLOYMENT.md)

Then, if product context is needed:

5. [mvp_roadmap.md](mvp_roadmap.md)
6. [04_architecture.md](04_architecture.md)
7. [03_functional_requirements.md](03_functional_requirements.md)
8. [02_user_journeys.md](02_user_journeys.md)

## File Roles

- `CURRENT.md` — current state, handoff, and active operational boundary
- `NOTES.md` — setup quirks, environment gotchas, and pragmatic reminders
- `codebase/DEPLOYMENT.md` — current GCP production runbook
- `04_architecture.md` — architecture plus implementation stack baseline
- old phase planning/review artifacts have been removed from the active docs set

## Current Project State

The project is no longer in bootstrap or transition-to-code mode.

Current reality:

- core MVP product slices are implemented;
- production runtime is registry-first on GCP;
- PR/main CI and release CI exist;
- deploy to the VM is still operator-driven;
- the main remaining work is pilot-readiness, hardening, and operational discipline.
