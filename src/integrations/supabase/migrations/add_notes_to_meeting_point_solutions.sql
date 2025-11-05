-- Add notes column to meeting_point_solutions table
ALTER TABLE meeting_point_solutions
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN meeting_point_solutions.notes IS 'Additional notes or comments for the solution';

