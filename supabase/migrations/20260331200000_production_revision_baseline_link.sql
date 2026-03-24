-- Snapshot google_drive_link when entering Request Revision; clear when leaving that status.

ALTER TABLE public.social_media_plans
  ADD COLUMN IF NOT EXISTS production_revision_baseline_link TEXT NULL;

COMMENT ON COLUMN public.social_media_plans.production_revision_baseline_link IS
  'google_drive_link at the moment production_status became Request Revision; used to detect real link change before promoting to Need Review. Cleared when leaving Request Revision.';

CREATE OR REPLACE FUNCTION public.set_production_revision_baseline_link()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Entering Request Revision: record baseline from current row link (after any same-statement updates to google_drive_link).
  IF NEW.production_status = 'Request Revision'
     AND (OLD.production_status IS DISTINCT FROM 'Request Revision') THEN
    NEW.production_revision_baseline_link := NEW.google_drive_link;
    RETURN NEW;
  END IF;

  -- Leaving Request Revision: clear baseline (e.g. promoted to Need Review, Approved, or cleared).
  IF OLD.production_status = 'Request Revision'
     AND NEW.production_status IS DISTINCT FROM 'Request Revision' THEN
    NEW.production_revision_baseline_link := NULL;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_production_revision_baseline_link ON public.social_media_plans;

CREATE TRIGGER trigger_set_production_revision_baseline_link
  BEFORE INSERT OR UPDATE OF production_status, google_drive_link
  ON public.social_media_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_production_revision_baseline_link();

COMMENT ON FUNCTION public.set_production_revision_baseline_link() IS
  'Sets production_revision_baseline_link to google_drive_link when entering Request Revision; clears it when leaving Request Revision.';
