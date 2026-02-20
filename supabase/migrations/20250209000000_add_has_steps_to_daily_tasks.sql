-- Add has_steps to daily_tasks (has_reminder and has_substeps already exist)
ALTER TABLE public.daily_tasks
  ADD COLUMN IF NOT EXISTS has_steps BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.daily_tasks.has_steps IS 'True if task has at least one step (task_steps) for UI and filtering.';
