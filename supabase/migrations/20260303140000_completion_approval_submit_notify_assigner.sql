-- Notify assigner when assignee submits completion (task/step/substep).
-- This creates a row in daily_task_notifications so assigner (e.g. Octa Vialdi)
-- gets a clear notification that the task has been completed and is pending approval.

BEGIN;

CREATE OR REPLACE FUNCTION public.trigger_completion_approval_notify_assigner_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigner_user_id UUID;
  v_org_id UUID;
  v_entity_type TEXT;
  v_task_title TEXT;
  v_step_title TEXT;
  v_substep_title TEXT;
  v_assignee_name TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- Only notify for new pending approvals
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  v_org_id := NEW.organization_id;
  v_entity_type := NEW.entity_type;

  -- Resolve assigner user_id
  SELECT e.user_id
  INTO v_assigner_user_id
  FROM public.employees e
  WHERE e.id = NEW.assigner_employee_id
    AND e.user_id IS NOT NULL;

  IF v_assigner_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve assignee display name (optional, fallback to generic text)
  SELECT COALESCE(NULLIF(trim(e.full_name), ''), 'Assignee')
  INTO v_assignee_name
  FROM public.employees e
  WHERE e.id = NEW.assignee_employee_id;

  -- Resolve titles based on entity type
  IF v_entity_type = 'task' THEN
    SELECT COALESCE(trim(dt.title), 'Task')
    INTO v_task_title
    FROM public.daily_tasks dt
    WHERE dt.id = NEW.daily_task_id;

    v_title := 'Task completed';
    v_body := format(
      '\"%s\" telah ditandai selesai oleh %s dan menunggu approval Anda.',
      COALESCE(v_task_title, 'Task'),
      COALESCE(v_assignee_name, 'assignee')
    );
  ELSIF v_entity_type = 'step' THEN
    SELECT COALESCE(trim(ts.title), 'Step'),
           COALESCE(trim(dt.title), 'Task')
    INTO v_step_title, v_task_title
    FROM public.task_steps ts
    JOIN public.daily_tasks dt ON dt.id = ts.task_id
    WHERE ts.id = NEW.task_step_id;

    v_title := 'Step completed';
    v_body := format(
      'Step \"%s\" pada task \"%s\" telah ditandai selesai oleh %s dan menunggu approval Anda.',
      COALESCE(v_step_title, 'Step'),
      COALESCE(v_task_title, 'Task'),
      COALESCE(v_assignee_name, 'assignee')
    );
  ELSIF v_entity_type = 'substep' THEN
    SELECT COALESCE(trim(tsts.title), 'Sub-step'),
           COALESCE(trim(ts.title), 'Step'),
           COALESCE(trim(dt.title), 'Task')
    INTO v_substep_title, v_step_title, v_task_title
    FROM public.task_steps_to_steps tsts
    JOIN public.task_steps ts ON ts.id = tsts.parent_step_id
    JOIN public.daily_tasks dt ON dt.id = ts.task_id
    WHERE tsts.id = NEW.task_steps_to_steps_id;

    v_title := 'Sub-step completed';
    v_body := format(
      'Sub-step \"%s\" (step \"%s\" pada task \"%s\") telah ditandai selesai oleh %s dan menunggu approval Anda.',
      COALESCE(v_substep_title, 'Sub-step'),
      COALESCE(v_step_title, 'Step'),
      COALESCE(v_task_title, 'Task'),
      COALESCE(v_assignee_name, 'assignee')
    );
  ELSE
    -- Unknown entity type; do not notify
    RETURN NEW;
  END IF;

  INSERT INTO public.daily_task_notifications (
    user_id,
    organization_id,
    type,
    daily_task_id,
    task_step_id,
    task_steps_to_steps_id,
    completion_approval_id,
    title,
    body,
    read_at,
    created_at
  ) VALUES (
    v_assigner_user_id,
    v_org_id,
    'completion_submitted',
    NEW.daily_task_id,
    NEW.task_step_id,
    NEW.task_steps_to_steps_id,
    NEW.id,
    v_title,
    v_body,
    NULL,
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_completion_approvals_insert_notify_assigner ON public.completion_approvals;
CREATE TRIGGER after_completion_approvals_insert_notify_assigner
  AFTER INSERT ON public.completion_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_completion_approval_notify_assigner_on_insert();

COMMIT;

