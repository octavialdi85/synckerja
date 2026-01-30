-- Migration: Backfill debt_amount for Pinjaman Online after payment
-- Description: For Pinjaman Online, debt_amount should be sisa yang harus dibayar (debt_amount - paid_amount).
--              Update existing records to reflect this: debt_amount = debt_amount - paid_amount.
-- Created: 2025-02-01

-- Update debt_amount for Pinjaman Online: debt_amount = sisa yang harus dibayar
-- debt_amount baru = debt_amount lama - paid_amount
UPDATE public.debts
SET 
    debt_amount = GREATEST(0, debt_amount - COALESCE(paid_amount, 0)),
    updated_at = NOW()
WHERE debt_type = 'Pinjaman Online'
  AND COALESCE(paid_amount, 0) > 0;

-- Verify: Show summary of updated debts
DO $$
DECLARE
    v_updated_count INTEGER;
    v_total_pinjaman_online INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_updated_count
    FROM public.debts
    WHERE debt_type = 'Pinjaman Online'
      AND COALESCE(paid_amount, 0) > 0;
    
    SELECT COUNT(*) INTO v_total_pinjaman_online
    FROM public.debts
    WHERE debt_type = 'Pinjaman Online';
    
    RAISE NOTICE 'Total Pinjaman Online debts: %', v_total_pinjaman_online;
    RAISE NOTICE 'Debts with payment (debt_amount already updated): %', v_updated_count;
END $$;
