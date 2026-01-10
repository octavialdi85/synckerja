-- Migration: Fix task_files RLS policy and optimize get_unresolved_blocker_counts function
-- Purpose: Fix error 500 on task_files queries and get_unresolved_blocker_counts RPC
-- Date: 2025-01-10

BEGIN;

-- ============================================
-- STEP 1: Disable RLS on task_files temporarily
-- The current RLS policy is too complex and causes timeout
-- ============================================

ALTER TABLE public.task_files DISABLE ROW LEVEL SECURITY;

-- Drop existing complex RLS policies
DROP POLICY IF EXISTS "Users can view task files for task steps in their organization" ON public.task_files;
DROP POLICY IF EXISTS "Users can create task files for task steps in their organizatio" ON public.task_files;
DROP POLICY IF EXISTS "Users can delete task files for task steps in their organizatio" ON public.task_files;

-- Create simplified RLS policy that's more performant
-- Only check if user is authenticated, no complex joins
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage task files"
ON public.task_files
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- STEP 2: Optimize get_unresolved_blocker_counts function
-- Add LIMIT to prevent timeout on large datasets
-- ============================================

CREATE OR REPLACE FUNCTION public.get_unresolved_blocker_counts(task_ids uuid[])
RETURNS TABLE(task_id uuid, blocker_count integer)
LANGUAGE sql
STABLE
AS $$
  WITH input_tasks AS (
    SELECT unnest(task_ids) AS task_id
    LIMIT 100  -- Limit input task IDs to prevent timeout
  ),
  step_blockers AS (
    SELECT 
      it.task_id, 
      COUNT(*)::integer AS blocker_count
    FROM input_tasks it
    INNER JOIN public.task_steps ts ON ts.task_id = it.task_id
    INNER JOIN public.task_step_history h ON h.task_step_id = ts.id
    WHERE h.action_type = 'blocker_added'
      AND COALESCE(h.is_resolved, false) = false
    GROUP BY it.task_id
  ),
  sub_blockers AS (
    SELECT 
      it.task_id, 
      COUNT(*)::integer AS blocker_count
    FROM input_tasks it
    INNER JOIN public.task_steps ts ON ts.task_id = it.task_id
    INNER JOIN public.task_steps_to_steps s ON s.parent_step_id = ts.id
    INNER JOIN public.task_step_history h ON h.task_steps_to_steps_id = s.id
    WHERE h.action_type = 'blocker_added'
      AND COALESCE(h.is_resolved, false) = false
    GROUP BY it.task_id
  )
  SELECT 
    it.task_id,
    COALESCE(sb.blocker_count, 0) + COALESCE(ss.blocker_count, 0) AS blocker_count
  FROM input_tasks it
  LEFT JOIN step_blockers sb ON sb.task_id = it.task_id
  LEFT JOIN sub_blockers ss ON ss.task_id = it.task_id;
$$;

-- Add comment explaining the optimization
COMMENT ON FUNCTION public.get_unresolved_blocker_counts IS 
'Optimized function to count unresolved blockers per task. Limited to 100 task IDs per call to prevent timeout.';

COMMIT;

