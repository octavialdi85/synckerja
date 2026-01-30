-- Backfill bank account balances from existing income and expense transactions
-- Description: Calculates and updates balances based on existing transactions
-- Created: 2025-01-29

DO $$
DECLARE
    v_bank_account_id UUID;
    v_organization_id UUID;
    v_total_income NUMERIC(15, 2);
    v_total_expense NUMERIC(15, 2);
    v_net_balance NUMERIC(15, 2);
    v_balance_record RECORD;
BEGIN
    -- Loop through all active bank accounts
    FOR v_bank_account_id IN 
        SELECT DISTINCT id FROM public.bank_accounts WHERE is_active = true
    LOOP
        -- Get organization_id for this bank account
        SELECT organization_id INTO v_organization_id
        FROM public.bank_accounts
        WHERE id = v_bank_account_id;
        
        -- Calculate total income for this bank account
        SELECT COALESCE(SUM(amount), 0) INTO v_total_income
        FROM public.income_transactions
        WHERE bank_account_id = v_bank_account_id
            AND status IN ('completed', 'pending');
        
        -- Calculate total expense for this bank account
        SELECT COALESCE(SUM(amount), 0) INTO v_total_expense
        FROM public.expenses
        WHERE bank_account_id = v_bank_account_id
            AND status = 'active';
        
        -- Calculate net balance (income - expense)
        v_net_balance := v_total_income - v_total_expense;
        
        -- Check if balance record exists
        SELECT * INTO v_balance_record
        FROM public.bank_account_balances
        WHERE bank_account_id = v_bank_account_id;
        
        IF FOUND THEN
            -- Update existing balance
            UPDATE public.bank_account_balances
            SET balance = v_net_balance,
                updated_at = NOW()
            WHERE bank_account_id = v_bank_account_id;
        ELSE
            -- Create new balance record
            INSERT INTO public.bank_account_balances (
                bank_account_id,
                organization_id,
                balance
            ) VALUES (
                v_bank_account_id,
                v_organization_id,
                v_net_balance
            );
        END IF;
        
        -- Create history entry if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM public.bank_account_balance_history
            WHERE bank_account_id = v_bank_account_id
                AND transaction_type = 'initial'
        ) THEN
            INSERT INTO public.bank_account_balance_history (
                bank_account_id,
                organization_id,
                transaction_type,
                amount,
                balance_before,
                balance_after,
                description,
                created_by
            ) VALUES (
                v_bank_account_id,
                v_organization_id,
                'initial',
                0,
                0,
                v_net_balance,
                'Initial balance calculated from existing transactions',
                NULL
            );
        END IF;
    END LOOP;
END $$;
