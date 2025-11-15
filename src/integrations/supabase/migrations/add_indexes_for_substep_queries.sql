-- Migration: Add indexes for sub-step queries optimization
-- Description: Creates indexes to improve performance for sub-step assignment and due_date queries
-- Created: 2025-01-XX
-- Risk Level: Very Low (indexes only improve performance, can be dropped if needed)

BEGIN;

-- Index untuk task_steps_to_steps_assigned (untuk fetch sub-step assignments)
CREATE INDEX IF NOT EXISTS idx_task_steps_to_steps_assigned_org_id 
ON task_steps_to_steps_assigned(organization_id);

CREATE INDEX IF NOT EXISTS idx_task_steps_to_steps_assigned_substep_id 
ON task_steps_to_steps_assigned(task_steps_to_steps_id);

CREATE INDEX IF NOT EXISTS idx_task_steps_to_steps_assigned_employee_id 
ON task_steps_to_steps_assigned(employee_id);

-- Index untuk task_steps_to_steps (untuk fetch all sub-steps dari parent step)
CREATE INDEX IF NOT EXISTS idx_task_steps_to_steps_parent_step_id 
ON task_steps_to_steps(parent_step_id);

-- Index untuk task_steps_assigned_duedate (untuk fetch due_date)
CREATE INDEX IF NOT EXISTS idx_task_steps_assigned_duedate_step_assigned_id 
ON task_steps_assigned_duedate(task_steps_assigned_id);

CREATE INDEX IF NOT EXISTS idx_task_steps_assigned_duedate_substep_assigned_id 
ON task_steps_assigned_duedate(task_steps_to_steps_assigned_id);

CREATE INDEX IF NOT EXISTS idx_task_steps_assigned_duedate_created_at 
ON task_steps_assigned_duedate(created_at DESC);

-- Composite index untuk query report (organization_id + created_at)
CREATE INDEX IF NOT EXISTS idx_task_steps_assigned_duedate_org_created 
ON task_steps_assigned_duedate(organization_id, created_at DESC)
WHERE organization_id IS NOT NULL;

-- Index untuk task_steps_assigned (untuk trigger performance)
CREATE INDEX IF NOT EXISTS idx_task_steps_assigned_task_step_id 
ON task_steps_assigned(task_step_id);

COMMIT;

-- Add comments for documentation
COMMENT ON INDEX idx_task_steps_to_steps_assigned_org_id IS 
'Index for filtering sub-step assignments by organization_id';

COMMENT ON INDEX idx_task_steps_to_steps_parent_step_id IS 
'Index for fetching all sub-steps from a parent step (used in report)';

COMMENT ON INDEX idx_task_steps_assigned_duedate_substep_assigned_id IS 
'Index for fetching due_date for sub-step assignments';

