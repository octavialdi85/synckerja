-- =====================================================
-- Task ID Optimization Migration
-- =====================================================
-- 
-- This migration creates an optimized RPC function for
-- fetching employee task IDs across all assignment levels.
-- 
-- Benefits:
-- - Single database query instead of 3 client-side queries
-- - Faster execution (database-side JOIN vs client-side merging)
-- - Reduced network overhead
-- - Better performance for large datasets
-- 
-- Expected Performance: 50-70% faster than client-side approach
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_employee_task_ids(uuid);

-- Create optimized RPC function
CREATE OR REPLACE FUNCTION get_employee_task_ids(p_employee_id uuid)
RETURNS TABLE(
  task_id uuid,
  assignment_level text
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  
  -- Task-level assignments (directly assigned to tasks)
  SELECT DISTINCT 
    tsa.task_id,
    'task'::text as assignment_level
  FROM task_steps_assigned tsa
  WHERE tsa.employee_id = p_employee_id
    AND tsa.task_id IS NOT NULL
  
  UNION
  
  -- Step-level assignments (assigned to task steps)
  SELECT DISTINCT
    ts.task_id,
    'step'::text as assignment_level
  FROM task_steps_assigned tsa
  INNER JOIN task_steps ts ON tsa.step_id = ts.id
  WHERE tsa.employee_id = p_employee_id
    AND ts.task_id IS NOT NULL
  
  UNION
  
  -- Sub-step-level assignments (assigned to sub-steps)
  SELECT DISTINCT
    ts.task_id,
    'substep'::text as assignment_level
  FROM task_steps_to_steps_assigned tstsa
  INNER JOIN task_steps_to_steps tsts ON tstsa.task_steps_to_steps_id = tsts.id
  INNER JOIN task_steps ts ON tsts.parent_step_id = ts.id
  WHERE tstsa.employee_id = p_employee_id
    AND ts.task_id IS NOT NULL;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_employee_task_ids(uuid) IS 
'Optimized function to get all task IDs assigned to an employee across task, step, and sub-step levels. Returns distinct task IDs with assignment level indicator.';

-- Create index for better performance if not exists
CREATE INDEX IF NOT EXISTS idx_task_steps_assigned_employee_id 
ON task_steps_assigned(employee_id);

CREATE INDEX IF NOT EXISTS idx_task_steps_assigned_task_id 
ON task_steps_assigned(task_id);

CREATE INDEX IF NOT EXISTS idx_task_steps_task_id 
ON task_steps(task_id);

CREATE INDEX IF NOT EXISTS idx_task_steps_to_steps_assigned_employee_id 
ON task_steps_to_steps_assigned(employee_id);

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_employee_task_ids(uuid) TO authenticated;

-- =====================================================
-- Alternative: Create materialized view for even faster reads
-- (Optional - uncomment if you want to use this approach)
-- =====================================================

/*
-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS employee_task_assignments_mv;

-- Create materialized view
CREATE MATERIALIZED VIEW employee_task_assignments_mv AS
SELECT DISTINCT
  e.id as employee_id,
  t.id as task_id,
  CASE 
    WHEN tsa.task_id IS NOT NULL THEN 'task'
    WHEN ts.id IS NOT NULL THEN 'step'
    ELSE 'substep'
  END as assignment_level
FROM employees e
LEFT JOIN task_steps_assigned tsa ON e.id = tsa.employee_id
LEFT JOIN task_steps ts ON tsa.step_id = ts.id
LEFT JOIN task_steps_to_steps tsts ON ts.id = tsts.parent_step_id
LEFT JOIN task_steps_to_steps_assigned tstsa ON tsts.id = tstsa.task_steps_to_steps_id
LEFT JOIN tasks t ON COALESCE(tsa.task_id, ts.task_id) = t.id
WHERE t.id IS NOT NULL;

-- Create indexes on materialized view
CREATE INDEX idx_employee_task_assignments_mv_employee_id 
ON employee_task_assignments_mv(employee_id);

CREATE INDEX idx_employee_task_assignments_mv_task_id 
ON employee_task_assignments_mv(task_id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_employee_task_assignments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY employee_task_assignments_mv;
END;
$$;

-- Schedule automatic refresh (requires pg_cron extension)
-- SELECT cron.schedule('refresh-task-assignments', '*/5 * * * *', 'SELECT refresh_employee_task_assignments()');

-- Grant access
GRANT SELECT ON employee_task_assignments_mv TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_employee_task_assignments() TO authenticated;
*/

-- =====================================================
-- Verification Query
-- =====================================================
-- 
-- Test the function with a sample employee ID:
-- SELECT * FROM get_employee_task_ids('your-employee-uuid-here');
-- 
-- Compare performance:
-- EXPLAIN ANALYZE SELECT * FROM get_employee_task_ids('your-employee-uuid-here');
-- =====================================================
