CREATE TABLE saved_views (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    owner_user_id TEXT NOT NULL REFERENCES app_users(id),
    workspace_type TEXT NOT NULL,
    name TEXT NOT NULL,
    filter_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT saved_views_workspace_type_check
        CHECK (workspace_type IN ('opportunity')),
    CONSTRAINT saved_views_name_check
        CHECK (length(trim(name)) > 0),
    CONSTRAINT saved_views_owner_name_uniq
        UNIQUE (tenant_id, owner_user_id, workspace_type, name)
);

CREATE INDEX idx_saved_views_tenant_owner_workspace
    ON saved_views (tenant_id, owner_user_id, workspace_type, updated_at DESC);
