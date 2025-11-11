-- Create campaign_kpi_templates table to store saved KPI calculator presets
CREATE TABLE IF NOT EXISTS campaign_kpi_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('services', 'sales')),
    settings JSONB NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Helpful indexes for filtering by organization, creator, and type
CREATE INDEX IF NOT EXISTS idx_campaign_kpi_templates_org ON campaign_kpi_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaign_kpi_templates_creator ON campaign_kpi_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_campaign_kpi_templates_org_type ON campaign_kpi_templates(organization_id, type);
CREATE INDEX IF NOT EXISTS idx_campaign_kpi_templates_public ON campaign_kpi_templates(is_public);

-- Shared updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Keep updated_at fresh on updates
CREATE TRIGGER update_campaign_kpi_templates_updated_at
    BEFORE UPDATE ON campaign_kpi_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable row level security
ALTER TABLE campaign_kpi_templates ENABLE ROW LEVEL SECURITY;

-- Allow users to view templates in their active organization.
-- Private templates are only visible to their creator, while shared (is_public) templates
-- can be viewed by anyone in the same organization.
CREATE POLICY "Users can view organization templates"
  ON campaign_kpi_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.active_organization_id = campaign_kpi_templates.organization_id
    )
    AND (
      campaign_kpi_templates.is_public = TRUE
      OR campaign_kpi_templates.created_by = auth.uid()
    )
  );

-- Allow users to insert templates scoped to their active organization
CREATE POLICY "Users can insert organization templates"
  ON campaign_kpi_templates
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.active_organization_id = campaign_kpi_templates.organization_id
    )
  );

-- Allow template owners to update their templates
CREATE POLICY "Users can update their own templates"
  ON campaign_kpi_templates
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Allow template owners to delete their templates
CREATE POLICY "Users can delete their own templates"
  ON campaign_kpi_templates
  FOR DELETE
  USING (auth.uid() = created_by);

COMMENT ON TABLE campaign_kpi_templates IS 'Stores saved KPI calculator templates per organization with optional sharing within the tenant.';
COMMENT ON COLUMN campaign_kpi_templates.organization_id IS 'Organization (tenant) that owns this template.';
COMMENT ON COLUMN campaign_kpi_templates.created_by IS 'User who created the template.';
COMMENT ON COLUMN campaign_kpi_templates.settings IS 'Serialized KPI calculator inputs for quick reuse.';
COMMENT ON COLUMN campaign_kpi_templates.is_public IS 'When true, template is visible to everyone in the organization.';





