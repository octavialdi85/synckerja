-- Storage RLS for bucket social-media-carousel: allow org members to upload/delete.
-- Path format: {organization_id}/{social_media_plan_id}/{uuid}.jpg
-- Bucket must exist and be public for read (getPublicUrl). No SELECT policy needed for public buckets.

CREATE POLICY "carousel_storage_insert_org"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'social-media-carousel'
  AND (storage.foldername(name))[1] = (
    SELECT active_organization_id::text
    FROM public.profiles
    WHERE user_id = auth.uid() AND active_organization_id IS NOT NULL
    LIMIT 1
  )
);

CREATE POLICY "carousel_storage_delete_org"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'social-media-carousel'
  AND (storage.foldername(name))[1] = (
    SELECT active_organization_id::text
    FROM public.profiles
    WHERE user_id = auth.uid() AND active_organization_id IS NOT NULL
    LIMIT 1
  )
);

-- Allow public read so review page (including anonymous) can load images via getPublicUrl.
CREATE POLICY "carousel_storage_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'social-media-carousel');
