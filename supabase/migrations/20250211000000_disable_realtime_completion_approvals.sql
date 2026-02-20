-- Disable Realtime for completion_approvals (approval flow no longer uses realtime).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'completion_approvals'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.completion_approvals;
  END IF;
END $$;
