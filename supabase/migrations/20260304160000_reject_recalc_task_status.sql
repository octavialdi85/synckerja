-- When assigner rejects step/substep, uncheck the step then recalc daily_tasks.status
-- so task progress (and status) reflects the unchecked step (e.g. 100% -> 0% when single step rejected).

BEGIN;

CREATE OR REPLACE FUNCTION public.trigger_completion_approval_revert_entity_on_reject()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id UUID;
  v_done INT;
  v_total INT;
  v_progress INT;
  v_current_status TEXT;
  v_new_status TEXT;
BEGIN
  IF NEW.status <> 'rejected' OR OLD.status = 'rejected' THEN
    RETURN NEW;
  END IF;

  IF NEW.entity_type = 'step' AND NEW.task_step_id IS NOT NULL THEN
    SELECT ts.task_id INTO v_task_id FROM public.task_steps ts WHERE ts.id = NEW.task_step_id;
    UPDATE public.task_steps
    SET is_completed = false, completed_at = NULL
    WHERE id = NEW.task_step_id;

    IF v_task_id IS NOT NULL THEN
      SELECT status INTO v_current_status FROM public.daily_tasks WHERE id = v_task_id;
      SELECT COUNT(*) FILTER (WHERE is_completed)::INT, COUNT(*)::INT
      INTO v_done, v_total
      FROM public.task_steps WHERE task_id = v_task_id;
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
        UPDATE public.daily_tasks SET status = v_new_status WHERE id = v_task_id;
      END IF;
    END IF;

  ELSIF NEW.entity_type = 'substep' AND NEW.task_steps_to_steps_id IS NOT NULL THEN
    SELECT ts.task_id INTO v_task_id
    FROM public.task_steps_to_steps tsts
    JOIN public.task_steps ts ON ts.id = tsts.parent_step_id
    WHERE tsts.id = NEW.task_steps_to_steps_id;
    UPDATE public.task_steps_to_steps
    SET is_completed = false
    WHERE id = NEW.task_steps_to_steps_id;

    IF v_task_id IS NOT NULL THEN
      SELECT status INTO v_current_status FROM public.daily_tasks WHERE id = v_task_id;
      SELECT COUNT(*) FILTER (WHERE is_completed)::INT, COUNT(*)::INT
      INTO v_done, v_total
      FROM public.task_steps WHERE task_id = v_task_id;
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
        UPDATE public.daily_tasks SET status = v_new_status WHERE id = v_task_id;
      END IF;
    END IF;

  ELSIF NEW.entity_type = 'task' THEN
    UPDATE public.daily_tasks
    SET status = 'in_progress', finish_date = NULL
    WHERE id = NEW.daily_task_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
