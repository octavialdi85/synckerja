-- ============================================
-- FIX RPC FUNCTIONS - Ambiguous Column & Type Mismatch
-- ============================================
-- This migration fixes:
-- 1. "column reference 'task_step_id' is ambiguous" error
-- 2. "Returned type uuid does not match expected type character varying(50) in column 3" error
-- ============================================

BEGIN;

-- FIX 1: Fix get_task_step_history_batch_v2 (ambiguous column reference)
CREATE OR REPLACE FUNCTION public.get_task_step_history_batch_v2(
  p_organization_id UUID,
  p_task_step_ids uuid[] DEFAULT '{}',
  p_sub_step_ids uuid[] DEFAULT '{}',
  p_limit integer DEFAULT 50,
  p_cursor_id UUID DEFAULT NULL,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_key BIGINT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  task_step_id UUID,
  task_steps_to_steps_id UUID,
  action_type TEXT,
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  blocker_type TEXT,
  blocker_severity TEXT,
  brief_type TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  updated_at TIMESTAMPTZ,
  is_resolved BOOLEAN,
  organization_id UUID,
  task_id UUID,
  employee_id UUID,
  cursor_key BIGINT,
  next_cursor_id UUID,
  next_cursor_created_at TIMESTAMPTZ,
  next_cursor_key BIGINT,
  has_more BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  has_steps BOOLEAN := array_length(p_task_step_ids, 1) IS NOT NULL;
  has_sub_steps BOOLEAN := array_length(p_sub_step_ids, 1) IS NOT NULL;
  safe_limit INTEGER := GREATEST(1, LEAST(COALESCE(p_limit, 50), 100));
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  IF NOT has_steps AND NOT has_sub_steps THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH step_history AS (
    SELECT 
      tsh.id,
      tsh.task_step_id,
      tsh.task_steps_to_steps_id,
      tsh.action_type,
      tsh.old_value,
      tsh.new_value,
      tsh.description,
      tsh.blocker_type,
      tsh.blocker_severity,
      tsh.brief_type,
      tsh.created_at,
      tsh.created_by,
      tsh.updated_at,
      tsh.is_resolved,
      tsh.organization_id,
      tsh.task_id,
      tsh.employee_id,
      tsh.cursor_key
    FROM public.task_step_history tsh
    WHERE tsh.organization_id = p_organization_id
      AND has_steps 
      AND tsh.task_step_id = ANY(p_task_step_ids)
      AND (
        p_cursor_key IS NULL
        OR tsh.cursor_key < p_cursor_key
        OR (tsh.cursor_key = p_cursor_key AND tsh.created_at < COALESCE(p_cursor_created_at, '1970-01-01'::TIMESTAMPTZ))
        OR (tsh.cursor_key = p_cursor_key AND tsh.created_at = COALESCE(p_cursor_created_at, '1970-01-01'::TIMESTAMPTZ) AND tsh.id < COALESCE(p_cursor_id, '00000000-0000-0000-0000-000000000000'::UUID))
      )
  ),
  sub_step_history AS (
    SELECT 
      tsh.id,
      tsh.task_step_id,
      tsh.task_steps_to_steps_id,
      tsh.action_type,
      tsh.old_value,
      tsh.new_value,
      tsh.description,
      tsh.blocker_type,
      tsh.blocker_severity,
      tsh.brief_type,
      tsh.created_at,
      tsh.created_by,
      tsh.updated_at,
      tsh.is_resolved,
      tsh.organization_id,
      tsh.task_id,
      tsh.employee_id,
      tsh.cursor_key
    FROM public.task_step_history tsh
    WHERE tsh.organization_id = p_organization_id
      AND has_sub_steps 
      AND tsh.task_steps_to_steps_id = ANY(p_sub_step_ids)
      AND (
        p_cursor_key IS NULL
        OR tsh.cursor_key < p_cursor_key
        OR (tsh.cursor_key = p_cursor_key AND tsh.created_at < COALESCE(p_cursor_created_at, '1970-01-01'::TIMESTAMPTZ))
        OR (tsh.cursor_key = p_cursor_key AND tsh.created_at = COALESCE(p_cursor_created_at, '1970-01-01'::TIMESTAMPTZ) AND tsh.id < COALESCE(p_cursor_id, '00000000-0000-0000-0000-000000000000'::UUID))
      )
  ),
  combined AS (
    SELECT * FROM step_history sh
    UNION ALL
    SELECT 
      ssh.id,
      ssh.task_step_id,
      ssh.task_steps_to_steps_id,
      ssh.action_type,
      ssh.old_value,
      ssh.new_value,
      ssh.description,
      ssh.blocker_type,
      ssh.blocker_severity,
      ssh.brief_type,
      ssh.created_at,
      ssh.created_by,
      ssh.updated_at,
      ssh.is_resolved,
      ssh.organization_id,
      ssh.task_id,
      ssh.employee_id,
      ssh.cursor_key
    FROM sub_step_history ssh
    WHERE ssh.id NOT IN (SELECT sh.id FROM step_history sh)
  ),
  dedup AS (
    SELECT DISTINCT ON (id) *
    FROM combined
    ORDER BY id, created_at DESC NULLS LAST
  ),
  ordered AS (
    SELECT *
    FROM dedup
    ORDER BY COALESCE(cursor_key, 0) DESC, created_at DESC NULLS LAST, id DESC
    LIMIT safe_limit + 1
  ),
  limited AS (
    SELECT *
    FROM ordered
    LIMIT safe_limit
  )
  SELECT 
    l.id,
    l.task_step_id,
    l.task_steps_to_steps_id,
    l.action_type,
    l.old_value,
    l.new_value,
    l.description,
    l.blocker_type,
    l.blocker_severity,
    l.brief_type,
    l.created_at,
    l.created_by,
    l.updated_at,
    l.is_resolved,
    l.organization_id,
    l.task_id,
    l.employee_id,
    l.cursor_key,
    CASE 
      WHEN (SELECT COUNT(*) FROM ordered) > safe_limit 
      THEN (SELECT id FROM ordered ORDER BY COALESCE(cursor_key, 0) DESC, created_at DESC, id DESC OFFSET safe_limit LIMIT 1)
      ELSE NULL
    END AS next_cursor_id,
    CASE 
      WHEN (SELECT COUNT(*) FROM ordered) > safe_limit 
      THEN (SELECT created_at FROM ordered ORDER BY COALESCE(cursor_key, 0) DESC, created_at DESC, id DESC OFFSET safe_limit LIMIT 1)
      ELSE NULL
    END AS next_cursor_created_at,
    CASE 
      WHEN (SELECT COUNT(*) FROM ordered) > safe_limit 
      THEN (SELECT cursor_key FROM ordered ORDER BY COALESCE(cursor_key, 0) DESC, created_at DESC, id DESC OFFSET safe_limit LIMIT 1)
      ELSE NULL
    END AS next_cursor_key,
    (SELECT COUNT(*) FROM ordered) > safe_limit AS has_more
  FROM limited l
  ORDER BY COALESCE(l.cursor_key, 0) DESC, l.created_at DESC NULLS LAST, l.id DESC;
END;
$$;

-- FIX 2: Fix old function wrapper (column order mismatch)
CREATE OR REPLACE FUNCTION public.get_task_step_history_batch(
  p_task_step_ids uuid[] DEFAULT '{}',
  p_sub_step_ids uuid[] DEFAULT '{}',
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS SETOF public.task_step_history
LANGUAGE plpgsql
AS $$
DECLARE
  v_organization_id UUID;
  has_steps BOOLEAN := array_length(p_task_step_ids, 1) IS NOT NULL;
  has_sub_steps BOOLEAN := array_length(p_sub_step_ids, 1) IS NOT NULL;
  safe_limit INTEGER := GREATEST(1, COALESCE(p_limit, 50));
  safe_offset INTEGER := GREATEST(0, COALESCE(p_offset, 0));
BEGIN
  IF NOT has_steps AND NOT has_sub_steps THEN
    RETURN;
  END IF;

  -- Try to get organization_id from first task_step if available
  IF has_steps AND array_length(p_task_step_ids, 1) > 0 THEN
    SELECT dt.organization_id INTO v_organization_id
    FROM public.task_steps ts
    INNER JOIN public.daily_tasks dt ON dt.id = ts.task_id
    WHERE ts.id = p_task_step_ids[1]
    LIMIT 1;
  END IF;
  
  -- If no organization_id found from steps, try from sub-steps
  IF v_organization_id IS NULL AND has_sub_steps AND array_length(p_sub_step_ids, 1) > 0 THEN
    SELECT dt.organization_id INTO v_organization_id
    FROM public.task_steps_to_steps tsts
    INNER JOIN public.task_steps ts ON ts.id = tsts.parent_step_id
    INNER JOIN public.daily_tasks dt ON dt.id = ts.task_id
    WHERE tsts.id = p_sub_step_ids[1]
    LIMIT 1;
  END IF;
  
  -- If organization_id found, use new optimized function
  IF v_organization_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      v2.id,
      v2.task_step_id,
      v2.task_steps_to_steps_id,
      v2.action_type::character varying,
      v2.old_value,
      v2.new_value,
      v2.description,
      v2.blocker_type::character varying,
      v2.blocker_severity::character varying,
      v2.brief_type::character varying,
      v2.created_at,
      v2.created_by,
      v2.updated_at,
      v2.is_resolved,
      v2.organization_id,
      v2.task_id,
      v2.employee_id
    FROM public.get_task_step_history_batch_v2(
      v_organization_id,
      p_task_step_ids,
      p_sub_step_ids,
      safe_limit,
      NULL,
      NULL,
      NULL
    ) v2
    OFFSET safe_offset;
  ELSE
    -- Fallback to old implementation (no org filter)
    RETURN QUERY
    WITH combined AS (
      SELECT *
      FROM public.task_step_history
      WHERE has_steps AND task_step_id = ANY(p_task_step_ids)
      UNION ALL
      SELECT *
      FROM public.task_step_history
      WHERE has_sub_steps AND task_steps_to_steps_id = ANY(p_sub_step_ids)
    ), dedup AS (
      SELECT DISTINCT ON (id) *
      FROM combined
      ORDER BY id, created_at DESC NULLS LAST
    )
    SELECT *
    FROM dedup
    ORDER BY created_at DESC NULLS LAST
    LIMIT safe_limit
    OFFSET safe_offset;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_task_step_history_batch_v2(UUID, uuid[], uuid[], integer, UUID, TIMESTAMPTZ, BIGINT) IS 
'Fixed: Removed ambiguous column references, fixed column order, added proper aliases.';

COMMENT ON FUNCTION public.get_task_step_history_batch(uuid[], uuid[], integer, integer) IS 
'Fixed: Added proper type casting for VARCHAR columns to match table structure.';

COMMIT;

