-- Migration: Add pending removal columns to employees table
-- Purpose: Enable marking employees for removal when downgrading subscription
-- Date: 2025-02-01
-- 
-- Kolom yang ditambahkan:
-- - pending_removal (BOOLEAN): Menandai employee yang akan dihapus
-- - pending_removal_reason (TEXT): Alasan penghapusan (e.g., "Subscription downgrade")
-- - pending_removal_date (TIMESTAMP): Tanggal kapan employee ditandai untuk dihapus

-- Add pending_removal column (default false)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS pending_removal BOOLEAN DEFAULT FALSE;

-- Add pending_removal_reason column
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS pending_removal_reason TEXT;

-- Add pending_removal_date column
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS pending_removal_date TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries on pending removal employees
CREATE INDEX IF NOT EXISTS idx_employees_pending_removal 
ON employees(organization_id, pending_removal) 
WHERE pending_removal = TRUE;

-- Add index for organization + status + pending_removal queries
CREATE INDEX IF NOT EXISTS idx_employees_org_status_pending 
ON employees(organization_id, status, pending_removal) 
WHERE status = 'active' AND pending_removal = TRUE;

-- Add comments for documentation
COMMENT ON COLUMN employees.pending_removal IS 
'Boolean flag indicating if this employee is marked for removal due to subscription downgrade. Set to TRUE when employee needs to be removed to comply with new member limit.';

COMMENT ON COLUMN employees.pending_removal_reason IS 
'Reason for marking employee for removal. Typically "Subscription downgrade" or similar.';

COMMENT ON COLUMN employees.pending_removal_date IS 
'Timestamp when employee was marked for removal. Used for audit trail and potential cancellation before processing.';


