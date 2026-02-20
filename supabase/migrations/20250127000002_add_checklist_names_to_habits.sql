-- Migration: Add checklist_names column to habits table
-- Description: Stores custom names for each checklist item when target_count > 1
-- This allows users to name each checklist (e.g., "Solat Subuh", "Solat Zuhur", etc.)
-- Created: 2025-01-27

BEGIN;

-- Add checklist_names column as JSONB to store array of strings
ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS checklist_names JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.habits.checklist_names IS 
'Array of custom names for each checklist item when target_count > 1. Example: ["Solat Subuh", "Solat Zuhur", "Solat Ashar", "Solat Maghrib", "Solat Isya"]';

COMMIT;
