# Meta OAuth – Variabel lingkungan

Untuk fitur **Connect Instagram** via OAuth (tombol "Connect with Facebook"), set variabel berikut.

## Frontend (Vite)

Di file `.env` atau `.env.local` di root project:

| Variabel | Wajib | Keterangan |
|----------|--------|------------|
| `VITE_META_APP_ID` | Ya (untuk OAuth) | App ID dari Meta for Developers (Dashboard → Settings → Basic). Jika tidak di-set, halaman Connect Instagram hanya menawarkan token manual dari Account Connect (WhatsApp). |

Contoh:
```
VITE_META_APP_ID=1234567890123456
```

## Supabase Edge Functions

Di **Supabase Dashboard** → **Project** → **Edge Functions** → **Secrets** (atau **Settings** → **Edge Functions** → **Environment variables**), set:

| Variabel | Wajib | Keterangan |
|----------|--------|------------|
| `META_APP_ID` | Ya | Sama dengan App ID di Meta for Developers. |
| `META_APP_SECRET` | Ya | App Secret dari Meta for Developers (Settings → Basic). Dipakai edge function `meta-oauth-exchange` untuk menukar `code` menjadi access token. |

## Meta for Developers

1. **Valid OAuth Redirect URIs**  
   Tambahkan URL callback yang dipakai app:
   - Production: `https://yourdomain.com/auth/meta/callback`
   - Development: `http://localhost:5173/auth/meta/callback` (sesuaikan port jika beda)

2. **App mode**  
   Untuk production, app harus dalam mode **Live** dan permission yang dipakai (mis. `instagram_manage_messages`) mungkin perlu **Advanced Access** lewat App Review.

## Ringkasan alur

1. User klik "Connect with Facebook" → popup ke Meta OAuth.
2. Setelah login/izin, Meta redirect ke `/auth/meta/callback?code=...&state=...`.
3. Halaman callback mengirim `code` ke frontend (postMessage), lalu frontend memanggil edge function `meta-oauth-exchange` dengan `code` dan `redirect_uri`.
4. Edge function memakai `META_APP_ID` dan `META_APP_SECRET` untuk menukar `code` → access token dan menyimpan token ke `organization_meta_config`.

Tanpa `VITE_META_APP_ID`, tombol OAuth tidak muncul; tanpa `META_APP_ID`/`META_APP_SECRET` di Supabase, penukaran token gagal.
