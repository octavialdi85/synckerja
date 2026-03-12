-- Digital Asset Characters: reference image from Detect from Image (stored in private bucket)
ALTER TABLE public.digital_asset_characters
ADD COLUMN IF NOT EXISTS reference_image_path TEXT;

COMMENT ON COLUMN public.digital_asset_characters.reference_image_path
IS 'Path in bucket digital-asset-character-images: {organization_id}/{character_id}.{ext}. Used for preview and download in Digital Assets.';

-- Create private bucket for character reference images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('digital-asset-character-images', 'digital-asset-character-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: private bucket, path format {organization_id}/{character_id}.{ext}
-- INSERT: authenticated users can upload only under their active_organization_id
CREATE POLICY "digital_asset_character_images_insert_org"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'digital-asset-character-images'
  AND (storage.foldername(name))[1] = (
    SELECT active_organization_id::text
    FROM public.profiles
    WHERE user_id = auth.uid() AND active_organization_id IS NOT NULL
    LIMIT 1
  )
);

-- SELECT: authenticated users can read only their org's files (for createSignedUrl preview/download)
CREATE POLICY "digital_asset_character_images_select_org"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'digital-asset-character-images'
  AND (storage.foldername(name))[1] = (
    SELECT active_organization_id::text
    FROM public.profiles
    WHERE user_id = auth.uid() AND active_organization_id IS NOT NULL
    LIMIT 1
  )
);

-- DELETE: allow org to remove file (e.g. when replacing or cleaning up)
CREATE POLICY "digital_asset_character_images_delete_org"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'digital-asset-character-images'
  AND (storage.foldername(name))[1] = (
    SELECT active_organization_id::text
    FROM public.profiles
    WHERE user_id = auth.uid() AND active_organization_id IS NOT NULL
    LIMIT 1
  )
);
