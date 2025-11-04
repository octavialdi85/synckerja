-- Optimize Slow Queries - Add Missing Indexes
-- Run this in Supabase SQL Editor to improve query performance

-- ============================================
-- INDEXES FOR task_steps_to_steps
-- ============================================

-- Index for querying by parent_step_id and organization_id (most common query)
CREATE INDEX IF NOT EXISTS idx_task_steps_to_steps_parent_org 
ON task_steps_to_steps (parent_step_id, organization_id);

-- Index for querying uncompleted substeps
CREATE INDEX IF NOT EXISTS idx_task_steps_to_steps_completed 
ON task_steps_to_steps (is_completed, organization_id);

-- ============================================
-- INDEXES FOR task_steps
-- ============================================

-- Index for querying steps by task and completion status
CREATE INDEX IF NOT EXISTS idx_task_steps_task_completed 
ON task_steps (task_id, is_completed);

-- Index for querying steps by organization
CREATE INDEX IF NOT EXISTS idx_task_steps_organization 
ON task_steps (task_id) 
WHERE is_completed = false;

-- ============================================
-- INDEXES FOR task_step_history
-- ============================================

-- Index for querying history by step and action type
CREATE INDEX IF NOT EXISTS idx_task_step_history_step_action 
ON task_step_history (task_step_id, action_type);

-- Index for querying history by substep
CREATE INDEX IF NOT EXISTS idx_task_step_history_substep 
ON task_step_history (task_steps_to_steps_id, action_type);

-- Index for recent history queries
CREATE INDEX IF NOT EXISTS idx_task_step_history_recent 
ON task_step_history (created_at DESC);

-- ============================================
-- INDEXES FOR task_steps_assigned
-- ============================================

-- Index for querying assignments by step
CREATE INDEX IF NOT EXISTS idx_task_steps_assigned_step 
ON task_steps_assigned (task_step_id);

-- Index for querying assignments by employee
CREATE INDEX IF NOT EXISTS idx_task_steps_assigned_employee 
ON task_steps_assigned (employee_id, organization_id);

-- ============================================
-- INDEXES FOR daily_tasks
-- ============================================

-- Index for querying by organization and status
CREATE INDEX IF NOT EXISTS idx_daily_tasks_org_status 
ON daily_tasks (organization_id, status);

-- Index for uncompleted tasks
CREATE INDEX IF NOT EXISTS idx_daily_tasks_active 
ON daily_tasks (organization_id, created_at DESC)
WHERE status != 'completed' AND status != 'cancelled';

-- ============================================
-- VERIFY INDEXES CREATED
-- ============================================

-- Check all indexes on our tables
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('daily_tasks', 'task_steps', 'task_steps_to_steps', 'task_step_history', 'task_steps_assigned')
ORDER BY tablename, indexname;

-- ============================================
-- ANALYZE TABLES (Update statistics)
-- ============================================

ANALYZE daily_tasks;
ANALYZE task_steps;
ANALYZE task_steps_to_steps;
ANALYZE task_step_history;
ANALYZE task_steps_assigned;

-- ============================================
-- CHECK QUERY PERFORMANCE AFTER INDEXES
-- ============================================

-- This will show you if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM task_steps_to_steps
WHERE parent_step_id = (SELECT id FROM task_steps LIMIT 1)
  AND organization_id = (SELECT id FROM organizations LIMIT 1);

-- Expected: Should show "Index Scan" instead of "Seq Scan"






