ALTER TABLE import_jobs
    DROP CONSTRAINT import_jobs_status_check;

ALTER TABLE import_jobs
    ADD CONSTRAINT import_jobs_status_check
        CHECK (status IN ('previewed', 'executed', 'failed'));

ALTER TABLE import_jobs
    ADD COLUMN executed_rows INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN skipped_rows INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN executed_at TIMESTAMPTZ,
    ADD CONSTRAINT import_jobs_execution_counts_check
        CHECK (executed_rows >= 0 AND skipped_rows >= 0);

ALTER TABLE import_job_rows
    ADD COLUMN execution_status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN created_record_id TEXT,
    ADD COLUMN execution_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD CONSTRAINT import_job_rows_execution_status_check
        CHECK (execution_status IN ('pending', 'created', 'skipped', 'failed'));
