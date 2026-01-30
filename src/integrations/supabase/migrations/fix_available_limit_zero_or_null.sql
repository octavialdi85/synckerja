-- Migration: Fix available_limit yang 0 atau null di database
-- available_limit seharusnya selalu memiliki nilai (tidak pernah 0 atau null)
-- Untuk Pinjaman Online: available_limit = debt_amount jika belum ada pembayaran
-- Untuk non-online: available_limit = limit_amount jika belum ada pemakaian

UPDATE public.debts
SET 
    available_limit = CASE 
        WHEN debt_type = 'Pinjaman Online' THEN
            -- Pinjaman Online: available_limit = debt_amount (Total Harus Dibayar) jika null/0
            COALESCE(NULLIF(available_limit, 0), debt_amount, limit_amount)
        ELSE
            -- Non-online: available_limit = limit_amount jika null/0
            COALESCE(NULLIF(available_limit, 0), limit_amount)
    END,
    updated_at = NOW()
WHERE 
    available_limit IS NULL 
    OR available_limit = 0
    OR (debt_type = 'Pinjaman Online' AND available_limit IS NULL)
    OR (debt_type != 'Pinjaman Online' AND available_limit IS NULL);

-- Set default constraint untuk mencegah 0 di masa depan (optional, bisa di-comment jika tidak diperlukan)
-- ALTER TABLE public.debts ADD CONSTRAINT check_available_limit_positive 
--     CHECK (available_limit IS NULL OR available_limit > 0);

COMMENT ON COLUMN public.debts.available_limit IS 'Available limit remaining. For Pinjaman Online: Sisa Harus Dibayar (default: debt_amount). For others: Limit tersedia (default: limit_amount). Never 0 or null.';
