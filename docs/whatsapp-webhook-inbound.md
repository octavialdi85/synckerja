# WhatsApp: Pesan Inbound Tidak Masuk

**Penyebab umum:** Akun WhatsApp sudah **Connected** dan **Approved** di halaman Connect, tapi pesan yang dikirim orang ke nomor bisnis Anda tidak muncul di Live Chat → **webhook WhatsApp belum dikonfigurasi di Meta Developer**, atau URL/Verify Token salah.

Meta **hanya mengirim** event pesan masuk (POST) ke server kita kalau **Webhook** untuk **WhatsApp** sudah di-set dengan URL dan Verify Token yang benar.

---

## Checklist: Supaya Bisa Menerima Pesan Inbound

| # | Cek | Keterangan |
|---|-----|------------|
| 1 | Akun terhubung di app | Di halaman **Connect WhatsApp**, akun (mis. Vialdi Wedding) tampil **Connected** dan **Approved**. |
| 2 | **Webhook WhatsApp di Meta** | Di Meta Developer, **WhatsApp** → **Configuration** → **Webhook** harus diisi: **Callback URL** + **Verify Token**, dan subscribe **messages**. |
| 3 | Callback URL benar | URL = `https://<PROJECT_REF>.supabase.co/functions/v1/whatsapp-webhook`. Lihat di halaman Connect (bagian Webhook configuration). |
| 4 | Verify Token sama | Verify Token di Meta **harus sama persis** dengan yang di halaman Connect (atau di DB: `organization_meta_config.verify_token`). |
| 5 | Subscribe "messages" | Di Meta, field yang di-subscribe harus **messages** (untuk pesan masuk/keluar dan status). |
| 6 | Mode App | **Development**: hanya nomor yang ditambahkan sebagai "To" di WhatsApp → API Setup yang bisa mengirim. **Live**: nomor bisnis bisa terima dari siapa saja (setelah disetujui Meta). |

---

## Langkah di Meta Developer (wajib)

1. Buka **https://developers.facebook.com** → pilih **App** Anda.

2. Masuk ke **WhatsApp** → **Configuration** (atau **Setup**).

3. Cari bagian **Webhook**:
   - **Callback URL**:  
     `https://<PROJECT_REF>.supabase.co/functions/v1/whatsapp-webhook`  
     (ganti `<PROJECT_REF>` dengan project Supabase Anda, atau copy dari halaman Connect).
   - **Verify Token**: sama dengan **Verify Token** yang tampil di halaman Connect WhatsApp (copy dari sana).

4. Klik **Verify and Save**.
   - Meta mengirim **GET** ke URL kita dengan `hub.verify_token=...`.  
   - Aplikasi kita mengembalikan `hub.challenge` jika token cocok. Kalau gagal, cek lagi Verify Token dan pastikan Edge Function `whatsapp-webhook` sudah di-deploy.

5. **Subscribe** ke field **messages** (agar Meta mengirim event pesan masuk ke URL kita).

6. Simpan.

---

## Cek Apakah Meta Sudah Mengirim Webhook

1. Kirim pesan dari WhatsApp (nomor lain) ke **nomor bisnis** Anda (yang terhubung di Connect).

2. Buka **Supabase Dashboard** → **Edge Functions** → **whatsapp-webhook** → **Logs**.

3. Lihat log sekitar waktu kirim pesan:
   - **"Webhook POST: object= whatsapp_business_account"** → Meta sudah mengirim.
   - **"WhatsApp account not found for phone_number_id: ..."** → Phone Number ID dari Meta tidak cocok dengan yang tersimpan di **organization_whatsapp_accounts**. Pastikan di Connect, **Phone Number ID** untuk akun itu = yang dipakai di Meta (WhatsApp → API Setup).
   - Jika **tidak ada POST** sama sekali → Meta belum memanggil URL kita; cek Callback URL, Verify Token, subscribe **messages**, dan mode App (Development vs Live).

---

## Ringkasan

| Yang Anda alami | Yang perlu di-set |
|-----------------|-------------------|
| Akun Connected tapi pesan masuk tidak muncul | Meta Developer → WhatsApp → Webhook: **Callback URL** = URL whatsapp-webhook, **Verify Token** = sama dengan di Connect, subscribe **messages**. |
| Log "WhatsApp account not found for phone_number_id" | Phone Number ID di Meta (dalam payload webhook) harus sama dengan yang tersimpan untuk akun di halaman Connect. Cek WhatsApp → API Setup di Meta dan bandingkan dengan kolom **Phone Number ID** di kartu akun. |

---

## Development vs Live

- **Development**: Hanya nomor yang Anda tambahkan di **WhatsApp → API Setup → "To"** yang bisa mengirim pesan ke nomor bisnis. Cocok untuk tes.
- **Live**: Setelah app disetujui dan nomor bisnis aktif, pesan dari pengguna biasa akan memicu webhook. Pastikan webhook sudah di-set sebelum switch ke Live.

---

## Dua nomor (multi-account): satu terima pesan, yang lain tidak

Jika **satu nomor** (mis. Vialdi Wedding) sudah menerima inbound di Live Chat tapi **nomor kedua** (mis. Integrasi Visual Digital Indonesia) tidak:

1. **Pastikan kedua nomor di App yang sama**
   - Di Meta Developer → **WhatsApp** → **API Setup** (atau **Configuration**).
   - Di dropdown **"From"** harus ada **kedua** nomor. Jika hanya satu yang muncul, nomor kedua mungkin ada di **WhatsApp Business Account (WABA)** atau **App** lain. Webhook hanya menerima event untuk nomor yang ada di App yang webhook-nya Anda set.

2. **Tes kirim pesan ke nomor yang belum jalan**
   - Dari HP pribadi, kirim chat ke **nomor yang belum terima** (mis. +62 811-1889-1308).
   - Catat waktu persis (mis. 19:45:00).

3. **Cek log Edge Function**
   - Supabase → **Edge Functions** → **whatsapp-webhook** → **Logs** → filter waktu tes.
   - Cari:
     - **`[whatsapp-webhook] ENTRY ... POST`** → Ada request dari Meta.
     - **`POST first phone_number_id from payload: 995961063601234`** (ganti dengan Phone Number ID nomor kedua) → Meta mengirim event untuk nomor itu.
     - **`Integrasi Visual Digital Indonesia: inbound message being processed`** → Backend memproses pesan untuk akun tersebut.
   - **Jika tidak ada POST** untuk waktu itu → Meta **tidak mengirim** webhook untuk nomor kedua. Solusi: di Meta pastikan nomor itu benar-benar di **App yang sama** yang webhook-nya dipakai, dan status nomor **Active** / bisa terima pesan.

4. **Filter di Live Chat**
   - Jika log menunjukkan pesan diproses tapi tidak tampil: di halaman Live Chat pilih filter akun **"Integrasi Visual Digital Indonesia"** (atau nama akun nomor kedua), lalu refresh.
