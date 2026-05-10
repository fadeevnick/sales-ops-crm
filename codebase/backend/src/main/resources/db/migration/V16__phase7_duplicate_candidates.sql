CREATE TABLE duplicate_candidates (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    entity_type TEXT NOT NULL,
    left_record_id TEXT NOT NULL,
    right_record_id TEXT NOT NULL,
    left_record_label TEXT NOT NULL,
    right_record_label TEXT NOT NULL,
    match_key TEXT NOT NULL,
    match_score INTEGER NOT NULL,
    reason_summary TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by_user_id TEXT REFERENCES app_users(id),
    created_by_user_id TEXT NOT NULL REFERENCES app_users(id),
    CONSTRAINT duplicate_candidates_entity_type_check
        CHECK (entity_type IN ('account', 'contact')),
    CONSTRAINT duplicate_candidates_status_check
        CHECK (status IN ('open', 'rejected', 'merged')),
    CONSTRAINT duplicate_candidates_match_score_check
        CHECK (match_score BETWEEN 0 AND 100),
    CONSTRAINT duplicate_candidates_record_order_check
        CHECK (left_record_id < right_record_id),
    CONSTRAINT duplicate_candidates_pair_uniq
        UNIQUE (tenant_id, entity_type, left_record_id, right_record_id)
);

CREATE INDEX idx_duplicate_candidates_tenant_status
    ON duplicate_candidates (tenant_id, status, generated_at DESC);

CREATE INDEX idx_duplicate_candidates_tenant_entity_status
    ON duplicate_candidates (tenant_id, entity_type, status, generated_at DESC);
