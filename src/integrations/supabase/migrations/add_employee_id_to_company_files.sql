-- Migration: Add employee_id column to company_files table
-- Purpose: Enable efficient filtering of private files by employee
-- Date: 2024

-- Add employee_id column (nullable, as files can be owned by non-employees like organization owners)
ALTER TABLE company_files 
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Add index for faster filtering by employee_id
CREATE INDEX IF NOT EXISTS idx_company_files_employee_id 
ON company_files(employee_id) 
WHERE employee_id IS NOT NULL;

-- Add composite index for visibility + employee_id + organization_id filtering
-- This optimizes queries that filter by visibility and employee within an organization
CREATE INDEX IF NOT EXISTS idx_company_files_visibility_employee_org 
ON company_files(visibility, employee_id, organization_id) 
WHERE visibility = 'privat';

-- Add composite index for visibility + owner_id + organization_id filtering
-- This optimizes queries for private files owned by non-employee users
CREATE INDEX IF NOT EXISTS idx_company_files_visibility_owner_org 
ON company_files(visibility, owner_id, organization_id) 
WHERE visibility = 'privat';

-- Add index for internal files (visibility = 'internal')
CREATE INDEX IF NOT EXISTS idx_company_files_visibility_internal 
ON company_files(organization_id) 
WHERE visibility = 'internal';

-- Comment on column for documentation
COMMENT ON COLUMN company_files.employee_id IS 
'References employees.id. Set when file visibility is private and uploaded by an employee. NULL for internal files or files uploaded by non-employees (e.g., organization owners).';


