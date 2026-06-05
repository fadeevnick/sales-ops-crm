CREATE TABLE tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
    id TEXT PRIMARY KEY,
    role_key TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL
);

CREATE TABLE app_users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_role_assignments (
    user_id TEXT NOT NULL REFERENCES app_users(id),
    role_id TEXT NOT NULL REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

INSERT INTO tenants (id, name, slug)
VALUES ('tenant_orion', 'Orion Industrial', 'orion-industrial');

INSERT INTO roles (id, role_key, display_name)
VALUES
    ('role_sales_rep', 'sales_rep', 'Sales Representative'),
    ('role_sales_manager', 'sales_manager', 'Sales Manager'),
    ('role_revops_admin', 'revops_admin', 'RevOps Administrator');

INSERT INTO app_users (id, tenant_id, email, display_name, status)
VALUES
    ('user_anna', 'tenant_orion', 'anna@orion.local', 'Anna Petrova', 'active'),
    ('user_michael', 'tenant_orion', 'michael@orion.local', 'Michael Green', 'active'),
    ('user_irina', 'tenant_orion', 'irina@orion.local', 'Irina Volkova', 'active');

INSERT INTO user_role_assignments (user_id, role_id)
VALUES
    ('user_anna', 'role_sales_rep'),
    ('user_michael', 'role_sales_manager'),
    ('user_irina', 'role_revops_admin');
