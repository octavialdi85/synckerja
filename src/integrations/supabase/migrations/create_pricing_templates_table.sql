-- Create pricing_templates table
CREATE TABLE IF NOT EXISTS pricing_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    -- NULL = global template (accessible by all tenants)
    -- NOT NULL = organization-specific template
    template_name TEXT NOT NULL,
    template_description TEXT,
    category TEXT, -- e.g., "Parfum Import", "Food & Beverage", "Manufacturing"
    industry TEXT, -- Optional industry classification
    template_data JSONB NOT NULL, -- Contains complete PricingCalculationInput structure
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pricing_templates_organization_id 
    ON pricing_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_pricing_templates_category 
    ON pricing_templates(category);
CREATE INDEX IF NOT EXISTS idx_pricing_templates_is_active 
    ON pricing_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_templates_org_active 
    ON pricing_templates(organization_id, is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pricing_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_pricing_templates_updated_at ON pricing_templates;
CREATE TRIGGER trigger_update_pricing_templates_updated_at
    BEFORE UPDATE ON pricing_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_pricing_templates_updated_at();

-- Comments
COMMENT ON TABLE pricing_templates IS 
'Stores pricing calculation templates. Global templates (organization_id = NULL) are accessible by all tenants. Organization-specific templates are private.';
COMMENT ON COLUMN pricing_templates.organization_id IS 
'NULL for global templates accessible by all tenants, otherwise the organization that owns this template';
COMMENT ON COLUMN pricing_templates.template_data IS 
'Complete PricingCalculationInput JSON structure including product info, costs, expenses, channels, and pricing settings';

-- Enable RLS
ALTER TABLE pricing_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view global templates (organization_id IS NULL)
CREATE POLICY "Users can view global templates"
    ON pricing_templates FOR SELECT
    USING (organization_id IS NULL);

-- Policy: Users can view their organization's templates
CREATE POLICY "Users can view organization templates"
    ON pricing_templates FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can create templates for their organization
CREATE POLICY "Users can create organization templates"
    ON pricing_templates FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update their organization's templates
CREATE POLICY "Users can update organization templates"
    ON pricing_templates FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can delete their organization's templates
CREATE POLICY "Users can delete organization templates"
    ON pricing_templates FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );


