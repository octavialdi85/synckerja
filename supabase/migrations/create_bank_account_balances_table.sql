-- Create bank_account_balances table
-- Description: Stores current balance for each bank account
-- Created: 2025-01-29

CREATE TABLE IF NOT EXISTS public.bank_account_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one balance record per bank account
    UNIQUE(bank_account_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bank_account_balances_bank_account_id 
    ON public.bank_account_balances(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_account_balances_organization_id 
    ON public.bank_account_balances(organization_id);

-- Enable RLS
ALTER TABLE public.bank_account_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view bank account balances from their organization"
    ON public.bank_account_balances FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = bank_account_balances.organization_id
        )
    );

CREATE POLICY "Users can insert bank account balances for their organization"
    ON public.bank_account_balances FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = bank_account_balances.organization_id
        )
    );

CREATE POLICY "Users can update bank account balances from their organization"
    ON public.bank_account_balances FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = bank_account_balances.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = bank_account_balances.organization_id
        )
    );

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_bank_account_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bank_account_balances_updated_at
    BEFORE UPDATE ON public.bank_account_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_account_balances_updated_at();

-- Add comments
COMMENT ON TABLE public.bank_account_balances IS 'Current balance for each bank account';
COMMENT ON COLUMN public.bank_account_balances.balance IS 'Current balance amount (starts from 0)';
