# Email Inbound: Log Kosong / Konfirmasi Tidak Jalan

**Penyebab umum:** Domain di Resend sudah **Verified** (DKIM, SPF, MX) dan link konfirmasi sudah dikirim ke alamat inbound (mis. `inbound-xxx@profitloop.id`), tapi di **Supabase Edge Function → email-inbound → Logs** tidak ada apa-apa → **Webhook Inbound di Resend belum dikonfigurasi**.

Resend **hanya mengirim** event email masuk (POST) ke server kita kalau **Webhook** untuk event **email.received** (Inbound) sudah di-set dengan URL yang benar.

---

## Kenapa tidak ada entry baru di email_conversations padahal saya kirim ke email_address?

**Alur yang benar:**

1. **email_address** (mis. `oktavialdidhanta@gmail.com`) = alamat Gmail yang terhubung di Connect Email. Kalau Anda **mengirim email ke alamat itu**, email itu **masuk ke Gmail**, bukan langsung ke sistem kita.
2. Supaya email itu **muncul di Live Chat** dan tercatat di **email_conversations**, email harus **sampai ke Resend** di alamat **inbound_address** (mis. `inbound-56f87d70cea7@profitloop.id`). Sistem kita hanya memproses email yang **diterima Resend** di alamat inbound.
3. Cara email sampai ke Resend:
   - **Opsi A:** Kirim email **langsung ke** **inbound_address** (mis. `inbound-56f87d70cea7@profitloop.id`). Resend menerima → webhook → kita buat entry di email_conversations.
   - **Opsi B:** Kirim email ke **email_address** (Gmail). **Gmail** akun itu harus **sudah di-set penerusan** ke **inbound_address** (Gmail → Pengaturan → Penerusan dan POP/IMAP → tambah alamat penerusan = nilai **inbound_address** dari tabel). Gmail meneruskan salinan ke Resend → Resend menerima di inbound_address → webhook → kita buat entry.

Jadi: kalau Anda hanya **mengirim ke email_address** (Gmail) dan **tidak** ada penerusan Gmail ke **inbound_address**, email tidak pernah sampai ke Resend → webhook tidak jalan → **tidak ada entry** di email_conversations.

**Cek:** Di Gmail (akun yang sama dengan email_address), apakah penerusan sudah di-set ke **persis** alamat **inbound_address** dari tabel `organization_email_connections`? Dan di log Edge Function, saat Anda kirim email, apakah ada "processing to [ \"inbound-xxx@profitloop.id\" ]"? Nilai itu harus **sama** dengan **inbound_address** di DB.

---

## Kenapa alamat inbound tidak sama? (Hanya ada 1 baris di organization_email_connections)

Di app, alamat inbound **dibuat oleh aplikasi** (bukan oleh Resend) saat Anda menambah koneksi di **Connect Email**:

- Setiap kali klik "Tambah koneksi", app memakai `generateInboundAddress()` → **random** `inbound-XXXXXXXXXXXX@profitloop.id` (12 karakter acak).
- Alamat itu **langsung disimpan** ke tabel `organization_email_connections` dan ditampilkan di layar untuk Anda salin ke Gmail.

Jadi:

- **Baris di DB** punya `inbound_address` = alamat yang **dibuat saat itu** (mis. `inbound-7a6124f2e109@profitloop.id`).
- **Email yang benar-benar masuk** lewat Resend punya "To" = alamat yang **benar-benar Anda pakai di Gmail** (mis. `inbound-b75483ebeba6@profitloop.id`).

Kalau keduanya beda, artinya:

- Di Gmail Anda memakai alamat **A** (mis. `inbound-b75483ebeba6@...`).
- Di DB hanya ada koneksi dengan alamat **B** (mis. `inbound-7a6124f2e109@...`).
- Bisa terjadi jika: koneksi pernah dihapus lalu ditambah lagi (alamat baru), atau alamat di Gmail disalin dari sumber lain / sesi lama.

Supaya email "diterima" di app, **alamat di DB harus persis sama** dengan alamat yang dipakai di Gmail (yang muncul di log sebagai "processing to [...]").

---

## Kenapa kolom status tetap "pending_verification"?

Status di-update ke `verified` **hanya saat** Edge Function **memproses** sebuah email yang **cocok** dengan koneksi itu:

1. Resend mengirim webhook dengan email "To" = mis. `inbound-b75483ebeba6@profitloop.id`.
2. Kita cari baris di `organization_email_connections` yang `inbound_address` = alamat itu.
3. Kalau **ketemu** dan ada kode konfirmasi di body email → kita update baris itu: `confirmation_code` + `status = 'verified'`.

