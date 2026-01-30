-- Migration: Available Limit Pinjaman Online = limit_amount - remaining_debt
-- Description: Satu rumus untuk semua: available_limit = limit_amount - remaining_debt.
--              Benar saat expense baru (remaining_debt naik → available_limit turun) dan saat lunas (remaining_debt = 0 → plafon penuh).
--              Selaras dengan ensure_remaining_debt, recalculate_debt_amount_pinjaman_online_on_expense, update_available_limit_on_payment.
-- Created: 2025-02-01

CREATE OR REPLACE FUNCTION public.recalculate_pinjaman_online_debt_amount(p_debt_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_debt_record RECORD;
    v_total_expense NUMERIC(15, 2);
    v_total_paid NUMERIC(15, 2);
    v_remaining_debt NUMERIC(15, 2);
BEGIN
    SELECT * INTO v_debt_record
    FROM public.debts
    WHERE id = p_debt_id;

    IF v_debt_record IS NULL OR v_debt_record.debt_type != 'Pinjaman Online' THEN
        RETURN;
    END IF;

    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_expense
    FROM public.expenses
    WHERE withdrawal_from_balance = p_debt_id;

    SELECT COALESCE(SUM(payment_amount), 0)
    INTO v_total_paid
    FROM public.debt_payments
    WHERE debt_id = p_debt_id;

    -- remaining_debt = total expense - total paid (sisa yang harus dibayar)
    v_remaining_debt := GREATEST(0, v_total_expense - v_total_paid);

    -- debt_amount = total expense; available_limit = limit_amount - remaining_debt (plafon pulih saat lunas)
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

COMMENT ON FUNCTION public.recalculate_pinjaman_online_debt_amount(UUID) IS 'Pinjaman Online: debt_amount = total expense, remaining_debt = debt_amount - paid_amount, available_limit = limit_amount - remaining_debt.';

-- Perbaiki data existing: jalankan recalculate untuk semua Pinjaman Online
DO $$
DECLARE
    v_debt RECORD;
BEGIN
    FOR v_debt IN SELECT id FROM public.debts WHERE debt_type = 'Pinjaman Online'
    LOOP
        PERFORM public.recalculate_pinjaman_online_debt_amount(v_debt.id);
    END LOOP;
END $$;
