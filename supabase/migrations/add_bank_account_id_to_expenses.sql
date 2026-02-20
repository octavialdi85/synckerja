-- Add bank_account_id column to expenses table
-- Description: Links expenses to bank accounts for balance tracking
-- Created: 2025-01-29

-- Add bank_account_id column (nullable for backward compatibility)
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_bank_account_id 
    ON public.expenses(bank_account_id)
    WHERE bank_account_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.expenses.bank_account_id IS 'Reference to bank account used for this expense (alternative to withdrawal_from_balance)';
