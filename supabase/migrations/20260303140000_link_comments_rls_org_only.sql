-- RLS for link_comments: org-based only so all users in the same org see all comments
-- Fixes: comments from dashboard (logged-in user) not visible to other org users in Preview modal

DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'link_comments') THEN
    ALTER TABLE public.link_comments ENABLE ROW LEVEL SECURITY;

    -- Drop all existing policies (remove any restrictive or "own rows only" policies)
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'link_comments'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.link_comments', pol.policyname);
    END LOOP;

    -- SELECT: users can view comments for plans in their active organization
    CREATE POLICY "Users can view link_comments in their organization"
      ON public.link_comments FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.social_media_plans smp
          WHERE smp.id = link_comments.social_media_plan_id
            AND smp.organization_id = (
                SELECT p.active_organization_id
                FROM public.profiles p
                WHERE p.user_id = (SELECT auth.uid())
            )
        )
      );

    -- INSERT: users can add comments for plans in their active organization
    CREATE POLICY "Users can insert link_comments in their organization"
      ON public.link_comments FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.social_media_plans smp
          WHERE smp.id = link_comments.social_media_plan_id
            AND smp.organization_id = (
                SELECT p.active_organization_id
                FROM public.profiles p
                WHERE p.user_id = (SELECT auth.uid())
            )
        )
      );

    -- UPDATE: users can edit any comment for plans in their active organization
    CREATE POLICY "Users can update link_comments in their organization"
      ON public.link_comments FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.social_media_plans smp
          WHERE smp.id = link_comments.social_media_plan_id
            AND smp.organization_id = (
                SELECT p.active_organization_id
                FROM public.profiles p
                WHERE p.user_id = (SELECT auth.uid())
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.social_media_plans smp
          WHERE smp.id = link_comments.social_media_plan_id
            AND smp.organization_id = (
                SELECT p.active_organization_id
                FROM public.profiles p
                WHERE p.user_id = (SELECT auth.uid())
            )
        )
      );

    -- DELETE: users can delete any comment for plans in their active organization
    CREATE POLICY "Users can delete link_comments in their organization"
      ON public.link_comments FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM public.social_media_plans smp
          WHERE smp.id = link_comments.social_media_plan_id
            AND smp.organization_id = (
                SELECT p.active_organization_id
                FROM public.profiles p
                WHERE p.user_id = (SELECT auth.uid())
            )
        )
      );
  END IF;
END $$;
