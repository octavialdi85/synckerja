-- Add monthly_dates column to habits table
-- This column stores an array of dates (1-31) for monthly habits
-- Created: 2025-01-27

BEGIN;

-- Add monthly_dates column as JSONB to store array of numbers (dates 1-31)
ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS monthly_dates JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.habits.monthly_dates IS 
'Array of dates (1-31) for monthly habits. Example: [1, 15, 30] means habit should be tracked on the 1st, 15th, and 30th of each month';

COMMIT;
