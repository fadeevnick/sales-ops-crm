CREATE TABLE metadata_config_versions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    version_number INTEGER NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    created_by_user_id TEXT NOT NULL REFERENCES app_users(id),
    published_by_user_id TEXT REFERENCES app_users(id),
    CONSTRAINT metadata_config_versions_status_check
        CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT metadata_config_versions_version_check
        CHECK (version_number > 0),
    CONSTRAINT metadata_config_versions_tenant_version_uniq
        UNIQUE (tenant_id, version_number)
);

CREATE UNIQUE INDEX idx_metadata_config_versions_one_draft
    ON metadata_config_versions (tenant_id)
    WHERE status = 'draft';

CREATE UNIQUE INDEX idx_metadata_config_versions_one_published
    ON metadata_config_versions (tenant_id)
    WHERE status = 'published';

CREATE TABLE metadata_field_definitions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    config_version_id TEXT NOT NULL REFERENCES metadata_config_versions(id),
    entity_type TEXT NOT NULL,
    field_key TEXT NOT NULL,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL,
    is_required_default BOOLEAN NOT NULL DEFAULT FALSE,
    select_options JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT metadata_field_definitions_entity_type_check
        CHECK (entity_type IN ('account', 'contact', 'opportunity')),
    CONSTRAINT metadata_field_definitions_field_type_check
        CHECK (field_type IN (
            'text',
            'long_text',
            'number',
            'currency',
            'date',
            'boolean',
            'single_select'
        )),
    CONSTRAINT metadata_field_definitions_sort_order_check
        CHECK (sort_order > 0),
    CONSTRAINT metadata_field_definitions_key_check
        CHECK (field_key ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT metadata_field_definitions_config_entity_key_uniq
        UNIQUE (config_version_id, entity_type, field_key),
    CONSTRAINT metadata_field_definitions_config_entity_sort_uniq
        UNIQUE (config_version_id, entity_type, sort_order)
);

CREATE INDEX idx_metadata_field_definitions_tenant_config_entity
    ON metadata_field_definitions (tenant_id, config_version_id, entity_type);

CREATE TABLE metadata_stage_definitions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    config_version_id TEXT NOT NULL REFERENCES metadata_config_versions(id),
    stage_key TEXT NOT NULL,
    display_name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT metadata_stage_definitions_sort_order_check
        CHECK (sort_order > 0),
    CONSTRAINT metadata_stage_definitions_key_check
        CHECK (stage_key ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT metadata_stage_definitions_config_key_uniq
        UNIQUE (config_version_id, stage_key),
    CONSTRAINT metadata_stage_definitions_config_sort_uniq
        UNIQUE (config_version_id, sort_order)
);

CREATE INDEX idx_metadata_stage_definitions_tenant_config
    ON metadata_stage_definitions (tenant_id, config_version_id, sort_order);

CREATE TABLE metadata_stage_required_fields (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    config_version_id TEXT NOT NULL REFERENCES metadata_config_versions(id),
    stage_key TEXT NOT NULL,
    entity_type TEXT NOT NULL DEFAULT 'opportunity',
    field_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT metadata_stage_required_fields_entity_type_check
        CHECK (entity_type = 'opportunity'),
    CONSTRAINT metadata_stage_required_fields_stage_key_check
        CHECK (stage_key ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT metadata_stage_required_fields_field_key_check
        CHECK (field_key ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT metadata_stage_required_fields_config_stage_field_uniq
        UNIQUE (config_version_id, stage_key, entity_type, field_key)
);

CREATE INDEX idx_metadata_stage_required_fields_tenant_config_stage
    ON metadata_stage_required_fields (tenant_id, config_version_id, stage_key);

CREATE TABLE metadata_custom_field_values (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    entity_type TEXT NOT NULL,
    entity_record_id TEXT NOT NULL,
    field_key TEXT NOT NULL,
    field_type TEXT NOT NULL,
    value_text TEXT,
    value_number NUMERIC(18, 4),
    value_date DATE,
    value_boolean BOOLEAN,
    value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    published_version_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id TEXT NOT NULL REFERENCES app_users(id),
    updated_by_user_id TEXT NOT NULL REFERENCES app_users(id),
    CONSTRAINT metadata_custom_field_values_entity_type_check
        CHECK (entity_type IN ('account', 'contact', 'opportunity')),
    CONSTRAINT metadata_custom_field_values_field_type_check
        CHECK (field_type IN (
            'text',
            'long_text',
            'number',
            'currency',
            'date',
            'boolean',
            'single_select'
        )),
    CONSTRAINT metadata_custom_field_values_version_check
        CHECK (published_version_number > 0),
    CONSTRAINT metadata_custom_field_values_key_check
        CHECK (field_key ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT metadata_custom_field_values_record_field_uniq
        UNIQUE (tenant_id, entity_type, entity_record_id, field_key)
);

CREATE INDEX idx_metadata_custom_field_values_tenant_record
    ON metadata_custom_field_values (tenant_id, entity_type, entity_record_id);

CREATE INDEX idx_metadata_custom_field_values_tenant_field
    ON metadata_custom_field_values (tenant_id, entity_type, field_key);

INSERT INTO metadata_config_versions (
    id,
    tenant_id,
    version_number,
    status,
    notes,
    published_at,
    created_by_user_id,
    published_by_user_id
)
VALUES (
    'mcv_orion_v1',
    'tenant_orion',
    1,
    'published',
    'Seeded metadata baseline mirroring the initial CRM process',
    NOW(),
    'user_irina',
    'user_irina'
);

INSERT INTO metadata_stage_definitions (
    id,
    tenant_id,
    config_version_id,
    stage_key,
    display_name,
    sort_order,
    is_closed
)
VALUES
    (
        'msd_orion_qualification_v1',
        'tenant_orion',
        'mcv_orion_v1',
        'qualification',
        'Qualification',
        10,
        FALSE
    ),
    (
        'msd_orion_negotiation_v1',
        'tenant_orion',
        'mcv_orion_v1',
        'negotiation',
        'Negotiation',
        20,
        FALSE
    ),
    (
        'msd_orion_pending_approval_v1',
        'tenant_orion',
        'mcv_orion_v1',
        'pending_approval',
        'Pending Approval',
        30,
        FALSE
    );
