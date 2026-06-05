# Scripts Map

Read these first:

- `scripts/core/production-migrate.sh`
- `scripts/core/deployment-smoke.sh`
- `scripts/core/production-backup.sh`
- `scripts/core/production-restore-drill.sh`
- `scripts/core/production-rollback-dry-run.sh`

Folders:

- `scripts/core/`: actual GCP production operations and registry-first rollback verification
- `scripts/ci/`: CI-only integration checks; not part of the production deploy path

GitHub Actions entrypoints:

- `.github/workflows/pr-main-ci.yml`: verification CI for PRs and `main`
- `.github/workflows/release-build.yml`: build/push release images to Artifact Registry
