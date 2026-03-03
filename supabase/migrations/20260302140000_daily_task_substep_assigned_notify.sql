-- Notify only the assigned person when a sub-step is assigned (INSERT/UPDATE on task_steps_to_steps_assigned).
-- Step assignment already notifies only the assignee via trigger_task_steps_assigned_notify.

CREATE OR REPLACE FUNCTION public.trigger_task_steps_to_steps_assigned_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_daily_task_id UUID;
  v_parent_step_id UUID;
  v_substep_title TEXT;
  v_user_id UUID;
  v_title TEXT;
  v_body TEXT;
  v_type TEXT;
BEGIN
  SELECT dt.organization_id, ts.task_id, ts.id, COALESCE(trim(tsts.title), 'Sub-step')
  INTO v_org_id, v_daily_task_id, v_parent_step_id, v_substep_title
  FROM public.task_steps_to_steps tsts
  JOIN public.task_steps ts ON ts.id = tsts.parent_step_id
  JOIN public.daily_tasks dt ON dt.id = ts.task_id
  WHERE tsts.id = NEW.task_steps_to_steps_id;

  IF v_org_id IS NULL OR v_parent_step_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT e.user_id INTO v_user_id
  FROM public.employees e
  WHERE e.id = NEW.employee_id AND e.user_id IS NOT NULL;
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_type := 'assignment_new';
    v_title := 'Sub-step assigned';
    v_body := 'Anda ditugaskan ke sub-step: ' || v_substep_title;
  ELSE
    v_type := 'assignment_updated';
    v_title := 'Sub-step assignment updated';
    v_body := 'Assignment sub-step diubah: ' || v_substep_title;
  END IF;

  INSERT INTO public.daily_task_notifications (
    user_id, organization_id, type, daily_task_id, task_step_id, task_steps_to_steps_id,
    title, body, read_at, created_at
  ) VALUES (
    v_user_id, v_org_id, v_type, v_daily_task_id, v_parent_step_id, NEW.task_steps_to_steps_id,
    v_title, v_body, NULL, now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS after_task_steps_to_steps_assigned_notify ON public.task_steps_to_steps_assigned;
CREATE TRIGGER after_task_steps_to_steps_assigned_notify
  AFTER INSERT OR UPDATE ON public.task_steps_to_steps_assigned
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_task_steps_to_steps_assigned_notify();

COMMENT ON FUNCTION public.trigger_task_steps_to_steps_assigned_notify() IS 'Notify only the assignee when a sub-step is assigned or reassigned.';
