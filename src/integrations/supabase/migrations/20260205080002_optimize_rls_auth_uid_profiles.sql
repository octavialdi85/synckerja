-- Optimize RLS: replace auth.uid() with (select auth.uid()) on profiles
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_same_org" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_delete_own"
    ON public.profiles FOR DELETE
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "profiles_select_same_org"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM user_organizations uo1
            JOIN user_organizations uo2 ON uo1.organization_id = uo2.organization_id
            WHERE uo1.user_id = (SELECT auth.uid())
              AND uo1.is_active = true
              AND uo2.user_id = profiles.user_id
              AND uo2.is_active = true
        )
    );

CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);
