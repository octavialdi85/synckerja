# Migration: Add Link Support to company_files

## Overview
This migration adds support for external links (Google Docs, Dropbox, OneDrive, etc.) alongside uploaded files in the `company_files` table.

## Purpose
- Enable storing external links (Google Docs, Dropbox, OneDrive, Notion, Figma, etc.) in addition to uploaded files
- Store link metadata (title, description, thumbnail, owner, modified date)
- Distinguish between uploaded files and external links in the database

## Changes

### 1. Database Schema
- Added `source_type` column (VARCHAR(20)) with CHECK constraint: 'upload' | 'link'
- Added `link_title` column (TEXT) - Title extracted from link metadata
- Added `link_description` column (TEXT) - Description/summary from link
- Added `link_modified_at` column (TIMESTAMPTZ) - Last modified date of linked document
- Added `link_owner` column (TEXT) - Owner of the linked document
- Added `link_thumbnail_url` column (TEXT) - URL to thumbnail/preview image

### 2. Indexes Created
- `idx_company_files_source_type`: Index on `source_type` and `organization_id` for filtering
- `idx_company_files_link_metadata`: Index on `source_type` and `link_title` for link queries

### 3. Application Changes

#### Interface Update
- Updated `CompanyFile` interface in `src/features/2-8-dashboard/utils/fileTypes.ts`
- Added `source_type: FileSourceType` field ('upload' | 'link')
- Added link metadata fields: `link_title`, `link_description`, `link_modified_at`, `link_owner`, `link_thumbnail_url`
- Updated `file_size` to be nullable (links have no file size)

#### File Upload Modal (FileUploadModal)
- Added toggle between "Upload File" and "Add Link"
- Added URL input field with validation
- Added link metadata extraction (title, description, thumbnail, etc.)
- Validates URL format and verifies accessibility
- Stores link URL in `file_path` field
- Sets `file_size` to NULL for links
- Sets `mime_type` based on link type detection

#### File Table Display (FileRow)
- Shows different icon for links vs uploaded files
- Displays link badge for external links
- Shows "—" for file size when source_type is 'link'
- Displays link title and description if available

#### File Preview Modal (FilePreviewModal)
- Shows thumbnail for links if available
- Displays link metadata (title, description, owner, modified date)
- "Open Link" button instead of "Download" for links
- Opens link in new tab when clicked

#### File Edit Modal (FileEditModal)
- Supports editing link URL
- Re-extracts metadata when URL is changed
- Updates link metadata fields

#### File Operations (useCompanyFiles)
- Delete: Only deletes from storage if source_type is 'upload'
- Download: Opens link in new tab if source_type is 'link'
- Update: Supports updating link URL and metadata

## Link Metadata Extraction

The system extracts metadata from various link types:
- **Google Docs/Sheets/Slides**: Detects document type and extracts title
- **Dropbox**: Generic Dropbox file metadata
- **OneDrive**: Generic OneDrive file metadata
- **Notion**: Notion page metadata
- **Figma**: Figma design file metadata
- **Generic Links**: Attempts to extract page title from HTML

## Usage

### Adding a Link
1. Click "Upload File" button in Company Files page
2. Select "Add Link" toggle
3. Enter link URL (e.g., Google Docs link)
4. System validates URL and extracts metadata
5. Review extracted metadata (title, description, thumbnail)
6. Fill in file name, category, visibility, and description
7. Click "Add Link" to save

### Editing a Link
1. Click "Edit File" on a link row
2. Update link URL if needed (metadata will be re-extracted)
3. Update file name, category, visibility, description
4. Click "Update Link" to save

### Viewing a Link
1. Click "View Details" on a link row
2. Preview shows thumbnail (if available) and link metadata
3. Click "Open Link" to open in new tab

## Database Query Examples

### Get all links
```sql
SELECT * FROM company_files WHERE source_type = 'link';
```

### Get links by organization
```sql
SELECT * FROM company_files 
WHERE organization_id = '...' AND source_type = 'link';
```

### Get links with metadata
```sql
SELECT file_name, link_title, link_description, link_thumbnail_url 
FROM company_files 
WHERE source_type = 'link' AND link_title IS NOT NULL;
```

## Migration Instructions

Run the migration SQL file:
```sql
\i src/integrations/supabase/migrations/add_link_support_to_company_files.sql
```

Or apply via Supabase CLI:
```bash
supabase migration up
```

## Notes

- Existing files will have `source_type = 'upload'` (default)
- Links store the full URL in `file_path` field
- Links have `file_size = NULL` (no file size)
- Link metadata extraction may fail for CORS-protected sites (link can still be saved)
- Thumbnail URLs may not work for all link types (depends on provider API)

