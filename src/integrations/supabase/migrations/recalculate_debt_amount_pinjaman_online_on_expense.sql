-- Migration: Recalculate debt_amount for Pinjaman Online when expense changes
-- Description: After expense insert/update/delete, recalculate for Pinjaman Online.
--              debt_amount = total expense, remaining_debt = debt_amount - paid_amount,
--              available_limit = limit_amount - remaining_debt (satu rumus: expense baru & lunas).
-- Created: 2025-02-01

-- Function to recalculate debt_amount for Pinjaman Online
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

    -- Calculate total expense
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_expense
    FROM public.expenses
    WHERE withdrawal_from_balance = p_debt_id;

    -- Calculate total paid
    SELECT COALESCE(SUM(payment_amount), 0)
    INTO v_total_paid
    FROM public.debt_payments
    WHERE debt_id = p_debt_id;

    -- remaining_debt = total expense - total paid (sisa yang harus dibayar)
    v_remaining_debt := GREATEST(0, v_total_expense - v_total_paid);

    -- debt_amount = total expense; available_limit = limit_amount - remaining_debt (satu rumus: expense baru & lunas)
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

-- Update expense triggers to recalculate debt_amount for Pinjaman Online
CREATE OR REPLACE FUNCTION public.handle_expense_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_debt_record RECORD;
    v_available_limit NUMERIC(15, 2);
BEGIN
    IF NEW.withdrawal_from_balance IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT id, limit_amount, available_limit, debt_amount, status, debt_type
    INTO v_debt_record
    FROM debts
    WHERE id = NEW.withdrawal_from_balance
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Debt with id % not found', NEW.withdrawal_from_balance;
    END IF;

    IF v_debt_record.status != 'active' THEN
        RAISE EXCEPTION 'Cannot use debt with status %. Only active debts can be used.', v_debt_record.status;
    END IF;

    v_available_limit := COALESCE(v_debt_record.available_limit, v_debt_record.limit_amount);

    IF v_available_limit < NEW.amount THEN
        RAISE EXCEPTION 'Insufficient available limit. Available: %, Required: %',
            v_available_limit, NEW.amount;
    END IF;

    UPDATE debts
    SET
        available_limit = COALESCE(available_limit, limit_amount) - NEW.amount,
        debt_amount = CASE 
            WHEN v_debt_record.debt_type = 'Pinjaman Online' THEN debt_amount -- Will be recalculated below
            ELSE COALESCE(debt_amount, 0) + NEW.amount
        END,
        updated_at = NOW()
    WHERE id = NEW.withdrawal_from_balance;

    -- Recalculate debt_amount for Pinjaman Online
    IF v_debt_record.debt_type = 'Pinjaman Online' THEN
        PERFORM public.recalculate_pinjaman_online_debt_amount(NEW.withdrawal_from_balance);
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_expense_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_old_debt_record RECORD;
    v_new_debt_record RECORD;
    v_old_available_limit NUMERIC(15, 2);
    v_new_available_limit NUMERIC(15, 2);
    v_amount_diff NUMERIC(15, 2);
