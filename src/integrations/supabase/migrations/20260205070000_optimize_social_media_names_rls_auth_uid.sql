-- Optimize RLS: use (select auth.uid()) so it's evaluated once per query, not per row
DROP POLICY IF EXISTS "Users can view social media names from their organization" ON public.social_media_names;
DROP POLICY IF EXISTS "Users can insert social media names for their organization" ON public.social_media_names;
DROP POLICY IF EXISTS "Users can update social media names from their organization" ON public.social_media_names;
DROP POLICY IF EXISTS "Users can delete social media names from their organization" ON public.social_media_names;

CREATE POLICY "Users can view social media names from their organization"
    ON public.social_media_names FOR SELECT
    USING (
        organization_id = (
            SELECT p.active_organization_id
            FROM profiles p
            WHERE p.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can insert social media names for their organization"
    ON public.social_media_names FOR INSERT
    WITH CHECK (
        organization_id = (
            SELECT p.active_organization_id
            FROM profiles p
            WHERE p.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can update social media names from their organization"
    ON public.social_media_names FOR UPDATE
    USING (
        organization_id = (
            SELECT p.active_organization_id
            FROM profiles p
            WHERE p.user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        organization_id = (
            SELECT p.active_organization_id
            FROM profiles p
            WHERE p.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can delete social media names from their organization"
    ON public.social_media_names FOR DELETE
    USING (
        organization_id = (
            SELECT p.active_organization_id
            FROM profiles p
            WHERE p.user_id = (SELECT auth.uid())
        )
    );
