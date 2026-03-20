-- Multiple receipt attachments (share flow, multi-image/PDF). receipt_url remains primary for legacy UI.
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS receipt_urls jsonb DEFAULT NULL;

COMMENT ON COLUMN public.expenses.receipt_urls IS 'JSON array of public storage URLs for all receipt attachments; receipt_url is first for backward compatibility.';
