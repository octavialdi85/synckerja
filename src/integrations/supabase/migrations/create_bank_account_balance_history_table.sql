-- Create bank_account_balance_history table
-- Description: Stores history of balance changes for each bank account
-- Created: 2025-01-29

CREATE TABLE IF NOT EXISTS public.bank_account_balance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'manual_adjustment', 'initial')),
    transaction_id UUID, -- Reference to income_transactions or expenses
    amount NUMERIC(15, 2) NOT NULL, -- Positive for income, negative for expense
    balance_before NUMERIC(15, 2) NOT NULL,
    balance_after NUMERIC(15, 2) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bank_account_balance_history_bank_account_id 
    ON public.bank_account_balance_history(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_account_balance_history_organization_id 
    ON public.bank_account_balance_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_account_balance_history_transaction_type 
    ON public.bank_account_balance_history(transaction_type);
CREATE INDEX IF NOT EXISTS idx_bank_account_balance_history_transaction_id 
    ON public.bank_account_balance_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_bank_account_balance_history_created_at 
    ON public.bank_account_balance_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.bank_account_balance_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view bank account balance history from their organization"
    ON public.bank_account_balance_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = bank_account_balance_history.organization_id
        )
    );

CREATE POLICY "Users can insert bank account balance history for their organization"
    ON public.bank_account_balance_history FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = bank_account_balance_history.organization_id
        )
    );

-- Add comments
COMMENT ON TABLE public.bank_account_balance_history IS 'History of balance changes for bank accounts';
COMMENT ON COLUMN public.bank_account_balance_history.transaction_type IS 'Type of transaction: income, expense, manual_adjustment, or initial';
COMMENT ON COLUMN public.bank_account_balance_history.amount IS 'Amount of change (positive for income, negative for expense)';
COMMENT ON COLUMN public.bank_account_balance_history.balance_before IS 'Balance before the transaction';
COMMENT ON COLUMN public.bank_account_balance_history.balance_after IS 'Balance after the transaction';
