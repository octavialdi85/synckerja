-- Explicit income -> expense / debt_payment allocations; block delete income and financial edits while allocations exist.

-- ---------------------------------------------------------------------------
-- 1) Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.income_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  income_transaction_id UUID NOT NULL REFERENCES public.income_transactions(id) ON DELETE RESTRICT,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
  debt_payment_id UUID REFERENCES public.debt_payments(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT income_allocations_target_xor CHECK (
    (expense_id IS NOT NULL AND debt_payment_id IS NULL)
    OR (expense_id IS NULL AND debt_payment_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_income_allocations_income_expense_unique
  ON public.income_allocations (income_transaction_id, expense_id)
  WHERE expense_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_income_allocations_income_debt_payment_unique
  ON public.income_allocations (income_transaction_id, debt_payment_id)
  WHERE debt_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_income_allocations_organization_id
  ON public.income_allocations (organization_id);

CREATE INDEX IF NOT EXISTS idx_income_allocations_income_transaction_id
  ON public.income_allocations (income_transaction_id);

CREATE INDEX IF NOT EXISTS idx_income_allocations_expense_id
  ON public.income_allocations (expense_id)
  WHERE expense_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_income_allocations_debt_payment_id
  ON public.income_allocations (debt_payment_id)
  WHERE debt_payment_id IS NOT NULL;

COMMENT ON TABLE public.income_allocations IS 'Links income to expense or debt payment amounts; prevents income delete and financial update while rows exist';

-- ---------------------------------------------------------------------------
-- 2) Validation trigger on allocations
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._tg_validate_income_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_income RECORD;
  v_other_sum NUMERIC(15, 2);
  v_exp RECORD;
  v_dp RECORD;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'INCOME_ALLOCATION_IMMUTABLE';
  END IF;

  SELECT it.id, it.organization_id, it.amount, it.bank_account_id
  INTO v_income
  FROM public.income_transactions it
  WHERE it.id = NEW.income_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INCOME_ALLOCATION_INVALID_INCOME';
  END IF;

  IF NEW.organization_id IS DISTINCT FROM v_income.organization_id THEN
    RAISE EXCEPTION 'INCOME_ALLOCATION_ORG_MISMATCH';
  END IF;

  SELECT COALESCE(SUM(ia.amount), 0) INTO v_other_sum
  FROM public.income_allocations ia
  WHERE ia.income_transaction_id = NEW.income_transaction_id
    AND ia.id IS DISTINCT FROM NEW.id;

  IF v_other_sum + NEW.amount > v_income.amount THEN
    RAISE EXCEPTION 'INCOME_ALLOCATION_EXCEEDS_INCOME';
  END IF;

  IF NEW.expense_id IS NOT NULL THEN
    SELECT e.id, e.organization_id, e.amount, e.bank_account_id
    INTO v_exp
    FROM public.expenses e
    WHERE e.id = NEW.expense_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INCOME_ALLOCATION_INVALID_EXPENSE';
    END IF;

    IF v_exp.organization_id IS DISTINCT FROM NEW.organization_id THEN
      RAISE EXCEPTION 'INCOME_ALLOCATION_ORG_MISMATCH';
    END IF;

    IF NEW.amount > v_exp.amount THEN
      RAISE EXCEPTION 'INCOME_ALLOCATION_EXCEEDS_EXPENSE';
    END IF;

    IF v_income.bank_account_id IS NOT NULL AND v_exp.bank_account_id IS NOT NULL THEN
      IF v_income.bank_account_id IS DISTINCT FROM v_exp.bank_account_id THEN
        RAISE EXCEPTION 'INCOME_ALLOCATION_BANK_MISMATCH';
      END IF;
    END IF;
  ELSE
    SELECT dp.id, dp.organization_id, dp.payment_amount, dp.payment_method
    INTO v_dp
    FROM public.debt_payments dp
    WHERE dp.id = NEW.debt_payment_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INCOME_ALLOCATION_INVALID_DEBT_PAYMENT';
    END IF;

    IF v_dp.organization_id IS DISTINCT FROM NEW.organization_id THEN
      RAISE EXCEPTION 'INCOME_ALLOCATION_ORG_MISMATCH';
    END IF;

    IF NEW.amount > v_dp.payment_amount THEN
      RAISE EXCEPTION 'INCOME_ALLOCATION_EXCEEDS_PAYMENT';
    END IF;

    IF v_income.bank_account_id IS NOT NULL AND v_dp.payment_method IS NOT NULL THEN
      IF v_income.bank_account_id IS DISTINCT FROM v_dp.payment_method THEN
        RAISE EXCEPTION 'INCOME_ALLOCATION_BANK_MISMATCH';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_income_allocation ON public.income_allocations;
CREATE TRIGGER trg_validate_income_allocation
  BEFORE INSERT OR UPDATE ON public.income_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public._tg_validate_income_allocation();

-- ---------------------------------------------------------------------------
-- 3) Lock financial columns on income when allocated
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._tg_lock_income_if_allocated()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.income_allocations ia WHERE ia.income_transaction_id = OLD.id) THEN
    IF NEW.amount IS DISTINCT FROM OLD.amount
      OR NEW.bank_account_id IS DISTINCT FROM OLD.bank_account_id
      OR NEW.transaction_date IS DISTINCT FROM OLD.transaction_date
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
      OR NEW.income_type_id IS DISTINCT FROM OLD.income_type_id
      OR NEW.category_id IS DISTINCT FROM OLD.category_id
      OR NEW.service_id IS DISTINCT FROM OLD.service_id
      OR NEW.sub_service_id IS DISTINCT FROM OLD.sub_service_id
      OR NEW.is_recurring IS DISTINCT FROM OLD.is_recurring
      OR NEW.recurring_frequency IS DISTINCT FROM OLD.recurring_frequency
      OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
    THEN
      RAISE EXCEPTION 'INCOME_HAS_ALLOCATIONS';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_income_if_allocated ON public.income_transactions;
CREATE TRIGGER trg_lock_income_if_allocated
  BEFORE UPDATE ON public.income_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public._tg_lock_income_if_allocated();

-- ---------------------------------------------------------------------------
-- 4) RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.income_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "income_allocations_select_org"
  ON public.income_allocations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.active_organization_id = income_allocations.organization_id
    )
  );

CREATE POLICY "income_allocations_insert_org"
  ON public.income_allocations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.active_organization_id = income_allocations.organization_id
    )
    AND created_by = (SELECT auth.uid())
  );

CREATE POLICY "income_allocations_delete_org"
  ON public.income_allocations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.active_organization_id = income_allocations.organization_id
    )
  );
