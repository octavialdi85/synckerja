-- Backfill subscription period on payments from organization_subscriptions where last_payment_id matches.
-- Improves receipt accuracy for historical payments that are still linked via last_payment_id.

UPDATE public.payments p
SET
  subscription_start_date = s.subscription_start_date,
  subscription_end_date = s.subscription_end_date
FROM public.organization_subscriptions s
WHERE s.last_payment_id = p.id
  AND (p.subscription_start_date IS NULL OR p.subscription_end_date IS NULL);
