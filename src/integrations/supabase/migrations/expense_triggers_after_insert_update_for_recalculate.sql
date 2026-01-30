-- Migration: Expense triggers AFTER INSERT/UPDATE so recalculate sees new expense
-- Description: Trigger INSERT/UPDATE pakai BEFORE -> recalculate tidak lihat baris baru -> remaining_debt tidak ikut.
--              Pisah: BEFORE = validasi saja; AFTER = update debt + recalculate. Recalculate baca dari expenses
--              sehingga Debt (remaining_debt) terisi benar saat ada pengeluaran baru dari Pinjaman Online.
-- Created: 2025-02-01

-- ============================================
-- 1. Validate-only: BEFORE INSERT (no update)
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_expense_insert_debt()
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

    RETURN NEW;
END;
$$;

-- ============================================
-- 2. Update + recalculate: AFTER INSERT (new row exists)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_expense_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_debt_record RECORD;
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

    UPDATE debts
    SET
        available_limit = COALESCE(available_limit, limit_amount) - NEW.amount,
        debt_amount = CASE 
            WHEN v_debt_record.debt_type = 'Pinjaman Online' THEN debt_amount
            ELSE COALESCE(debt_amount, 0) + NEW.amount
        END,
        updated_at = NOW()
    WHERE id = NEW.withdrawal_from_balance;

    IF v_debt_record.debt_type = 'Pinjaman Online' THEN
        PERFORM public.recalculate_pinjaman_online_debt_amount(NEW.withdrawal_from_balance);
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================
-- 3. Validate-only: BEFORE UPDATE (when amount or withdrawal changes)
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_expense_update_debt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_debt_record RECORD;
    v_available_limit NUMERIC(15, 2);
    v_amount_diff NUMERIC(15, 2);
BEGIN
    v_amount_diff := NEW.amount - OLD.amount;

    IF (OLD.withdrawal_from_balance IS DISTINCT FROM NEW.withdrawal_from_balance) THEN
        IF NEW.withdrawal_from_balance IS NOT NULL THEN
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
        END IF;
        RETURN NEW;
    END IF;

    IF OLD.withdrawal_from_balance IS NOT NULL AND v_amount_diff > 0 THEN
        SELECT id, limit_amount, available_limit, debt_amount, status, debt_type
        INTO v_debt_record
        FROM debts
        WHERE id = OLD.withdrawal_from_balance
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Debt with id % not found', OLD.withdrawal_from_balance;
        END IF;

        v_available_limit := COALESCE(v_debt_record.available_limit, v_debt_record.limit_amount);
        IF v_available_limit < v_amount_diff THEN
            RAISE EXCEPTION 'Insufficient available limit. Available: %, Required additional: %',
                v_available_limit, v_amount_diff;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================
-- 4. Update + recalculate: AFTER UPDATE (expenses has NEW state)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_expense_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_old_debt_record RECORD;
    v_new_debt_record RECORD;
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

-- handle_expense_delete unchanged (already AFTER DELETE, recalculate sees deleted row gone)
-- Ensure it exists and calls recalculate for Pinjaman Online
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

-- ============================================
-- 5. Drop old triggers, create new (BEFORE validate, AFTER update+recalculate)
-- ============================================
DROP TRIGGER IF EXISTS trigger_expense_insert_debt_update ON expenses;
DROP TRIGGER IF EXISTS trigger_expense_update_debt_update ON expenses;
DROP TRIGGER IF EXISTS trigger_expense_delete_debt_update ON expenses;

CREATE TRIGGER trigger_expense_insert_validate
    BEFORE INSERT ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION validate_expense_insert_debt();

CREATE TRIGGER trigger_expense_insert_debt_update
    AFTER INSERT ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION handle_expense_insert();

CREATE TRIGGER trigger_expense_update_validate
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    WHEN (
        OLD.withdrawal_from_balance IS DISTINCT FROM NEW.withdrawal_from_balance
        OR OLD.amount IS DISTINCT FROM NEW.amount
    )
    EXECUTE FUNCTION validate_expense_update_debt();

CREATE TRIGGER trigger_expense_update_debt_update
    AFTER UPDATE ON expenses
    FOR EACH ROW
    WHEN (
        OLD.withdrawal_from_balance IS DISTINCT FROM NEW.withdrawal_from_balance
        OR OLD.amount IS DISTINCT FROM NEW.amount
    )
    EXECUTE FUNCTION handle_expense_update();

CREATE TRIGGER trigger_expense_delete_debt_update
    AFTER DELETE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION handle_expense_delete();

-- ============================================
-- 6. Recalculate existing Pinjaman Online (fix current "tess pengeluaran" + any stale data)
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

COMMENT ON FUNCTION public.validate_expense_insert_debt() IS 'BEFORE INSERT: validate debt exists, active, available_limit >= amount. No update.';
COMMENT ON FUNCTION public.validate_expense_update_debt() IS 'BEFORE UPDATE: validate when amount or withdrawal_from_balance changes. No update.';
COMMENT ON FUNCTION public.handle_expense_insert() IS 'AFTER INSERT: update debt + recalculate Pinjaman Online. Recalculate sees new row.';
COMMENT ON FUNCTION public.handle_expense_update() IS 'AFTER UPDATE: update debt + recalculate Pinjaman Online. Recalculate sees NEW state.';
COMMENT ON FUNCTION public.handle_expense_delete() IS 'AFTER DELETE: update debt + recalculate Pinjaman Online.';
