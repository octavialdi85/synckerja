-- Optimize RLS: replace auth.uid() with (select auth.uid()) on ownership_transfers
DROP POLICY IF EXISTS "Owners can create transfer requests" ON public.ownership_transfers;
DROP POLICY IF EXISTS "Owners can insert transfer requests" ON public.ownership_transfers;
DROP POLICY IF EXISTS "Users can update their own transfer requests" ON public.ownership_transfers;
DROP POLICY IF EXISTS "Users can update their related transfers" ON public.ownership_transfers;
DROP POLICY IF EXISTS "Users can view incoming transfers" ON public.ownership_transfers;
DROP POLICY IF EXISTS "Users can view their incoming transfers" ON public.ownership_transfers;
DROP POLICY IF EXISTS "Users can view their outgoing transfers" ON public.ownership_transfers;
DROP POLICY IF EXISTS "Users can view their transfer requests" ON public.ownership_transfers;

CREATE POLICY "Owners can create transfer requests"
    ON public.ownership_transfers FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = from_user_id);

CREATE POLICY "Owners can insert transfer requests"
    ON public.ownership_transfers FOR INSERT
    WITH CHECK (
        (EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN profiles p ON p.user_id = (SELECT auth.uid())
            WHERE ur.user_id = (SELECT auth.uid())
              AND ur.organization_id = p.active_organization_id
              AND ur.role = 'owner'::app_role
        )) AND (SELECT auth.uid()) = from_user_id
    );

CREATE POLICY "Users can update their own transfer requests"
    ON public.ownership_transfers FOR UPDATE
    USING (((SELECT auth.uid()) = from_user_id) OR ((SELECT auth.uid()) = to_user_id));

CREATE POLICY "Users can update their related transfers"
    ON public.ownership_transfers FOR UPDATE
    USING (((SELECT auth.uid()) = from_user_id) OR ((SELECT auth.uid()) = to_user_id));

CREATE POLICY "Users can view incoming transfers"
    ON public.ownership_transfers FOR SELECT
    USING ((to_user_id = (SELECT auth.uid())) OR (from_user_id = (SELECT auth.uid())));

CREATE POLICY "Users can view their incoming transfers"
    ON public.ownership_transfers FOR SELECT
    USING ((SELECT auth.uid()) = to_user_id);

CREATE POLICY "Users can view their outgoing transfers"
    ON public.ownership_transfers FOR SELECT
    USING ((SELECT auth.uid()) = from_user_id);

CREATE POLICY "Users can view their transfer requests"
    ON public.ownership_transfers FOR SELECT
    USING (
        ((SELECT auth.uid()) = from_user_id)
        OR ((SELECT auth.uid()) = to_user_id)
        OR has_role((SELECT auth.uid()), 'owner'::app_role)
    );
