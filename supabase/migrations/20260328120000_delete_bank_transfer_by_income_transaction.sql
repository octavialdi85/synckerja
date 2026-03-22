-- Allow deleting internal-transfer income rows: remove journal + paired expense + reverse book balances.

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
  v_from_before NUMERIC(15, 2);
  v_to_before NUMERIC(15, 2);
  v_total_out NUMERIC(15, 2);
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

  SELECT b.balance INTO v_from_before
  FROM public.bank_account_balances b
  WHERE b.bank_account_id = j.from_bank_account_id
    AND b.organization_id = v_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOURCE_BALANCE_ROW_MISSING';
  END IF;

  SELECT b.balance INTO v_to_before
  FROM public.bank_account_balances b
  WHERE b.bank_account_id = j.to_bank_account_id
    AND b.organization_id = v_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DEST_BALANCE_ROW_MISSING';
  END IF;

  IF v_to_before < j.amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_DEST_TO_DELETE_TRANSFER';
  END IF;

  UPDATE public.bank_account_balances
  SET balance = v_from_before + v_total_out,
      updated_at = NOW()
  WHERE bank_account_id = j.from_bank_account_id
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
    j.from_bank_account_id,
    v_org_id,
    'manual_adjustment',
    NULL,
    v_total_out,
    v_from_before,
    v_from_before + v_total_out,
    'Revert bank transfer (delete paired income/expense)',
    v_uid
  );

  UPDATE public.bank_account_balances
  SET balance = v_to_before - j.amount,
      updated_at = NOW()
  WHERE bank_account_id = j.to_bank_account_id
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
    j.to_bank_account_id,
    v_org_id,
    'manual_adjustment',
    NULL,
    -j.amount,
    v_to_before,
    v_to_before - j.amount,
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

COMMENT ON FUNCTION public.delete_bank_transfer_by_income_transaction(UUID) IS 'Deletes internal bank transfer: journal, paired expense, income; reverses bank_account_balances';
