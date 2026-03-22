-- Fix delete_bank_transfer_by_income_transaction:
-- 1) Use ledger (_computed_bank_balance) for sufficiency + new book values (avoids false INSUFFICIENT when book row drifts).
-- 2) Upsert bank_account_balances if row missing.

CREATE OR REPLACE FUNCTION public.delete_bank_transfer_by_income_transaction(p_income_transaction_id UUID)
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
  WHERE btj.income_transaction_id = p_income_transaction_id
    AND btj.organization_id = v_org_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_BANK_TRANSFER_INCOME';
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
    'Revert bank transfer (delete paired income/expense)',
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
    'Revert bank transfer (remove credit to destination)',
    v_uid
  );

  DELETE FROM public.bank_transfer_journals
  WHERE id = j.id;

  DELETE FROM public.expenses
  WHERE id = j.expense_id;

  DELETE FROM public.income_transactions
  WHERE id = p_income_transaction_id;

  RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_bank_transfer_by_income_transaction(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_bank_transfer_by_income_transaction(UUID) TO authenticated;

COMMENT ON FUNCTION public.delete_bank_transfer_by_income_transaction(UUID) IS 'Deletes internal transfer; reverses book using ledger (computed) balances';
