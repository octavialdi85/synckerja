-- Soft-delete expense (status active -> deleted) must reverse debt like AFTER DELETE.
-- Sync remaining_debt for non–Pinjaman Online on expense insert/update/delete so UI/DB stay aligned.

-- ============================================
-- 1. AFTER INSERT: keep remaining_debt in sync (non–Pinjaman Online)
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
        remaining_debt = CASE
            WHEN v_debt_record.debt_type = 'Pinjaman Online' THEN remaining_debt
            ELSE GREATEST(0, COALESCE(debt_amount, 0) + NEW.amount - COALESCE(paid_amount, 0))
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
-- 2. AFTER UPDATE (amount / withdrawal): sync remaining_debt on each branch
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
                remaining_debt = CASE
                    WHEN v_old_debt_record.debt_type = 'Pinjaman Online' THEN remaining_debt
                    ELSE GREATEST(
                        0,
                        GREATEST(0, COALESCE(debt_amount, 0) - OLD.amount) - COALESCE(paid_amount, 0)
                    )
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
                remaining_debt = CASE
                    WHEN v_new_debt_record.debt_type = 'Pinjaman Online' THEN remaining_debt
                    ELSE GREATEST(0, COALESCE(debt_amount, 0) + NEW.amount - COALESCE(paid_amount, 0))
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
            remaining_debt = CASE
                WHEN v_old_debt_record.debt_type = 'Pinjaman Online' THEN remaining_debt
                ELSE GREATEST(0, COALESCE(debt_amount, 0) + v_amount_diff - COALESCE(paid_amount, 0))
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

-- ============================================
-- 3. AFTER DELETE: sync remaining_debt (non–Pinjaman Online)
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
            WHEN v_debt_record.debt_type = 'Pinjaman Online' THEN debt_amount
            ELSE GREATEST(0, COALESCE(debt_amount, 0) - OLD.amount)
        END,
        remaining_debt = CASE
            WHEN v_debt_record.debt_type = 'Pinjaman Online' THEN remaining_debt
            ELSE GREATEST(
                0,
                GREATEST(0, COALESCE(debt_amount, 0) - OLD.amount) - COALESCE(paid_amount, 0)
            )
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
-- 4. AFTER UPDATE status active -> deleted: reverse debt (soft delete)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_expense_soft_delete_debt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_debt_record RECORD;
BEGIN
    IF OLD.status IS DISTINCT FROM 'active' OR NEW.status IS DISTINCT FROM 'deleted' THEN
        RETURN NEW;
    END IF;

    IF OLD.withdrawal_from_balance IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT debt_type INTO v_debt_record FROM debts WHERE id = OLD.withdrawal_from_balance;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    UPDATE debts
    SET
        available_limit = COALESCE(available_limit, limit_amount) + OLD.amount,
        debt_amount = CASE
            WHEN v_debt_record.debt_type = 'Pinjaman Online' THEN debt_amount
            ELSE GREATEST(0, COALESCE(debt_amount, 0) - OLD.amount)
        END,
        remaining_debt = CASE
            WHEN v_debt_record.debt_type = 'Pinjaman Online' THEN remaining_debt
            ELSE GREATEST(
                0,
                GREATEST(0, COALESCE(debt_amount, 0) - OLD.amount) - COALESCE(paid_amount, 0)
            )
        END,
        updated_at = NOW()
    WHERE id = OLD.withdrawal_from_balance;

    IF v_debt_record.debt_type = 'Pinjaman Online' THEN
        PERFORM public.recalculate_pinjaman_online_debt_amount(OLD.withdrawal_from_balance);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_expense_soft_delete_debt_reversal ON public.expenses;

CREATE TRIGGER trigger_expense_soft_delete_debt_reversal
    AFTER UPDATE OF status ON public.expenses
    FOR EACH ROW
    WHEN (
        OLD.status = 'active'
        AND NEW.status = 'deleted'
        AND OLD.withdrawal_from_balance IS NOT NULL
    )
    EXECUTE FUNCTION public.handle_expense_soft_delete_debt();

COMMENT ON FUNCTION public.handle_expense_soft_delete_debt() IS
    'AFTER UPDATE: when expense goes active->deleted, reverse debt balance like handle_expense_delete (soft delete).';
