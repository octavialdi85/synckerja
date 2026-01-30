-- Migration: Backfill paid_amount in debts table from debt_payments
-- Description: Recalculates and updates paid_amount for all debts based on actual payments in debt_payments table
-- Created: 2025-02-01

-- Update paid_amount for all debts based on sum of payments in debt_payments
UPDATE public.debts d
SET 
    paid_amount = COALESCE(
        (SELECT SUM(payment_amount) 
         FROM public.debt_payments dp 
         WHERE dp.debt_id = d.id),
        0
    ),
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 
    FROM public.debt_payments dp 
    WHERE dp.debt_id = d.id
)
OR d.paid_amount IS NOT NULL;

-- For debts with no payments, set paid_amount to 0
UPDATE public.debts d
SET 
    paid_amount = 0,
    updated_at = NOW()
WHERE NOT EXISTS (
    SELECT 1 
    FROM public.debt_payments dp 
    WHERE dp.debt_id = d.id
)
AND (d.paid_amount IS NULL OR d.paid_amount != 0);

-- For Pinjaman Online type, also update available_limit
UPDATE public.debts d
SET 
    available_limit = GREATEST(0, d.limit_amount - COALESCE(d.paid_amount, 0)),
    updated_at = NOW()
WHERE d.debt_type = 'Pinjaman Online'
AND (
    d.available_limit IS NULL 
    OR d.available_limit != GREATEST(0, d.limit_amount - COALESCE(d.paid_amount, 0))
);

-- Verify: Show summary of updated debts
-- This is just for verification, not part of the migration
DO $$
DECLARE
    v_total_debts INTEGER;
    v_debts_with_payments INTEGER;
    v_total_paid NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_total_debts FROM public.debts;
    SELECT COUNT(DISTINCT debt_id) INTO v_debts_with_payments FROM public.debt_payments;
    SELECT COALESCE(SUM(paid_amount), 0) INTO v_total_paid FROM public.debts;
    
    RAISE NOTICE 'Total debts: %', v_total_debts;
    RAISE NOTICE 'Debts with payments: %', v_debts_with_payments;
    RAISE NOTICE 'Total paid_amount across all debts: %', v_total_paid;
END $$;
