-- Migration: Fix trigger to handle edge cases and prevent JSON errors
-- Description: Updates sync_social_media_links_to_post_link trigger to handle NULL values and edge cases
-- Created: 2025-01-30

CREATE OR REPLACE FUNCTION public.sync_social_media_links_to_post_link()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_id UUID;
    v_post_link JSONB;
BEGIN
    -- Determine plan_id based on trigger operation
    IF TG_OP = 'DELETE' THEN
        v_plan_id := OLD.social_media_plan_id;
    ELSE
        v_plan_id := NEW.social_media_plan_id;
    END IF;

    -- If no plan_id, nothing to do
    IF v_plan_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Aggregate all social_media_links for this plan into JSONB
    -- Format: { "platform": { "url": "...", "social_media_name": "..." } }
    -- Handle NULL values and empty strings properly to prevent JSON errors
    -- Use FILTER clause to ensure we only aggregate valid rows
    SELECT COALESCE(
        jsonb_object_agg(
            platform::text,
            jsonb_build_object(
                'url', COALESCE(url::text, ''),
                'social_media_name', COALESCE(social_media_name::text, '')
            )
        ) FILTER (WHERE platform IS NOT NULL AND url IS NOT NULL AND social_media_name IS NOT NULL),
        '{}'::jsonb
    )
    INTO v_post_link
    FROM public.social_media_links
    WHERE social_media_plan_id = v_plan_id
    AND url IS NOT NULL
    AND LENGTH(TRIM(url)) > 0
    AND social_media_name IS NOT NULL
    AND LENGTH(TRIM(social_media_name)) > 0
    AND platform IS NOT NULL
    AND LENGTH(TRIM(platform)) > 0;

    -- Update post_link in social_media_plans
    -- This will trigger the completion check trigger automatically
    UPDATE public.social_media_plans
    SET 
        post_link = v_post_link,
        updated_at = NOW()
    WHERE id = v_plan_id;

    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the insert
        RAISE WARNING 'Error in sync_social_media_links_to_post_link: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION public.sync_social_media_links_to_post_link() IS 
'Automatically syncs social_media_links to post_link JSONB in social_media_plans. Format: { "platform": { "url": "...", "social_media_name": "..." } }. Handles NULL values and edge cases to prevent JSON errors.';

