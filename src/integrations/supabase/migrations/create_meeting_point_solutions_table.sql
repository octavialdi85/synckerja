-- Create table for meeting point solutions
-- This table stores solutions for issues, with foreign key reference to meeting_point_issues

CREATE TABLE IF NOT EXISTS meeting_point_solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_point_issue_id UUID NOT NULL REFERENCES meeting_point_issues(id) ON DELETE CASCADE,
  meeting_point_id UUID NOT NULL REFERENCES meeting_points(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  solution_description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_meeting_point_solutions_issue_id ON meeting_point_solutions(meeting_point_issue_id);
CREATE INDEX idx_meeting_point_solutions_meeting_point_id ON meeting_point_solutions(meeting_point_id);
CREATE INDEX idx_meeting_point_solutions_organization_id ON meeting_point_solutions(organization_id);
CREATE INDEX idx_meeting_point_solutions_created_at ON meeting_point_solutions(created_at DESC);

-- Enable RLS
ALTER TABLE meeting_point_solutions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access solutions in their organization
CREATE POLICY "Users can view solutions in their organization"
  ON meeting_point_solutions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.organization_id = meeting_point_solutions.organization_id
    )
  );

CREATE POLICY "Users can create solutions in their organization"
  ON meeting_point_solutions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.organization_id = meeting_point_solutions.organization_id
    )
  );

CREATE POLICY "Users can update solutions in their organization"
  ON meeting_point_solutions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.organization_id = meeting_point_solutions.organization_id
    )
  );

CREATE POLICY "Users can delete solutions in their organization"
  ON meeting_point_solutions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.organization_id = meeting_point_solutions.organization_id
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meeting_point_solutions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_meeting_point_solutions_updated_at
  BEFORE UPDATE ON meeting_point_solutions
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_point_solutions_updated_at();

-- Add comment for documentation
COMMENT ON TABLE meeting_point_solutions IS 'Stores solutions for meeting point issues, with foreign key reference to meeting_point_issues';
COMMENT ON COLUMN meeting_point_solutions.meeting_point_issue_id IS 'Foreign key reference to the issue this solution addresses';
COMMENT ON COLUMN meeting_point_solutions.solution_description IS 'Description of the solution for the referenced issue';

