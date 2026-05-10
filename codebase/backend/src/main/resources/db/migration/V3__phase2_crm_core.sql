CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    website TEXT,
    owner_user_id TEXT NOT NULL REFERENCES app_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id TEXT NOT NULL REFERENCES app_users(id),
    updated_by_user_id TEXT NOT NULL REFERENCES app_users(id)
);

CREATE INDEX idx_accounts_tenant_owner
    ON accounts (tenant_id, owner_user_id);

CREATE INDEX idx_accounts_tenant_lower_name
    ON accounts (tenant_id, lower(name));

CREATE TABLE contacts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    account_id TEXT NOT NULL REFERENCES accounts(id),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    owner_user_id TEXT NOT NULL REFERENCES app_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id TEXT NOT NULL REFERENCES app_users(id),
    updated_by_user_id TEXT NOT NULL REFERENCES app_users(id)
);

CREATE INDEX idx_contacts_tenant_account
    ON contacts (tenant_id, account_id);

CREATE INDEX idx_contacts_tenant_owner
    ON contacts (tenant_id, owner_user_id);

CREATE TABLE opportunity_stages (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    stage_key TEXT NOT NULL,
    display_name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    is_closed BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT opportunity_stages_tenant_stage_key_uniq UNIQUE (tenant_id, stage_key),
    CONSTRAINT opportunity_stages_tenant_sort_order_uniq UNIQUE (tenant_id, sort_order)
);

CREATE TABLE opportunities (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    account_id TEXT NOT NULL REFERENCES accounts(id),
    primary_contact_id TEXT REFERENCES contacts(id),
    title TEXT NOT NULL,
    owner_user_id TEXT NOT NULL REFERENCES app_users(id),
    stage_id TEXT NOT NULL REFERENCES opportunity_stages(id),
    expected_amount NUMERIC(14, 2),
    close_date DATE,
    global_status TEXT NOT NULL,
    approval_state TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id TEXT NOT NULL REFERENCES app_users(id),
    updated_by_user_id TEXT NOT NULL REFERENCES app_users(id),
    CONSTRAINT opportunities_global_status_check
        CHECK (global_status IN (
            'active',
            'pending_approval',
            'approved_to_progress',
            'blocked_by_rejection',
            'closed_won',
            'closed_lost'
        )),
    CONSTRAINT opportunities_approval_state_check
        CHECK (approval_state IN ('none', 'pending', 'approved', 'rejected'))
);

CREATE INDEX idx_opportunities_tenant_owner
    ON opportunities (tenant_id, owner_user_id);

CREATE INDEX idx_opportunities_tenant_stage
    ON opportunities (tenant_id, stage_id);

CREATE INDEX idx_opportunities_tenant_account
    ON opportunities (tenant_id, account_id);

CREATE INDEX idx_opportunities_tenant_close_date
    ON opportunities (tenant_id, close_date);

CREATE TABLE activities (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    due_date DATE,
    owner_user_id TEXT NOT NULL REFERENCES app_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id TEXT NOT NULL REFERENCES app_users(id),
    updated_by_user_id TEXT NOT NULL REFERENCES app_users(id),
    CONSTRAINT activities_status_check
        CHECK (status IN ('open', 'completed'))
);

CREATE INDEX idx_activities_tenant_opportunity
    ON activities (tenant_id, opportunity_id);

CREATE INDEX idx_activities_tenant_owner_status
    ON activities (tenant_id, owner_user_id, status);

INSERT INTO opportunity_stages (id, tenant_id, stage_key, display_name, sort_order, is_closed)
VALUES
    ('stage_orion_qualification', 'tenant_orion', 'qualification', 'Qualification', 10, FALSE),
    ('stage_orion_negotiation', 'tenant_orion', 'negotiation', 'Negotiation', 20, FALSE),
    ('stage_orion_pending_approval', 'tenant_orion', 'pending_approval', 'Pending Approval', 30, FALSE);
