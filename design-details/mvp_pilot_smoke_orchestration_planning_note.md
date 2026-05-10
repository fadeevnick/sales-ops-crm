# MVP Pilot Smoke Orchestration Planning Note

## Slice

```text
pilot smoke suite orchestration baseline
```

## Goal

Add a single CI-compatible command that runs the accepted MVP pilot smoke gate suite in order, including automatic headless Chrome lifecycle management for browser-backed reporting UI gates.

## Files

- add frontend smoke suite orchestration script;
- add npm script entrypoint;
- update pilot runbook with the one-command gate;
- update project status docs after verification.

## In Scope

- run accepted pilot gates in deterministic order;
- start Chrome DevTools on `9223` only when needed and only if not already running;
- close Chrome when the orchestrator started it;
- preserve the existing `npm run runtime:smoke -- <scenario>` entrypoint;
- return non-zero on first failing gate.

## Out of Scope

- GitHub Actions/GitLab CI config;
- production deployment workflow;
- parallel test execution;
- test database reset;
- new smoke scenario coverage.

## Acceptance

- `npm run pilot:smoke` passes against the current compose runtime;
- no headless Chrome process is left running if the orchestrator started it;
- runbook documents both the one-command suite and individual gate commands;
- project status docs record the orchestration baseline.
