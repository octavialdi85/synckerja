-- Daily task notifications: table, RLS, RPC, triggers on daily_tasks, daily_tasks_assigned,
-- task_steps_assigned, task_steps, task_steps_to_steps, completion_approvals.
-- One row per recipient per event; webhook on INSERT sends FCM.

CREATE TABLE IF NOT EXISTS public.daily_task_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  type TEXT NOT NULL,
  daily_task_id UUID REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  task_step_id UUID REFERENCES public.task_steps(id) ON DELETE CASCADE,
  task_steps_to_steps_id UUID REFERENCES public.task_steps_to_steps(id) ON DELETE CASCADE,
  completion_approval_id UUID REFERENCES public.completion_approvals(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Daily Task update',
  body TEXT NOT NULL DEFAULT '',
  view TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_task_notifications_user_id ON public.daily_task_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_task_notifications_user_read ON public.daily_task_notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_daily_task_notifications_created_at ON public.daily_task_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_task_notifications_organization_id ON public.daily_task_notifications(organization_id);

ALTER TABLE public.daily_task_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily task notifications"
  ON public.daily_task_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own daily task notifications (read_at)"
  ON public.daily_task_notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Org members can insert daily task notifications"
  ON public.daily_task_notifications FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid())
  );

-- RPC: mark as read
CREATE OR REPLACE FUNCTION public.mark_daily_task_notifications_read(notification_ids UUID[] DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF notification_ids IS NULL OR array_length(notification_ids, 1) IS NULL THEN
    UPDATE public.daily_task_notifications
    SET read_at = now()
    WHERE user_id = auth.uid() AND read_at IS NULL;
  ELSE
    UPDATE public.daily_task_notifications
    SET read_at = now()
    WHERE user_id = auth.uid() AND id = ANY(notification_ids);
  END IF;
END;
$$;

-- Trigger 1: daily_tasks UPDATE OF status
CREATE OR REPLACE FUNCTION public.trigger_daily_task_notify_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_title TEXT;
  v_title TEXT := 'Task status updated';
  v_body TEXT;
  v_rec RECORD;
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  v_old_status := COALESCE(OLD.status::TEXT, '');
  v_new_status := COALESCE(NEW.status::TEXT, '');
  v_task_title := COALESCE(trim(NEW.title), 'Task');
  v_body := v_task_title || ': ' || v_old_status || ' → ' || v_new_status;

  FOR v_rec IN
    SELECT DISTINCT e.user_id
    FROM public.daily_tasks_assigned dta
    JOIN public.employees e ON e.id = dta.employee_id AND e.user_id IS NOT NULL
    WHERE dta.daily_task_id = NEW.id
    UNION
    SELECT DISTINCT e.user_id
    FROM public.daily_tasks_assigned dta
    JOIN public.employees e ON e.id = dta.assigned_by AND e.user_id IS NOT NULL
    WHERE dta.daily_task_id = NEW.id
  LOOP
    INSERT INTO public.daily_task_notifications (
      user_id, organization_id, type, daily_task_id, title, body, read_at, created_at
    ) VALUES (
      v_rec.user_id, NEW.organization_id, 'task_status', NEW.id, v_title, v_body, NULL, now()
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_daily_tasks_status_notify ON public.daily_tasks;
CREATE TRIGGER after_daily_tasks_status_notify
  AFTER UPDATE OF status ON public.daily_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_daily_task_notify_status_change();

-- Trigger 2: daily_tasks_assigned INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.trigger_daily_tasks_assigned_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_task_title TEXT;
  v_user_id UUID;
  v_title TEXT;
  v_body TEXT;
  v_type TEXT;
BEGIN
  SELECT dt.organization_id, COALESCE(trim(dt.title), 'Task') INTO v_org_id, v_task_title
  FROM public.daily_tasks dt WHERE dt.id = NEW.daily_task_id;
  IF v_org_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT e.user_id INTO v_user_id
  FROM public.employees e WHERE e.id = NEW.employee_id AND e.user_id IS NOT NULL;
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_type := 'assignment_new';
    v_title := 'Task assigned';
    v_body := 'Anda ditugaskan ke task: ' || v_task_title;
  ELSE
    v_type := 'assignment_updated';
    v_title := 'Assignment updated';
    v_body := 'Assignment task diubah: ' || v_task_title;
  END IF;

  INSERT INTO public.daily_task_notifications (
    user_id, organization_id, type, daily_task_id, title, body, read_at, created_at
  ) VALUES (
    v_user_id, v_org_id, v_type, NEW.daily_task_id, v_title, v_body, NULL, now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS after_daily_tasks_assigned_notify ON public.daily_tasks_assigned;
CREATE TRIGGER after_daily_tasks_assigned_notify
  AFTER INSERT OR UPDATE ON public.daily_tasks_assigned
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_daily_tasks_assigned_notify();

-- Trigger 3: task_steps_assigned INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.trigger_task_steps_assigned_notify()
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
  v_title TEXT;
  v_body TEXT;
  v_type TEXT;
BEGIN
  SELECT ts.task_id, dt.organization_id, COALESCE(trim(ts.title), 'Step')
  INTO v_daily_task_id, v_org_id, v_step_title
  FROM public.task_steps ts
  JOIN public.daily_tasks dt ON dt.id = ts.task_id
  WHERE ts.id = NEW.task_step_id;
  IF v_org_id IS NULL OR v_daily_task_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT e.user_id INTO v_user_id
  FROM public.employees e WHERE e.id = NEW.employee_id AND e.user_id IS NOT NULL;
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_type := 'assignment_new';
    v_title := 'Step assigned';
    v_body := 'Anda ditugaskan ke step: ' || v_step_title;
  ELSE
    v_type := 'assignment_updated';
    v_title := 'Step assignment updated';
    v_body := 'Assignment step diubah: ' || v_step_title;
  END IF;

  INSERT INTO public.daily_task_notifications (
    user_id, organization_id, type, daily_task_id, task_step_id, title, body, read_at, created_at
  ) VALUES (
    v_user_id, v_org_id, v_type, v_daily_task_id, NEW.task_step_id, v_title, v_body, NULL, now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS after_task_steps_assigned_notify ON public.task_steps_assigned;
CREATE TRIGGER after_task_steps_assigned_notify
  AFTER INSERT OR UPDATE ON public.task_steps_assigned
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_task_steps_assigned_notify();

-- Trigger 4: task_steps UPDATE OF is_completed (only when reopened: NEW.is_completed = false)
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

  FOR v_rec IN
    SELECT DISTINCT e.user_id
    FROM public.task_steps_assigned tsa
    JOIN public.employees e ON e.id = tsa.employee_id AND e.user_id IS NOT NULL
    WHERE tsa.task_step_id = NEW.id
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

DROP TRIGGER IF EXISTS after_task_steps_reopened_notify ON public.task_steps;
CREATE TRIGGER after_task_steps_reopened_notify
  AFTER UPDATE OF is_completed ON public.task_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_task_steps_reopened_notify();

-- Trigger 5: task_steps_to_steps UPDATE OF is_completed (only when reopened)
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

  FOR v_rec IN
    SELECT DISTINCT e.user_id
    FROM public.task_steps_to_steps_assigned tstsa
    JOIN public.employees e ON e.id = tstsa.employee_id AND e.user_id IS NOT NULL
    WHERE tstsa.task_steps_to_steps_id = NEW.id
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

DROP TRIGGER IF EXISTS after_task_steps_to_steps_reopened_notify ON public.task_steps_to_steps;
CREATE TRIGGER after_task_steps_to_steps_reopened_notify
  AFTER UPDATE OF is_completed ON public.task_steps_to_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_task_steps_to_steps_reopened_notify();

-- Trigger 6: completion_approvals UPDATE OF status (approved/rejected -> notify assignee)
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
BEGIN
  IF NEW.status NOT IN ('approved', 'rejected') OR OLD.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT e.user_id INTO v_user_id
  FROM public.employees e WHERE e.id = NEW.assignee_employee_id AND e.user_id IS NOT NULL;
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    v_type := 'approval_approved';
    v_title := 'Completion approved';
    v_body := 'Completion disetujui.';
  ELSE
    v_type := 'approval_rejected';
    v_title := 'Completion rejected';
    v_body := 'Completion ditolak.' || CASE WHEN trim(COALESCE(NEW.reject_reason, '')) <> '' THEN ' Alasan: ' || left(trim(NEW.reject_reason), 200) ELSE '' END;
  END IF;

  INSERT INTO public.daily_task_notifications (
    user_id, organization_id, type, daily_task_id, task_step_id, task_steps_to_steps_id,
    completion_approval_id, title, body, read_at, created_at
  ) VALUES (
    v_user_id, NEW.organization_id, v_type, NEW.daily_task_id, NEW.task_step_id, NEW.task_steps_to_steps_id,
    NEW.id, v_title, v_body, NULL, now()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_completion_approvals_status_notify ON public.completion_approvals;
CREATE TRIGGER after_completion_approvals_status_notify
  AFTER UPDATE OF status ON public.completion_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_completion_approval_notify_assignee();

-- Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_task_notifications;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE public.daily_task_notifications IS 'Notifications for daily task events: status change, assignment, step/substep reopened, approval/reject. One row per recipient.';
COMMENT ON FUNCTION public.mark_daily_task_notifications_read(UUID[]) IS 'Mark daily task notifications as read for current user.';
