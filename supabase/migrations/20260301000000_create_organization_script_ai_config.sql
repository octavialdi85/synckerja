-- Create organization_script_ai_config: per-tenant Google Gemini API config for Script Generator
CREATE TABLE IF NOT EXISTS public.organization_script_ai_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    google_ai_api_key TEXT,
    api_key_configured BOOLEAN DEFAULT FALSE,
    daily_limit INTEGER DEFAULT 50,
    model TEXT DEFAULT 'gemini-1.5-flash',
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_organization_script_ai_config UNIQUE (organization_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_script_ai_config_organization_id
    ON public.organization_script_ai_config(organization_id);

ALTER TABLE public.organization_script_ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org script ai config"
    ON public.organization_script_ai_config FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_script_ai_config.organization_id
        )
    );

CREATE POLICY "Users can insert own org script ai config"
    ON public.organization_script_ai_config FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_id
        )
    );

CREATE POLICY "Users can update own org script ai config"
    ON public.organization_script_ai_config FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_script_ai_config.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_id
        )
    );

CREATE POLICY "Users can delete own org script ai config"
    ON public.organization_script_ai_config FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_script_ai_config.organization_id
        )
    );

CREATE OR REPLACE FUNCTION update_organization_script_ai_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_organization_script_ai_config_updated_at ON public.organization_script_ai_config;
CREATE TRIGGER trigger_organization_script_ai_config_updated_at
    BEFORE UPDATE ON public.organization_script_ai_config
    FOR EACH ROW
    EXECUTE FUNCTION update_organization_script_ai_config_updated_at();

COMMENT ON TABLE public.organization_script_ai_config IS 'Per-tenant Google Gemini API config for Script Generator. API key never sent to frontend.';
