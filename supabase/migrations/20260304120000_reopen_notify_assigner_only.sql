-- Reopen: notify only assigner (not assignee). Assignee is the one who reopens; only assigner needs "ditandai belum selesai".

BEGIN;

CREATE OR REPLACE FUNCTION public.trigger_task_steps_reopened_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_daily_task_id UUID;
  v_step_title TEXT;
  v_rec RECORD;
BEGIN
  IF NEW.is_completed = true THEN
    RETURN NEW;
  END IF;
  IF OLD.is_completed IS NOT DISTINCT FROM NEW.is_completed THEN
    RETURN NEW;
  END IF;

  SELECT ts.task_id, dt.organization_id, COALESCE(trim(ts.title), 'Step')
  INTO v_daily_task_id, v_org_id, v_step_title
  FROM public.task_steps ts
  JOIN public.daily_tasks dt ON dt.id = ts.task_id
  WHERE ts.id = NEW.id;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Notify only assigner(s); assignee is the one who reopened, no need to notify them
  FOR v_rec IN
    SELECT DISTINCT e2.user_id
    FROM public.task_steps_assigned tsa2
    JOIN public.employees e2 ON e2.id = tsa2.assigned_by AND e2.user_id IS NOT NULL
    WHERE tsa2.task_step_id = NEW.id
  LOOP
    INSERT INTO public.daily_task_notifications (
      user_id, organization_id, type, daily_task_id, task_step_id, title, body, read_at, created_at
    ) VALUES (
      v_rec.user_id, v_org_id, 'step_reopened', v_daily_task_id, NEW.id,
      'Step reopened', 'Step ditandai belum selesai: ' || v_step_title, NULL, now()
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_task_steps_to_steps_reopened_notify()
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
  v_rec RECORD;
BEGIN
  IF NEW.is_completed = true THEN
    RETURN NEW;
  END IF;
  IF OLD.is_completed IS NOT DISTINCT FROM NEW.is_completed THEN
    RETURN NEW;
  END IF;

  v_parent_step_id := NEW.parent_step_id;
  v_substep_title := COALESCE(trim(NEW.title), 'Sub-step');

  SELECT ts.task_id, dt.organization_id INTO v_daily_task_id, v_org_id
  FROM public.task_steps ts
  JOIN public.daily_tasks dt ON dt.id = ts.task_id
  WHERE ts.id = v_parent_step_id;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Notify only assigner(s); assignee is the one who reopened
  FOR v_rec IN
    SELECT DISTINCT e2.user_id
    FROM public.task_steps_to_steps_assigned tstsa2
    JOIN public.employees e2 ON e2.id = tstsa2.assigned_by AND e2.user_id IS NOT NULL
    WHERE tstsa2.task_steps_to_steps_id = NEW.id
  LOOP
    INSERT INTO public.daily_task_notifications (
      user_id, organization_id, type, daily_task_id, task_step_id, task_steps_to_steps_id, title, body, read_at, created_at
    ) VALUES (
      v_rec.user_id, v_org_id, 'substep_reopened', v_daily_task_id, v_parent_step_id, NEW.id,
      'Sub-step reopened', 'Sub-step ditandai belum selesai: ' || v_substep_title, NULL, now()
    );
  END LOOP;

  RETURN NEW;
END;
$$;

COMMIT;
