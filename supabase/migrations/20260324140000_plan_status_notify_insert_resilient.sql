-- Plan status notify: do not abort the social_media_plans UPDATE if one notification INSERT fails
-- (FK, RLS edge case, etc.). Previously any failure rolled back the whole transaction → PATCH 500,
-- production_status stayed "Need Review", but the app could still show a misleading success path.

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
    BEGIN
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
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'trigger_notify_plan_status_change: skip user % plan %: %',
          v_rec.user_id, NEW.id, SQLERRM;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_notify_plan_status_change() IS
  'Inserts plan_status_change_notifications per org employee; per-row errors are logged and do not roll back the plan UPDATE.';
