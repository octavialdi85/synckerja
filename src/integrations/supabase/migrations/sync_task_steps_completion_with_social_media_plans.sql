-- Migration: Sync task_steps completion status with social_media_plans production approval
-- Goals:
-- 1. Automatically mark task steps (and sub-steps) complete when either:
--    - production_approved = TRUE, or
--    - google_drive_link is provided AND production_status = 'Need Review'
-- 2. Ensure completed_at timestamps are populated whenever auto-completion fires
-- 3. Reopen all linked steps when the auto-completion condition is no longer met

CREATE OR REPLACE FUNCTION public.social_media_plan_auto_completion_active(
  p_production_approved BOOLEAN,
  p_google_drive_link TEXT,
  p_production_status TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  trimmed_status TEXT := UPPER(TRIM(COALESCE(p_production_status, '')));
  has_drive_link BOOLEAN := p_google_drive_link IS NOT NULL AND LENGTH(TRIM(p_google_drive_link)) > 0;
BEGIN
  RETURN COALESCE(p_production_approved, FALSE)
    OR (has_drive_link AND trimmed_status = 'NEED REVIEW');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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

  auto_complete := public.social_media_plan_auto_completion_active(
    plan_record.production_approved,
    plan_record.google_drive_link,
    plan_record.production_status
  );

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

  auto_complete := public.social_media_plan_auto_completion_active(
    plan_record.production_approved,
    plan_record.google_drive_link,
    plan_record.production_status
  );

  IF auto_complete THEN
    NEW.is_completed := TRUE;
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := COALESCE(plan_record.production_approved_date, NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ab_enforce_plan_completion_on_task_steps ON public.task_steps;
CREATE TRIGGER trigger_ab_enforce_plan_completion_on_task_steps
  BEFORE INSERT OR UPDATE ON public.task_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_plan_completion_on_task_steps();

DROP TRIGGER IF EXISTS trigger_ab_enforce_plan_completion_on_task_substeps ON public.task_steps_to_steps;
CREATE TRIGGER trigger_ab_enforce_plan_completion_on_task_substeps
  BEFORE INSERT OR UPDATE ON public.task_steps_to_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_plan_completion_on_task_substeps();

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

  IF new_auto AND NOT old_auto THEN
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

DROP TRIGGER IF EXISTS trigger_sync_task_steps_completion_with_plan ON public.social_media_plans;
CREATE TRIGGER trigger_sync_task_steps_completion_with_plan
  AFTER UPDATE OF production_approved, production_approved_date, google_drive_link, production_status ON public.social_media_plans
  FOR EACH ROW
  WHEN (
    OLD.production_approved IS DISTINCT FROM NEW.production_approved OR
    OLD.production_approved_date IS DISTINCT FROM NEW.production_approved_date OR
    OLD.google_drive_link IS DISTINCT FROM NEW.google_drive_link OR
    OLD.production_status IS DISTINCT FROM NEW.production_status
  )
  EXECUTE FUNCTION public.sync_task_steps_completion_with_social_media_plan();

-- Initial sync so existing approved / review-ready plans immediately mark their linked steps as completed
WITH auto_plans AS (
  SELECT id, production_approved_date, google_drive_link, production_status, production_approved
  FROM public.social_media_plans
  WHERE public.social_media_plan_auto_completion_active(
    production_approved,
    google_drive_link,
    production_status
  )
)
UPDATE public.task_steps ts
SET
  is_completed = TRUE,
  completed_at = COALESCE(ts.completed_at, ap.production_approved_date, NOW()),
  updated_at = NOW()
FROM auto_plans ap
WHERE ts.social_media_plan_id = ap.id;

WITH auto_plans AS (
  SELECT id, production_approved_date, google_drive_link, production_status, production_approved
  FROM public.social_media_plans
  WHERE public.social_media_plan_auto_completion_active(
    production_approved,
    google_drive_link,
    production_status
  )
)
UPDATE public.task_steps_to_steps sub
SET
  is_completed = TRUE,
  completed_at = COALESCE(sub.completed_at, ap.production_approved_date, NOW()),
  updated_at = NOW()
FROM auto_plans ap, public.task_steps parent
WHERE parent.id = sub.parent_step_id
  AND parent.social_media_plan_id = ap.id;

