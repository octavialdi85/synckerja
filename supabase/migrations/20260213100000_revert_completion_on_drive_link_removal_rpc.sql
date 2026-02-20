-- RPC: Revert step completion and reject pending approval when Google Drive link is removed from Preview.
-- Runs with SECURITY DEFINER so any user who can update the plan can trigger it (RLS on completion_approvals
-- would otherwise block non-assigner from updating the approval row).

CREATE OR REPLACE FUNCTION public.revert_completion_on_drive_link_removal(
  p_organization_id UUID,
  p_social_media_plan_id UUID,
  p_rejected_by_employee_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step_id UUID;
  v_task_id UUID;
  v_done INT;
  v_total INT;
  v_progress INT;
  v_current_status TEXT;
  v_new_status TEXT;
  v_rejected_at TIMESTAMPTZ := NOW();
  v_reject_reason TEXT := 'Link removed from Preview';
BEGIN
  -- 1. Find step linked to plan (prefer Content step, then Concept)
  SELECT id, task_id INTO v_step_id, v_task_id
  FROM task_steps
  WHERE social_media_plan_id = p_social_media_plan_id
    AND is_concept_step = false
  LIMIT 1;

  IF v_step_id IS NULL THEN
    SELECT id, task_id INTO v_step_id, v_task_id
    FROM task_steps
    WHERE social_media_plan_id = p_social_media_plan_id
      AND is_concept_step = true
    LIMIT 1;
  END IF;

  IF v_step_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'message', 'no_linked_step');
  END IF;

  -- 2. Uncomplete the step
  UPDATE task_steps
  SET is_completed = false, completed_at = NULL
  WHERE id = v_step_id;

  -- 3. Reject any pending completion_approval for this step
  UPDATE completion_approvals
  SET
    status = 'rejected',
    rejected_at = v_rejected_at,
    reject_reason = v_reject_reason,
    rejected_by = p_rejected_by_employee_id,
    updated_at = v_rejected_at
  WHERE entity_type = 'step'
    AND task_step_id = v_step_id
    AND status = 'pending';

  -- 4. Recalculate daily_tasks.status from step progress
  SELECT status INTO v_current_status
  FROM daily_tasks
  WHERE id = v_task_id;

  SELECT
    COUNT(*) FILTER (WHERE is_completed)::INT,
    COUNT(*)::INT
  INTO v_done, v_total
  FROM task_steps
  WHERE task_id = v_task_id;

  IF v_total > 0 THEN
    v_progress := ROUND((v_done::NUMERIC / v_total) * 100);
    IF v_current_status = 'cancelled' THEN
      v_new_status := 'cancelled';
    ELSIF v_progress >= 100 THEN
      v_new_status := 'completed';
    ELSIF v_progress <= 0 THEN
      v_new_status := 'pending';
    ELSE
      v_new_status := 'in_progress';
    END IF;
    UPDATE daily_tasks SET status = v_new_status WHERE id = v_task_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'step_id', v_step_id, 'task_id', v_task_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.revert_completion_on_drive_link_removal(UUID, UUID, UUID) IS
  'When Google Drive link is removed in Preview: uncomplete linked step and reject pending completion_approval. Callable by any org user.';
