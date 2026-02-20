-- Migration: Add link support to company_files table
-- Purpose: Enable storing external links (Google Docs, etc.) alongside uploaded files
-- Date: 2025-01-29

-- Add source_type column to distinguish between 'upload' and 'link'
ALTER TABLE company_files 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'upload' CHECK (source_type IN ('upload', 'link'));

-- Add link metadata columns
ALTER TABLE company_files 
ADD COLUMN IF NOT EXISTS link_title TEXT,
ADD COLUMN IF NOT EXISTS link_description TEXT,
ADD COLUMN IF NOT EXISTS link_modified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS link_owner TEXT,
ADD COLUMN IF NOT EXISTS link_thumbnail_url TEXT;

-- Update existing records to have source_type = 'upload'
UPDATE company_files SET source_type = 'upload' WHERE source_type IS NULL;

-- Add index for source_type filtering
CREATE INDEX IF NOT EXISTS idx_company_files_source_type 
ON company_files(source_type, organization_id);

-- Add index for link-specific queries
CREATE INDEX IF NOT EXISTS idx_company_files_link_metadata 
ON company_files(source_type, link_title) 
WHERE source_type = 'link';

-- Comments for documentation
COMMENT ON COLUMN company_files.source_type IS 
'Type of file source: "upload" for uploaded files, "link" for external links (Google Docs, etc.)';

COMMENT ON COLUMN company_files.link_title IS 
'Title extracted from the link metadata (e.g., document title from Google Docs)';

COMMENT ON COLUMN company_files.link_description IS 
'Description or summary extracted from the link metadata';

COMMENT ON COLUMN company_files.link_modified_at IS 
'Last modified date of the linked document (if available)';

COMMENT ON COLUMN company_files.link_owner IS 
'Owner of the linked document (e.g., Google Docs owner name)';

COMMENT ON COLUMN company_files.link_thumbnail_url IS 
'URL to thumbnail/preview image of the linked document';

