-- Add bank_account_id column to income_transactions table
-- Description: Links income transactions to bank accounts
-- Created: 2025-01-29

-- Add bank_account_id column (nullable for backward compatibility)
ALTER TABLE public.income_transactions
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_income_transactions_bank_account_id 
    ON public.income_transactions(bank_account_id)
    WHERE bank_account_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.income_transactions.bank_account_id IS 'Reference to bank account used for this transaction';
