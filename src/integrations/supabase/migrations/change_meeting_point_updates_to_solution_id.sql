-- Migration: Change meeting_point_updates.meeting_point_id to meeting_point_solution_id
-- This changes the relationship from meeting_point to meeting_point_solution

-- Step 1: Add new column meeting_point_solution_id
ALTER TABLE meeting_point_updates
ADD COLUMN IF NOT EXISTS meeting_point_solution_id UUID;

-- Step 2: Add foreign key constraint for the new column
ALTER TABLE meeting_point_updates
ADD CONSTRAINT meeting_point_updates_meeting_point_solution_id_fkey
FOREIGN KEY (meeting_point_solution_id)
REFERENCES meeting_point_solutions(id)
ON DELETE CASCADE;

-- Step 3: Drop the old foreign key constraint
ALTER TABLE meeting_point_updates
DROP CONSTRAINT IF EXISTS meeting_point_updates_meeting_point_id_fkey;

-- Step 4: Remove the old column (after ensuring data is migrated or cleared)
-- Note: This will delete all existing updates. If you need to preserve data,
-- you'll need to map meeting_point_id to solution_id first.
ALTER TABLE meeting_point_updates
DROP COLUMN IF EXISTS meeting_point_id;

-- Add comment for documentation
COMMENT ON COLUMN meeting_point_updates.meeting_point_solution_id IS 'Reference to meeting_point_solutions table. Updates are now linked to solutions instead of meeting points.';

