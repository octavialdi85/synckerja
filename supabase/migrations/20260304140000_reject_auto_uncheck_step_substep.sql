-- When assigner rejects a completion, automatically uncheck the step/substep/task
-- so the UI shows it as not completed (assignee can redo and resubmit).

BEGIN;

CREATE OR REPLACE FUNCTION public.trigger_completion_approval_revert_entity_on_reject()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only when status changes to rejected
  IF NEW.status <> 'rejected' OR OLD.status = 'rejected' THEN
    RETURN NEW;
  END IF;

  IF NEW.entity_type = 'step' AND NEW.task_step_id IS NOT NULL THEN
    UPDATE public.task_steps
    SET is_completed = false, completed_at = NULL
    WHERE id = NEW.task_step_id;
  ELSIF NEW.entity_type = 'substep' AND NEW.task_steps_to_steps_id IS NOT NULL THEN
    UPDATE public.task_steps_to_steps
    SET is_completed = false
    WHERE id = NEW.task_steps_to_steps_id;
  ELSIF NEW.entity_type = 'task' THEN
    UPDATE public.daily_tasks
    SET status = 'in_progress', finish_date = NULL
    WHERE id = NEW.daily_task_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Run before status_notify trigger (alphabetically) so entity is unchecked first
DROP TRIGGER IF EXISTS after_completion_approvals_revert_entity_on_reject ON public.completion_approvals;
CREATE TRIGGER after_completion_approvals_revert_entity_on_reject
  AFTER UPDATE OF status ON public.completion_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_completion_approval_revert_entity_on_reject();

COMMIT;
