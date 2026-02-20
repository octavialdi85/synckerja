-- Migration: Ensure remaining_debt = debt_amount - paid_amount for all debts
-- Description: Kolom remaining_debt selalu hasil pengurangan debt_amount - paid_amount.
--              Untuk semua tipe debt: remaining_debt = GREATEST(0, debt_amount - paid_amount).
-- Created: 2025-02-01

-- ============================================
-- 1. Update trigger update_debt_paid_amount: selalu set remaining_debt = debt_amount - paid_amount
-- ============================================
CREATE OR REPLACE FUNCTION public.update_debt_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
    v_debt_id UUID;
    v_total_paid NUMERIC(15, 2);
    v_debt_record RECORD;
    v_remaining_debt NUMERIC(15, 2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_debt_id := OLD.debt_id;
    ELSE
        v_debt_id := NEW.debt_id;
    END IF;

    IF v_debt_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT COALESCE(SUM(payment_amount), 0)
    INTO v_total_paid
    FROM public.debt_payments
    WHERE debt_id = v_debt_id;

    SELECT * INTO v_debt_record
    FROM public.debts
    WHERE id = v_debt_id
    FOR UPDATE;

    IF v_debt_record IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- remaining_debt = debt_amount - paid_amount (untuk semua tipe debt)
    v_remaining_debt := GREATEST(0, COALESCE(v_debt_record.debt_amount, 0) - v_total_paid);

    -- available_limit = limit_amount - remaining_debt (satu rumus untuk semua: expense baru & lunas)
    UPDATE public.debts
    SET 
        paid_amount = v_total_paid,
        remaining_debt = v_remaining_debt,
        available_limit = GREATEST(0, COALESCE(v_debt_record.limit_amount, 0) - v_remaining_debt),
        updated_at = NOW()
    WHERE id = v_debt_id;

    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating debt paid_amount: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_debt_paid_amount() IS 'Updates paid_amount, remaining_debt, and available_limit. remaining_debt = debt_amount - paid_amount. available_limit = limit_amount - remaining_debt (semua tipe debt).';

-- ============================================
-- 2. Update recalculate_pinjaman_online_debt_amount: debt_amount = total expense, remaining_debt = debt_amount - paid_amount
-- ============================================
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

    -- debt_amount = total expense (total yang dipakai); remaining_debt = debt_amount - paid_amount
    v_remaining_debt := GREATEST(0, v_total_expense - v_total_paid);

    -- available_limit = limit_amount - remaining_debt (satu rumus: benar saat expense baru & saat lunas)
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

-- ============================================
-- 3. Recalculate Pinjaman Online agar debt_amount = total expense (bukan sisa)
-- ============================================
DO $$
DECLARE
    v_debt RECORD;
BEGIN
    FOR v_debt IN SELECT id FROM public.debts WHERE debt_type = 'Pinjaman Online'
    LOOP
        PERFORM public.recalculate_pinjaman_online_debt_amount(v_debt.id);
    END LOOP;
END $$;

-- ============================================
-- 4. Backfill: set remaining_debt = debt_amount - paid_amount untuk semua baris
-- ============================================
UPDATE public.debts
SET 
    remaining_debt = GREATEST(0, COALESCE(debt_amount, 0) - COALESCE(paid_amount, 0)),
    updated_at = NOW()
WHERE remaining_debt IS NULL 
   OR remaining_debt != GREATEST(0, COALESCE(debt_amount, 0) - COALESCE(paid_amount, 0));

COMMENT ON COLUMN public.debts.remaining_debt IS 'Sisa hutang yang harus dibayar = debt_amount - paid_amount';
