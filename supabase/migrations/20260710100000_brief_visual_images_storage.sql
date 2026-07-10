-- Brief visual reference images (paste into brief table column 2).
-- Path format: {organization_id}/{social_media_plan_id}/{uuid}.{ext}
-- Public bucket so getPublicUrl works in brief modal and public review.

INSERT INTO storage.buckets (id, name, public)
VALUES ('brief-visual-images', 'brief-visual-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "brief_visual_images_insert_org"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brief-visual-images'
  AND (storage.foldername(name))[1] = (
    SELECT active_organization_id::text
    FROM public.profiles
    WHERE user_id = auth.uid() AND active_organization_id IS NOT NULL
    LIMIT 1
  )
);

CREATE POLICY "brief_visual_images_delete_org"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'brief-visual-images'
  AND (storage.foldername(name))[1] = (
    SELECT active_organization_id::text
    FROM public.profiles
    WHERE user_id = auth.uid() AND active_organization_id IS NOT NULL
    LIMIT 1
  )
);

CREATE POLICY "brief_visual_images_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'brief-visual-images');
