CREATE TABLE opportunity_timeline_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
    event_type TEXT NOT NULL,
    event_code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    actor_user_id TEXT NOT NULL REFERENCES app_users(id),
    actor_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_opp_timeline_opportunity
    ON opportunity_timeline_events (opportunity_id);
