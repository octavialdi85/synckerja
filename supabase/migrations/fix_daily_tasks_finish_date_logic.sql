-- Fix daily_tasks finish_date logic: ensure finish_date is NULL if status is not 'completed'
-- This migration creates a trigger to automatically set finish_date to NULL when status changes to non-completed

-- Function to handle finish_date logic based on status
CREATE OR REPLACE FUNCTION ensure_finish_date_null_on_non_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is not 'completed', ensure finish_date is NULL
  IF NEW.status != 'completed' THEN
    NEW.finish_date = NULL;
  END IF;
  
  -- If status is 'completed' and finish_date is NULL, set it to current timestamp
  IF NEW.status = 'completed' AND NEW.finish_date IS NULL THEN
    NEW.finish_date = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically enforce finish_date logic
DROP TRIGGER IF EXISTS trigger_ensure_finish_date_null_on_non_completed ON daily_tasks;
CREATE TRIGGER trigger_ensure_finish_date_null_on_non_completed
  BEFORE INSERT OR UPDATE ON daily_tasks
  FOR EACH ROW
  EXECUTE FUNCTION ensure_finish_date_null_on_non_completed();

-- Fix existing data: set finish_date to NULL for all tasks where status is not 'completed'
UPDATE daily_tasks
SET finish_date = NULL
WHERE status != 'completed' AND finish_date IS NOT NULL;

-- Add comment for documentation
COMMENT ON FUNCTION ensure_finish_date_null_on_non_completed() IS 'Ensures finish_date is NULL when status is not completed, and sets finish_date when status becomes completed';

