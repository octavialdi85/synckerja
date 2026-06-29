-- Fix: Post/Carousel plans can be production-approved when carousel images exist (no google_drive_link required).
-- The carousel migration updated validate_production_approved_with_google_drive_link() but
-- auto_reset_production_approved_on_link_removal() still blocked approval without a drive link.

CREATE OR REPLACE FUNCTION public.auto_reset_production_approved_on_link_removal()
RETURNS TRIGGER AS $$
DECLARE
  ct_name TEXT;
  carousel_count INTEGER := 0;
  has_carousel_content BOOLEAN := FALSE;
BEGIN
  SELECT ct.name INTO ct_name
  FROM public.content_types ct
  WHERE ct.id = NEW.content_type_id;

  IF ct_name IN ('Post', 'Carousel') AND NEW.id IS NOT NULL THEN
    SELECT COUNT(*)::INTEGER INTO carousel_count
    FROM public.social_media_plan_carousel_images
    WHERE social_media_plan_id = NEW.id;
    has_carousel_content := carousel_count >= 1;
  END IF;

  -- If google_drive_link is being cleared (was non-empty, now empty/null)
  IF TG_OP = 'UPDATE'
     AND (OLD.google_drive_link IS NOT NULL AND TRIM(OLD.google_drive_link) != '')
     AND (NEW.google_drive_link IS NULL OR TRIM(NEW.google_drive_link) = '') THEN
    -- Post/Carousel with carousel images do not depend on the drive link
    IF NOT has_carousel_content THEN
      NEW.production_approved := FALSE;
      NEW.production_approved_date := NULL;
    END IF;
  END IF;

  -- Block approval without drive link unless Post/Carousel has carousel images
  IF NEW.production_approved = TRUE
     AND (NEW.google_drive_link IS NULL OR TRIM(NEW.google_drive_link) = '') THEN
    IF has_carousel_content THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Cannot set production_approved to true when google_drive_link is NULL or EMPTY. For Post/Carousel, add at least one carousel image.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.auto_reset_production_approved_on_link_removal() IS
'Resets production_approved when google_drive_link is removed (unless Post/Carousel still has carousel images). Allows approval without drive link when carousel images exist.';

-- Ensure validate function matches carousel rules (idempotent if already applied)
CREATE OR REPLACE FUNCTION public.validate_production_approved_with_google_drive_link()
RETURNS TRIGGER AS $$
DECLARE
  ct_name TEXT;
  carousel_count INTEGER;
BEGIN
  IF NEW.production_approved = true THEN
    SELECT ct.name INTO ct_name
    FROM public.content_types ct
    WHERE ct.id = NEW.content_type_id;
    IF ct_name IN ('Post', 'Carousel') THEN
      SELECT COUNT(*)::INTEGER INTO carousel_count
      FROM public.social_media_plan_carousel_images
      WHERE social_media_plan_id = NEW.id;
      IF carousel_count >= 1 THEN
        RETURN NEW;
      END IF;
    END IF;
    IF NEW.google_drive_link IS NULL OR TRIM(NEW.google_drive_link) = '' THEN
      RAISE EXCEPTION 'Cannot set production_approved to true when google_drive_link is NULL or EMPTY. For Post/Carousel, add at least one carousel image.';
    END IF;
  END IF;

  IF NEW.production_approved = true AND (NEW.google_drive_link IS NULL OR TRIM(NEW.google_drive_link) = '') THEN
    SELECT ct.name INTO ct_name FROM public.content_types ct WHERE ct.id = NEW.content_type_id;
    IF ct_name IN ('Post', 'Carousel') THEN
      SELECT COUNT(*)::INTEGER INTO carousel_count
      FROM public.social_media_plan_carousel_images
      WHERE social_media_plan_id = NEW.id;
      IF carousel_count >= 1 THEN
        RETURN NEW;
      END IF;
    END IF;
    IF (TG_OP = 'UPDATE' AND OLD.production_approved = true) OR (TG_OP = 'INSERT' AND NEW.production_approved = true) THEN
      RAISE EXCEPTION 'Cannot remove or clear google_drive_link when production_approved is true. For Post/Carousel, keep at least one carousel image.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_production_approved_with_google_drive_link ON public.social_media_plans;
CREATE TRIGGER trigger_validate_production_approved_with_google_drive_link
  BEFORE INSERT OR UPDATE OF production_approved, google_drive_link
  ON public.social_media_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_production_approved_with_google_drive_link();
