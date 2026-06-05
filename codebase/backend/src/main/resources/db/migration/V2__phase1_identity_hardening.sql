ALTER TABLE app_users
    ADD CONSTRAINT app_users_status_check
    CHECK (status IN ('active', 'disabled'));

CREATE INDEX idx_app_users_tenant_status
    ON app_users (tenant_id, status);

INSERT INTO roles (id, role_key, display_name)
VALUES
    ('role_finance_approver', 'finance_approver', 'Finance Approver'),
    ('role_legal_approver', 'legal_approver', 'Legal Approver');

INSERT INTO app_users (id, tenant_id, email, display_name, status)
VALUES
    ('user_daria', 'tenant_orion', 'daria@orion.local', 'Daria Orlova', 'active'),
    ('user_oleg', 'tenant_orion', 'oleg@orion.local', 'Oleg Smirnov', 'active');

INSERT INTO user_role_assignments (user_id, role_id)
VALUES
    ('user_daria', 'role_finance_approver'),
    ('user_oleg', 'role_legal_approver');
