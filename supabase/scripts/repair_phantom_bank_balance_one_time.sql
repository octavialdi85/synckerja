-- =============================================================================
-- PERBAIKAN SEKALI JALAN — saldo "nyangkut" setelah hapus income tanpa reverse
-- ledger (bug lama). Jalankan manual di: Supabase Dashboard → SQL → New query.
--
-- JANGAN dipasang sebagai migration otomatis (supabase db push) kecuali Anda
-- sengaja ingin menjalankan logika ini di setiap environment.
--
-- ALUR:
-- 1. (Opsional) Jalankan Step A — pastikan baris & organization_id yang benar.
-- 2. Sesuaikan v_account_number / v_adjustment di blok DO jika perlu.
-- 3. Jalankan blok PREVIEW (Step B) jika ingin cek saldo sebelum update.
-- 4. Jalankan blok DO (repair). Secara default org di-resolve dari nomor rekening
--    jika hanya SATU organisasi punya rekening aktif itu; jika ambigu, isi
--    v_organization_id_override.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step A — jalankan ini dulu; salin organization_id jika perlu override manual.
-- -----------------------------------------------------------------------------
SELECT
  ba.organization_id,
  ba.id AS bank_account_id,
  ba.name,
  ba.account_number
FROM public.bank_accounts ba
WHERE ba.account_number = '8710178926'
  AND ba.is_active = true;

-- -----------------------------------------------------------------------------
-- Step B — PREVIEW saldo (ganti UUID jika Anda pakai override, atau pakai hasil Step A).
-- -----------------------------------------------------------------------------
/*
SELECT
  ba.id AS bank_account_id,
  ba.name,
  ba.account_number,
  ba.organization_id,
  bab.id AS balance_row_id,
  bab.balance AS current_stored_balance
FROM public.bank_accounts ba
LEFT JOIN public.bank_account_balances bab
  ON bab.bank_account_id = ba.id AND bab.organization_id = ba.organization_id
WHERE ba.organization_id = 'GANTI-UUID-ORG-DARI-STEP-A'::uuid
  AND ba.account_number = '8710178926'
  AND ba.is_active = true;
*/

-- -----------------------------------------------------------------------------
-- REPAIR — setelah yakin, jalankan blok DO ini.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  -- NULL = otomatis dari v_account_number (1 organisasi saja). Jika >1 org punya
  -- nomor yang sama, isi UUID dari Step A di sini.
  v_organization_id_override uuid := NULL;

  v_account_number text := '8710178926';
  v_adjustment numeric(15, 2) := 5409220;

  v_organization_id uuid;
  v_org_count int;
  v_bank_id uuid;
  v_before numeric(15, 2);
  v_after numeric(15, 2);
BEGIN
  IF v_organization_id_override IS NOT NULL
     AND v_organization_id_override = '00000000-0000-0000-0000-000000000000'::uuid THEN
    RAISE EXCEPTION
      'v_organization_id_override tidak boleh all-zero. Pakai NULL untuk auto, atau UUID dari Step A.';
  END IF;

  IF v_organization_id_override IS NOT NULL THEN
    v_organization_id := v_organization_id_override;
  ELSE
    SELECT COUNT(DISTINCT ba.organization_id) INTO v_org_count
    FROM public.bank_accounts ba
    WHERE ba.account_number = v_account_number
      AND ba.is_active = true;

    IF v_org_count = 0 THEN
      RAISE EXCEPTION
        'Tidak ada rekening aktif dengan nomor %. Periksa v_account_number atau data bank_accounts.',
        v_account_number;
    ELSIF v_org_count > 1 THEN
      RAISE EXCEPTION
        'Lebih dari satu organisasi punya nomor %; jalankan Step A, lalu set v_organization_id_override ke organization_id yang benar.',
        v_account_number;
    ELSE
      SELECT ba.organization_id INTO v_organization_id
      FROM public.bank_accounts ba
      WHERE ba.account_number = v_account_number
        AND ba.is_active = true
      LIMIT 1;
    END IF;
  END IF;

  SELECT ba.id INTO v_bank_id
  FROM public.bank_accounts ba
  WHERE ba.organization_id = v_organization_id
    AND ba.account_number = v_account_number
    AND ba.is_active = true
  ORDER BY ba.created_at ASC
  LIMIT 1;

  IF v_bank_id IS NULL THEN
    RAISE EXCEPTION 'Rekening tidak ditemukan (org + nomor rekening + aktif).';
  END IF;

  SELECT bab.balance INTO v_before
  FROM public.bank_account_balances bab
  WHERE bab.bank_account_id = v_bank_id
    AND bab.organization_id = v_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Baris bank_account_balances tidak ada untuk rekening ini.';
  END IF;

  v_after := v_before - v_adjustment;

  UPDATE public.bank_account_balances
  SET
    balance = v_after,
    updated_at = now()
  WHERE bank_account_id = v_bank_id
    AND organization_id = v_organization_id;

  INSERT INTO public.bank_account_balance_history (
    bank_account_id,
    organization_id,
    transaction_type,
    transaction_id,
    amount,
    balance_before,
    balance_after,
    description,
    created_by
  ) VALUES (
    v_bank_id,
    v_organization_id,
    'manual_adjustment',
    NULL,
    -v_adjustment,
    v_before,
    v_after,
    'One-time repair: kurangi saldo phantom setelah hapus income (ledger tidak ikut berkurang).',
    NULL
  );

  RAISE NOTICE 'OK: balance_before=%, adjustment=%, balance_after=%', v_before, v_adjustment, v_after;
END $$;
