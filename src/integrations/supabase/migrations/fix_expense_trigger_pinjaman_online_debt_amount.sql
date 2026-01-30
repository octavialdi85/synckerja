-- Migration: Fix expense triggers for Pinjaman Online debt_amount
-- Description: For Pinjaman Online, debt_amount is calculated from total expense - total paid (by payment trigger).
--              Expense triggers should NOT modify debt_amount for Pinjaman Online, only available_limit.
-- Created: 2025-02-01

-- ============================================
-- Update trigger: handle_expense_insert (Pinjaman Online: don't modify debt_amount)
-- ============================================
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
            WHEN v_debt_record.debt_type = 'Pinjaman Online' THEN debt_amount -- Don't modify, payment trigger will recalculate
            ELSE COALESCE(debt_amount, 0) + NEW.amount
        END,
        updated_at = NOW()
    WHERE id = NEW.withdrawal_from_balance;

    RETURN NEW;
END;
$$;

-- ============================================
-- Update trigger: handle_expense_update (Pinjaman Online: don't modify debt_amount)
-- ============================================
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
                    WHEN v_old_debt_record.debt_type = 'Pinjaman Online' THEN debt_amount -- Don't modify
                    ELSE GREATEST(0, COALESCE(debt_amount, 0) - OLD.amount)
                END,
                updated_at = NOW()
            WHERE id = OLD.withdrawal_from_balance;
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
                    WHEN v_new_debt_record.debt_type = 'Pinjaman Online' THEN debt_amount -- Don't modify
                    ELSE COALESCE(debt_amount, 0) + NEW.amount
                END,
                updated_at = NOW()
            WHERE id = NEW.withdrawal_from_balance;
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
                WHEN v_old_debt_record.debt_type = 'Pinjaman Online' THEN debt_amount -- Don't modify
                ELSE COALESCE(debt_amount, 0) + v_amount_diff
            END,
            updated_at = NOW()
        WHERE id = OLD.withdrawal_from_balance;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================
-- Update trigger: handle_expense_delete (Pinjaman Online: don't modify debt_amount)
-- ============================================
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
            WHEN v_debt_record.debt_type = 'Pinjaman Online' THEN debt_amount -- Don't modify
            ELSE GREATEST(0, COALESCE(debt_amount, 0) - OLD.amount)
        END,
        updated_at = NOW()
    WHERE id = OLD.withdrawal_from_balance;

    RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.handle_expense_insert() IS 'Handles expense insert. For Pinjaman Online: only updates available_limit, debt_amount is recalculated by payment trigger.';
COMMENT ON FUNCTION public.handle_expense_update() IS 'Handles expense update. For Pinjaman Online: only updates available_limit, debt_amount is recalculated by payment trigger.';
COMMENT ON FUNCTION public.handle_expense_delete() IS 'Handles expense delete. For Pinjaman Online: only updates available_limit, debt_amount is recalculated by payment trigger.';
