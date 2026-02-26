-- Plan status change notifications: table, RLS, RPC, trigger on social_media_plans
-- Notify all org members (employees with user_id) when status, production_status, or done changes.

CREATE TABLE IF NOT EXISTS public.plan_status_change_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  social_media_plan_id UUID NOT NULL REFERENCES public.social_media_plans(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  plan_title TEXT,
  change_kind TEXT,
  old_value TEXT,
  new_value TEXT,
  title TEXT NOT NULL DEFAULT 'Update status',
  body TEXT NOT NULL DEFAULT '',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_status_change_notifications_user_id ON public.plan_status_change_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_status_change_notifications_user_read ON public.plan_status_change_notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_plan_status_change_notifications_created_at ON public.plan_status_change_notifications(created_at DESC);

ALTER TABLE public.plan_status_change_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan status change notifications"
  ON public.plan_status_change_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own plan status change notifications (read_at)"
  ON public.plan_status_change_notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow org members to insert (trigger runs in updater context)
CREATE POLICY "Org members can insert plan status change notifications"
  ON public.plan_status_change_notifications FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid())
  );

-- RPC: mark as read
CREATE OR REPLACE FUNCTION public.mark_plan_status_change_notifications_read(notification_ids UUID[] DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF notification_ids IS NULL OR array_length(notification_ids, 1) IS NULL THEN
    UPDATE public.plan_status_change_notifications
    SET read_at = now()
    WHERE user_id = auth.uid() AND read_at IS NULL;
  ELSE
    UPDATE public.plan_status_change_notifications
    SET read_at = now()
    WHERE user_id = auth.uid() AND id = ANY(notification_ids);
  END IF;
END;
$$;

-- Trigger function: on social_media_plans UPDATE of status, production_status, done
CREATE OR REPLACE FUNCTION public.trigger_notify_plan_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_title TEXT;
  v_parts TEXT[] := '{}';
  v_body TEXT;
  v_title TEXT := 'Update status';
  v_change_kind TEXT := '';
  v_old_val TEXT;
  v_new_val TEXT;
  v_rec RECORD;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status
    AND OLD.production_status IS NOT DISTINCT FROM NEW.production_status
    AND OLD.done IS NOT DISTINCT FROM NEW.done THEN
    RETURN NEW;
  END IF;

  v_plan_title := COALESCE(trim(NEW.title), 'Plan');

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_old_val := COALESCE(OLD.status::TEXT, '');
    v_new_val := COALESCE(NEW.status::TEXT, '');
    v_parts := array_append(v_parts, 'status: ' || v_old_val || ' → ' || v_new_val);
    v_change_kind := coalesce(nullif(trim(v_change_kind), '') || ', ', '') || 'status';
  END IF;

  IF OLD.production_status IS DISTINCT FROM NEW.production_status THEN
    v_old_val := COALESCE(OLD.production_status::TEXT, '');
    v_new_val := COALESCE(NEW.production_status::TEXT, '');
    v_parts := array_append(v_parts, 'production: ' || v_old_val || ' → ' || v_new_val);
    v_change_kind := coalesce(nullif(trim(v_change_kind), '') || ', ', '') || 'production_status';
  END IF;

  IF OLD.done IS DISTINCT FROM NEW.done THEN
    v_old_val := COALESCE(OLD.done::TEXT, '');
    v_new_val := COALESCE(NEW.done::TEXT, '');
    v_parts := array_append(v_parts, 'done: ' || v_old_val || ' → ' || v_new_val);
    v_change_kind := coalesce(nullif(trim(v_change_kind), '') || ', ', '') || 'done';
  END IF;

  v_body := v_plan_title || ': ' || array_to_string(v_parts, '; ');
  v_change_kind := trim(both ',' from v_change_kind);

  FOR v_rec IN
    SELECT DISTINCT e.user_id
    FROM public.employees e
    WHERE e.organization_id = NEW.organization_id
      AND e.user_id IS NOT NULL
  LOOP
    INSERT INTO public.plan_status_change_notifications (
      user_id,
      social_media_plan_id,
      organization_id,
      plan_title,
      change_kind,
      old_value,
      new_value,
      title,
      body,
      read_at,
      created_at
    ) VALUES (
      v_rec.user_id,
      NEW.id,
      NEW.organization_id,
      v_plan_title,
      v_change_kind,
      NULL,
      NULL,
      v_title,
      v_body,
      NULL,
      now()
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_social_media_plans_status_change_notify ON public.social_media_plans;
CREATE TRIGGER after_social_media_plans_status_change_notify
  AFTER UPDATE OF status, production_status, done ON public.social_media_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_plan_status_change();

-- Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_status_change_notifications;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE public.plan_status_change_notifications IS 'Notifications when status, production_status, or done changes on a social media plan; one row per org member.';
COMMENT ON FUNCTION public.mark_plan_status_change_notifications_read(UUID[]) IS 'Mark plan status change notifications as read for current user.';
