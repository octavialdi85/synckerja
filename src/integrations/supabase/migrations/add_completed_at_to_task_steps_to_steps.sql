BEGIN;

ALTER TABLE public.task_steps_to_steps
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE public.task_steps_to_steps
SET completed_at = updated_at
WHERE is_completed = TRUE
  AND completed_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_task_substep_completed_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_completed = TRUE THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at = NOW();
    END IF;
  ELSE
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_task_substep_completed_at ON public.task_steps_to_steps;

CREATE TRIGGER trigger_set_task_substep_completed_at
BEFORE INSERT OR UPDATE OF is_completed, completed_at
ON public.task_steps_to_steps
FOR EACH ROW
EXECUTE FUNCTION public.set_task_substep_completed_at();

ALTER TABLE public.task_steps_to_steps
  DROP CONSTRAINT IF EXISTS task_steps_to_steps_completed_at_check;

ALTER TABLE public.task_steps_to_steps
  ADD CONSTRAINT task_steps_to_steps_completed_at_check
  CHECK (
    (is_completed = TRUE AND completed_at IS NOT NULL)
    OR
    (is_completed = FALSE AND completed_at IS NULL)
  );

COMMIT;













