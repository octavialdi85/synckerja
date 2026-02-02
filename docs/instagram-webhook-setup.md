# Setup Webhook Instagram agar pesan DM masuk ke Live Chat

**Tidak perlu** schema database baru atau edge function baru. Kita pakai:
- Tabel yang sama: `whatsapp_conversations` + `whatsapp_messages` (kolom `channel` = `'instagram'`).
- Edge function yang sama: **whatsapp-webhook** (Meta mengirim WhatsApp dan Instagram ke URL yang sama).

Pesan Instagram masuk hanya jika **Meta mengirim POST** ke URL webhook. Itu terjadi hanya kalau di Meta Developer webhook untuk **Instagram Messaging (DM)** sudah di-set.

---

## Langkah di Meta Developer (wajib)

1. Buka **https://developers.facebook.com** → pilih **App** Anda.

2. Masuk ke **Webhooks** (menu kiri, atau lewat **Products** → **Messenger** / **Instagram**).

3. Cari bagian **Instagram** untuk **Messaging** (bukan "Instagram Graph API" untuk comments/mentions).
   - Kadang tampil sebagai: **Instagram** → **Configure** / **Add subscription**.
   - Yang dipakai untuk DM (pesan ke @octa.vialdi) adalah **Instagram Messaging** / **Instagram** di bawah Messenger.

4. **Callback URL** (wajib):
   ```
   https://najgdwffjhnqlogfrlqa.supabase.co/functions/v1/whatsapp-webhook
   ```
   (Sama persis dengan URL webhook WhatsApp.)

5. **Verify Token** (wajib):
   - Harus **sama persis** dengan nilai di **Account Connect** di app Anda (kolom `verify_token` di tabel `organization_meta_config`).
   - Cek nilai itu di Supabase: tabel `organization_meta_config` → kolom `verify_token` (untuk org yang dipakai).

6. Klik **Verify and Save**.
   - Meta mengirim **GET** ke URL di atas dengan `hub.verify_token=...`.
   - Handler kita mengembalikan `hub.challenge` jika token cocok. Kalau gagal, cek lagi Verify Token.

7. **Subscribe** ke field **messages** (untuk menerima pesan masuk dan echo).

8. Simpan.

---

## Cek apakah Meta sudah mengirim webhook

1. Kirim pesan dari Instagram ke akun bisnis yang terconnect (mis. @octa.vialdi).

2. Buka **Supabase Dashboard** → **Edge Functions** → **whatsapp-webhook** → **Logs**.

3. Lihat log sekitar waktu kirim pesan:
   - **"Webhook POST: object= instagram"** → Meta sudah mengirim.
   - **"Instagram webhook: using entry.messaging"** → Payload pakai entry.messaging (format DM).
   - **"Instagram webhook: using events from entry.changes"** → Payload pakai entry.changes (mis. Test).
   - **"Instagram webhook: config found"** lalu **"message saved"** → Pesan masuk DB.
   - **"Instagram webhook: config not found"** → Cek instagram_business_account_id di DB = recipient.id dari Meta.
   - **"entry.changes value structure (no events parsed)"** + valueKeys → Struktur value beda; kirim valueKeys untuk disesuaikan.
   - **Tidak ada POST** → Meta belum mengirim; cek URL, Verify Token, subscribe messages, App mode Live.

---

## Ringkasan

| Yang Anda kirim | Yang perlu di-set |
|-----------------|-------------------|
| Log `list-instagram-accounts` | Itu hanya API "Load Instagram accounts" dari halaman Connect Instagram. **Bukan** webhook penerima pesan. |
| Pesan DM ke @octa.vialdi | Meta harus kirim POST ke **whatsapp-webhook**. Itu hanya terjadi kalau di Meta Developer webhook **Instagram (Messaging)** sudah di-set dengan URL yang sama + Verify Token yang sama + subscribe **messages**. |

**Tidak perlu:** schema baru, edge function baru, atau URL webhook lain untuk Instagram. Cukup satu URL (**whatsapp-webhook**), satu schema, dan konfigurasi webhook Instagram di Meta seperti di atas.
