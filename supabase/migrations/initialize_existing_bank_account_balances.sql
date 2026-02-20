-- Initialize balances for existing bank accounts that don't have balance records
-- Description: Creates balance records (starting from 0) for bank accounts that were created before the trigger was added
-- Created: 2025-01-29

-- Insert balance records for bank accounts that don't have one yet
INSERT INTO public.bank_account_balances (
    bank_account_id,
    organization_id,
    balance
)
SELECT 
    ba.id,
    ba.organization_id,
    0
FROM public.bank_accounts ba
WHERE ba.is_active = true
    AND NOT EXISTS (
        SELECT 1 
        FROM public.bank_account_balances bab 
        WHERE bab.bank_account_id = ba.id
    )
ON CONFLICT (bank_account_id) DO NOTHING;

-- Create initial history entries for newly created balances
INSERT INTO public.bank_account_balance_history (
    bank_account_id,
    organization_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    created_by
)
SELECT 
    bab.bank_account_id,
    bab.organization_id,
    'initial',
    0,
    0,
    0,
    'Initial balance (migrated)',
    ba.created_by
FROM public.bank_account_balances bab
INNER JOIN public.bank_accounts ba ON ba.id = bab.bank_account_id
WHERE NOT EXISTS (
    SELECT 1 
    FROM public.bank_account_balance_history bah 
    WHERE bah.bank_account_id = bab.bank_account_id 
        AND bah.transaction_type = 'initial'
)
ON CONFLICT DO NOTHING;
