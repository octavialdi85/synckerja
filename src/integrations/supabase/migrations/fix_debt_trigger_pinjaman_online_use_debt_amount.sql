-- Migration: Pinjaman Online - available_limit = sisa plafon (limit_amount - debt_amount)
-- Description: For Pinjaman Online, limit_amount = Total Limit, debt_amount = total used for expense.
--              available_limit = sisa plafon = limit_amount - debt_amount (tidak berubah saat Pay Debt).
--              remaining_debt = debt_amount - paid_amount (sisa harus dibayar).
-- Created: 2025-01-29

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
    WHERE id = v_debt_id;

    IF v_debt_record IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- For Pinjaman Online: debt_amount = total used for expense; remaining_debt = debt_amount - paid (sisa harus dibayar).
    -- available_limit = limit_amount - debt_amount (sisa plafon, tidak berubah saat Pay Debt).
    IF v_debt_record.debt_type = 'Pinjaman Online' THEN
        v_remaining_debt := GREATEST(0, COALESCE(v_debt_record.debt_amount, 0) - v_total_paid);
    ELSE
        v_remaining_debt := GREATEST(0, COALESCE(v_debt_record.debt_amount, 0) - v_total_paid);
    END IF;

    UPDATE public.debts
    SET 
        paid_amount = v_total_paid,
        remaining_debt = v_remaining_debt,
        available_limit = CASE 
            WHEN v_debt_record.debt_type = 'Pinjaman Online' THEN GREATEST(0, COALESCE(v_debt_record.limit_amount, 0) - COALESCE(v_debt_record.debt_amount, 0))
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

COMMENT ON FUNCTION public.update_debt_paid_amount() IS 'Updates paid_amount, remaining_debt. For Pinjaman Online: available_limit = limit_amount - debt_amount (sisa plafon).';
