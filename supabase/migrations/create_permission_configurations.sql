-- Create permission_configurations table
CREATE TABLE IF NOT EXISTS permission_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    page_path TEXT NOT NULL,
    page_title TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    roles_allowed TEXT[] DEFAULT ARRAY[]::TEXT[],
    job_levels_allowed TEXT[] DEFAULT ARRAY[]::TEXT[],
    exceptions TEXT[] DEFAULT ARRAY[]::TEXT[], -- Employee IDs who have special access
    exception_paths TEXT[] DEFAULT ARRAY[]::TEXT[], -- Path exceptions that remain accessible
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_permission_configurations_organization_id ON permission_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_permission_configurations_page_path ON permission_configurations(page_path);
CREATE INDEX IF NOT EXISTS idx_permission_configurations_is_active ON permission_configurations(is_active);

-- Create unique constraint to prevent duplicate page_path per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_permission_configurations_unique_page_org 
ON permission_configurations(organization_id, page_path) 
WHERE organization_id IS NOT NULL AND is_active = TRUE;

-- Allow system-wide default configurations (organization_id = NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_permission_configurations_unique_page_system 
ON permission_configurations(page_path) 
WHERE organization_id IS NULL AND is_active = TRUE;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_permission_configurations_updated_at 
    BEFORE UPDATE ON permission_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system configurations
INSERT INTO permission_configurations (
    id, organization_id, page_path, page_title, is_active, roles_allowed, exceptions, exception_paths
) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', NULL, '/dashboard', 'Dashboard', TRUE, ARRAY['owner', 'admin', 'employee'], ARRAY[]::TEXT[], ARRAY[]::TEXT[]),
    ('550e8400-e29b-41d4-a716-446655440002', NULL, '/employee-management', 'Employee Management', TRUE, ARRAY['owner', 'admin'], ARRAY[]::TEXT[], ARRAY[]::TEXT[]),
    ('550e8400-e29b-41d4-a716-446655440003', NULL, '/recruitment', 'Recruitment', TRUE, ARRAY['owner', 'admin'], ARRAY[]::TEXT[], ARRAY['/recruitment/interviewees']),
    ('550e8400-e29b-41d4-a716-446655440004', NULL, '/access-permissions', 'Access Permissions', TRUE, ARRAY['owner'], ARRAY[]::TEXT[], ARRAY[]::TEXT[]),
    ('550e8400-e29b-41d4-a716-446655440005', NULL, '/subscription', 'Subscription Management', TRUE, ARRAY['owner'], ARRAY[]::TEXT[], ARRAY[]::TEXT[])
ON CONFLICT (page_path) WHERE organization_id IS NULL AND is_active = TRUE DO NOTHING;

