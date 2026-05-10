# MVP Pilot Full Smoke Gate Rerun Planning Note

## Slice

```text
full pilot smoke gate suite rerun
```

## Goal

Re-run the accepted MVP pilot smoke gates as one verification pass before starting pilot packaging/runbook work.

## Files

- no product code changes planned;
- run existing runtime smoke scenarios;
- update project status docs after verification.

## In Scope

- Phase 9 pilot end-to-end API gate;
- Phase 9 metadata safety gate;
- Phase 9 approval negative-path gate;
- Phase 8 reporting backend and UI gates;
- current compose service health check;
- scenario inventory check.

## Out of Scope

- new product capability;
- schema changes;
- additional browser coverage beyond existing reporting UI gates;
- deployment/runbook authoring.

## Acceptance

- compose services are running on the expected ports;
- all selected runtime smoke scenarios pass;
- no headless Chrome process is left running after UI smoke checks;
- status docs record the full gate rerun result;
- next focus is pilot packaging/runbook work.
