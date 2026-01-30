-- Migration: principal_amount & interest_amount on debt_payments; Interest = sum(bunga per pelunasan)
-- Description: Setiap pembayaran: principal = min(payment_amount, remaining_debt), interest = payment - principal.
--              Kolom Interest di UI = SUM(interest_amount) per debt (akumulasi bunga).
-- Created: 2025-02-01

-- ============================================
-- 1. Add columns to debt_payments
-- ============================================
ALTER TABLE public.debt_payments
  ADD COLUMN IF NOT EXISTS principal_amount NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS interest_amount NUMERIC(15, 2);

COMMENT ON COLUMN public.debt_payments.principal_amount IS 'Pokok yang dilunasi oleh pembayaran ini (min of payment_amount, remaining_debt saat bayar).';
COMMENT ON COLUMN public.debt_payments.interest_amount IS 'Bunga pada pembayaran ini (payment_amount - principal_amount).';

-- ============================================
-- 2. BEFORE INSERT trigger: set principal_amount, interest_amount
-- ============================================
CREATE OR REPLACE FUNCTION public.set_principal_interest_on_debt_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_remaining NUMERIC(15, 2);
BEGIN
    SELECT COALESCE(d.remaining_debt, GREATEST(0, COALESCE(d.debt_amount, 0) - COALESCE(d.paid_amount, 0)))
    INTO v_remaining
    FROM public.debts d
    WHERE d.id = NEW.debt_id;

    v_remaining := COALESCE(v_remaining, 0);

    NEW.principal_amount := LEAST(NEW.payment_amount, v_remaining);
    NEW.interest_amount := GREATEST(0, NEW.payment_amount - NEW.principal_amount);

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_principal_interest_on_debt_payment() IS 'BEFORE INSERT: set principal_amount = min(payment_amount, remaining_debt), interest_amount = payment - principal.';

DROP TRIGGER IF EXISTS trg_set_principal_interest_on_debt_payment ON public.debt_payments;
CREATE TRIGGER trg_set_principal_interest_on_debt_payment
    BEFORE INSERT ON public.debt_payments
    FOR EACH ROW
    EXECUTE FUNCTION set_principal_interest_on_debt_payment();

-- ============================================
-- 3. Backfill existing rows (conservative: principal = payment, interest = 0)
-- ============================================
UPDATE public.debt_payments
SET
    principal_amount = payment_amount,
    interest_amount = 0
WHERE principal_amount IS NULL OR interest_amount IS NULL;
