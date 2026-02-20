-- Optimize RLS: use (select auth.uid()) so it's evaluated once per query, not per row
DROP POLICY IF EXISTS "Users can view social media links from their organization" ON public.social_media_links;
DROP POLICY IF EXISTS "Users can insert social media links for their organization" ON public.social_media_links;
DROP POLICY IF EXISTS "Users can update social media links from their organization" ON public.social_media_links;
DROP POLICY IF EXISTS "Users can delete social media links from their organization" ON public.social_media_links;

CREATE POLICY "Users can view social media links from their organization"
    ON public.social_media_links FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM social_media_plans smp
            WHERE smp.id = social_media_links.social_media_plan_id
              AND smp.organization_id = (
                  SELECT p.active_organization_id
                  FROM profiles p
                  WHERE p.user_id = (SELECT auth.uid())
              )
        )
    );

CREATE POLICY "Users can insert social media links for their organization"
    ON public.social_media_links FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM social_media_plans smp
            WHERE smp.id = social_media_links.social_media_plan_id
              AND smp.organization_id = (
                  SELECT p.active_organization_id
                  FROM profiles p
                  WHERE p.user_id = (SELECT auth.uid())
              )
        )
    );

CREATE POLICY "Users can update social media links from their organization"
    ON public.social_media_links FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM social_media_plans smp
            WHERE smp.id = social_media_links.social_media_plan_id
              AND smp.organization_id = (
                  SELECT p.active_organization_id
                  FROM profiles p
                  WHERE p.user_id = (SELECT auth.uid())
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM social_media_plans smp
            WHERE smp.id = social_media_links.social_media_plan_id
              AND smp.organization_id = (
                  SELECT p.active_organization_id
                  FROM profiles p
                  WHERE p.user_id = (SELECT auth.uid())
              )
        )
    );

CREATE POLICY "Users can delete social media links from their organization"
    ON public.social_media_links FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM social_media_plans smp
            WHERE smp.id = social_media_links.social_media_plan_id
              AND smp.organization_id = (
                  SELECT p.active_organization_id
                  FROM profiles p
                  WHERE p.user_id = (SELECT auth.uid())
              )
        )
    );
