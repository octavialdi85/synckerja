-- Migration: Fix remaining_debt to use SUM(principal_amount) instead of SUM(payment_amount)
-- Description: Untuk revolving credit (Pinjaman Online), remaining_debt harus dihitung dari:
--              remaining_debt = debt_amount - SUM(principal_amount)
--              Bukan debt_amount - SUM(payment_amount) karena payment_amount termasuk bunga.
--              
--              Contoh:
--              - Expense pertama: 1jt → debt_amount = 1jt
--              - Bayar 1.2jt (1jt pokok + 200rb bunga): principal_paid = 1jt → remaining = 0
--              - Expense kedua: 300rb → debt_amount = 1.3jt
--              - remaining = 1.3jt - 1jt = 300rb (benar!)
--              - available = 1jt - 300rb = 700rb (benar!)
-- Created: 2025-02-01

CREATE OR REPLACE FUNCTION public.recalculate_pinjaman_online_debt_amount(p_debt_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_debt_record RECORD;
    v_total_expense NUMERIC(15, 2);
    v_total_paid NUMERIC(15, 2);
    v_total_principal_paid NUMERIC(15, 2);
    v_remaining_debt NUMERIC(15, 2);
BEGIN
    SELECT * INTO v_debt_record
    FROM public.debts
    WHERE id = p_debt_id;

    IF v_debt_record IS NULL OR v_debt_record.debt_type != 'Pinjaman Online' THEN
        RETURN;
    END IF;

    -- Total expense (total amount borrowed from this debt)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_expense
    FROM public.expenses
    WHERE withdrawal_from_balance = p_debt_id;

    -- Total paid (for display, includes interest)
    SELECT COALESCE(SUM(payment_amount), 0)
    INTO v_total_paid
    FROM public.debt_payments
    WHERE debt_id = p_debt_id;

    -- Total principal paid (only principal, excludes interest) - for remaining calculation
    SELECT COALESCE(SUM(COALESCE(principal_amount, payment_amount)), 0)
    INTO v_total_principal_paid
    FROM public.debt_payments
    WHERE debt_id = p_debt_id;

    -- remaining_debt = total expense - total principal paid (outstanding principal)
    v_remaining_debt := GREATEST(0, v_total_expense - v_total_principal_paid);

    -- Update debt record
    -- debt_amount = total expense (total borrowed)
    -- paid_amount = total paid (for display, includes interest)
    -- remaining_debt = outstanding principal
    -- available_limit = limit - remaining (available credit)
    UPDATE public.debts
    SET 
        debt_amount = v_total_expense,
        paid_amount = v_total_paid,
        remaining_debt = v_remaining_debt,
        available_limit = GREATEST(0, COALESCE(limit_amount, 0) - v_remaining_debt),
        updated_at = NOW()
    WHERE id = p_debt_id;
END;
$$;

COMMENT ON FUNCTION public.recalculate_pinjaman_online_debt_amount(UUID) IS 'Pinjaman Online: debt_amount = total expense, remaining_debt = debt_amount - SUM(principal_amount), available_limit = limit - remaining.';

-- Recalculate all existing Pinjaman Online debts
DO $$
DECLARE
    v_debt RECORD;
BEGIN
    FOR v_debt IN SELECT id FROM public.debts WHERE debt_type = 'Pinjaman Online'
    LOOP
        PERFORM public.recalculate_pinjaman_online_debt_amount(v_debt.id);
    END LOOP;
END $$;
