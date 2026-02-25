-- Add subscription period columns to payments for accurate receipt period (historical payments).
-- Filled by process-midtrans-payment and check-midtrans-payment-status on activation.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz NULL,
  ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz NULL;

COMMENT ON COLUMN public.payments.subscription_start_date IS 'Start of subscription period covered by this payment; used for receipt PDF.';
COMMENT ON COLUMN public.payments.subscription_end_date IS 'End of subscription period covered by this payment; used for receipt PDF and next billing date.';
