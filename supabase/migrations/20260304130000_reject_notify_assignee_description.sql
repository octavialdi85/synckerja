-- Reject: assignee gets clear notification — "Submission ditolak", by whom (assigner name), and reason.

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
  v_assigner_name TEXT;
BEGIN
  IF NEW.status NOT IN ('approved', 'rejected') OR OLD.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT e.user_id INTO v_user_id
  FROM public.employees e
  WHERE e.id = NEW.assignee_employee_id
    AND e.user_id IS NOT NULL;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

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

    -- Resolve assigner name for reject message
    SELECT COALESCE(NULLIF(trim(e.full_name), ''), 'Assigner')
    INTO v_assigner_name
    FROM public.employees e
    WHERE e.id = NEW.assigner_employee_id;

    v_assigner_name := COALESCE(v_assigner_name, 'Assigner');

    -- Assignee-oriented: "Submission ditolak" / "Tugas ditolak" etc., then "Ditolak oleh [nama]. Alasan: ..."
    IF NEW.entity_type = 'task' THEN
      v_title := 'Tugas ditolak';
      v_body := format('Ditolak oleh %s.%s',
        v_assigner_name,
        CASE
          WHEN trim(COALESCE(NEW.reject_reason, '')) <> '' THEN
            ' Alasan: ' || left(trim(NEW.reject_reason), 120)
          ELSE
            ''
        END);
    ELSIF NEW.entity_type = 'step' THEN
      v_title := 'Step ditolak';
      v_body := format('Step "%s" pada "%s" ditolak oleh %s.%s',
        COALESCE(v_step_title, 'Step'),
        COALESCE(v_task_title, 'Task'),
        v_assigner_name,
        CASE
          WHEN trim(COALESCE(NEW.reject_reason, '')) <> '' THEN
            ' Alasan: ' || left(trim(NEW.reject_reason), 120)
          ELSE
            ''
        END);
    ELSE
      v_title := 'Sub-step ditolak';
      v_body := format('Sub-step "%s" pada "%s" ditolak oleh %s.%s',
        COALESCE(v_substep_title, 'Sub-step'),
        COALESCE(v_task_title, 'Task'),
        v_assigner_name,
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

DROP TRIGGER IF EXISTS after_completion_approvals_status_notify ON public.completion_approvals;
CREATE TRIGGER after_completion_approvals_status_notify
  AFTER UPDATE OF status ON public.completion_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_completion_approval_notify_assignee();

COMMIT;
