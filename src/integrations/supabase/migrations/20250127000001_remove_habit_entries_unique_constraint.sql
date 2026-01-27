-- Migration: Remove unique constraint from habit_entries
-- Description: Allows multiple entries for the same habit_id and entry_date
-- This is needed for tracking habits with target_count > 1 (e.g., Solat 5 Waktu)
-- Created: 2025-01-27

BEGIN;

-- Drop the unique constraint/index if it exists
DROP INDEX IF EXISTS idx_habit_entries_unique_habit_date;
DROP INDEX IF EXISTS habit_entries_habit_id_entry_date_key;
DROP INDEX IF EXISTS idx_habit_entries_habit_date_unique;

-- Also try to drop constraint by name if it exists as a constraint
ALTER TABLE public.habit_entries 
DROP CONSTRAINT IF EXISTS idx_habit_entries_unique_habit_date;
ALTER TABLE public.habit_entries 
DROP CONSTRAINT IF EXISTS habit_entries_habit_id_entry_date_key;
ALTER TABLE public.habit_entries 
DROP CONSTRAINT IF EXISTS habit_entries_habit_id_entry_date_unique;

-- Create a regular (non-unique) index for better query performance
-- This allows multiple entries for the same habit_id + entry_date combination
CREATE INDEX IF NOT EXISTS idx_habit_entries_habit_date 
ON public.habit_entries(habit_id, entry_date);

COMMIT;

-- Add comment for documentation
COMMENT ON INDEX idx_habit_entries_habit_date IS 
'Index for querying habit entries by habit_id and entry_date. Allows multiple entries per date for habits with target_count > 1';
