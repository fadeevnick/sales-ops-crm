ALTER TABLE saved_views
    ADD COLUMN visibility_scope TEXT NOT NULL DEFAULT 'private';

ALTER TABLE saved_views
    ADD CONSTRAINT saved_views_visibility_scope_check
        CHECK (visibility_scope IN ('private', 'shared'));

CREATE INDEX idx_saved_views_tenant_workspace_shared
    ON saved_views (tenant_id, workspace_type, visibility_scope, updated_at DESC);
