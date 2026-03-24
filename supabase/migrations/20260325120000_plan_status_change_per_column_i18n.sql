-- Plan status notifications: one row per changed column (status, production_status, done).
-- Title + Done labels follow organization language (application_language.is_indonesian; default true).
-- Body: "old → new" line + newline + plan title (social_media_plans.title).
-- Per-INSERT EXCEPTION so a failed row does not roll back the plan UPDATE.
--
-- Mirror copy in frontend: translations.ts keys under push.planStatusChange.*

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

  -- 1) Status column (Content Plan / Rencana konten)
  IF OLD.status IS DISTINCT FROM NEW.status
    AND NEW.status IS NOT NULL
    AND trim(COALESCE(NEW.status::TEXT, '')) <> '' THEN
    v_title := CASE WHEN v_is_indonesian THEN 'Rencana konten' ELSE 'Content Plan' END;
    v_old_val := COALESCE(OLD.status::TEXT, '');
    v_new_val := COALESCE(NEW.status::TEXT, '');
    v_body := v_old_val || ' → ' || v_new_val || chr(10) || v_plan_title;

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
          'status',
          v_old_val,
          v_new_val,
          v_title,
          v_body,
          NULL,
          now()
        );
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'trigger_notify_plan_status_change: skip user % plan % (status): %',
            v_rec.user_id, NEW.id, SQLERRM;
      END;
    END LOOP;
  END IF;

  -- 2) Production status (Content Production / Produksi konten)
  IF OLD.production_status IS DISTINCT FROM NEW.production_status
    AND NEW.production_status IS NOT NULL THEN
    v_title := CASE WHEN v_is_indonesian THEN 'Produksi konten' ELSE 'Content Production' END;
    v_old_val := COALESCE(OLD.production_status::TEXT, '');
    v_new_val := COALESCE(NEW.production_status::TEXT, '');
    v_body := v_old_val || ' → ' || v_new_val || chr(10) || v_plan_title;

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
          'production_status',
          v_old_val,
          v_new_val,
          v_title,
          v_body,
          NULL,
          now()
        );
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'trigger_notify_plan_status_change: skip user % plan % (production_status): %',
            v_rec.user_id, NEW.id, SQLERRM;
      END;
    END LOOP;
  END IF;

  -- 3) Done (Content Post / Posting konten) — semantic labels, not raw boolean
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
          'done',
          v_old_val,
          v_new_val,
          v_title,
          v_body,
          NULL,
          now()
        );
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'trigger_notify_plan_status_change: skip user % plan % (done): %',
            v_rec.user_id, NEW.id, SQLERRM;
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_notify_plan_status_change() IS
  'Inserts one plan_status_change_notifications row per org employee per changed column (status, production_status, done), in that order. Title and Done line use application_language.is_indonesian for the plan org (default Indonesian). Skips status notify if NEW.status null/blank; skips production if NEW.production_status null. Per-row INSERT errors are logged and do not roll back the plan UPDATE. Mirror: translations.ts push.planStatusChange.*';
