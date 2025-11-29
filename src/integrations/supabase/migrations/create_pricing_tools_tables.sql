-- Create business_expenses table
CREATE TABLE IF NOT EXISTS business_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    month INTEGER CHECK (month IS NULL OR (month >= 0 AND month <= 12)), -- 0 = all months, 1-12 = specific month
    time_period TEXT NOT NULL CHECK (time_period IN ('monthly', 'yearly')),
    year INTEGER, -- For yearly tracking
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for business_expenses
CREATE INDEX IF NOT EXISTS idx_business_expenses_organization_id ON business_expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_business_expenses_created_by ON business_expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_business_expenses_category ON business_expenses(category);
CREATE INDEX IF NOT EXISTS idx_business_expenses_is_active ON business_expenses(is_active);
CREATE INDEX IF NOT EXISTS idx_business_expenses_time_period ON business_expenses(time_period);

-- Create sales_channels table
CREATE TABLE IF NOT EXISTS sales_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL for system-wide defaults
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('online', 'offline')),
    commission_percent NUMERIC(5, 2) DEFAULT 0,
    payment_fee_percent NUMERIC(5, 2) DEFAULT 0,
    ad_spend_percent NUMERIC(5, 2) DEFAULT 0,
    other_fee_percent NUMERIC(5, 2) DEFAULT 0,
    total_fee_percent NUMERIC(5, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE, -- For default channels (Tokopedia, Shopee, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure unique channel name per organization (or system-wide)
    UNIQUE(organization_id, name)
);

-- Create indexes for sales_channels
CREATE INDEX IF NOT EXISTS idx_sales_channels_organization_id ON sales_channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_channels_type ON sales_channels(type);
CREATE INDEX IF NOT EXISTS idx_sales_channels_is_active ON sales_channels(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_channels_is_default ON sales_channels(is_default);

-- Create pricing_calculations table
CREATE TABLE IF NOT EXISTS pricing_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- Optional link to product
    calculation_name TEXT NOT NULL,
    calculation_input JSONB NOT NULL, -- All input data (costs, expenses, channels, etc.)
    calculation_result JSONB NOT NULL, -- All calculation results
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for pricing_calculations
CREATE INDEX IF NOT EXISTS idx_pricing_calculations_organization_id ON pricing_calculations(organization_id);
CREATE INDEX IF NOT EXISTS idx_pricing_calculations_created_by ON pricing_calculations(created_by);
CREATE INDEX IF NOT EXISTS idx_pricing_calculations_product_id ON pricing_calculations(product_id);
CREATE INDEX IF NOT EXISTS idx_pricing_calculations_created_at ON pricing_calculations(created_at DESC);

-- Shared updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_business_expenses_updated_at
    BEFORE UPDATE ON business_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_channels_updated_at
    BEFORE UPDATE ON sales_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_calculations_updated_at
    BEFORE UPDATE ON pricing_calculations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE business_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_calculations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_expenses
CREATE POLICY "Users can view organization business expenses"
    ON business_expenses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = business_expenses.organization_id
        )
    );

CREATE POLICY "Users can insert organization business expenses"
    ON business_expenses
    FOR INSERT
    WITH CHECK (
        auth.uid() = created_by
        AND EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = business_expenses.organization_id
        )
    );

CREATE POLICY "Users can update organization business expenses"
    ON business_expenses
    FOR UPDATE
    USING (
        auth.uid() = created_by
        AND EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = business_expenses.organization_id
        )
    );

CREATE POLICY "Users can delete organization business expenses"
    ON business_expenses
    FOR DELETE
    USING (
        auth.uid() = created_by
        AND EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = business_expenses.organization_id
        )
    );

-- RLS Policies for sales_channels
-- Users can view system-wide defaults OR organization-specific channels
CREATE POLICY "Users can view sales channels"
    ON sales_channels
    FOR SELECT
    USING (
        -- System-wide defaults (organization_id IS NULL) are visible to all
        organization_id IS NULL
        OR EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = sales_channels.organization_id
        )
    );

-- Only system admins can create system-wide defaults, others create org-specific
CREATE POLICY "Users can insert organization sales channels"
    ON sales_channels
    FOR INSERT
    WITH CHECK (
        -- Can only insert org-specific channels (not system-wide)
        organization_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = sales_channels.organization_id
        )
    );

CREATE POLICY "Users can update organization sales channels"
    ON sales_channels
    FOR UPDATE
    USING (
        -- Can only update org-specific channels (not system defaults)
        organization_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = sales_channels.organization_id
        )
    );

CREATE POLICY "Users can delete organization sales channels"
    ON sales_channels
    FOR DELETE
    USING (
        -- Can only delete org-specific channels (not system defaults)
        organization_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = sales_channels.organization_id
        )
    );

-- RLS Policies for pricing_calculations
CREATE POLICY "Users can view organization pricing calculations"
    ON pricing_calculations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = pricing_calculations.organization_id
        )
    );

CREATE POLICY "Users can insert organization pricing calculations"
    ON pricing_calculations
    FOR INSERT
    WITH CHECK (
        auth.uid() = created_by
        AND EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = pricing_calculations.organization_id
        )
    );

CREATE POLICY "Users can update organization pricing calculations"
    ON pricing_calculations
    FOR UPDATE
    USING (
        auth.uid() = created_by
        AND EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = pricing_calculations.organization_id
        )
    );

CREATE POLICY "Users can delete organization pricing calculations"
    ON pricing_calculations
    FOR DELETE
    USING (
        auth.uid() = created_by
        AND EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = pricing_calculations.organization_id
        )
    );

-- Insert default system-wide sales channels
INSERT INTO sales_channels (id, organization_id, name, type, commission_percent, payment_fee_percent, ad_spend_percent, other_fee_percent, total_fee_percent, is_active, is_default, created_at, updated_at)
VALUES
    ('550e8400-e29b-41d4-a716-446655440101', NULL, 'Tokopedia', 'online', 1.5, 0.7, 1.0, 0, 3.2, TRUE, TRUE, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440102', NULL, 'Shopee', 'online', 1.5, 0.7, 1.5, 0, 3.7, TRUE, TRUE, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440103', NULL, 'Bukalapak', 'online', 1.5, 0.7, 1.0, 0, 3.2, FALSE, TRUE, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440104', NULL, 'Offline Store', 'offline', 0, 0, 0, 5.0, 5.0, TRUE, TRUE, NOW(), NOW())
ON CONFLICT (organization_id, name) DO NOTHING;

-- Comments
COMMENT ON TABLE business_expenses IS 'Stores business operational expenses per organization';
COMMENT ON TABLE sales_channels IS 'Stores sales channel configurations, with system-wide defaults and organization-specific overrides';
COMMENT ON TABLE pricing_calculations IS 'Stores pricing calculation history with input and result data';

