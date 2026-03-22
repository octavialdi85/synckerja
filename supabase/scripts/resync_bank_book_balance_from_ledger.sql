-- =============================================================================
-- SELARASKAN saldo buku (bank_account_balances) dengan jurnal transaksi
-- untuk SATU rekening — ketika angka di UI salah tapi data income/expense benar.
--
-- Jika hasil agregat jurnal MASIH ~36 juta padahal seharusnya ~151 rb, jangan
-- jalankan UPDATE di bawah: berarti ada baris income/expense SALAH ke rekening ini.
-- Hapus/koreksi transaksi dulu, lalu jalankan lagi PREVIEW lalu SYNC.
--
-- Cara pakai (Supabase → SQL):
-- 1) Isi v_account_number (dan v_organization_id jika perlu).
-- 2) Jalankan hanya blok PREVIEW — cek stored_balance vs ledger_balance.
-- 3) Jika ledger_balance sesuai kenyataan, set v_do_update := true dan jalankan blok SYNC.
-- =============================================================================

DO $$
DECLARE
  v_account_number text := '8710178926';
  -- NULL = pakai satu-satunya org untuk rekening ini; jika ambigu, isi UUID org Anda
  v_organization_id uuid := NULL;

  v_bank_account_id uuid;
  v_org_id uuid;
  v_stored numeric(15, 2);
  v_ledger numeric(15, 2);
  v_do_update boolean := false; -- ubah ke true setelah PREVIEW oke
BEGIN
  SELECT ba.id, ba.organization_id
  INTO v_bank_account_id, v_org_id
  FROM public.bank_accounts ba
  WHERE ba.account_number = v_account_number
    AND ba.is_active = true
    AND (v_organization_id IS NULL OR ba.organization_id = v_organization_id)
  ORDER BY ba.created_at
  LIMIT 1;

  IF v_bank_account_id IS NULL THEN
    RAISE EXCEPTION 'Rekening tidak ditemukan (nomor / org).';
  END IF;

  IF v_organization_id IS NOT NULL AND v_org_id IS DISTINCT FROM v_organization_id THEN
    RAISE EXCEPTION 'organization_id tidak cocok.';
  END IF;

  SELECT bab.balance::numeric(15, 2)
  INTO v_stored
  FROM public.bank_account_balances bab
  WHERE bab.bank_account_id = v_bank_account_id
    AND bab.organization_id = v_org_id;

  SELECT
    COALESCE((
      SELECT SUM(it.amount::numeric)
      FROM public.income_transactions it
      WHERE it.bank_account_id = v_bank_account_id
        AND it.organization_id = v_org_id
        AND it.status IN ('completed', 'pending')
    ), 0)
    -
    COALESCE((
      SELECT SUM(e.amount::numeric)
      FROM public.expenses e
      WHERE e.bank_account_id = v_bank_account_id
        AND e.organization_id = v_org_id
        AND e.status = 'active'
    ), 0)
    + COALESCE((
      SELECT SUM(btj.amount::numeric)
      FROM public.bank_transfer_journals btj
      WHERE btj.to_bank_account_id = v_bank_account_id
        AND btj.organization_id = v_org_id
        AND btj.income_transaction_id IS NULL
    ), 0)
    - COALESCE((
      SELECT SUM(btj.amount::numeric)
      FROM public.bank_transfer_journals btj
      WHERE btj.from_bank_account_id = v_bank_account_id
        AND btj.organization_id = v_org_id
        AND btj.income_transaction_id IS NULL
    ), 0)
  INTO v_ledger;

  RAISE NOTICE 'bank_account_id=%, org=%', v_bank_account_id, v_org_id;
  RAISE NOTICE 'stored_balance (bank_account_balances) = %', v_stored;
  RAISE NOTICE 'ledger_balance (income - expense + transfer principal via journals) = %', v_ledger;

  IF NOT v_do_update THEN
    RAISE NOTICE 'PREVIEW saja. Set v_do_update := true untuk menulis ulang saldo buku = ledger.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bank_account_balances bab
    WHERE bab.bank_account_id = v_bank_account_id AND bab.organization_id = v_org_id
  ) THEN
    UPDATE public.bank_account_balances
    SET balance = v_ledger, updated_at = NOW()
    WHERE bank_account_id = v_bank_account_id
      AND organization_id = v_org_id;
    RAISE NOTICE 'UPDATE OK: saldo buku diset = %', v_ledger;
  ELSE
    INSERT INTO public.bank_account_balances (bank_account_id, organization_id, balance)
    VALUES (v_bank_account_id, v_org_id, v_ledger);
    RAISE NOTICE 'INSERT OK: baris saldo baru = %', v_ledger;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- OVERRIDE manual (hanya jika jurnal di DB juga salah / Anda yakin angka benar)
-- Contoh: BCA harus persis 151.058 setelah satu transfer — ganti UUID dari Step A
-- di diagnose_bank_account_balance_sources.sql
-- -----------------------------------------------------------------------------
/*
UPDATE public.bank_account_balances bab
SET balance = 151058.00,
    updated_at = NOW()
FROM public.bank_accounts ba
WHERE bab.bank_account_id = ba.id
  AND bab.organization_id = ba.organization_id
  AND ba.account_number = '8710178926'
  AND ba.is_active = true;
*/
