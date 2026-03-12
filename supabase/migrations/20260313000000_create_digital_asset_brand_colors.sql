-- Digital Assets: brand colors per organization (Settings > Digital Assets > Brand Color)
CREATE TABLE IF NOT EXISTS public.digital_asset_brand_colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT,
    hex_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digital_asset_brand_colors_organization_id
    ON public.digital_asset_brand_colors(organization_id);

ALTER TABLE public.digital_asset_brand_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org digital asset brand colors"
    ON public.digital_asset_brand_colors FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = digital_asset_brand_colors.organization_id
        )
    );

CREATE POLICY "Users can insert own org digital asset brand colors"
    ON public.digital_asset_brand_colors FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_id
        )
    );

CREATE POLICY "Users can update own org digital asset brand colors"
    ON public.digital_asset_brand_colors FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = digital_asset_brand_colors.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_id
        )
    );

CREATE POLICY "Users can delete own org digital asset brand colors"
    ON public.digital_asset_brand_colors FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = digital_asset_brand_colors.organization_id
        )
    );

CREATE OR REPLACE FUNCTION update_digital_asset_brand_colors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_digital_asset_brand_colors_updated_at ON public.digital_asset_brand_colors;
CREATE TRIGGER trigger_digital_asset_brand_colors_updated_at
    BEFORE UPDATE ON public.digital_asset_brand_colors
    FOR EACH ROW
    EXECUTE FUNCTION update_digital_asset_brand_colors_updated_at();

COMMENT ON TABLE public.digital_asset_brand_colors IS 'Digital asset brand colors per organization for Settings > Digital Assets.';
