-- Add notes column to meeting_point_issues table
ALTER TABLE meeting_point_issues
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN meeting_point_issues.notes IS 'Additional notes or comments for the issue';

