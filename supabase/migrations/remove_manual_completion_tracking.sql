-- Migration: Remove manual completion tracking columns and triggers

DROP TRIGGER IF EXISTS trigger_aa_track_manual_task_step_completion ON public.task_steps;
DROP TRIGGER IF EXISTS trigger_aa_track_manual_task_substep_completion ON public.task_steps_to_steps;
DROP FUNCTION IF EXISTS public.track_manual_task_step_completion();
DROP FUNCTION IF EXISTS public.track_manual_task_substep_completion();

ALTER TABLE public.task_steps
  DROP COLUMN IF EXISTS manual_is_completed,
  DROP COLUMN IF EXISTS manual_completed_at;

ALTER TABLE public.task_steps_to_steps
  DROP COLUMN IF EXISTS manual_is_completed,
  DROP COLUMN IF EXISTS manual_completed_at;

