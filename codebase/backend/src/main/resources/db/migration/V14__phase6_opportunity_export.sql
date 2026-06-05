ALTER TABLE export_jobs
    DROP CONSTRAINT export_jobs_entity_type_check;

ALTER TABLE export_jobs
    ADD CONSTRAINT export_jobs_entity_type_check
        CHECK (entity_type IN ('account', 'opportunity'));
