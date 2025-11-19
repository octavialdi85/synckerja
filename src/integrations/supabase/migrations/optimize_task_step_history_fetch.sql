BEGIN;

CREATE INDEX IF NOT EXISTS idx_task_step_history_task_step_created_at
  ON public.task_step_history (task_step_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_step_history_sub_step_created_at
  ON public.task_step_history (task_steps_to_steps_id, created_at DESC);

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
  has_steps BOOLEAN := array_length(p_task_step_ids, 1) IS NOT NULL;
  has_sub_steps BOOLEAN := array_length(p_sub_step_ids, 1) IS NOT NULL;
  safe_limit INTEGER := GREATEST(1, COALESCE(p_limit, 50));
  safe_offset INTEGER := GREATEST(0, COALESCE(p_offset, 0));
BEGIN
  IF NOT has_steps AND NOT has_sub_steps THEN
    RETURN;
  END IF;

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
END;
$$;

COMMIT;











