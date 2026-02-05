-- Optimize RLS: replace auth.uid() with (select auth.uid()) on approval_access_configurations
DROP POLICY IF EXISTS "Admins can manage configurations in their organization" ON public.approval_access_configurations;
DROP POLICY IF EXISTS "Users can view configurations in their organization" ON public.approval_access_configurations;

CREATE POLICY "Admins can manage configurations in their organization"
    ON public.approval_access_configurations FOR ALL
    USING (
        organization_id IN (
            SELECT uo.organization_id
            FROM user_organizations uo
            JOIN user_roles ur ON ur.user_id = uo.user_id AND ur.organization_id = uo.organization_id
            WHERE uo.user_id = (SELECT auth.uid())
              AND uo.is_active = true
              AND ur.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'hr'::app_role])
        )
    );

CREATE POLICY "Users can view configurations in their organization"
    ON public.approval_access_configurations FOR SELECT
    USING (
        organization_id IN (
            SELECT user_organizations.organization_id
            FROM user_organizations
            WHERE user_organizations.user_id = (SELECT auth.uid())
              AND user_organizations.is_active = true
        )
    );
