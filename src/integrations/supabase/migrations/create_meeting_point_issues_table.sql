-- Create table for meeting point issues (pokok permasalahan)
-- This table stores problems/issues that need to be discussed and solved for each meeting point

CREATE TABLE IF NOT EXISTS meeting_point_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_point_id UUID NOT NULL REFERENCES meeting_points(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  issue_description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_meeting_point_issues_meeting_point_id ON meeting_point_issues(meeting_point_id);
CREATE INDEX idx_meeting_point_issues_organization_id ON meeting_point_issues(organization_id);
CREATE INDEX idx_meeting_point_issues_created_at ON meeting_point_issues(created_at DESC);

-- Enable RLS
ALTER TABLE meeting_point_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access issues in their organization
CREATE POLICY "Users can view issues in their organization"
  ON meeting_point_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.organization_id = meeting_point_issues.organization_id
    )
  );

CREATE POLICY "Users can create issues in their organization"
  ON meeting_point_issues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.organization_id = meeting_point_issues.organization_id
    )
  );

CREATE POLICY "Users can update issues in their organization"
  ON meeting_point_issues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.organization_id = meeting_point_issues.organization_id
    )
  );

CREATE POLICY "Users can delete issues in their organization"
  ON meeting_point_issues FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.organization_id = meeting_point_issues.organization_id
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meeting_point_issues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_meeting_point_issues_updated_at
  BEFORE UPDATE ON meeting_point_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_point_issues_updated_at();

-- Add comment for documentation
COMMENT ON TABLE meeting_point_issues IS 'Stores problems/issues (pokok permasalahan) that need to be discussed and solved for each meeting point';
COMMENT ON COLUMN meeting_point_issues.issue_description IS 'Description of the problem/issue that needs to be addressed';

