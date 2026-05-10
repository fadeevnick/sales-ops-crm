CREATE TABLE manager_user_reports (
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    manager_user_id TEXT NOT NULL REFERENCES app_users(id),
    report_user_id TEXT NOT NULL REFERENCES app_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, manager_user_id, report_user_id),
    CONSTRAINT manager_user_reports_no_self_report_check
        CHECK (manager_user_id <> report_user_id)
);

CREATE INDEX idx_manager_user_reports_tenant_manager
    ON manager_user_reports (tenant_id, manager_user_id);

INSERT INTO manager_user_reports (
    tenant_id,
    manager_user_id,
    report_user_id
)
VALUES (
    'tenant_orion',
    'user_michael',
    'user_anna'
);
