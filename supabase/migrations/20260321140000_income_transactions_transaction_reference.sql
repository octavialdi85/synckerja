-- Income transactions: external transaction reference from receipt (share flow dedupe per org)

ALTER TABLE public.income_transactions
  ADD COLUMN IF NOT EXISTS transaction_reference TEXT;

COMMENT ON COLUMN public.income_transactions.transaction_reference IS 'External ref from receipt (e.g. BI-FAST ref); unique per organization when set.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_income_transactions_org_transaction_ref_unique
  ON public.income_transactions (organization_id, transaction_reference)
  WHERE transaction_reference IS NOT NULL AND btrim(transaction_reference) <> '';
