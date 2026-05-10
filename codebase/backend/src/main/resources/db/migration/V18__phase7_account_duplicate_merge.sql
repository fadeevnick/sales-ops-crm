ALTER TABLE duplicate_candidates
    ADD COLUMN merge_master_record_id TEXT,
    ADD COLUMN merge_duplicate_record_id TEXT,
    ADD COLUMN merge_reason TEXT;
