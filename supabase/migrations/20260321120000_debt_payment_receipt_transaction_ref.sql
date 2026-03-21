-- Debt payments: transaction reference (dedupe per org), receipt metadata, storage bucket

ALTER TABLE public.debt_payments
  ADD COLUMN IF NOT EXISTS transaction_reference TEXT,
  ADD COLUMN IF NOT EXISTS receipt_file_path TEXT,
  ADD COLUMN IF NOT EXISTS receipt_file_name TEXT,
  ADD COLUMN IF NOT EXISTS receipt_file_size BIGINT,
  ADD COLUMN IF NOT EXISTS receipt_mime_type TEXT;

COMMENT ON COLUMN public.debt_payments.transaction_reference IS 'External ref from receipt (e.g. BI-FAST ref); unique per organization when set.';
COMMENT ON COLUMN public.debt_payments.receipt_file_path IS 'Storage path in bucket debt-payment-receipts: {organization_id}/...';
COMMENT ON COLUMN public.debt_payments.receipt_file_name IS 'Original file name for display/download.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_debt_payments_org_transaction_ref_unique
  ON public.debt_payments (organization_id, transaction_reference)
  WHERE transaction_reference IS NOT NULL AND btrim(transaction_reference) <> '';

-- Private bucket for debt payment proof images
INSERT INTO storage.buckets (id, name, public)
VALUES ('debt-payment-receipts', 'debt-payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "debt_payment_receipts_insert_org" ON storage.objects;
DROP POLICY IF EXISTS "debt_payment_receipts_select_org" ON storage.objects;
DROP POLICY IF EXISTS "debt_payment_receipts_delete_org" ON storage.objects;

CREATE POLICY "debt_payment_receipts_insert_org"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'debt-payment-receipts'
  AND (storage.foldername(name))[1] = (
    SELECT active_organization_id::text
    FROM public.profiles
    WHERE user_id = auth.uid() AND active_organization_id IS NOT NULL
    LIMIT 1
  )
);

CREATE POLICY "debt_payment_receipts_select_org"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'debt-payment-receipts'
  AND (storage.foldername(name))[1] = (
    SELECT active_organization_id::text
    FROM public.profiles
    WHERE user_id = auth.uid() AND active_organization_id IS NOT NULL
    LIMIT 1
  )
);

CREATE POLICY "debt_payment_receipts_delete_org"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'debt-payment-receipts'
  AND (storage.foldername(name))[1] = (
    SELECT active_organization_id::text
    FROM public.profiles
    WHERE user_id = auth.uid() AND active_organization_id IS NOT NULL
    LIMIT 1
  )
);
