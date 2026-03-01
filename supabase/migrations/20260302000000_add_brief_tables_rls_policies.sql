-- RLS policies for brief_target_audiences, brief_captions, brief_link_references
-- Allow users to SELECT/INSERT/UPDATE when they have access to the associated social_media_plan (same organization)
-- Fixes: "new row violates row-level security policy for table brief_target_audiences" (403)

-- brief_target_audiences
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'brief_target_audiences') THEN
    ALTER TABLE public.brief_target_audiences ENABLE ROW LEVEL SECURITY;

    -- Drop all existing policies (may have restrictive/incorrect policies)
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'brief_target_audiences'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.brief_target_audiences', pol.policyname);
    END LOOP;

    CREATE POLICY "Users can view brief_target_audiences for their org plans"
      ON public.brief_target_audiences FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.social_media_plans smp
          JOIN public.profiles p ON p.user_id = (SELECT auth.uid())
          WHERE smp.id = brief_target_audiences.social_media_plan_id
            AND p.active_organization_id IS NOT NULL
            AND smp.organization_id = p.active_organization_id
        )
      );

    CREATE POLICY "Users can insert brief_target_audiences for their org plans"
      ON public.brief_target_audiences FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.social_media_plans smp
          JOIN public.profiles p ON p.user_id = (SELECT auth.uid())
          WHERE smp.id = brief_target_audiences.social_media_plan_id
            AND p.active_organization_id IS NOT NULL
            AND smp.organization_id = p.active_organization_id
        )
      );

    CREATE POLICY "Users can update brief_target_audiences for their org plans"
      ON public.brief_target_audiences FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.social_media_plans smp
          JOIN public.profiles p ON p.user_id = (SELECT auth.uid())
          WHERE smp.id = brief_target_audiences.social_media_plan_id
            AND p.active_organization_id IS NOT NULL
            AND smp.organization_id = p.active_organization_id
        )
      );
  END IF;
END $$;

-- brief_captions
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'brief_captions') THEN
    ALTER TABLE public.brief_captions ENABLE ROW LEVEL SECURITY;

    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'brief_captions'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.brief_captions', pol.policyname);
    END LOOP;

    CREATE POLICY "Users can view brief_captions for their org plans"
      ON public.brief_captions FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.social_media_plans smp
          JOIN public.profiles p ON p.user_id = (SELECT auth.uid())
          WHERE smp.id = brief_captions.social_media_plan_id
            AND p.active_organization_id IS NOT NULL
            AND smp.organization_id = p.active_organization_id
        )
      );

    CREATE POLICY "Users can insert brief_captions for their org plans"
      ON public.brief_captions FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.social_media_plans smp
          JOIN public.profiles p ON p.user_id = (SELECT auth.uid())
          WHERE smp.id = brief_captions.social_media_plan_id
            AND p.active_organization_id IS NOT NULL
            AND smp.organization_id = p.active_organization_id
        )
      );

    CREATE POLICY "Users can update brief_captions for their org plans"
      ON public.brief_captions FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.social_media_plans smp
          JOIN public.profiles p ON p.user_id = (SELECT auth.uid())
          WHERE smp.id = brief_captions.social_media_plan_id
            AND p.active_organization_id IS NOT NULL
            AND smp.organization_id = p.active_organization_id
        )
      );
  END IF;
END $$;

-- brief_link_references
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'brief_link_references') THEN
    ALTER TABLE public.brief_link_references ENABLE ROW LEVEL SECURITY;

    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'brief_link_references'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.brief_link_references', pol.policyname);
    END LOOP;

    CREATE POLICY "Users can view brief_link_references for their org plans"
      ON public.brief_link_references FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.social_media_plans smp
          JOIN public.profiles p ON p.user_id = (SELECT auth.uid())
          WHERE smp.id = brief_link_references.social_media_plan_id
            AND p.active_organization_id IS NOT NULL
            AND smp.organization_id = p.active_organization_id
        )
      );

    CREATE POLICY "Users can insert brief_link_references for their org plans"
      ON public.brief_link_references FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.social_media_plans smp
          JOIN public.profiles p ON p.user_id = (SELECT auth.uid())
          WHERE smp.id = brief_link_references.social_media_plan_id
            AND p.active_organization_id IS NOT NULL
            AND smp.organization_id = p.active_organization_id
        )
      );

    CREATE POLICY "Users can update brief_link_references for their org plans"
      ON public.brief_link_references FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.social_media_plans smp
          JOIN public.profiles p ON p.user_id = (SELECT auth.uid())
          WHERE smp.id = brief_link_references.social_media_plan_id
            AND p.active_organization_id IS NOT NULL
            AND smp.organization_id = p.active_organization_id
        )
      );
  END IF;
END $$;
