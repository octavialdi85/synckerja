-- Migration: Update debt_amount on payment for Pinjaman Online
-- Description: For Pinjaman Online, debt_amount should decrease when payment is made.
--              debt_amount = sisa yang harus dibayar (bukan total dipakai untuk expense).
--              Saat ada pembayaran: debt_amount = debt_amount - payment_amount.
-- Created: 2025-02-01

CREATE OR REPLACE FUNCTION public.update_debt_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
    v_debt_id UUID;
    v_total_paid NUMERIC(15, 2);
    v_debt_record RECORD;
    v_remaining_debt NUMERIC(15, 2);
    v_payment_amount NUMERIC(15, 2);
    v_total_expense NUMERIC(15, 2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_debt_id := OLD.debt_id;
        v_payment_amount := OLD.payment_amount;
    ELSE
        v_debt_id := NEW.debt_id;
        v_payment_amount := NEW.payment_amount;
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

    -- Calculate remaining debt
    IF v_debt_record.debt_type = 'Pinjaman Online' THEN
        -- For Pinjaman Online: debt_amount = sisa yang harus dibayar
        -- Hitung dari total expense (dari expenses table) dikurangi total payment
        SELECT COALESCE(SUM(amount), 0)
        INTO v_total_expense
        FROM public.expenses
        WHERE withdrawal_from_balance = v_debt_id;
        
        -- debt_amount = total expense - total payment (sisa yang harus dibayar)
        v_remaining_debt := GREATEST(0, v_total_expense - v_total_paid);
    ELSE
        -- For other types: remaining_debt = debt_amount - paid_amount (debt_amount tidak berubah)
        v_remaining_debt := GREATEST(0, COALESCE(v_debt_record.debt_amount, 0) - v_total_paid);
    END IF;

    UPDATE public.debts
    SET 
        paid_amount = v_total_paid,
        remaining_debt = v_remaining_debt,
        debt_amount = CASE 
            WHEN v_debt_record.debt_type = 'Pinjaman Online' THEN v_remaining_debt
            ELSE debt_amount
        END,
        available_limit = CASE 
            WHEN v_debt_record.debt_type = 'Pinjaman Online' THEN GREATEST(0, COALESCE(v_debt_record.limit_amount, 0) - (COALESCE(v_remaining_debt, 0) + COALESCE(v_total_paid, 0)))
            ELSE available_limit
        END,
        updated_at = NOW()
    WHERE id = v_debt_id;

    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating debt paid_amount: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_debt_paid_amount() IS 'Updates paid_amount, remaining_debt. For Pinjaman Online: debt_amount decreases on payment (debt_amount = sisa yang harus dibayar), available_limit = limit_amount - debt_amount.';
