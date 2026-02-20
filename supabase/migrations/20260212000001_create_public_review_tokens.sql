-- Public review tokens: map shareable token to (social_media_plan_id, link_url) for unauthenticated review/QC
CREATE TABLE IF NOT EXISTS public.public_review_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL,
    social_media_plan_id UUID NOT NULL REFERENCES public.social_media_plans(id) ON DELETE CASCADE,
    link_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_public_review_tokens_token ON public.public_review_tokens(token);
CREATE INDEX IF NOT EXISTS idx_public_review_tokens_plan_link ON public.public_review_tokens(social_media_plan_id, link_url);

ALTER TABLE public.public_review_tokens ENABLE ROW LEVEL SECURITY;

-- Only users with access to the plan's organization can manage tokens
CREATE POLICY "Users can view tokens for their organization plans"
    ON public.public_review_tokens FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.social_media_plans smp
            JOIN public.profiles p ON p.user_id = (SELECT auth.uid())
            WHERE smp.id = public_review_tokens.social_media_plan_id
              AND p.active_organization_id IS NOT NULL
              AND smp.organization_id = p.active_organization_id
        )
    );

CREATE POLICY "Users can insert tokens for their organization plans"
    ON public.public_review_tokens FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.social_media_plans smp
            JOIN public.profiles p ON p.user_id = (SELECT auth.uid())
            WHERE smp.id = public_review_tokens.social_media_plan_id
              AND p.active_organization_id IS NOT NULL
              AND smp.organization_id = p.active_organization_id
        )
    );

CREATE POLICY "Users can update tokens for their organization plans"
    ON public.public_review_tokens FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.social_media_plans smp
            JOIN public.profiles p ON p.user_id = (SELECT auth.uid())
            WHERE smp.id = public_review_tokens.social_media_plan_id
              AND p.active_organization_id IS NOT NULL
              AND smp.organization_id = p.active_organization_id
        )
    );

CREATE POLICY "Users can delete tokens for their organization plans"
    ON public.public_review_tokens FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.social_media_plans smp
            JOIN public.profiles p ON p.user_id = (SELECT auth.uid())
            WHERE smp.id = public_review_tokens.social_media_plan_id
              AND p.active_organization_id IS NOT NULL
              AND smp.organization_id = p.active_organization_id
        )
    );

COMMENT ON TABLE public.public_review_tokens IS 'Shareable tokens for public content review; one token maps to one (social_media_plan_id, link_url).';
