-- =============================================================================
-- DIAGNOSA: asal angka "Balance" di UI (Net Income per Bank Account)
-- Jalankan di Supabase → SQL. Hanya SELECT (tidak mengubah data).
--
-- Penjelasan singkat:
-- - Di aplikasi terbaru, Balance per rekening = agregat jurnal (sum income − sum expense) untuk
--   bank_account_id itu (semua waktu), bukan sekadar kolom bank_account_balances.
-- - Angka besar = di database memang banyak pemasukan dikurangi sedikit pengeluaran untuk rekening itu,
--   ATAU dulu bug klien hanya menjumlahkan ~1000 baris pertama (pengeluaran terpotong → saldo kelihatan membengkak).
-- - Query di bawah memakai SQL penuh (tanpa limit klien) sehingga angka di sini = sumber kebenaran.
-- =============================================================================

-- >>> Ganti nomor rekening di ketiga query di bawah ini jika perlu <<<

-- 1) Rekening BCA + saldo buku tersimpan (sumber utama angka di kartu "Balance")
SELECT
  ba.id AS bank_account_id,
  ba.organization_id,
  ba.name,
  ba.account_number,
  bab.balance AS stored_book_balance,
  bab.updated_at AS balance_row_updated_at
FROM public.bank_accounts ba
LEFT JOIN public.bank_account_balances bab
  ON bab.bank_account_id = ba.id
  AND bab.organization_id = ba.organization_id
WHERE ba.account_number = '8710178926'
  AND ba.is_active = true;

-- 2) Agregat jurnal (semua masa) untuk rekening yang sama
WITH acc AS (
  SELECT id, organization_id
  FROM public.bank_accounts
  WHERE account_number = '8710178926'
    AND is_active = true
  LIMIT 1
)
SELECT
  (SELECT count(*)::int FROM public.income_transactions it, acc
   WHERE it.bank_account_id = acc.id AND it.organization_id = acc.organization_id
     AND it.status IN ('completed', 'pending')) AS income_row_count,
  (SELECT coalesce(sum(it.amount::numeric), 0) FROM public.income_transactions it, acc
   WHERE it.bank_account_id = acc.id AND it.organization_id = acc.organization_id
     AND it.status IN ('completed', 'pending')) AS sum_income,
  (SELECT count(*)::int FROM public.expenses e, acc
   WHERE e.bank_account_id = acc.id AND e.organization_id = acc.organization_id
     AND e.status = 'active') AS expense_row_count,
  (SELECT coalesce(sum(e.amount::numeric), 0) FROM public.expenses e, acc
   WHERE e.bank_account_id = acc.id AND e.organization_id = acc.organization_id
     AND e.status = 'active') AS sum_expense,
  (
    (SELECT coalesce(sum(it.amount::numeric), 0) FROM public.income_transactions it, acc
     WHERE it.bank_account_id = acc.id AND it.organization_id = acc.organization_id
       AND it.status IN ('completed', 'pending'))
    -
    (SELECT coalesce(sum(e.amount::numeric), 0) FROM public.expenses e, acc
     WHERE e.bank_account_id = acc.id AND e.organization_id = acc.organization_id
       AND e.status = 'active')
  ) AS ledger_income_minus_expense;

-- 3) 15 pemasukan terbaru ke rekening ini (lihat nominal & deskripsi)
WITH acc AS (
  SELECT id, organization_id
  FROM public.bank_accounts
  WHERE account_number = '8710178926'
    AND is_active = true
  LIMIT 1
)
SELECT it.id, it.transaction_date, it.amount, it.description, it.status, it.created_at
FROM public.income_transactions it, acc
WHERE it.bank_account_id = acc.id AND it.organization_id = acc.organization_id
ORDER BY it.transaction_date DESC, it.created_at DESC
LIMIT 15;

-- =============================================================================
-- Jika Anda yakin BCA harus 151 rb saja:
-- - Cek hasil query (2): kalau sum_income jauh lebih besar dari 151 rb, ada banyak
--   income yang terpasang ke BCA di database (bukan bug tampilan).
-- - Kalau stored_book_balance jauh dari ledger_income_minus_expense, baris saldo
--   pernah di-set / disinkronkan salah; pertimbangkan koreksi manual + data transaksi.
-- Skrip repair contoh: repair_phantom_bank_balance_one_time.sql (sesuaikan nominal).
-- =============================================================================
