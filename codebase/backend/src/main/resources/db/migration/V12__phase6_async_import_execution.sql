ALTER TABLE import_jobs
    DROP CONSTRAINT import_jobs_status_check;

ALTER TABLE import_jobs
    ADD CONSTRAINT import_jobs_status_check
        CHECK (status IN ('previewed', 'queued', 'running', 'executed', 'failed'));

ALTER TABLE import_jobs
    ADD COLUMN started_at TIMESTAMPTZ,
    ADD COLUMN executed_by_user_id TEXT REFERENCES app_users(id),
    ADD COLUMN failure_message TEXT;

CREATE INDEX idx_import_jobs_tenant_status_created
    ON import_jobs (tenant_id, status, created_at);
