CREATE TABLE export_jobs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    entity_type TEXT NOT NULL,
    status TEXT NOT NULL,
    criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    row_count INTEGER NOT NULL DEFAULT 0,
    csv_content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_by_user_id TEXT NOT NULL REFERENCES app_users(id),
    CONSTRAINT export_jobs_entity_type_check
        CHECK (entity_type IN ('account')),
    CONSTRAINT export_jobs_status_check
        CHECK (status IN ('completed', 'failed')),
    CONSTRAINT export_jobs_row_count_check
        CHECK (row_count >= 0)
);

CREATE INDEX idx_export_jobs_tenant_created
    ON export_jobs (tenant_id, created_at DESC);
