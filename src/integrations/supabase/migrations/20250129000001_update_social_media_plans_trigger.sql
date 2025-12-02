-- Migration: Create trigger function to auto-update done column in social_media_plans
-- Description: Automatically sets done = TRUE when all required platforms have links filled
-- Created: 2025-01-29

CREATE OR REPLACE FUNCTION public.check_social_media_plan_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_service_id UUID;
    v_organization_id UUID;
    required_platforms_count INTEGER;
    filled_platforms_count INTEGER;
    required_platforms_list TEXT[];
    filled_platforms_list TEXT[];
    all_required_met BOOLEAN;
    required_platform TEXT;
    filled_platform TEXT;
    i INTEGER;
BEGIN
    -- Get service_id and organization_id from the plan
    v_service_id := NEW.service_id;
    v_organization_id := NEW.organization_id;

    -- If no service_id, plan cannot be done (unless no required platforms exist)
    IF v_service_id IS NULL THEN
        -- If no required platforms exist for this organization, check if post_link has any content
        SELECT COUNT(*) INTO required_platforms_count
        FROM public.service_required_platforms
        WHERE organization_id = v_organization_id
        AND is_active = TRUE;
        
        IF required_platforms_count = 0 THEN
            -- No required platforms configured, check if post_link has content
            NEW.done := (
                NEW.post_link IS NOT NULL 
                AND jsonb_typeof(NEW.post_link) = 'object' 
                AND jsonb_array_length(jsonb_object_keys(NEW.post_link)) > 0
            );
        ELSE
            NEW.done := FALSE;
        END IF;
        RETURN NEW;
    END IF;

    -- Get the list of required platforms for the service
    -- Format: "platform:social_media_name" or "platform:custom_platform_name"
    SELECT ARRAY_AGG(
        CASE
            WHEN srp.social_media_name_id IS NOT NULL THEN 
                srp.platform || ':' || smn.name
            ELSE 
                srp.platform || ':' || srp.custom_platform_name
        END
        ORDER BY srp.platform, 
            CASE WHEN srp.social_media_name_id IS NOT NULL THEN smn.name ELSE srp.custom_platform_name END
    )
    INTO required_platforms_list
    FROM public.service_required_platforms srp
    LEFT JOIN public.social_media_names smn ON srp.social_media_name_id = smn.id
    WHERE srp.service_id = v_service_id
    AND srp.organization_id = v_organization_id
    AND srp.is_active = TRUE;

    required_platforms_count := COALESCE(ARRAY_LENGTH(required_platforms_list, 1), 0);

    -- If no required platforms are configured, the plan is considered done if post_link is not empty
    IF required_platforms_count = 0 THEN
        NEW.done := (
            NEW.post_link IS NOT NULL 
            AND jsonb_typeof(NEW.post_link) = 'object' 
            AND jsonb_array_length(jsonb_object_keys(NEW.post_link)) > 0
        );
        RETURN NEW;
    END IF;

    -- Get the list of platforms and social media names that have links
    -- Format: "platform:social_media_name" (matching the required format)
    SELECT ARRAY_AGG(key || ':' || (value->>'social_media_name'))
    INTO filled_platforms_list
    FROM jsonb_each(NEW.post_link)
    WHERE value->>'url' IS NOT NULL 
    AND LENGTH(TRIM(value->>'url')) > 0
    AND value->>'social_media_name' IS NOT NULL
    AND LENGTH(TRIM(value->>'social_media_name')) > 0;

    -- If no links are filled, plan is not done
    IF filled_platforms_list IS NULL OR ARRAY_LENGTH(filled_platforms_list, 1) = 0 THEN
        NEW.done := FALSE;
        RETURN NEW;
    END IF;

    -- Check if all required platforms are present in the filled platforms
    all_required_met := TRUE;
    FOR i IN 1..required_platforms_count LOOP
        required_platform := required_platforms_list[i];
        
        -- Check if this required platform exists in filled platforms
        IF NOT (required_platform = ANY(filled_platforms_list)) THEN
            all_required_met := FALSE;
            EXIT;
        END IF;
    END LOOP;

    NEW.done := all_required_met;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_social_media_plan_completion ON public.social_media_plans;

-- Create trigger to automatically check completion when post_link or service_id changes
CREATE TRIGGER trg_social_media_plan_completion
    BEFORE INSERT OR UPDATE OF post_link, service_id ON public.social_media_plans
    FOR EACH ROW
    -- Only run if done is not already TRUE (to avoid re-validation of completed plans)
    WHEN (NEW.done IS FALSE OR NEW.done IS NULL)
    EXECUTE FUNCTION public.check_social_media_plan_completion();

-- Add comment for documentation
COMMENT ON FUNCTION public.check_social_media_plan_completion() IS 
'Automatically sets done = TRUE in social_media_plans when all required platforms (from service_required_platforms) have corresponding links filled in post_link. Only runs for plans where done IS FALSE or NULL.';

