-- Re-apply create_bank_transfer: after journal insert, set income_transactions.transaction_reference
-- to bank-transfer:<journal_id> so the income table shows a stable ID (and matches bank_transfer_journals).

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
  v_income_id UUID;
  v_journal_id UUID;
  v_to_label TEXT;
  v_expense_name TEXT;
  v_income_desc TEXT;
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

  v_expense_name := 'Bank transfer to: ' || v_to_label;
  v_income_desc := 'Bank transfer from: ' || coalesce(v_from.name, v_from.bank_name, 'Account');

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
    v_total_out,
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
      THEN 'Internal transfer. Principal: ' || trim(p_amount::TEXT) || ', fee: ' || trim(p_fee::TEXT) || '. ' || trim(p_note)
      ELSE 'Internal transfer. Principal: ' || trim(p_amount::TEXT) || ', fee: ' || trim(p_fee::TEXT)
    END,
    v_uid,
    'active'
  )
  RETURNING id INTO v_expense_id;

  INSERT INTO public.income_transactions (
    organization_id,
    user_id,
    transaction_date,
    amount,
    bank_account_id,
    status,
    description,
    is_recurring,
    created_by
  ) VALUES (
    v_org_id,
    v_uid,
    p_transaction_date,
    p_amount,
    p_to_bank_account_id,
    'completed',
    v_income_desc,
    false,
    v_uid
  )
  RETURNING id INTO v_income_id;

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
    v_income_id,
    p_note,
    v_uid
  )
  RETURNING id INTO v_journal_id;

  UPDATE public.income_transactions
  SET transaction_reference = 'bank-transfer:' || v_journal_id::text
  WHERE id = v_income_id;

  UPDATE public.bank_account_balances
  SET balance = v_from_before - v_total_out,
      updated_at = NOW()
  WHERE bank_account_id = p_from_bank_account_id
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
    p_from_bank_account_id,
    v_org_id,
    'expense',
    v_expense_id,
    -v_total_out,
    v_from_before,
    v_from_before - v_total_out,
    'Bank transfer out (incl. fee)',
    v_uid
  );

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
    'income',
    v_income_id,
    p_amount,
    v_to_before,
    v_to_before + p_amount,
    'Bank transfer in',
    v_uid
  );

  RETURN json_build_object(
    'journal_id', v_journal_id,
    'expense_id', v_expense_id,
    'income_transaction_id', v_income_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_bank_transfer(UUID, UUID, NUMERIC, NUMERIC, TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_bank_transfer(UUID, UUID, NUMERIC, NUMERIC, TEXT, DATE) TO authenticated;

COMMENT ON FUNCTION public.create_bank_transfer IS 'Inter-bank transfer: reconcile book from ledger; stamp income transaction_reference with journal id';
