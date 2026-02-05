# Rekomendasi untuk 502 pada endpoint employees

Diterapkan dari rekomendasi tambahan untuk mengurangi **502** / `http_response_incomplete` pada **GET /rest/v1/employees**.

## 1. Supabase Dashboard (tindakan manual)

- Cek apakah ada **insiden** atau **overload** di [Supabase Dashboard](https://supabase.com/dashboard).
- Cek **connection pool** dan batas penggunaan; 502 `http_response_incomplete` bisa berasal dari sisi Supabase/Cloudflare.

## 2. Index (sudah diterapkan)

- Migrasi: `src/integrations/supabase/migrations/20250212000000_employees_indexes_for_list_query.sql`
- Index yang ditambahkan:
  - `idx_employees_organization_id_status` → `(organization_id, status)` untuk filter org + status.
  - `idx_employees_organization_id_full_name` → `(organization_id, full_name)` untuk filter org + order by full_name.
- Jalankan migrasi di Supabase (push migrasi atau jalankan SQL manual).

## 3. Timeout REST di client (sudah diterapkan)

- File: `src/integrations/supabase/client.ts`
- Timeout untuk request **REST** (bukan auth) dinaikkan dari **15 detik** menjadi **25 detik** agar query berat punya waktu cukup sebelum timeout.

## Jika 502 masih muncul

1. Pastikan migrasi index di atas sudah dijalankan di database.
2. Cek lagi Supabase Dashboard (insiden, connection pool, penggunaan).
3. Client sudah retry 1x pada 502/504 REST; React Query juga akan retry (default 3x).
