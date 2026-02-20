-- Migration: Comprehensive fix for available_limit yang masih 0 atau null
-- Memperbaiki semua kasus termasuk ketika debt_amount juga 0

UPDATE public.debts
SET 
    available_limit = CASE 
        WHEN debt_type = 'Pinjaman Online' THEN
            -- Pinjaman Online: available_limit = debt_amount jika ada, atau limit_amount sebagai fallback
            -- Jika keduanya 0/null, gunakan limit_amount (Amount Received sebagai fallback terakhir)
            COALESCE(
                NULLIF(available_limit, 0),
                NULLIF(debt_amount, 0),
                limit_amount
            )
        ELSE
            -- Non-online: available_limit = limit_amount jika null/0
            COALESCE(NULLIF(available_limit, 0), limit_amount)
    END,
    -- Untuk Pinjaman Online, juga perbaiki debt_amount jika masih 0
    debt_amount = CASE 
        WHEN debt_type = 'Pinjaman Online' AND debt_amount = 0 THEN
            -- Jika debt_amount 0, gunakan limit_amount sebagai fallback (Total Must Be Paid = Amount Received jika belum diisi)
            COALESCE(NULLIF(debt_amount, 0), limit_amount)
        ELSE
            debt_amount
    END,
    updated_at = NOW()
WHERE 
    (available_limit IS NULL OR available_limit = 0)
    OR (debt_type = 'Pinjaman Online' AND debt_amount = 0);

COMMENT ON COLUMN public.debts.available_limit IS 'Available limit remaining. For Pinjaman Online: Sisa Harus Dibayar (default: debt_amount or limit_amount). For others: Limit tersedia (default: limit_amount). Never 0 or null.';
