-- Enable Realtime for completion_approvals so "Pending your approval" updates live when assignee checks a box.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'completion_approvals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.completion_approvals;
  END IF;
END $$;
