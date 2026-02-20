-- Allow return without document when asset has only one assignment (e.g. newly assigned then returned).
ALTER TABLE asset_assignments
ALTER COLUMN document_path DROP NOT NULL;

COMMENT ON COLUMN asset_assignments.document_path IS 'Path to handover/return document; null only when return and document waived (e.g. single assignment)';
