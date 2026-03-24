-- 1) App code selects task_steps.assigned_to (e.g. completionApprovalService); column was missing in prod → Postgres errors.
-- 2) sync_task_steps_completion_with_social_media_plan runs as INVOKER by default; if RLS blocks UPDATE on linked task_steps,
--    the AFTER trigger can fail and surface as PostgREST 500. Run as DEFINER with fixed search_path (standard Supabase pattern).

ALTER TABLE public.task_steps
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.task_steps.assigned_to IS
  'Optional denormalized assignee; primary source of truth is task_steps_assigned. Used when assignment reads are blocked.';

ALTER FUNCTION public.sync_task_steps_completion_with_social_media_plan() SECURITY DEFINER;
ALTER FUNCTION public.sync_task_steps_completion_with_social_media_plan() SET search_path TO 'public';
