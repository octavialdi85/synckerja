-- WhatsApp Business API config per organization
CREATE TABLE IF NOT EXISTS public.organization_whatsapp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    whatsapp_business_account_id TEXT NOT NULL,
    whatsapp_access_token TEXT NOT NULL,
    verify_token TEXT NOT NULL,
    phone_number_id TEXT,
    display_phone_number TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_org_whatsapp_config UNIQUE (organization_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_whatsapp_config_verify_token
    ON public.organization_whatsapp_config(verify_token)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_organization_whatsapp_config_organization_id
    ON public.organization_whatsapp_config(organization_id);

ALTER TABLE public.organization_whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org whatsapp config"
    ON public.organization_whatsapp_config FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_whatsapp_config.organization_id
        )
    );

CREATE POLICY "Users can insert own org whatsapp config"
    ON public.organization_whatsapp_config FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_id
        )
    );

CREATE POLICY "Users can update own org whatsapp config"
    ON public.organization_whatsapp_config FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_whatsapp_config.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_id
        )
    );

CREATE POLICY "Users can delete own org whatsapp config"
    ON public.organization_whatsapp_config FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_whatsapp_config.organization_id
        )
    );

CREATE OR REPLACE FUNCTION update_organization_whatsapp_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_organization_whatsapp_config_updated_at
    BEFORE UPDATE ON public.organization_whatsapp_config
    FOR EACH ROW
    EXECUTE FUNCTION update_organization_whatsapp_config_updated_at();
