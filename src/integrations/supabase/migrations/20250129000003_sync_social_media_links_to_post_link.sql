-- Migration: Create trigger to sync social_media_links to post_link JSONB in social_media_plans
-- Description: Automatically updates post_link JSONB when social_media_links are inserted/updated/deleted
-- Created: 2025-01-29

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
    -- Note: The trigger completion function expects key (platform) and value->>'social_media_name'
    -- If multiple links have the same platform, the last one will be used (jsonb_object_agg behavior)
    -- This is OK because platform + social_media_name combination should be unique per plan
    SELECT COALESCE(
        jsonb_object_agg(
            platform,
            jsonb_build_object(
                'url', url,
                'social_media_name', social_media_name
            )
        ),
        '{}'::jsonb
    )
    INTO v_post_link
    FROM public.social_media_links
    WHERE social_media_plan_id = v_plan_id
    AND url IS NOT NULL
    AND LENGTH(TRIM(url)) > 0
    AND social_media_name IS NOT NULL
    AND LENGTH(TRIM(social_media_name)) > 0;

    -- Update post_link in social_media_plans
    -- This will trigger the completion check trigger automatically
    UPDATE public.social_media_plans
    SET 
        post_link = v_post_link,
        updated_at = NOW()
    WHERE id = v_plan_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_sync_social_media_links_to_post_link ON public.social_media_links;

-- Create trigger on social_media_links table
CREATE TRIGGER trg_sync_social_media_links_to_post_link
    AFTER INSERT OR UPDATE OR DELETE ON public.social_media_links
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_social_media_links_to_post_link();

-- Add comment for documentation
COMMENT ON FUNCTION public.sync_social_media_links_to_post_link() IS 
'Automatically syncs social_media_links to post_link JSONB in social_media_plans. Format: { "platform": { "url": "...", "social_media_name": "..." } }';
