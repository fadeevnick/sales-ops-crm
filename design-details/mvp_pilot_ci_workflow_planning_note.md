# MVP Pilot CI Workflow Planning Note

## Slice

Pilot CI smoke workflow baseline.

## Goal

Provide a repository-level CI entrypoint that can prove the current MVP pilot cut from a clean checkout by starting the Docker Compose runtime, running backend/frontend build checks, and executing the accepted pilot smoke gate suite.

## Scope

- add a shell entrypoint under `codebase/scripts/`;
- add a GitHub Actions workflow that calls the entrypoint;
- keep pilot ports unchanged at backend `8081` and frontend `5173`;
- keep the existing local `npm run pilot:smoke` suite as the source of truth for pilot runtime gates;
- allow CI environments to override the Chrome executable with `RUNTIME_SMOKE_CHROME_BIN`.

## Acceptance

- CI entrypoint writes deterministic pilot env values for the compose runtime without permanently changing an existing local `.env`;
- CI entrypoint starts compose, waits for backend and frontend readiness, runs backend compile, runs frontend build, and runs `npm run pilot:smoke`;
- GitHub Actions workflow runs on pull requests and pushes to `main`/`master`;
- local pilot smoke orchestration still passes after the Chrome binary override is introduced.
