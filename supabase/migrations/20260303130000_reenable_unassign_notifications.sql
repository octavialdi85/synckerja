-- Aktifkan kembali notifikasi unassign: orang yang di-unassign (Step/Sub-step) dapat notifikasi.
-- Trigger INSERT ke daily_task_notifications; webhook kirim push ke user tersebut.
CREATE OR REPLACE FUNCTION public.trigger_task_steps_assigned_unassign_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_daily_task_id UUID;
  v_step_title TEXT;
  v_user_id UUID;
BEGIN
  SELECT ts.task_id, dt.organization_id, COALESCE(trim(ts.title), 'Step')
  INTO v_daily_task_id, v_org_id, v_step_title
  FROM public.task_steps ts
  JOIN public.daily_tasks dt ON dt.id = ts.task_id
  WHERE ts.id = OLD.task_step_id;

  IF v_org_id IS NULL OR v_daily_task_id IS NULL THEN
    RETURN OLD;
  END IF;

  SELECT e.user_id INTO v_user_id
  FROM public.employees e
  WHERE e.id = OLD.employee_id AND e.user_id IS NOT NULL;
  IF v_user_id IS NULL THEN
    RETURN OLD;
  END IF;

  INSERT INTO public.daily_task_notifications (
    user_id, organization_id, type, daily_task_id, task_step_id, title, body, read_at, created_at
  ) VALUES (
    v_user_id, v_org_id, 'assignment_removed', v_daily_task_id, OLD.task_step_id,
    'Step unassigned', 'Anda tidak lagi ditugaskan ke step: ' || v_step_title, NULL, now()
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS after_task_steps_assigned_delete_notify ON public.task_steps_assigned;
CREATE TRIGGER after_task_steps_assigned_delete_notify
  AFTER DELETE ON public.task_steps_assigned
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_task_steps_assigned_unassign_notify();

CREATE OR REPLACE FUNCTION public.trigger_task_steps_to_steps_assigned_unassign_notify()
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
BEGIN
  SELECT dt.organization_id, ts.task_id, ts.id, COALESCE(trim(tsts.title), 'Sub-step')
  INTO v_org_id, v_daily_task_id, v_parent_step_id, v_substep_title
  FROM public.task_steps_to_steps tsts
  JOIN public.task_steps ts ON ts.id = tsts.parent_step_id
  JOIN public.daily_tasks dt ON dt.id = ts.task_id
  WHERE tsts.id = OLD.task_steps_to_steps_id;

  IF v_org_id IS NULL OR v_parent_step_id IS NULL THEN
    RETURN OLD;
  END IF;

  SELECT e.user_id INTO v_user_id
  FROM public.employees e
  WHERE e.id = OLD.employee_id AND e.user_id IS NOT NULL;
  IF v_user_id IS NULL THEN
    RETURN OLD;
  END IF;

  INSERT INTO public.daily_task_notifications (
    user_id, organization_id, type, daily_task_id, task_step_id, task_steps_to_steps_id,
    title, body, read_at, created_at
  ) VALUES (
    v_user_id, v_org_id, 'assignment_removed', v_daily_task_id, v_parent_step_id, OLD.task_steps_to_steps_id,
    'Sub-step unassigned', 'Anda tidak lagi ditugaskan ke sub-step: ' || v_substep_title, NULL, now()
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS after_task_steps_to_steps_assigned_delete_notify ON public.task_steps_to_steps_assigned;
CREATE TRIGGER after_task_steps_to_steps_assigned_delete_notify
  AFTER DELETE ON public.task_steps_to_steps_assigned
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_task_steps_to_steps_assigned_unassign_notify();

COMMENT ON FUNCTION public.trigger_task_steps_assigned_unassign_notify() IS 'Notify the assignee when a step is unassigned (DELETE from task_steps_assigned).';
COMMENT ON FUNCTION public.trigger_task_steps_to_steps_assigned_unassign_notify() IS 'Notify the assignee when a sub-step is unassigned (DELETE from task_steps_to_steps_assigned).';
