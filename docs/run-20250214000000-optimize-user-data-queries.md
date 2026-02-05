# Menjalankan migrasi 20250214000000_optimize_user_data_queries

Migrasi ini menambah indeks untuk mempercepat "User data query" (CentralizedUserDataContext) dan mengurangi timeout.

## Cara 1: Supabase Dashboard (disarankan)

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → pilih project.
2. Masuk ke **SQL Editor**.
3. Buat **New query**, lalu salin-tempel isi file:
   `src/integrations/supabase/migrations/20250214000000_optimize_user_data_queries.sql`
   atau `supabase/migrations/20250214000000_optimize_user_data_queries.sql`.
4. Klik **Run**. Pastikan tidak ada error.

## Cara 2: Supabase CLI (jika history migrasi sudah selaras)

Jika Anda sudah menyelaraskan riwayat migrasi lokal dengan remote:

```bash
npx supabase db push
```

## Setelah migrasi

- Indeks dipakai otomatis untuk query `profiles`, `user_organizations`, `employees`, `user_roles`.
- Optimasi frontend (cache 60s, timeout 12s, retry batch pertama) sudah aktif di `CentralizedUserDataContext.tsx`.
