-- Expenses: external transaction reference from receipt (share flow dedupe per org)

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS transaction_reference TEXT;

COMMENT ON COLUMN public.expenses.transaction_reference IS 'External ref from receipt (e.g. BI-FAST ref); unique per organization when set.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_org_transaction_ref_unique
  ON public.expenses (organization_id, transaction_reference)
  WHERE transaction_reference IS NOT NULL AND btrim(transaction_reference) <> '';
