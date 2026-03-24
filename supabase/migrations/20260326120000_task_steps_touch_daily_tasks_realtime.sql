-- 1) When a task_step linked to social_media_plan_id has completion fields change, bump parent
--    daily_tasks.updated_at so useTaskRealtime (postgres_changes on daily_tasks) refetches steps
--    for other sessions/users without manual refresh.
-- 2) revert_completion_on_drive_link_removal: also set daily_tasks.updated_at (was status-only).
-- 3) Ensure daily_tasks and task_steps are in supabase_realtime publication (idempotent).

CREATE OR REPLACE FUNCTION public.bump_daily_task_updated_at_from_social_plan_step()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.social_media_plan_id IS NOT NULL
     AND (
       OLD.is_completed IS DISTINCT FROM NEW.is_completed
       OR OLD.completed_at IS DISTINCT FROM NEW.completed_at
     )
  THEN
    UPDATE public.daily_tasks
    SET updated_at = now()
    WHERE id = NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.bump_daily_task_updated_at_from_social_plan_step() IS
  'After UPDATE on task_steps (social-linked): touch parent daily_tasks.updated_at for Realtime-driven Daily Task UI refresh.';

DROP TRIGGER IF EXISTS after_task_steps_social_plan_completion_touch_daily_task ON public.task_steps;
CREATE TRIGGER after_task_steps_social_plan_completion_touch_daily_task
  AFTER UPDATE OF is_completed, completed_at ON public.task_steps
  FOR EACH ROW
  WHEN (
    NEW.social_media_plan_id IS NOT NULL
    AND (
      OLD.is_completed IS DISTINCT FROM NEW.is_completed
      OR OLD.completed_at IS DISTINCT FROM NEW.completed_at
    )
  )
  EXECUTE FUNCTION public.bump_daily_task_updated_at_from_social_plan_step();

-- RPC: include updated_at on parent task (matches client revert path)
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

  UPDATE task_steps
  SET is_completed = false, completed_at = NULL
  WHERE id = v_step_id;

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
    UPDATE daily_tasks
    SET
      status = v_new_status,
      updated_at = NOW()
    WHERE id = v_task_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'step_id', v_step_id, 'task_id', v_task_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.revert_completion_on_drive_link_removal(UUID, UUID, UUID) IS
  'When Google Drive link is removed in Preview: uncomplete linked step, reject pending completion_approval, recalc task status, bump updated_at for Realtime.';

-- Realtime publication (no-op if already added)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_tasks;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_steps;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
