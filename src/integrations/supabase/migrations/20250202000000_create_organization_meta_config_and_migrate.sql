-- Create organization_meta_config: centralized Meta token + WhatsApp/Facebook/Instagram config per org
CREATE TABLE IF NOT EXISTS public.organization_meta_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    meta_access_token TEXT NOT NULL,
    meta_business_manager_id TEXT,
    whatsapp_business_account_id TEXT NOT NULL DEFAULT '',
    verify_token TEXT NOT NULL DEFAULT '',
    phone_number_id TEXT,
    display_phone_number TEXT,
    whatsapp_business_name TEXT,
    name_status TEXT,
    facebook_page_id TEXT,
    facebook_verify_token TEXT,
    instagram_business_account_id TEXT,
    instagram_verify_token TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_org_meta_config UNIQUE (organization_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_meta_config_verify_token
    ON public.organization_meta_config(verify_token)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_organization_meta_config_organization_id
    ON public.organization_meta_config(organization_id);

ALTER TABLE public.organization_meta_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org meta config"
    ON public.organization_meta_config FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_meta_config.organization_id
        )
    );

CREATE POLICY "Users can insert own org meta config"
    ON public.organization_meta_config FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_id
        )
    );

CREATE POLICY "Users can update own org meta config"
    ON public.organization_meta_config FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_meta_config.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_id
        )
    );

CREATE POLICY "Users can delete own org meta config"
    ON public.organization_meta_config FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_meta_config.organization_id
        )
    );

CREATE OR REPLACE FUNCTION update_organization_meta_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_organization_meta_config_updated_at
    BEFORE UPDATE ON public.organization_meta_config
    FOR EACH ROW
    EXECUTE FUNCTION update_organization_meta_config_updated_at();

-- Copy data from organization_whatsapp_config only if that table exists (existing projects)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organization_whatsapp_config'
  ) THEN
    INSERT INTO public.organization_meta_config (
      id, organization_id, meta_access_token, meta_business_manager_id,
      whatsapp_business_account_id, verify_token, phone_number_id, display_phone_number,
      whatsapp_business_name, name_status, is_active, created_by, created_at, updated_at
    )
    SELECT
      id, organization_id, whatsapp_access_token, NULL,
      COALESCE(whatsapp_business_account_id, ''),
      COALESCE(verify_token, ''),
      phone_number_id, display_phone_number,
      whatsapp_business_name, name_status,
      COALESCE(is_active, TRUE), created_by, created_at, updated_at
    FROM public.organization_whatsapp_config
    ON CONFLICT (organization_id) DO NOTHING;
  END IF;
END $$;
