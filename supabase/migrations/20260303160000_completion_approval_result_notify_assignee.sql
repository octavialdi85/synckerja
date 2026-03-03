-- Daily task completion result notifications for assignee (e.g. Milda).
-- When assigner (e.g. Octa) approves or rejects a completion_approval,
-- send a clear, short notification to the assignee via daily_task_notifications
-- so push notif can use the same title/body.

BEGIN;

CREATE OR REPLACE FUNCTION public.trigger_completion_approval_notify_assignee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_title TEXT;
  v_body TEXT;
  v_type TEXT;
  v_task_title TEXT;
  v_step_title TEXT;
  v_substep_title TEXT;
BEGIN
  -- Only fire when status changes from pending -> approved/rejected
  IF NEW.status NOT IN ('approved', 'rejected') OR OLD.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  -- Resolve assignee user_id
  SELECT e.user_id INTO v_user_id
  FROM public.employees e
  WHERE e.id = NEW.assignee_employee_id
    AND e.user_id IS NOT NULL;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve titles for task / step / substep
  IF NEW.entity_type = 'task' THEN
    SELECT COALESCE(trim(dt.title), 'Task')
    INTO v_task_title
    FROM public.daily_tasks dt
    WHERE dt.id = NEW.daily_task_id;
  ELSIF NEW.entity_type = 'step' THEN
    SELECT COALESCE(trim(ts.title), 'Step'),
           COALESCE(trim(dt.title), 'Task')
    INTO v_step_title, v_task_title
    FROM public.task_steps ts
    JOIN public.daily_tasks dt ON dt.id = ts.task_id
    WHERE ts.id = NEW.task_step_id;
  ELSIF NEW.entity_type = 'substep' THEN
    SELECT COALESCE(trim(tsts.title), 'Sub-step'),
           COALESCE(trim(ts.title), 'Step'),
           COALESCE(trim(dt.title), 'Task')
    INTO v_substep_title, v_step_title, v_task_title
    FROM public.task_steps_to_steps tsts
    JOIN public.task_steps ts ON ts.id = tsts.parent_step_id
    JOIN public.daily_tasks dt ON dt.id = ts.task_id
    WHERE tsts.id = NEW.task_steps_to_steps_id;
  END IF;

  -- Build short, clear messages based on entity_type and status
  IF NEW.status = 'approved' THEN
    v_type := 'approval_approved';

    IF NEW.entity_type = 'task' THEN
      v_title := 'Tugas disetujui';
      v_body := format('"%s" telah disetujui.', COALESCE(v_task_title, 'Task'));
    ELSIF NEW.entity_type = 'step' THEN
      v_title := 'Step disetujui';
      v_body := format('Step "%s" pada "%s" telah disetujui.',
        COALESCE(v_step_title, 'Step'),
        COALESCE(v_task_title, 'Task'));
    ELSE
      v_title := 'Sub-step disetujui';
      v_body := format('Sub-step "%s" pada "%s" telah disetujui.',
        COALESCE(v_substep_title, 'Sub-step'),
        COALESCE(v_task_title, 'Task'));
    END IF;

  ELSE
    v_type := 'approval_rejected';
    -- Singkat, tapi sertakan alasan bila ada (dipotong 120 karakter)
    IF NEW.entity_type = 'task' THEN
      v_title := 'Tugas direvisi';
      v_body := format('"%s" diminta revisi.%s',
        COALESCE(v_task_title, 'Task'),
        CASE
          WHEN trim(COALESCE(NEW.reject_reason, '')) <> '' THEN
            ' Alasan: ' || left(trim(NEW.reject_reason), 120)
          ELSE
            ''
        END);
    ELSIF NEW.entity_type = 'step' THEN
      v_title := 'Step direvisi';
      v_body := format('Step "%s" pada "%s" diminta revisi.%s',
        COALESCE(v_step_title, 'Step'),
        COALESCE(v_task_title, 'Task'),
        CASE
          WHEN trim(COALESCE(NEW.reject_reason, '')) <> '' THEN
            ' Alasan: ' || left(trim(NEW.reject_reason), 120)
          ELSE
            ''
        END);
    ELSE
      v_title := 'Sub-step direvisi';
      v_body := format('Sub-step "%s" pada "%s" diminta revisi.%s',
        COALESCE(v_substep_title, 'Sub-step'),
        COALESCE(v_task_title, 'Task'),
        CASE
          WHEN trim(COALESCE(NEW.reject_reason, '')) <> '' THEN
            ' Alasan: ' || left(trim(NEW.reject_reason), 120)
          ELSE
            ''
        END);
    END IF;
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
    v_user_id,
    NEW.organization_id,
    v_type,
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

-- Re-attach trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS after_completion_approvals_status_notify ON public.completion_approvals;
CREATE TRIGGER after_completion_approvals_status_notify
  AFTER UPDATE OF status ON public.completion_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_completion_approval_notify_assignee();

COMMIT;

