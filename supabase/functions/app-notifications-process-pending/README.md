# app-notifications-process-pending

Memproses notifikasi **plan_status_change_notifications** yang belum dikirim push (kolom `push_sent_at` masih NULL). Dipanggil secara periodik dari **cron eksternal** karena Database Webhook (pg_net) di project ini gagal memanggil Edge Function dengan error **"Couldn't resolve host name"**.

## Deploy

```bash
supabase functions deploy app-notifications-process-pending --no-verify-jwt
```

Set secret yang sama dengan `app-notifications-send-push`:
- `FCM_SERVICE_ACCOUNT_JSON` (service account key JSON)
- Opsional: `FCM_PROJECT_ID` jika tidak ada di JSON

## Pemanggilan (cron eksternal)

Panggil dengan **Service Role Key** sebagai Bearer token. Contoh setiap 1 menit:

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/app-notifications-process-pending" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json"
```

Atau GET (untuk cron yang hanya support URL):

```bash
curl "https://<PROJECT_REF>.supabase.co/functions/v1/app-notifications-process-pending" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

### Opsi cron gratis

- **cron-job.org** – Buat job dengan URL di atas, schedule setiap menit.
- **Vercel Cron** (jika app frontend di Vercel) – Tambah di `vercel.json` dan endpoint yang memanggil URL ini dengan `CRON_SECRET` + Service Role Key dari env.
- **GitHub Actions** – Workflow scheduled yang curl ke URL di atas (simpan Service Role Key di Secrets).

## Response

- `200`: `{ "ok": true, "processed": N, "removedTokens": M }` – N notifikasi diproses, M token FCM invalid dihapus.
- `200`: `{ "ok": true, "processed": 0, "message": "No pending notifications" }` – Tidak ada yang tertunda.
- `401`: Missing/Invalid Authorization.
- `500`: Konfigurasi FCM atau error database.

## Migration

Pastikan migration `20260301100000_plan_status_change_notifications_push_sent_at.sql` sudah dijalankan (kolom `push_sent_at` dan index untuk pending).
