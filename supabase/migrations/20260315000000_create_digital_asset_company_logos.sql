-- Digital Assets: company logos per organization (Settings > Digital Assets > Company Logo)
CREATE TABLE IF NOT EXISTS public.digital_asset_company_logos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    brand_name TEXT,
    logo_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digital_asset_company_logos_organization_id
    ON public.digital_asset_company_logos(organization_id);

ALTER TABLE public.digital_asset_company_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org digital asset company logos"
    ON public.digital_asset_company_logos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = digital_asset_company_logos.organization_id
        )
    );

CREATE POLICY "Users can insert own org digital asset company logos"
    ON public.digital_asset_company_logos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_id
        )
    );

CREATE POLICY "Users can update own org digital asset company logos"
    ON public.digital_asset_company_logos FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = digital_asset_company_logos.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_id
        )
    );

CREATE POLICY "Users can delete own org digital asset company logos"
    ON public.digital_asset_company_logos FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = digital_asset_company_logos.organization_id
        )
    );

CREATE OR REPLACE FUNCTION update_digital_asset_company_logos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_digital_asset_company_logos_updated_at ON public.digital_asset_company_logos;
CREATE TRIGGER trigger_digital_asset_company_logos_updated_at
    BEFORE UPDATE ON public.digital_asset_company_logos
    FOR EACH ROW
    EXECUTE FUNCTION update_digital_asset_company_logos_updated_at();

COMMENT ON TABLE public.digital_asset_company_logos IS 'Digital asset company logos per organization for Settings > Digital Assets.';
COMMENT ON COLUMN public.digital_asset_company_logos.logo_path IS 'Path in bucket digital-asset-company-logos: {organization_id}/{id}.{ext}.';

-- Create private bucket for company logos (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('digital-asset-company-logos', 'digital-asset-company-logos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "digital_asset_company_logos_insert_org"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'digital-asset-company-logos'
  AND (storage.foldername(name))[1] = (
    SELECT active_organization_id::text
    FROM public.profiles
    WHERE user_id = auth.uid() AND active_organization_id IS NOT NULL
    LIMIT 1
  )
);

CREATE POLICY "digital_asset_company_logos_select_org"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'digital-asset-company-logos'
  AND (storage.foldername(name))[1] = (
    SELECT active_organization_id::text
    FROM public.profiles
    WHERE user_id = auth.uid() AND active_organization_id IS NOT NULL
    LIMIT 1
  )
);

CREATE POLICY "digital_asset_company_logos_delete_org"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'digital-asset-company-logos'
  AND (storage.foldername(name))[1] = (
    SELECT active_organization_id::text
    FROM public.profiles
    WHERE user_id = auth.uid() AND active_organization_id IS NOT NULL
    LIMIT 1
  )
);
