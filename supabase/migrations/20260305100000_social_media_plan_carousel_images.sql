-- Carousel images for Post/Carousel content types: upload JPG (max 10 per plan), ordered by sort_order.
-- Bucket 'social-media-carousel' must exist (create in Dashboard if needed; public read for review page).

CREATE TABLE IF NOT EXISTS public.social_media_plan_carousel_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_media_plan_id UUID NOT NULL REFERENCES public.social_media_plans(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_carousel_plan_sort UNIQUE (social_media_plan_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_carousel_images_plan_id ON public.social_media_plan_carousel_images(social_media_plan_id);

-- Enforce max 10 images per plan
CREATE OR REPLACE FUNCTION public.check_carousel_images_limit()
RETURNS TRIGGER AS $$
DECLARE
  img_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  SELECT COUNT(*)::INTEGER INTO img_count
  FROM public.social_media_plan_carousel_images
  WHERE social_media_plan_id = NEW.social_media_plan_id;
  IF img_count >= 10 THEN
    RAISE EXCEPTION 'Maximum 10 carousel images per plan.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_carousel_images_limit ON public.social_media_plan_carousel_images;
CREATE TRIGGER trigger_check_carousel_images_limit
  BEFORE INSERT ON public.social_media_plan_carousel_images
  FOR EACH ROW
  EXECUTE FUNCTION public.check_carousel_images_limit();

ALTER TABLE public.social_media_plan_carousel_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carousel_select_org"
  ON public.social_media_plan_carousel_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.social_media_plans smp
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE smp.id = social_media_plan_carousel_images.social_media_plan_id
        AND p.active_organization_id IS NOT NULL
        AND p.active_organization_id = smp.organization_id
    )
  );

CREATE POLICY "carousel_insert_org"
  ON public.social_media_plan_carousel_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.social_media_plans smp
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE smp.id = social_media_plan_carousel_images.social_media_plan_id
        AND p.active_organization_id IS NOT NULL
        AND p.active_organization_id = smp.organization_id
    )
  );

CREATE POLICY "carousel_update_org"
  ON public.social_media_plan_carousel_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.social_media_plans smp
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE smp.id = social_media_plan_carousel_images.social_media_plan_id
        AND p.active_organization_id IS NOT NULL
        AND p.active_organization_id = smp.organization_id
    )
  );

CREATE POLICY "carousel_delete_org"
  ON public.social_media_plan_carousel_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.social_media_plans smp
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE smp.id = social_media_plan_carousel_images.social_media_plan_id
        AND p.active_organization_id IS NOT NULL
        AND p.active_organization_id = smp.organization_id
    )
  );

COMMENT ON TABLE public.social_media_plan_carousel_images IS 'Carousel/preview images (JPG, max 10) for Post/Carousel content types. Order by sort_order.';

-- Allow production_approved and production_status "Need Review" for Post/Carousel when carousel images exist
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

CREATE OR REPLACE FUNCTION public.validate_production_status_with_google_drive_link()
RETURNS TRIGGER AS $$
DECLARE
  ct_name TEXT;
  carousel_count INTEGER;
BEGIN
  IF NEW.production_status = 'Need Review' THEN
    SELECT ct.name INTO ct_name FROM public.content_types ct WHERE ct.id = NEW.content_type_id;
    IF ct_name IN ('Post', 'Carousel') THEN
      SELECT COUNT(*)::INTEGER INTO carousel_count
      FROM public.social_media_plan_carousel_images
      WHERE social_media_plan_id = NEW.id;
      IF carousel_count >= 1 THEN
        RETURN NEW;
      END IF;
    END IF;
    IF NEW.google_drive_link IS NULL OR TRIM(NEW.google_drive_link) = '' THEN
      RAISE EXCEPTION 'Cannot set production_status to "Need Review" when google_drive_link is NULL or EMPTY. For Post/Carousel, add at least one carousel image.';
    END IF;
  END IF;

  IF NEW.production_status = 'Need Review' AND (NEW.google_drive_link IS NULL OR TRIM(NEW.google_drive_link) = '') THEN
    SELECT ct.name INTO ct_name FROM public.content_types ct WHERE ct.id = NEW.content_type_id;
    IF ct_name IN ('Post', 'Carousel') THEN
      SELECT COUNT(*)::INTEGER INTO carousel_count
      FROM public.social_media_plan_carousel_images
      WHERE social_media_plan_id = NEW.id;
      IF carousel_count >= 1 THEN
        RETURN NEW;
      END IF;
    END IF;
    IF (TG_OP = 'UPDATE' AND OLD.production_status = 'Need Review') OR (TG_OP = 'INSERT' AND NEW.production_status = 'Need Review') THEN
      NEW.production_status := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
