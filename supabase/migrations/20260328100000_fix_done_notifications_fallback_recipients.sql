-- Fix: ensure Content Post (done) notifications are still generated on mobile
-- when recipient filtering results in zero rows (e.g. no assigner relation),
-- and when actor context is missing.

BEGIN;

CREATE OR REPLACE FUNCTION public.trigger_notify_plan_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_title TEXT;
  v_is_indonesian BOOLEAN;
  v_rec RECORD;
  v_title TEXT;
  v_body TEXT;
  v_old_val TEXT;
  v_new_val TEXT;
  v_actor_uid UUID;
  v_actor_emp_id UUID;
  v_assignee_emp_id UUID;
  v_assignee_uid UUID;
  v_is_actor_assignee_col BOOLEAN;
  v_is_actor_assigner BOOLEAN;
  v_done_inserted_count INTEGER := 0;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status
    AND OLD.production_status IS NOT DISTINCT FROM NEW.production_status
    AND OLD.done IS NOT DISTINCT FROM NEW.done THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    (SELECT al.is_indonesian
     FROM public.application_language al
     WHERE al.organization_id = NEW.organization_id
     LIMIT 1),
    true
  ) INTO v_is_indonesian;

  v_plan_title := NULLIF(trim(NEW.title), '');
  IF v_plan_title IS NULL THEN
    v_plan_title := CASE WHEN v_is_indonesian THEN 'Konten' ELSE 'Plan' END;
  END IF;

  v_actor_uid := auth.uid();
  v_actor_emp_id := NULL;
  IF v_actor_uid IS NOT NULL THEN
    SELECT e.id INTO v_actor_emp_id
    FROM public.employees e
    WHERE e.user_id = v_actor_uid
      AND e.organization_id = NEW.organization_id
    LIMIT 1;
  END IF;

  v_is_actor_assigner := FALSE;
  IF v_actor_emp_id IS NOT NULL THEN
    v_is_actor_assigner := EXISTS (
      SELECT 1
      FROM public.task_steps ts
      JOIN public.task_steps_assigned tsa ON tsa.task_step_id = ts.id
      WHERE ts.social_media_plan_id = NEW.id
        AND tsa.assigned_by = v_actor_emp_id
        AND tsa.employee_id IS DISTINCT FROM tsa.assigned_by
    );
  END IF;

  -- 1) Status column (Content Plan)
  IF OLD.status IS DISTINCT FROM NEW.status
    AND NEW.status IS NOT NULL
    AND trim(COALESCE(NEW.status::TEXT, '')) <> '' THEN
    v_title := CASE WHEN v_is_indonesian THEN 'Rencana konten' ELSE 'Content Plan' END;
    v_old_val := COALESCE(OLD.status::TEXT, '');
    v_new_val := COALESCE(NEW.status::TEXT, '');
    v_body := v_old_val || ' → ' || v_new_val || chr(10) || v_plan_title;

    v_assignee_emp_id := NEW.pic_id;
    v_assignee_uid := NULL;
    IF v_assignee_emp_id IS NOT NULL THEN
      SELECT e.user_id INTO v_assignee_uid
      FROM public.employees e
      WHERE e.id = v_assignee_emp_id AND e.user_id IS NOT NULL;
    END IF;

    v_is_actor_assignee_col := (v_actor_emp_id IS NOT NULL AND v_actor_emp_id IS NOT DISTINCT FROM v_assignee_emp_id);

    IF v_is_actor_assignee_col AND v_assignee_emp_id IS NOT NULL THEN
      FOR v_rec IN
        SELECT DISTINCT e2.user_id AS uid
        FROM public.task_steps ts
        JOIN public.task_steps_assigned tsa ON tsa.task_step_id = ts.id
        JOIN public.employees e2 ON e2.id = tsa.assigned_by AND e2.user_id IS NOT NULL
        WHERE ts.social_media_plan_id = NEW.id
          AND tsa.assigned_by IS NOT NULL
          AND tsa.employee_id IS DISTINCT FROM tsa.assigned_by
          AND e2.user_id IS DISTINCT FROM v_actor_uid
      LOOP
        BEGIN
          INSERT INTO public.plan_status_change_notifications (
            user_id, social_media_plan_id, organization_id, plan_title, change_kind,
            old_value, new_value, title, body, read_at, created_at
          ) VALUES (
            v_rec.uid, NEW.id, NEW.organization_id, v_plan_title, 'status',
            v_old_val, v_new_val, v_title, v_body, NULL, now()
          );
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'trigger_notify_plan_status_change: skip user % plan % (status): %',
              v_rec.uid, NEW.id, SQLERRM;
        END;
      END LOOP;
    ELSIF v_is_actor_assigner AND v_assignee_uid IS NOT NULL AND v_assignee_uid IS DISTINCT FROM v_actor_uid THEN
      BEGIN
        INSERT INTO public.plan_status_change_notifications (
          user_id, social_media_plan_id, organization_id, plan_title, change_kind,
          old_value, new_value, title, body, read_at, created_at
        ) VALUES (
          v_assignee_uid, NEW.id, NEW.organization_id, v_plan_title, 'status',
          v_old_val, v_new_val, v_title, v_body, NULL, now()
        );
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'trigger_notify_plan_status_change: skip user % plan % (status assigner path): %',
            v_assignee_uid, NEW.id, SQLERRM;
      END;
    END IF;
  END IF;

  -- 2) Production status
  IF OLD.production_status IS DISTINCT FROM NEW.production_status
    AND NEW.production_status IS NOT NULL THEN
    v_title := CASE WHEN v_is_indonesian THEN 'Produksi konten' ELSE 'Content Production' END;
    v_old_val := COALESCE(OLD.production_status::TEXT, '');
    v_new_val := COALESCE(NEW.production_status::TEXT, '');
    v_body := v_old_val || ' → ' || v_new_val || chr(10) || v_plan_title;

    v_assignee_emp_id := NEW.pic_production_id;
    v_assignee_uid := NULL;
    IF v_assignee_emp_id IS NOT NULL THEN
      SELECT e.user_id INTO v_assignee_uid
      FROM public.employees e
      WHERE e.id = v_assignee_emp_id AND e.user_id IS NOT NULL;
    END IF;

    v_is_actor_assignee_col := (v_actor_emp_id IS NOT NULL AND v_actor_emp_id IS NOT DISTINCT FROM v_assignee_emp_id);

    IF v_is_actor_assignee_col AND v_assignee_emp_id IS NOT NULL THEN
      FOR v_rec IN
        SELECT DISTINCT e2.user_id AS uid
        FROM public.task_steps ts
        JOIN public.task_steps_assigned tsa ON tsa.task_step_id = ts.id
        JOIN public.employees e2 ON e2.id = tsa.assigned_by AND e2.user_id IS NOT NULL
        WHERE ts.social_media_plan_id = NEW.id
          AND tsa.assigned_by IS NOT NULL
          AND tsa.employee_id IS DISTINCT FROM tsa.assigned_by
          AND e2.user_id IS DISTINCT FROM v_actor_uid
      LOOP
        BEGIN
          INSERT INTO public.plan_status_change_notifications (
            user_id, social_media_plan_id, organization_id, plan_title, change_kind,
            old_value, new_value, title, body, read_at, created_at
          ) VALUES (
            v_rec.uid, NEW.id, NEW.organization_id, v_plan_title, 'production_status',
            v_old_val, v_new_val, v_title, v_body, NULL, now()
          );
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'trigger_notify_plan_status_change: skip user % plan % (production_status): %',
              v_rec.uid, NEW.id, SQLERRM;
        END;
      END LOOP;
    ELSIF v_is_actor_assigner AND v_assignee_uid IS NOT NULL AND v_assignee_uid IS DISTINCT FROM v_actor_uid THEN
      BEGIN
        INSERT INTO public.plan_status_change_notifications (
          user_id, social_media_plan_id, organization_id, plan_title, change_kind,
          old_value, new_value, title, body, read_at, created_at
        ) VALUES (
          v_assignee_uid, NEW.id, NEW.organization_id, v_plan_title, 'production_status',
          v_old_val, v_new_val, v_title, v_body, NULL, now()
        );
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'trigger_notify_plan_status_change: skip user % plan % (production_status assigner): %',
            v_assignee_uid, NEW.id, SQLERRM;
      END;
    END IF;
  END IF;

  -- 3) Done (Content Post) — assignee: post_link_created_by, else pic_production_id, else pic_id
  IF OLD.done IS DISTINCT FROM NEW.done THEN
    v_title := CASE WHEN v_is_indonesian THEN 'Posting konten' ELSE 'Content Post' END;
    IF v_is_indonesian THEN
      IF NEW.done = TRUE THEN
        v_body := 'Belum diposting → Sudah diposting' || chr(10) || v_plan_title;
        v_old_val := 'Belum diposting';
        v_new_val := 'Sudah diposting';
      ELSE
        v_body := 'Sudah diposting → Belum diposting' || chr(10) || v_plan_title;
        v_old_val := 'Sudah diposting';
        v_new_val := 'Belum diposting';
      END IF;
    ELSE
      IF NEW.done = TRUE THEN
        v_body := 'Not posted → Posted' || chr(10) || v_plan_title;
        v_old_val := 'Not posted';
        v_new_val := 'Posted';
      ELSE
        v_body := 'Posted → Not posted' || chr(10) || v_plan_title;
        v_old_val := 'Posted';
        v_new_val := 'Not posted';
      END IF;
    END IF;

    v_assignee_emp_id := COALESCE(NEW.post_link_created_by, NEW.pic_production_id, NEW.pic_id);
    v_assignee_uid := NULL;
    IF v_assignee_emp_id IS NOT NULL THEN
      SELECT e.user_id INTO v_assignee_uid
      FROM public.employees e
      WHERE e.id = v_assignee_emp_id AND e.user_id IS NOT NULL;
    END IF;

    v_is_actor_assignee_col := (v_actor_emp_id IS NOT NULL AND v_actor_emp_id IS NOT DISTINCT FROM v_assignee_emp_id);
    v_done_inserted_count := 0;

    IF v_is_actor_assignee_col AND v_assignee_emp_id IS NOT NULL THEN
      FOR v_rec IN
        SELECT DISTINCT e2.user_id AS uid
        FROM public.task_steps ts
        JOIN public.task_steps_assigned tsa ON tsa.task_step_id = ts.id
        JOIN public.employees e2 ON e2.id = tsa.assigned_by AND e2.user_id IS NOT NULL
        WHERE ts.social_media_plan_id = NEW.id
          AND tsa.assigned_by IS NOT NULL
          AND tsa.employee_id IS DISTINCT FROM tsa.assigned_by
          AND e2.user_id IS DISTINCT FROM v_actor_uid
      LOOP
        BEGIN
          INSERT INTO public.plan_status_change_notifications (
            user_id, social_media_plan_id, organization_id, plan_title, change_kind,
            old_value, new_value, title, body, read_at, created_at
          ) VALUES (
            v_rec.uid, NEW.id, NEW.organization_id, v_plan_title, 'done',
            v_old_val, v_new_val, v_title, v_body, NULL, now()
          );
          v_done_inserted_count := v_done_inserted_count + 1;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'trigger_notify_plan_status_change: skip user % plan % (done): %',
              v_rec.uid, NEW.id, SQLERRM;
        END;
      END LOOP;
    ELSIF v_is_actor_assigner AND v_assignee_uid IS NOT NULL AND v_assignee_uid IS DISTINCT FROM v_actor_uid THEN
      BEGIN
        INSERT INTO public.plan_status_change_notifications (
          user_id, social_media_plan_id, organization_id, plan_title, change_kind,
          old_value, new_value, title, body, read_at, created_at
        ) VALUES (
          v_assignee_uid, NEW.id, NEW.organization_id, v_plan_title, 'done',
          v_old_val, v_new_val, v_title, v_body, NULL, now()
        );
        v_done_inserted_count := v_done_inserted_count + 1;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'trigger_notify_plan_status_change: skip user % plan % (done assigner): %',
            v_assignee_uid, NEW.id, SQLERRM;
      END;
    END IF;

    -- Fallback recipient to avoid silent drop when no recipients matched.
    -- Priority: actor user (if available), else assignee user.
    IF v_done_inserted_count = 0 THEN
      IF v_actor_uid IS NOT NULL THEN
        BEGIN
          INSERT INTO public.plan_status_change_notifications (
            user_id, social_media_plan_id, organization_id, plan_title, change_kind,
            old_value, new_value, title, body, read_at, created_at
          ) VALUES (
            v_actor_uid, NEW.id, NEW.organization_id, v_plan_title, 'done',
            v_old_val, v_new_val, v_title, v_body, NULL, now()
          );
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'trigger_notify_plan_status_change: skip fallback actor user % plan % (done): %',
              v_actor_uid, NEW.id, SQLERRM;
        END;
      ELSIF v_assignee_uid IS NOT NULL THEN
        BEGIN
          INSERT INTO public.plan_status_change_notifications (
            user_id, social_media_plan_id, organization_id, plan_title, change_kind,
            old_value, new_value, title, body, read_at, created_at
          ) VALUES (
            v_assignee_uid, NEW.id, NEW.organization_id, v_plan_title, 'done',
            v_old_val, v_new_val, v_title, v_body, NULL, now()
          );
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'trigger_notify_plan_status_change: skip fallback assignee user % plan % (done): %',
              v_assignee_uid, NEW.id, SQLERRM;
        END;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_notify_plan_status_change() IS
  'Plan status/production/done notifications with assigner-assignee policy plus fallback for done change: if no recipient matched, notify actor (or assignee when actor unavailable) so mobile shade and push are still delivered.';

COMMIT;
