CREATE TABLE reporting_projection_snapshots (
    tenant_id TEXT PRIMARY KEY REFERENCES tenants(id),
    refreshed_at TIMESTAMPTZ NOT NULL,
    refreshed_by_user_id TEXT NOT NULL REFERENCES app_users(id),
    metrics JSONB NOT NULL,
    source_counters JSONB NOT NULL
);
