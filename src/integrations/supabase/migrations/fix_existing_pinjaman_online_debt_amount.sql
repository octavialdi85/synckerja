-- Migration: Fix existing Pinjaman Online debt_amount
-- Description: Recalculate debt_amount and available_limit for all existing Pinjaman Online debts
--              to ensure consistency: debt_amount = total expense - total paid
-- Created: 2025-02-01

-- Recalculate debt_amount for all Pinjaman Online debts
DO $$
DECLARE
    v_debt RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_debt IN SELECT id FROM public.debts WHERE debt_type = 'Pinjaman Online'
    LOOP
        PERFORM public.recalculate_pinjaman_online_debt_amount(v_debt.id);
        v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Recalculated debt_amount for % Pinjaman Online debts', v_count;
END $$;
