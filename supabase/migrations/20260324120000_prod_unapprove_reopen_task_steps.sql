-- When Prod Approved is turned OFF, linked task steps must uncheck even if the plan still has
-- google_drive_link + production_status = 'Need Review' (same condition as "submitted for review").
-- 1) BEFORE triggers on task_steps / substeps must NOT re-force completion from link+Need Review alone;
--    only production_approved forces completion there (AFTER trigger on social_media_plans still handles submit).
-- 2) AFTER trigger on social_media_plans must reopen steps when production_approved goes TRUE -> FALSE,
--    even when new_auto and old_auto are both true.

CREATE OR REPLACE FUNCTION public.enforce_plan_completion_on_task_steps()
RETURNS TRIGGER AS $$
DECLARE
  plan_record RECORD;
  auto_complete BOOLEAN;
BEGIN
  IF NEW.social_media_plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT production_approved,
         production_approved_date,
         google_drive_link,
         production_status
  INTO plan_record
  FROM public.social_media_plans
  WHERE id = NEW.social_media_plan_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Only prod approval forces completion on row-level updates. Link + Need Review is applied via
  -- sync_task_steps_completion_with_social_media_plan() on the plan row (avoids blocking uncheck on prod unapprove).
  auto_complete := COALESCE(plan_record.production_approved, FALSE);

  IF auto_complete THEN
    NEW.is_completed := TRUE;
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := COALESCE(plan_record.production_approved_date, NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.enforce_plan_completion_on_task_substeps()
RETURNS TRIGGER AS $$
DECLARE
  plan_record RECORD;
  auto_complete BOOLEAN;
BEGIN
  IF NEW.parent_step_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT smp.production_approved,
         smp.production_approved_date,
         smp.google_drive_link,
         smp.production_status
  INTO plan_record
  FROM public.task_steps ts
  JOIN public.social_media_plans smp ON smp.id = ts.social_media_plan_id
  WHERE ts.id = NEW.parent_step_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  auto_complete := COALESCE(plan_record.production_approved, FALSE);

  IF auto_complete THEN
    NEW.is_completed := TRUE;
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := COALESCE(plan_record.production_approved_date, NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.sync_task_steps_completion_with_social_media_plan()
RETURNS TRIGGER AS $$
DECLARE
  new_auto BOOLEAN;
  old_auto BOOLEAN;
BEGIN
  new_auto := public.social_media_plan_auto_completion_active(
    NEW.production_approved,
    NEW.google_drive_link,
    NEW.production_status
  );

  old_auto := public.social_media_plan_auto_completion_active(
    COALESCE(OLD.production_approved, FALSE),
    OLD.google_drive_link,
    OLD.production_status
  );

  -- Prod approval removed: always reopen linked steps (assigner re-review), even if new_auto stays true.
  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.production_approved, FALSE) = TRUE
     AND COALESCE(NEW.production_approved, FALSE) = FALSE
  THEN
    UPDATE public.task_steps ts
    SET
      is_completed = FALSE,
      completed_at = NULL,
      updated_at = NOW()
    WHERE ts.social_media_plan_id = NEW.id;

    UPDATE public.task_steps_to_steps sub
    SET
      is_completed = FALSE,
      completed_at = NULL,
      updated_at = NOW()
    FROM public.task_steps parent
    WHERE parent.social_media_plan_id = NEW.id
      AND sub.parent_step_id = parent.id;

  ELSIF new_auto AND NOT old_auto THEN
    UPDATE public.task_steps ts
    SET
      is_completed = TRUE,
      completed_at = COALESCE(ts.completed_at, NEW.production_approved_date, NOW()),
      updated_at = NOW()
    WHERE ts.social_media_plan_id = NEW.id;

    UPDATE public.task_steps_to_steps sub
    SET
      is_completed = TRUE,
      completed_at = COALESCE(sub.completed_at, NEW.production_approved_date, NOW()),
      updated_at = NOW()
    FROM public.task_steps parent
    WHERE parent.social_media_plan_id = NEW.id
      AND sub.parent_step_id = parent.id;

  ELSIF old_auto AND NOT new_auto THEN
    UPDATE public.task_steps ts
    SET
      is_completed = FALSE,
      completed_at = NULL,
      updated_at = NOW()
    WHERE ts.social_media_plan_id = NEW.id;

    UPDATE public.task_steps_to_steps sub
    SET
      is_completed = FALSE,
      completed_at = NULL,
      updated_at = NOW()
    FROM public.task_steps parent
    WHERE parent.social_media_plan_id = NEW.id
      AND sub.parent_step_id = parent.id;

  ELSIF new_auto AND old_auto THEN
    UPDATE public.task_steps ts
    SET
      completed_at = COALESCE(ts.completed_at, NEW.production_approved_date, NOW()),
      updated_at = CASE WHEN ts.completed_at IS NULL THEN NOW() ELSE ts.updated_at END
    WHERE ts.social_media_plan_id = NEW.id
      AND ts.completed_at IS NULL;

    UPDATE public.task_steps_to_steps sub
    SET
      completed_at = COALESCE(sub.completed_at, NEW.production_approved_date, NOW()),
      updated_at = CASE WHEN sub.completed_at IS NULL THEN NOW() ELSE sub.updated_at END
    FROM public.task_steps parent
    WHERE parent.social_media_plan_id = NEW.id
      AND sub.parent_step_id = parent.id
      AND sub.completed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.enforce_plan_completion_on_task_steps() IS
  'Forces task_steps linked to a plan to completed only when production_approved is true. Link+Need Review completion is synced from social_media_plans via sync_task_steps_completion_with_social_media_plan.';

COMMENT ON FUNCTION public.sync_task_steps_completion_with_social_media_plan() IS
  'Syncs linked task step completion with social_media_plans; reopens steps when production_approved goes from true to false.';
