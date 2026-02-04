-- 1. Backfill: set has_steps = true for tasks that already have rows in task_steps
UPDATE public.daily_tasks dt
SET has_steps = true
WHERE EXISTS (
  SELECT 1 FROM public.task_steps ts WHERE ts.task_id = dt.id
);

-- 2. Trigger: keep has_steps in sync when steps are added or removed
CREATE OR REPLACE FUNCTION public.sync_daily_tasks_has_steps()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.daily_tasks SET has_steps = true WHERE id = NEW.task_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.daily_tasks
    SET has_steps = EXISTS (SELECT 1 FROM public.task_steps WHERE task_id = OLD.task_id)
    WHERE id = OLD.task_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_has_steps_on_task_steps ON public.task_steps;
CREATE TRIGGER trigger_sync_has_steps_on_task_steps
  AFTER INSERT OR DELETE ON public.task_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_daily_tasks_has_steps();

COMMENT ON FUNCTION public.sync_daily_tasks_has_steps() IS 'Keeps daily_tasks.has_steps in sync with task_steps (true if task has at least one step).';
