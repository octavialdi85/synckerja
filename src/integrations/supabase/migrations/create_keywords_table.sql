-- Create keywords table
CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_keywords_organization_id ON keywords(organization_id);
CREATE INDEX IF NOT EXISTS idx_keywords_service_id ON keywords(service_id);
CREATE INDEX IF NOT EXISTS idx_keywords_keyword ON keywords(keyword);

-- Add RLS policies
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view keywords from their organization
CREATE POLICY "Users can view keywords from their organization"
  ON keywords FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.active_organization_id = keywords.organization_id
    )
  );

-- Policy: Users can insert keywords for their organization
CREATE POLICY "Users can insert keywords for their organization"
  ON keywords FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.active_organization_id = keywords.organization_id
    )
  );

-- Policy: Users can update keywords from their organization
CREATE POLICY "Users can update keywords from their organization"
  ON keywords FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.active_organization_id = keywords.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.active_organization_id = keywords.organization_id
    )
  );

-- Policy: Users can delete keywords from their organization
CREATE POLICY "Users can delete keywords from their organization"
  ON keywords FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.active_organization_id = keywords.organization_id
    )
  );

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_keywords_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_keywords_updated_at
  BEFORE UPDATE ON keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_keywords_updated_at();

-- Add comment
COMMENT ON TABLE keywords IS 'Keywords for SEO optimization in script generator';
COMMENT ON COLUMN keywords.keyword IS 'The keyword text (e.g., "SEO TikTok", "Digital Marketing")';
COMMENT ON COLUMN keywords.service_id IS 'The service this keyword is associated with';

