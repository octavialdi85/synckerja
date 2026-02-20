-- Create bank_accounts table
-- Description: Stores bank account information for income transactions
-- Created: 2025-01-29

CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_number TEXT,
    bank_name TEXT,
    account_holder TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_organization_id 
    ON public.bank_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active 
    ON public.bank_accounts(is_active) 
    WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_name 
    ON public.bank_accounts(name);

-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy: Users can view bank accounts from their organization
CREATE POLICY "Users can view bank accounts from their organization"
    ON public.bank_accounts FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = bank_accounts.organization_id
        )
    );

-- Policy: Users can insert bank accounts for their organization
CREATE POLICY "Users can insert bank accounts for their organization"
    ON public.bank_accounts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = bank_accounts.organization_id
        )
    );

-- Policy: Users can update bank accounts from their organization
CREATE POLICY "Users can update bank accounts from their organization"
    ON public.bank_accounts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = bank_accounts.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = bank_accounts.organization_id
        )
    );

-- Policy: Users can delete bank accounts from their organization
CREATE POLICY "Users can delete bank accounts from their organization"
    ON public.bank_accounts FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = bank_accounts.organization_id
        )
    );

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON public.bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_accounts_updated_at();

-- Add comments
COMMENT ON TABLE public.bank_accounts IS 'Bank accounts for income transactions';
COMMENT ON COLUMN public.bank_accounts.name IS 'Account name or identifier';
COMMENT ON COLUMN public.bank_accounts.account_number IS 'Bank account number';
COMMENT ON COLUMN public.bank_accounts.bank_name IS 'Name of the bank';
COMMENT ON COLUMN public.bank_accounts.account_holder IS 'Name of the account holder';
