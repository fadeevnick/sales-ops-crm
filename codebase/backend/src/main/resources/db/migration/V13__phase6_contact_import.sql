ALTER TABLE import_jobs
    DROP CONSTRAINT import_jobs_entity_type_check;

ALTER TABLE import_jobs
    ADD CONSTRAINT import_jobs_entity_type_check
        CHECK (entity_type IN ('account', 'contact'));
