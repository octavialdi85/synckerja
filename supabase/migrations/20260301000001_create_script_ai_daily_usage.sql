-- Create script_ai_daily_usage: rate limiting for Script Generator AI (one row per org per day)
CREATE TABLE IF NOT EXISTS public.script_ai_daily_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_script_ai_daily_usage_org_date UNIQUE (organization_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_script_ai_daily_usage_organization_id
    ON public.script_ai_daily_usage(organization_id);

CREATE INDEX IF NOT EXISTS idx_script_ai_daily_usage_org_date
    ON public.script_ai_daily_usage(organization_id, usage_date);

ALTER TABLE public.script_ai_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org script ai usage"
    ON public.script_ai_daily_usage FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = script_ai_daily_usage.organization_id
        )
    );

CREATE POLICY "Users can insert own org script ai usage"
    ON public.script_ai_daily_usage FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_id
        )
    );

CREATE POLICY "Users can update own org script ai usage"
    ON public.script_ai_daily_usage FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = script_ai_daily_usage.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_id
        )
    );

CREATE OR REPLACE FUNCTION update_script_ai_daily_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_script_ai_daily_usage_updated_at ON public.script_ai_daily_usage;
CREATE TRIGGER trigger_script_ai_daily_usage_updated_at
    BEFORE UPDATE ON public.script_ai_daily_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_script_ai_daily_usage_updated_at();

COMMENT ON TABLE public.script_ai_daily_usage IS 'Daily usage count for Script Generator AI rate limiting.';
