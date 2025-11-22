# Migration: Add employee_id to company_files

## Overview
This migration adds the `employee_id` column to the `company_files` table to enable efficient filtering of private files by employee while maintaining support for non-employee users (e.g., organization owners).

## Purpose
- Enable efficient filtering of private files by employee
- Support visibility-based access control:
  - **Internal files**: Visible to all members of the organization
  - **Private files**: Visible only to the owner (user_id) or employee (employee_id)

## Changes

### 1. Database Schema
- Added `employee_id` column (nullable UUID) to `company_files` table
- Foreign key reference to `employees(id)` with `ON DELETE SET NULL`
- Multiple indexes for query optimization

### 2. Indexes Created
- `idx_company_files_employee_id`: Index on `employee_id` (partial index for non-null values)
- `idx_company_files_visibility_employee_org`: Composite index for private files by employee
- `idx_company_files_visibility_owner_org`: Composite index for private files by owner (non-employee)
- `idx_company_files_visibility_internal`: Index for internal files by organization

### 3. Application Changes

#### Interface Update
- Updated `CompanyFile` interface in `src/features/2-8-dashboard/utils/fileTypes.ts`
- Added `employee_id?: string | null` field

#### File Upload (FileUploadModal)
- When uploading private files, checks if user is an employee
- If employee exists, stores `employee_id` in database
- If non-employee (owner/guest), `employee_id` remains NULL

#### File Edit (FileEditModal)
- When changing visibility to private, automatically sets `employee_id` if user is an employee
- When changing visibility to internal, sets `employee_id` to NULL

#### File Query (useCompanyFiles)
- Efficiently queries internal and private files separately
- Filters private files based on `owner_id` OR `employee_id`
- Uses indexes for optimal performance

## Query Logic

### Private Files Visibility
- **If user is an employee**: Files are visible if `owner_id = user.id` OR `employee_id = employee.id`
- **If user is not an employee** (owner/guest): Files are visible if `owner_id = user.id` only

### Internal Files Visibility
- All internal files are visible to all members of the organization

## Migration Execution

Run this migration on your Supabase database:

```sql
-- Execute the migration file
\i src/integrations/supabase/migrations/add_employee_id_to_company_files.sql
```

Or execute the SQL directly in Supabase SQL Editor.

## Backward Compatibility

- **Existing files**: Files uploaded before this migration will have `employee_id = NULL`
- **Non-employee users**: Files uploaded by organization owners/guests will have `employee_id = NULL`
- **Query compatibility**: Existing queries continue to work, filtering happens in application layer

## Testing Checklist

- [x] Migration runs successfully without errors
- [x] New private files store `employee_id` correctly when uploaded by employee
- [x] New private files have `employee_id = NULL` when uploaded by non-employee
- [x] Internal files have `employee_id = NULL`
- [x] File query correctly filters private files by employee
- [x] File edit updates `employee_id` when visibility changes
- [x] Indexes improve query performance

## Notes

- `employee_id` is nullable because:
  - Internal files don't need employee_id (visible to all)
  - Non-employee users (owners/guests) may upload files
  - Legacy files may not have employee_id

- File path structure:
  - **Private files**: `{organizationId}/private/{employeeId|userId}/{fileName}`
  - **Internal files**: `{organizationId}/{fileName}`


