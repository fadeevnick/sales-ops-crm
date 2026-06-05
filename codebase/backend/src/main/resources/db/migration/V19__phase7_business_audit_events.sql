CREATE TABLE business_audit_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    details JSONB NOT NULL,
    actor_user_id TEXT NOT NULL REFERENCES app_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT business_audit_events_event_type_check
        CHECK (event_type IN ('account_duplicate_merged', 'contact_duplicate_merged')),
    CONSTRAINT business_audit_events_entity_type_check
        CHECK (entity_type IN ('duplicate_candidate', 'account', 'contact'))
);

CREATE INDEX idx_business_audit_events_tenant_created
    ON business_audit_events (tenant_id, created_at DESC);

CREATE INDEX idx_business_audit_events_tenant_entity
    ON business_audit_events (tenant_id, entity_type, entity_id, created_at DESC);
