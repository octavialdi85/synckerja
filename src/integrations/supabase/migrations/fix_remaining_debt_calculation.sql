-- Migration: Fix remaining_debt calculation in trigger
-- Description: Ensures remaining_debt is calculated correctly, especially when no payments exist
-- Created: 2025-02-01

-- Update trigger function to correctly calculate remaining_debt
CREATE OR REPLACE FUNCTION public.update_debt_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
    v_debt_id UUID;
    v_total_paid NUMERIC(15, 2);
    v_debt_record RECORD;
    v_remaining_debt NUMERIC(15, 2);
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

    -- Calculate remaining debt based on debt type
    IF v_debt_record.debt_type = 'Pinjaman Online' THEN
        -- For Pinjaman Online: remaining_debt = limit_amount - paid_amount
        -- If no payment, remaining_debt = limit_amount (full debt)
        v_remaining_debt := GREATEST(0, COALESCE(v_debt_record.limit_amount, 0) - v_total_paid);
    ELSE
        -- For other types: remaining_debt = debt_amount - paid_amount
        -- If no payment, remaining_debt = debt_amount (full debt)
        v_remaining_debt := GREATEST(0, COALESCE(v_debt_record.debt_amount, 0) - v_total_paid);
    END IF;

    -- Update paid_amount and remaining_debt in debts table
    UPDATE public.debts
    SET 
        paid_amount = v_total_paid,
        remaining_debt = v_remaining_debt,
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

-- Backfill remaining_debt for all debts to ensure correct values
UPDATE public.debts d
SET 
    remaining_debt = CASE 
        WHEN d.debt_type = 'Pinjaman Online' THEN
            GREATEST(0, COALESCE(d.limit_amount, 0) - COALESCE(d.paid_amount, 0))
        ELSE
            GREATEST(0, COALESCE(d.debt_amount, 0) - COALESCE(d.paid_amount, 0))
    END,
    updated_at = NOW()
WHERE remaining_debt IS NULL 
   OR remaining_debt != CASE 
        WHEN d.debt_type = 'Pinjaman Online' THEN
            GREATEST(0, COALESCE(d.limit_amount, 0) - COALESCE(d.paid_amount, 0))
        ELSE
            GREATEST(0, COALESCE(d.debt_amount, 0) - COALESCE(d.paid_amount, 0))
    END;
