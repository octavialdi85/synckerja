-- Add optional columns to task_steps if missing (avoids 500 when client selects them).
-- status/priority: optional display; completed_at: used for completion timestamp.

BEGIN;

-- completed_at: when step was marked complete (nullable until set)
ALTER TABLE public.task_steps
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- status: optional display status (e.g. pending, in_progress, completed)
ALTER TABLE public.task_steps
  ADD COLUMN IF NOT EXISTS status TEXT;

-- priority: optional display priority
ALTER TABLE public.task_steps
  ADD COLUMN IF NOT EXISTS priority TEXT;

COMMIT;
