-- Migration: Pinjaman Online - validasi available = limit - terpakai (bukan limit - remaining_debt)
-- Description: Terpakai = min(debt_amount, limit). Available = limit - terpakai. Saat limit penuh → 0.
--              Validasi expense pakai available ini agar konsisten dengan tampilan (Debt = terpakai, Available = limit - terpakai).
-- Created: 2025-02-01

CREATE OR REPLACE FUNCTION public.validate_expense_insert_debt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_debt_record RECORD;
    v_available_limit NUMERIC(15, 2);
    v_terpakai NUMERIC(15, 2);
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

    IF v_debt_record.debt_type = 'Pinjaman Online' THEN
        v_terpakai := LEAST(COALESCE(v_debt_record.debt_amount, 0), COALESCE(v_debt_record.limit_amount, 0));
        v_available_limit := GREATEST(0, COALESCE(v_debt_record.limit_amount, 0) - v_terpakai);
    ELSE
        v_available_limit := COALESCE(v_debt_record.available_limit, v_debt_record.limit_amount);
    END IF;

    IF v_available_limit < NEW.amount THEN
        RAISE EXCEPTION 'Insufficient available limit. Available: %, Required: %',
            v_available_limit, NEW.amount;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_expense_update_debt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_debt_record RECORD;
    v_available_limit NUMERIC(15, 2);
    v_terpakai NUMERIC(15, 2);
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

            IF v_debt_record.debt_type = 'Pinjaman Online' THEN
                v_terpakai := LEAST(COALESCE(v_debt_record.debt_amount, 0), COALESCE(v_debt_record.limit_amount, 0));
                v_available_limit := GREATEST(0, COALESCE(v_debt_record.limit_amount, 0) - v_terpakai);
            ELSE
                v_available_limit := COALESCE(v_debt_record.available_limit, v_debt_record.limit_amount);
            END IF;

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

        IF v_debt_record.debt_type = 'Pinjaman Online' THEN
            v_terpakai := LEAST(COALESCE(v_debt_record.debt_amount, 0), COALESCE(v_debt_record.limit_amount, 0));
            v_available_limit := GREATEST(0, COALESCE(v_debt_record.limit_amount, 0) - v_terpakai);
        ELSE
            v_available_limit := COALESCE(v_debt_record.available_limit, v_debt_record.limit_amount);
        END IF;

        IF v_available_limit < v_amount_diff THEN
            RAISE EXCEPTION 'Insufficient available limit. Available: %, Required additional: %',
                v_available_limit, v_amount_diff;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_expense_insert_debt() IS 'BEFORE INSERT: validate. Pinjaman Online: available = limit - min(debt_amount, limit).';
COMMENT ON FUNCTION public.validate_expense_update_debt() IS 'BEFORE UPDATE: validate. Pinjaman Online: available = limit - min(debt_amount, limit).';
