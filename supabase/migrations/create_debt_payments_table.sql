-- Create debt_payments table
CREATE TABLE IF NOT EXISTS debt_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_amount NUMERIC(15, 2) NOT NULL CHECK (payment_amount > 0),
    payment_date DATE NOT NULL,
    payment_method UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for debt_payments
CREATE INDEX IF NOT EXISTS idx_debt_payments_organization_id ON debt_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_created_by ON debt_payments(created_by);
CREATE INDEX IF NOT EXISTS idx_debt_payments_payment_date ON debt_payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_debt_payments_payment_method ON debt_payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_debt_payments_created_at ON debt_payments(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_debt_payments_updated_at
    BEFORE UPDATE ON debt_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for debt_payments
CREATE POLICY "Users can view organization debt payments"
    ON debt_payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = debt_payments.organization_id
        )
    );

CREATE POLICY "Users can insert organization debt payments"
    ON debt_payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = debt_payments.organization_id
        )
    );

CREATE POLICY "Users can update organization debt payments"
    ON debt_payments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = debt_payments.organization_id
        )
    );

CREATE POLICY "Users can delete organization debt payments"
    ON debt_payments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = debt_payments.organization_id
        )
    );

-- Comments
COMMENT ON TABLE debt_payments IS 'Stores payment records for debts';
COMMENT ON COLUMN debt_payments.debt_id IS 'Reference to the debt being paid';
COMMENT ON COLUMN debt_payments.payment_amount IS 'Amount paid for this payment';
COMMENT ON COLUMN debt_payments.payment_date IS 'Date when the payment was made';
COMMENT ON COLUMN debt_payments.payment_method IS 'Reference to bank_account used for payment (if applicable)';
COMMENT ON COLUMN debt_payments.notes IS 'Additional notes about the payment';
