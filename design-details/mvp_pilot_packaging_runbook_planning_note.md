# MVP Pilot Packaging Runbook Planning Note

## Slice

```text
pilot packaging and local runbook baseline
```

## Goal

Document how to start, verify, operate and hand off the local MVP pilot cut without changing product behavior.

## Files

- add pilot runbook document under `design-details/`;
- include startup/shutdown commands, ports, smoke gates and troubleshooting notes;
- update project status docs after review.

## In Scope

- local compose startup and readiness checks;
- expected ports and URLs;
- runtime smoke gate commands;
- manual persona entry points;
- known deferred follow-ups;
- safe cleanup notes;
- permission/escalation notes for smoke commands.

## Out of Scope

- production deployment guide;
- cloud infrastructure;
- backup/restore implementation;
- CI pipeline;
- new product code;
- environment secret management.

## Acceptance

- runbook exists in `design-details/`;
- runbook can be followed from a clean shell in the project workspace;
- status docs point to the next post-runbook decision.
