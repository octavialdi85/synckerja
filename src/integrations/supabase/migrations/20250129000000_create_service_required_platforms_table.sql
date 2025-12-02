-- Migration: Create service_required_platforms table
-- Description: Stores required platforms configuration for each service
-- Created: 2025-01-29

CREATE TABLE IF NOT EXISTS public.service_required_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    social_media_name_id UUID REFERENCES public.social_media_names(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    -- Custom platform name if social_media_name_id is null
    custom_platform_name TEXT,
    
    -- Unique constraint: combination of service_id, platform, and social_media_name_id must be unique
    UNIQUE (service_id, platform, social_media_name_id)
);

-- Add constraint after table creation
ALTER TABLE public.service_required_platforms
    ADD CONSTRAINT chk_custom_platform_name_if_null_social_media_name_id
    CHECK (
        (social_media_name_id IS NOT NULL AND custom_platform_name IS NULL) OR
        (social_media_name_id IS NULL AND custom_platform_name IS NOT NULL AND LENGTH(TRIM(custom_platform_name)) > 0)
    );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_service_required_platforms_organization_id 
    ON public.service_required_platforms(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_required_platforms_service_id 
    ON public.service_required_platforms(service_id);
CREATE INDEX IF NOT EXISTS idx_service_required_platforms_is_active 
    ON public.service_required_platforms(is_active) 
    WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.service_required_platforms ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organizations can view their service_required_platforms"
    ON public.service_required_platforms FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.active_organization_id = public.service_required_platforms.organization_id
        )
    );

CREATE POLICY "Organization owners can manage all service_required_platforms"
    ON public.service_required_platforms FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND organization_id = public.service_required_platforms.organization_id 
            AND role = 'owner'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND organization_id = public.service_required_platforms.organization_id 
            AND role = 'owner'
        )
    );

CREATE POLICY "Admins can manage service_required_platforms in their organization"
    ON public.service_required_platforms FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND organization_id = public.service_required_platforms.organization_id 
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND organization_id = public.service_required_platforms.organization_id 
            AND role = 'admin'
        )
    );

-- Add comments for documentation
COMMENT ON TABLE public.service_required_platforms IS 'Stores required platforms configuration for each service. Each service can have multiple required platforms that must be filled before a plan is marked as done.';
COMMENT ON COLUMN public.service_required_platforms.platform IS 'Platform name (e.g., Instagram, Facebook, TikTok). Must match platform in social_media_names if social_media_name_id is set.';
COMMENT ON COLUMN public.service_required_platforms.social_media_name_id IS 'Reference to social_media_names table. If set, platform must match the platform in social_media_names.';
COMMENT ON COLUMN public.service_required_platforms.custom_platform_name IS 'Custom platform name when social_media_name_id is NULL. Used for platforms not in social_media_names table.';
COMMENT ON COLUMN public.service_required_platforms.is_active IS 'Soft delete flag. When FALSE, this required platform is not enforced.';

