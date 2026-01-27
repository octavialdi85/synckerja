-- Add weekly_days column to habits table
-- This column stores an array of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
-- for weekly habits with target_count > 1

ALTER TABLE public.habits
ADD COLUMN IF NOT EXISTS weekly_days JSONB;

-- Add comment to explain the column
COMMENT ON COLUMN public.habits.weekly_days IS 'Array of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday) for weekly habits with target_count > 1';