BEGIN
    v_amount_diff := NEW.amount - OLD.amount;

    IF (OLD.withdrawal_from_balance IS DISTINCT FROM NEW.withdrawal_from_balance) THEN
        IF OLD.withdrawal_from_balance IS NOT NULL THEN
            SELECT debt_type INTO v_old_debt_record FROM debts WHERE id = OLD.withdrawal_from_balance;
            UPDATE debts
            SET
                available_limit = COALESCE(available_limit, limit_amount) + OLD.amount,
                debt_amount = CASE 
                    WHEN v_old_debt_record.debt_type = 'Pinjaman Online' THEN debt_amount
                    ELSE GREATEST(0, COALESCE(debt_amount, 0) - OLD.amount)
                END,
                updated_at = NOW()
            WHERE id = OLD.withdrawal_from_balance;
            
            IF v_old_debt_record.debt_type = 'Pinjaman Online' THEN
                PERFORM public.recalculate_pinjaman_online_debt_amount(OLD.withdrawal_from_balance);
            END IF;
        END IF;

        IF NEW.withdrawal_from_balance IS NOT NULL THEN
            SELECT id, limit_amount, available_limit, debt_amount, status, debt_type
            INTO v_new_debt_record
            FROM debts
            WHERE id = NEW.withdrawal_from_balance
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Debt with id % not found', NEW.withdrawal_from_balance;
            END IF;

            IF v_new_debt_record.status != 'active' THEN
                RAISE EXCEPTION 'Cannot use debt with status %. Only active debts can be used.', v_new_debt_record.status;
            END IF;

            v_new_available_limit := COALESCE(v_new_debt_record.available_limit, v_new_debt_record.limit_amount);

            IF v_new_available_limit < NEW.amount THEN
                RAISE EXCEPTION 'Insufficient available limit. Available: %, Required: %',
                    v_new_available_limit, NEW.amount;
            END IF;

            UPDATE debts
            SET
                available_limit = COALESCE(available_limit, limit_amount) - NEW.amount,
                debt_amount = CASE 
                    WHEN v_new_debt_record.debt_type = 'Pinjaman Online' THEN debt_amount
                    ELSE COALESCE(debt_amount, 0) + NEW.amount
                END,
                updated_at = NOW()
            WHERE id = NEW.withdrawal_from_balance;
            
            IF v_new_debt_record.debt_type = 'Pinjaman Online' THEN
                PERFORM public.recalculate_pinjaman_online_debt_amount(NEW.withdrawal_from_balance);
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    IF OLD.withdrawal_from_balance IS NOT NULL AND v_amount_diff != 0 THEN
        SELECT id, limit_amount, available_limit, debt_amount, status, debt_type
        INTO v_old_debt_record
        FROM debts
        WHERE id = OLD.withdrawal_from_balance
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Debt with id % not found', OLD.withdrawal_from_balance;
        END IF;

        v_old_available_limit := COALESCE(v_old_debt_record.available_limit, v_old_debt_record.limit_amount);

        IF v_amount_diff > 0 THEN
            IF v_old_available_limit < v_amount_diff THEN
                RAISE EXCEPTION 'Insufficient available limit. Available: %, Required additional: %',
                    v_old_available_limit, v_amount_diff;
            END IF;
        END IF;

        UPDATE debts
        SET
            available_limit = COALESCE(available_limit, limit_amount) - v_amount_diff,
            debt_amount = CASE 
                WHEN v_old_debt_record.debt_type = 'Pinjaman Online' THEN debt_amount
                ELSE COALESCE(debt_amount, 0) + v_amount_diff
            END,
            updated_at = NOW()
        WHERE id = OLD.withdrawal_from_balance;
        
        IF v_old_debt_record.debt_type = 'Pinjaman Online' THEN
            PERFORM public.recalculate_pinjaman_online_debt_amount(OLD.withdrawal_from_balance);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_expense_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_debt_record RECORD;
BEGIN
    IF OLD.withdrawal_from_balance IS NULL THEN
        RETURN OLD;
    END IF;

    SELECT debt_type INTO v_debt_record FROM debts WHERE id = OLD.withdrawal_from_balance;

    UPDATE debts
    SET
        available_limit = COALESCE(available_limit, limit_amount) + OLD.amount,
        debt_amount = CASE 
            WHEN v_debt_record.debt_type = 'Pinjaman Online' THEN debt_amount
            ELSE GREATEST(0, COALESCE(debt_amount, 0) - OLD.amount)
        END,
        updated_at = NOW()
    WHERE id = OLD.withdrawal_from_balance;
    
    IF v_debt_record.debt_type = 'Pinjaman Online' THEN
        PERFORM public.recalculate_pinjaman_online_debt_amount(OLD.withdrawal_from_balance);
    END IF;

    RETURN OLD;
END;
$$;

-- Update payment trigger to use the same function
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

    -- For Pinjaman Online: use recalculate function (it will update paid_amount, remaining_debt, debt_amount, available_limit)
    IF v_debt_record.debt_type = 'Pinjaman Online' THEN
        PERFORM public.recalculate_pinjaman_online_debt_amount(v_debt_id);
    ELSE
        -- For other types: remaining_debt = debt_amount - paid_amount (debt_amount tidak berubah)
        v_remaining_debt := GREATEST(0, COALESCE(v_debt_record.debt_amount, 0) - v_total_paid);
        UPDATE public.debts
        SET 
            paid_amount = v_total_paid,
            remaining_debt = v_remaining_debt,
            updated_at = NOW()
        WHERE id = v_debt_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating debt paid_amount: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.recalculate_pinjaman_online_debt_amount(UUID) IS 'Pinjaman Online: debt_amount = total expense, remaining_debt = debt_amount - paid_amount, available_limit = limit_amount - remaining_debt.';
