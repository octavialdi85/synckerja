# API routes (Vercel serverless)

## `/api/forward-to-send-push` – Webhook relay for FCM

Relay untuk Supabase **Database Webhook** ketika pg_net error **"Couldn't resolve host name"** saat memanggil Edge Function langsung.

**Alur:** Webhook (INSERT) → panggil URL relay ini → relay meneruskan body ke `SUPABASE_URL/functions/v1/app-notifications-send-push` dengan `Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY`.

### Setup

1. **Deploy ke Vercel** (atau sudah termasuk saat deploy project).
2. **Environment variables** di Vercel:
   - `SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key dari Supabase (Settings → API).
3. **Supabase Dashboard → Database → Webhooks**  
   Untuk webhook tabel **plan_status_change_notifications** (dan tabel lain yang mau pakai relay):
   - **URL:** `https://<vercel-domain>/api/forward-to-send-push`  
     Contoh: `https://synckerja.vercel.app/api/forward-to-send-push`
   - **Method:** POST  
   - **Headers:** Boleh kosong (relay tidak cek Authorization dari webhook; relay sendiri yang pakai SERVICE_ROLE_KEY untuk memanggil Edge Function).

Setelah itu, setiap INSERT ke tabel yang di-webhook akan memanggil relay → relay memanggil Edge Function → FCM terkirim.
