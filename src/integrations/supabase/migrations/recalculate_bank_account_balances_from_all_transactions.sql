-- Recalculate bank account balances from all income and expense transactions
-- Description: This migration recalculates balances for all bank accounts by summing all transactions,
-- including transactions that may not have bank_account_id set but should be counted
-- Created: 2025-01-29

DO $$
DECLARE
    v_bank_account_id UUID;
    v_organization_id UUID;
    v_total_income NUMERIC(15, 2);
    v_total_expense NUMERIC(15, 2);
    v_net_balance NUMERIC(15, 2);
    v_balance_record RECORD;
    v_bank_account_record RECORD;
BEGIN
    -- Loop through all active bank accounts
    FOR v_bank_account_record IN 
        SELECT id, organization_id FROM public.bank_accounts WHERE is_active = true
    LOOP
        v_bank_account_id := v_bank_account_record.id;
        v_organization_id := v_bank_account_record.organization_id;
        
        -- Calculate total income for this bank account (only transactions with bank_account_id)
        SELECT COALESCE(SUM(amount), 0) INTO v_total_income
        FROM public.income_transactions
        WHERE bank_account_id = v_bank_account_id
            AND status IN ('completed', 'pending');
        
        -- Calculate total expense for this bank account (only expenses with bank_account_id)
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
        
        -- Delete old initial history entry if balance is not 0
        IF v_net_balance != 0 THEN
            DELETE FROM public.bank_account_balance_history
            WHERE bank_account_id = v_bank_account_id
                AND transaction_type = 'initial'
                AND amount = 0
                AND balance_before = 0
                AND balance_after = 0;
        END IF;
        
        -- Create/update initial history entry with correct balance
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
        ELSE
            -- Update existing initial history entry
            UPDATE public.bank_account_balance_history
            SET balance_after = v_net_balance,
                description = 'Initial balance calculated from existing transactions',
                updated_at = NOW()
            WHERE bank_account_id = v_bank_account_id
                AND transaction_type = 'initial';
        END IF;
    END LOOP;
END $$;
