-- Migration: Create trigger to auto-update paid_amount in debts table
-- Description: Automatically updates paid_amount in debts table based on sum of payments in debt_payments
-- Created: 2025-02-01

-- Function to update paid_amount in debts table based on debt_payments
CREATE OR REPLACE FUNCTION public.update_debt_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
    v_debt_id UUID;
    v_total_paid NUMERIC(15, 2);
    v_debt_record RECORD;
BEGIN
    -- Determine debt_id based on trigger operation
    IF TG_OP = 'DELETE' THEN
        v_debt_id := OLD.debt_id;
    ELSE
        v_debt_id := NEW.debt_id;
    END IF;

    -- If no debt_id, nothing to do
    IF v_debt_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Calculate total paid amount from debt_payments for this debt
    SELECT COALESCE(SUM(payment_amount), 0)
    INTO v_total_paid
    FROM public.debt_payments
    WHERE debt_id = v_debt_id;

    -- Get debt record to check debt_type
    SELECT * INTO v_debt_record
    FROM public.debts
    WHERE id = v_debt_id;

    -- If debt not found, return
    IF v_debt_record IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Update paid_amount in debts table
    UPDATE public.debts
    SET 
        paid_amount = v_total_paid,
        updated_at = NOW()
    WHERE id = v_debt_id;

    -- For Pinjaman Online, also update available_limit
    -- available_limit = limit_amount - paid_amount
    IF v_debt_record.debt_type = 'Pinjaman Online' THEN
        UPDATE public.debts
        SET 
            available_limit = GREATEST(0, v_debt_record.limit_amount - v_total_paid),
            updated_at = NOW()
        WHERE id = v_debt_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the insert/update/delete
        RAISE WARNING 'Error updating debt paid_amount: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_update_debt_paid_amount_on_insert ON public.debt_payments;
DROP TRIGGER IF EXISTS trg_update_debt_paid_amount_on_update ON public.debt_payments;
DROP TRIGGER IF EXISTS trg_update_debt_paid_amount_on_delete ON public.debt_payments;

-- Create triggers on debt_payments table
CREATE TRIGGER trg_update_debt_paid_amount_on_insert
    AFTER INSERT ON public.debt_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_debt_paid_amount();

CREATE TRIGGER trg_update_debt_paid_amount_on_update
    AFTER UPDATE ON public.debt_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_debt_paid_amount();

CREATE TRIGGER trg_update_debt_paid_amount_on_delete
    AFTER DELETE ON public.debt_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_debt_paid_amount();

-- Comments
COMMENT ON FUNCTION public.update_debt_paid_amount() IS 'Automatically updates paid_amount in debts table based on sum of payments in debt_payments. Also updates available_limit for Pinjaman Online type.';
