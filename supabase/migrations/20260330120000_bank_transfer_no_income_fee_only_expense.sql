-- Internal bank transfer (new behavior): no income_transactions row; expenses row only when fee > 0 (amount = fee).
-- Principal movement is reflected via bank_transfer_journals where income_transaction_id IS NULL.
-- Legacy rows keep income_transaction_id set; ledger unchanged for them.

-- ---------------------------------------------------------------------------
-- 1) Nullable FKs on journal
-- ---------------------------------------------------------------------------
ALTER TABLE public.bank_transfer_journals
  ALTER COLUMN expense_id DROP NOT NULL,
  ALTER COLUMN income_transaction_id DROP NOT NULL;

COMMENT ON TABLE public.bank_transfer_journals IS 'Inter-bank transfers: optional expense (fee only), optional legacy income row; principal via journal when income_transaction_id IS NULL';

-- ---------------------------------------------------------------------------
-- 2) Ledger: income - expense + journal principal (new-style journals only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._computed_bank_balance(p_bank_account_id UUID, p_org_id UUID)
RETURNS NUMERIC(15, 2)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COALESCE((
      SELECT SUM(it.amount::NUMERIC)
      FROM public.income_transactions it
      WHERE it.bank_account_id = p_bank_account_id
        AND it.organization_id = p_org_id
        AND it.status IN ('completed', 'pending')
    ), 0)
    - COALESCE((
      SELECT SUM(e.amount::NUMERIC)
      FROM public.expenses e
      WHERE e.bank_account_id = p_bank_account_id
        AND e.organization_id = p_org_id
        AND e.status = 'active'
    ), 0)
    + COALESCE((
      SELECT SUM(btj.amount::NUMERIC)
      FROM public.bank_transfer_journals btj
      WHERE btj.to_bank_account_id = p_bank_account_id
        AND btj.organization_id = p_org_id
        AND btj.income_transaction_id IS NULL
    ), 0)
    - COALESCE((
      SELECT SUM(btj.amount::NUMERIC)
      FROM public.bank_transfer_journals btj
      WHERE btj.from_bank_account_id = p_bank_account_id
        AND btj.organization_id = p_org_id
        AND btj.income_transaction_id IS NULL
    ), 0);
$$;

-- ---------------------------------------------------------------------------
-- 3) create_bank_transfer (no income row; expense only if fee > 0)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_bank_transfer(
  p_from_bank_account_id UUID,
  p_to_bank_account_id UUID,
  p_amount NUMERIC,
  p_fee NUMERIC DEFAULT 0,
  p_note TEXT DEFAULT NULL,
  p_transaction_date DATE DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC')::DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_org_id UUID;
  v_from RECORD;
  v_to RECORD;
  v_type_id UUID;
  v_cat_id UUID;
  v_from_balance NUMERIC(15, 2);
  v_to_balance NUMERIC(15, 2);
  v_from_ledger NUMERIC(15, 2);
  v_to_ledger NUMERIC(15, 2);
  v_from_before NUMERIC(15, 2);
  v_to_before NUMERIC(15, 2);
  v_total_out NUMERIC(15, 2);
  v_expense_id UUID;
  v_journal_id UUID;
  v_to_label TEXT;
  v_expense_name TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_from_bank_account_id = p_to_bank_account_id THEN
    RAISE EXCEPTION 'SAME_ACCOUNT';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  IF p_fee IS NULL OR p_fee < 0 THEN
    RAISE EXCEPTION 'INVALID_FEE';
  END IF;

  v_total_out := p_amount + p_fee;

  SELECT p.active_organization_id INTO v_org_id
  FROM public.profiles p
  WHERE p.user_id = v_uid
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No active organization';
  END IF;

  SELECT ba.* INTO v_from
  FROM public.bank_accounts ba
  WHERE ba.id = p_from_bank_account_id
    AND ba.organization_id = v_org_id;

  IF NOT FOUND OR v_from.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'INVALID_SOURCE_ACCOUNT';
  END IF;

  SELECT ba.* INTO v_to
  FROM public.bank_accounts ba
  WHERE ba.id = p_to_bank_account_id
    AND ba.organization_id = v_org_id;

  IF NOT FOUND OR v_to.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'INVALID_DESTINATION_ACCOUNT';
  END IF;

  IF p_fee > 0 THEN
    SELECT et.id INTO v_type_id
    FROM public.expense_types et
    WHERE et.organization_id IS NULL
      AND lower(trim(et.name)) = lower(trim('Internal bank transfer'))
    LIMIT 1;

    IF v_type_id IS NULL THEN
      RAISE EXCEPTION 'Internal transfer expense type not configured';
    END IF;

    SELECT ec.id INTO v_cat_id
    FROM public.expense_categories ec
    WHERE ec.organization_id IS NULL
      AND ec.expense_type_id = v_type_id
      AND lower(trim(ec.name)) = lower(trim('Internal bank transfer'))
    LIMIT 1;

    IF v_cat_id IS NULL THEN
      RAISE EXCEPTION 'Internal transfer expense category not configured';
    END IF;
  END IF;

  SELECT b.balance INTO v_from_balance
  FROM public.bank_account_balances b
  WHERE b.bank_account_id = p_from_bank_account_id
    AND b.organization_id = v_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_from_balance := public._computed_bank_balance(p_from_bank_account_id, v_org_id);
    INSERT INTO public.bank_account_balances (bank_account_id, organization_id, balance)
    VALUES (p_from_bank_account_id, v_org_id, v_from_balance);
    SELECT b.balance INTO v_from_balance
    FROM public.bank_account_balances b
    WHERE b.bank_account_id = p_from_bank_account_id
      AND b.organization_id = v_org_id
    FOR UPDATE;
  ELSE
    v_from_ledger := public._computed_bank_balance(p_from_bank_account_id, v_org_id);
    IF v_from_balance IS DISTINCT FROM v_from_ledger THEN
      UPDATE public.bank_account_balances
      SET balance = v_from_ledger,
          updated_at = NOW()
      WHERE bank_account_id = p_from_bank_account_id
        AND organization_id = v_org_id;
      v_from_balance := v_from_ledger;
    END IF;
  END IF;

  v_from_before := v_from_balance;
  IF v_from_before < v_total_out THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
  END IF;

  SELECT b.balance INTO v_to_balance
  FROM public.bank_account_balances b
  WHERE b.bank_account_id = p_to_bank_account_id
    AND b.organization_id = v_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_to_balance := public._computed_bank_balance(p_to_bank_account_id, v_org_id);
    INSERT INTO public.bank_account_balances (bank_account_id, organization_id, balance)
    VALUES (p_to_bank_account_id, v_org_id, v_to_balance);
    SELECT b.balance INTO v_to_balance
    FROM public.bank_account_balances b
    WHERE b.bank_account_id = p_to_bank_account_id
      AND b.organization_id = v_org_id
    FOR UPDATE;
  ELSE
    v_to_ledger := public._computed_bank_balance(p_to_bank_account_id, v_org_id);
    IF v_to_balance IS DISTINCT FROM v_to_ledger THEN
      UPDATE public.bank_account_balances
      SET balance = v_to_ledger,
          updated_at = NOW()
      WHERE bank_account_id = p_to_bank_account_id
        AND organization_id = v_org_id;
      v_to_balance := v_to_ledger;
    END IF;
  END IF;

  v_to_before := v_to_balance;

  v_to_label := coalesce(v_to.name, '') || coalesce(' / ' || v_to.bank_name, '');
  v_expense_id := NULL;

  IF p_fee > 0 THEN
    v_expense_name := 'Bank transfer admin fee (to: ' || v_to_label || ')';

    INSERT INTO public.expenses (
      organization_id,
      expense_name,
      amount,
      expense_type,
      expense_type_id,
      category,
      expense_category_id,
      withdrawal_from_balance,
      bank_account_id,
      create_date,
      is_recurring,
      description,
      created_by,
      status
    ) VALUES (
      v_org_id,
      v_expense_name,
      p_fee,
      'Internal bank transfer',
      v_type_id,
      'Internal bank transfer',
      v_cat_id,
      NULL,
      p_from_bank_account_id,
      p_transaction_date,
      false,
      CASE
        WHEN p_note IS NOT NULL AND length(trim(p_note)) > 0
        THEN 'Internal transfer fee. Principal moved: ' || trim(p_amount::TEXT) || ' (not booked as expense). ' || trim(p_note)
        ELSE 'Internal transfer fee. Principal moved: ' || trim(p_amount::TEXT) || ' (not booked as expense).'
      END,
      v_uid,
      'active'
    )
    RETURNING id INTO v_expense_id;
  END IF;

  INSERT INTO public.bank_transfer_journals (
    organization_id,
    from_bank_account_id,
    to_bank_account_id,
    amount,
    fee,
    expense_id,
    income_transaction_id,
    note,
    created_by
  ) VALUES (
    v_org_id,
    p_from_bank_account_id,
    p_to_bank_account_id,
    p_amount,
    coalesce(p_fee, 0),
    v_expense_id,
    NULL,
    p_note,
    v_uid
  )
  RETURNING id INTO v_journal_id;

  UPDATE public.bank_account_balances
  SET balance = v_from_before - v_total_out,
      updated_at = NOW()
  WHERE bank_account_id = p_from_bank_account_id
    AND organization_id = v_org_id;

  IF p_fee > 0 AND v_expense_id IS NOT NULL THEN
    INSERT INTO public.bank_account_balance_history (
      bank_account_id,
      organization_id,
      transaction_type,
      transaction_id,
      amount,
      balance_before,
      balance_after,
      description,
      created_by
    ) VALUES (
      p_from_bank_account_id,
      v_org_id,
      'expense',
      v_expense_id,
      -p_fee,
      v_from_before,
      v_from_before - p_fee,
      'Bank transfer admin fee',
      v_uid
    );

    INSERT INTO public.bank_account_balance_history (
      bank_account_id,
      organization_id,
      transaction_type,
      transaction_id,
      amount,
      balance_before,
      balance_after,
      description,
      created_by
    ) VALUES (
      p_from_bank_account_id,
      v_org_id,
      'manual_adjustment',
      NULL,
      -p_amount,
      v_from_before - p_fee,
      v_from_before - v_total_out,
      'Bank transfer principal out',
      v_uid
    );
  ELSE
    INSERT INTO public.bank_account_balance_history (
      bank_account_id,
      organization_id,
      transaction_type,
      transaction_id,
      amount,
      balance_before,
      balance_after,
      description,
      created_by
    ) VALUES (
      p_from_bank_account_id,
      v_org_id,
      'manual_adjustment',
      NULL,
      -p_amount,
      v_from_before,
      v_from_before - v_total_out,
      'Bank transfer out (no fee)',
      v_uid
    );
  END IF;

  UPDATE public.bank_account_balances
  SET balance = v_to_before + p_amount,
      updated_at = NOW()
  WHERE bank_account_id = p_to_bank_account_id
    AND organization_id = v_org_id;

  INSERT INTO public.bank_account_balance_history (
    bank_account_id,
    organization_id,
    transaction_type,
    transaction_id,
    amount,
    balance_before,
    balance_after,
    description,
    created_by
  ) VALUES (
    p_to_bank_account_id,
    v_org_id,
    'manual_adjustment',
    NULL,
    p_amount,
    v_to_before,
    v_to_before + p_amount,
    'Bank transfer in',
    v_uid
  );

  RETURN json_build_object(
    'journal_id', v_journal_id,
    'expense_id', v_expense_id,
    'income_transaction_id', NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_bank_transfer(UUID, UUID, NUMERIC, NUMERIC, TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_bank_transfer(UUID, UUID, NUMERIC, NUMERIC, TEXT, DATE) TO authenticated;

COMMENT ON FUNCTION public.create_bank_transfer IS 'Inter-bank transfer: journal + book balances; optional expense row for fee only; no income row (principal via journal)';

-- ---------------------------------------------------------------------------
-- 4) delete_bank_transfer_by_journal_id (new-style transfers only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_bank_transfer_by_journal_id(p_journal_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_org_id UUID;
  j RECORD;
  v_total_out NUMERIC(15, 2);
  v_from_ledger NUMERIC(15, 2);
  v_to_ledger NUMERIC(15, 2);
  v_from_after NUMERIC(15, 2);
  v_to_after NUMERIC(15, 2);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.active_organization_id INTO v_org_id
  FROM public.profiles p
  WHERE p.user_id = v_uid
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No active organization';
  END IF;

  SELECT * INTO j
  FROM public.bank_transfer_journals btj
  WHERE btj.id = p_journal_id
    AND btj.organization_id = v_org_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BANK_TRANSFER_JOURNAL_NOT_FOUND';
  END IF;

  IF j.income_transaction_id IS NOT NULL THEN
    RAISE EXCEPTION 'LEGACY_TRANSFER_USE_INCOME_DELETE';
  END IF;

  v_total_out := j.amount + j.fee;

  v_to_ledger := public._computed_bank_balance(j.to_bank_account_id, v_org_id);
  v_from_ledger := public._computed_bank_balance(j.from_bank_account_id, v_org_id);

  IF v_to_ledger < j.amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_DEST_TO_DELETE_TRANSFER';
  END IF;

  v_to_after := v_to_ledger - j.amount;
  v_from_after := v_from_ledger + v_total_out;

  INSERT INTO public.bank_account_balances (bank_account_id, organization_id, balance)
  VALUES (j.from_bank_account_id, v_org_id, v_from_after)
  ON CONFLICT (bank_account_id) DO UPDATE
  SET balance = EXCLUDED.balance,
      updated_at = NOW();

  INSERT INTO public.bank_account_balance_history (
    bank_account_id,
    organization_id,
    transaction_type,
    transaction_id,
    amount,
    balance_before,
    balance_after,
    description,
    created_by
  ) VALUES (
    j.from_bank_account_id,
    v_org_id,
    'manual_adjustment',
    NULL,
    v_total_out,
    v_from_ledger,
    v_from_after,
    'Revert bank transfer (by journal)',
    v_uid
  );

  INSERT INTO public.bank_account_balances (bank_account_id, organization_id, balance)
  VALUES (j.to_bank_account_id, v_org_id, v_to_after)
  ON CONFLICT (bank_account_id) DO UPDATE
  SET balance = EXCLUDED.balance,
      updated_at = NOW();

  INSERT INTO public.bank_account_balance_history (
    bank_account_id,
    organization_id,
    transaction_type,
    transaction_id,
    amount,
    balance_before,
    balance_after,
    description,
    created_by
  ) VALUES (
    j.to_bank_account_id,
    v_org_id,
    'manual_adjustment',
    NULL,
    -j.amount,
    v_to_ledger,
    v_to_after,
    'Revert bank transfer credit (by journal)',
    v_uid
  );

  DELETE FROM public.bank_transfer_journals
  WHERE id = j.id;

  IF j.expense_id IS NOT NULL THEN
    DELETE FROM public.expenses
    WHERE id = j.expense_id;
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_bank_transfer_by_journal_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_bank_transfer_by_journal_id(UUID) TO authenticated;

COMMENT ON FUNCTION public.delete_bank_transfer_by_journal_id(UUID) IS 'Undo new-style bank transfer (income_transaction_id NULL); deletes journal and fee expense if any';
