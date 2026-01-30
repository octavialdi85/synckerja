-- Migration: Available Limit bertambah otomatis ketika ada Paid
-- Description: Ketika pembayaran masuk, remaining_debt berkurang. Available Limit = limit_amount - remaining_debt,
--              sehingga Available Limit bertambah otomatis saat ada Paid.
-- Created: 2025-02-01

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

    -- remaining_debt = debt_amount - paid_amount
    v_remaining_debt := GREATEST(0, COALESCE(v_debt_record.debt_amount, 0) - v_total_paid);

    -- available_limit = limit_amount - remaining_debt (bertambah ketika Paid masuk karena remaining_debt berkurang)
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

COMMENT ON FUNCTION public.update_debt_paid_amount() IS 'Updates paid_amount, remaining_debt, and available_limit. remaining_debt = debt_amount - paid_amount. available_limit = limit_amount - remaining_debt (bertambah ketika ada Paid).';
