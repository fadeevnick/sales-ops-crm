CREATE TABLE approval_requests (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
    request_type TEXT NOT NULL,
    policy_key TEXT NOT NULL,
    policy_version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL,
    business_justification TEXT,
    opportunity_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_by_user_id TEXT NOT NULL REFERENCES app_users(id),
    submitted_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id TEXT NOT NULL REFERENCES app_users(id),
    updated_by_user_id TEXT NOT NULL REFERENCES app_users(id),
    CONSTRAINT approval_requests_status_check
        CHECK (status IN (
            'draft',
            'submitted',
            'pending_step',
            'approved',
            'rejected',
            'sent_back',
            'cancelled',
            'superseded'
        )),
    CONSTRAINT approval_requests_policy_version_check
        CHECK (policy_version > 0)
);

CREATE UNIQUE INDEX idx_approval_requests_one_active_policy_scope
    ON approval_requests (tenant_id, opportunity_id, request_type, policy_key)
    WHERE status IN ('draft', 'submitted', 'pending_step', 'sent_back');

CREATE INDEX idx_approval_requests_tenant_opportunity
    ON approval_requests (tenant_id, opportunity_id);

CREATE INDEX idx_approval_requests_tenant_status
    ON approval_requests (tenant_id, status);

CREATE INDEX idx_approval_requests_tenant_submitter
    ON approval_requests (tenant_id, submitted_by_user_id);

CREATE TABLE approval_steps (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    approval_request_id TEXT NOT NULL REFERENCES approval_requests(id),
    step_order INTEGER NOT NULL,
    approver_role_key TEXT NOT NULL,
    assigned_approver_user_id TEXT REFERENCES app_users(id),
    status TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    activated_at TIMESTAMPTZ,
    decided_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT approval_steps_status_check
        CHECK (status IN (
            'inactive',
            'active',
            'approved',
            'rejected',
            'skipped',
            'expired'
        )),
    CONSTRAINT approval_steps_step_order_check
        CHECK (step_order > 0),
    CONSTRAINT approval_steps_request_step_order_uniq
        UNIQUE (approval_request_id, step_order)
);

CREATE INDEX idx_approval_steps_tenant_request
    ON approval_steps (tenant_id, approval_request_id);

CREATE INDEX idx_approval_steps_tenant_assignee_status
    ON approval_steps (tenant_id, assigned_approver_user_id, status);

CREATE INDEX idx_approval_steps_tenant_role_status
    ON approval_steps (tenant_id, approver_role_key, status);

CREATE TABLE approval_decision_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    approval_request_id TEXT NOT NULL REFERENCES approval_requests(id),
    approval_step_id TEXT REFERENCES approval_steps(id),
    actor_user_id TEXT NOT NULL REFERENCES app_users(id),
    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    comment TEXT,
    decision_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT approval_decision_history_event_type_check
        CHECK (event_type IN (
            'submitted',
            'step_activated',
            'approved',
            'rejected',
            'sent_back',
            'cancelled',
            'superseded'
        ))
);

CREATE INDEX idx_approval_decision_history_tenant_request_created
    ON approval_decision_history (tenant_id, approval_request_id, created_at);

CREATE INDEX idx_approval_decision_history_tenant_actor_created
    ON approval_decision_history (tenant_id, actor_user_id, created_at);
