CREATE TABLE import_jobs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    entity_type TEXT NOT NULL,
    status TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    source_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
    mapping_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    invalid_rows INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id TEXT NOT NULL REFERENCES app_users(id),
    CONSTRAINT import_jobs_entity_type_check
        CHECK (entity_type IN ('account')),
    CONSTRAINT import_jobs_status_check
        CHECK (status IN ('previewed', 'failed')),
    CONSTRAINT import_jobs_row_counts_check
        CHECK (total_rows >= 0 AND valid_rows >= 0 AND invalid_rows >= 0)
);

CREATE INDEX idx_import_jobs_tenant_created
    ON import_jobs (tenant_id, created_at DESC);

CREATE TABLE import_job_rows (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    import_job_id TEXT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    source_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    preview_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT import_job_rows_row_number_check
        CHECK (row_number > 0),
    CONSTRAINT import_job_rows_job_row_uniq
        UNIQUE (import_job_id, row_number)
);

CREATE INDEX idx_import_job_rows_job_row
    ON import_job_rows (import_job_id, row_number);
