-- Re-use transaction_reference after soft-delete: exclude status = 'deleted' from unique index.

DROP INDEX IF EXISTS public.idx_expenses_org_transaction_ref_unique;

CREATE UNIQUE INDEX idx_expenses_org_transaction_ref_unique
  ON public.expenses (organization_id, transaction_reference)
  WHERE transaction_reference IS NOT NULL
    AND btrim(transaction_reference) <> ''
    AND (status IS DISTINCT FROM 'deleted');

COMMENT ON COLUMN public.expenses.transaction_reference IS
  'External ref from receipt (e.g. BI-FAST ref); unique per organization among non-deleted rows when set.';

COMMENT ON INDEX public.idx_expenses_org_transaction_ref_unique IS
  'Unique (org, external ref) for non-deleted expenses only; deleted rows may retain ref for audit.';