Kalau **tidak ketemu** (alamat di DB beda dengan "To" di email), kita **tidak update** baris mana pun → `status` tetap `pending_verification`.

Jadi untuk id `7dc458e7-f85d-4254-b1ce-35161700843a`:

- Status tetap `pending_verification` karena **belum pernah** ada email yang "To"-nya **sama persis** dengan `inbound_address` baris itu.
- Log menunjukkan email masuk ke `inbound-b75483ebeba6@profitloop.id`, sedangkan baris itu kemungkinan punya `inbound_address = inbound-7a6124f2e109@...` → tidak cocok → tidak ada update.

---

## Perbaikan: samakan alamat di DB dengan alamat yang dipakai Gmail/Resend

Karena di DB hanya ada **1 baris** dan email yang masuk ke **inbound-b75483ebeba6@profitloop.id**:

- **Opsi A – Ubah baris yang ada agar dipakai untuk alamat yang benar-benar dipakai**

Jalankan di Supabase SQL Editor (ganti `id` jika perlu):

```sql
UPDATE public.organization_email_connections
SET
  inbound_address = 'inbound-b75483ebeba6@profitloop.id',
  status = 'verified',
  updated_at = NOW()
WHERE id = '7dc458e7-f85d-4254-b1ce-35161700843a';
```

Setelah itu:

- Email yang masuk ke `inbound-b75483ebeba6@profitloop.id` akan cocok dengan baris ini dan tampil di Live Chat.
- Status jadi "Verified" (bisa juga dibiarkan `pending_verification` dan nanti akan ter-update saat ada email konfirmasi yang cocok).

- **Opsi B – Pakai alamat yang sudah ada di DB di Gmail**

Cek di app **Connect Email** nilai **Inbound address** untuk koneksi itu (mis. `inbound-7a6124f2e109@profitloop.id`). Di Gmail → Pengaturan → Penerusan, ubah alamat penerusan menjadi **persis** alamat itu. Setelah Gmail mengirim konfirmasi ke alamat itu, webhook akan memproses dan bisa mengisi `confirmation_code` + `status = 'verified'` untuk baris yang ada.

---

## Checklist: Supaya Inbound Jalan dan Log Ada

| # | Cek | Keterangan |
|---|-----|------------|
| 1 | Domain verified di Resend | Di Resend → Domains → profitloop.id: **Enable Receiving (MX)** = Verified. |
| 2 | **Webhook di Resend** | Di Resend Dashboard → **Webhooks** → tambah endpoint untuk event **email.received** (atau "Inbound"). |
| 3 | URL webhook benar | URL = `https://<PROJECT_REF>.supabase.co/functions/v1/email-inbound` (ganti `<PROJECT_REF>` dengan project Supabase Anda). |
| 4 | Secret di Supabase | Di Supabase → Edge Functions → Secrets: set **RESEND_WEBHOOK_SECRET** = Signing Secret dari webhook Resend (whsec_...). |
| 5 | (Opsional) Body & link | Untuk isi email lengkap (termasuk link konfirmasi Gmail): set **RESEND_API_KEY** (API key Resend). |
| 6 | **Alamat inbound sama** | **inbound_address** di tabel `organization_email_connections` harus **persis** sama dengan alamat yang Anda pakai di Gmail (dan yang muncul di log "processing to"). |

---

## Langkah di Resend (wajib)

1. Buka **https://resend.com** → login → **Webhooks**.
2. **Add Webhook** (atau "Create endpoint"):
   - **Endpoint URL:** `https://<PROJECT_REF>.supabase.co/functions/v1/email-inbound`
   - **Events:** pilih **email.received** (atau "Inbound" / "Received emails").
3. Simpan. Copy **Signing Secret** (whsec_...).
4. Di **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets** → tambah:
   - Name: `RESEND_WEBHOOK_SECRET`
   - Value: `whsec_...`
5. **Verify JWT = OFF** untuk fungsi `email-inbound` (Function configuration → Verify JWT with legacy secret → OFF → Save changes).

---

## Troubleshooting: "Sudah kirim ulang tapi belum ada email masuk"

1. **Redeploy Edge Function** (jika pakai config.toml): `supabase functions deploy email-inbound` atau `--no-verify-jwt`.
2. **Cek Resend → Webhooks** (bukan Logs): event **email.received** harus dapat status **200**.
3. **Alamat inbound harus sama:** Email hanya masuk ke Live Chat jika **To** di webhook = **inbound_address** salah satu baris di `organization_email_connections`. Jika log menampilkan "no connection for inbound_address inbound-XXX@...", tambahkan koneksi dengan alamat itu di Connect Email atau update baris yang ada (lihat **Perbaikan** di atas).
