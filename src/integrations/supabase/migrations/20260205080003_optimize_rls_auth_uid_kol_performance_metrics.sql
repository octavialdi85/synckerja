-- Optimize RLS: replace auth.uid() with (select auth.uid()) on kol_performance_metrics
DROP POLICY IF EXISTS "Users can manage performance metrics" ON public.kol_performance_metrics;
DROP POLICY IF EXISTS "Org members can manage kol_performance_metrics (WITH CHECK)" ON public.kol_performance_metrics;
DROP POLICY IF EXISTS "Users can manage performance metrics in their organization" ON public.kol_performance_metrics;

CREATE POLICY "Users can manage performance metrics"
    ON public.kol_performance_metrics FOR ALL
    USING (
        content_post_id IN (
            SELECT kol_content_posts.id
            FROM kol_content_posts
            WHERE kol_content_posts.campaign_assignment_id IN (
                SELECT kol_campaign_assignments.id
                FROM kol_campaign_assignments
                WHERE kol_campaign_assignments.campaign_id IN (
                    SELECT kol_campaigns.id
                    FROM kol_campaigns
                    WHERE kol_campaigns.organization_id IN (
                        SELECT user_organizations.organization_id
                        FROM user_organizations
                        WHERE user_organizations.user_id = (SELECT auth.uid())
                          AND user_organizations.is_active = true
                    )
                )
            )
        )
    );

CREATE POLICY "Org members can manage kol_performance_metrics (WITH CHECK)"
    ON public.kol_performance_metrics FOR ALL
    USING (
        content_post_id IN (
            SELECT kol_content_posts.id
            FROM kol_content_posts
            WHERE kol_content_posts.campaign_assignment_id IN (
                SELECT kol_campaign_assignments.id
                FROM kol_campaign_assignments
                WHERE kol_campaign_assignments.campaign_id IN (
                    SELECT kol_campaigns.id
                    FROM kol_campaigns
                    WHERE kol_campaigns.organization_id IN (
                        SELECT user_organizations.organization_id
                        FROM user_organizations
                        WHERE user_organizations.user_id = (SELECT auth.uid())
                          AND user_organizations.is_active = true
                    )
                )
            )
        )
    )
    WITH CHECK (
        content_post_id IN (
            SELECT kol_content_posts.id
            FROM kol_content_posts
            WHERE kol_content_posts.campaign_assignment_id IN (
                SELECT kol_campaign_assignments.id
                FROM kol_campaign_assignments
                WHERE kol_campaign_assignments.campaign_id IN (
                    SELECT kol_campaigns.id
                    FROM kol_campaigns
                    WHERE kol_campaigns.organization_id IN (
                        SELECT user_organizations.organization_id
                        FROM user_organizations
                        WHERE user_organizations.user_id = (SELECT auth.uid())
                          AND user_organizations.is_active = true
                    )
                )
            )
        )
    );

CREATE POLICY "Users can manage performance metrics in their organization"
    ON public.kol_performance_metrics FOR ALL
    USING (
        organization_id IN (
            SELECT user_organizations.organization_id
            FROM user_organizations
            WHERE user_organizations.user_id = (SELECT auth.uid())
              AND user_organizations.is_active = true
        )
    );
