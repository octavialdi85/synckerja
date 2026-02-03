# Setup Webhook Instagram agar pesan DM masuk ke Live Chat

**Penyebab umum:** Akun Instagram sudah terconnect (@octa.vialdi) tapi pesan inbound tidak muncul di live chat → **webhook Instagram belum di-set di Meta Developer**. Meta hanya mengirim POST ke URL kita kalau webhook untuk **Instagram (Messaging)** sudah dikonfigurasi.

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

---

## Pastikan live chat bisa menerima pesan Instagram

| # | Cek | Keterangan |
|---|-----|------------|
| 1 | Akun Instagram terconnect | Di halaman Connect Instagram, akun (mis. @octa.vialdi) tampil **Connected**. |
| 2 | Webhook Instagram di Meta | Meta Developer → Webhooks → **Instagram** → Callback URL & Verify Token sama dengan WhatsApp, subscribe **messages**. |
| 3 | Kirim **pesan baru** (bukan edit) | Untuk tes: kirim **satu pesan baru** dari akun lain ke @octa.vialdi. Event **message_edit** (pesan diedit) tidak diproses sebagai pesan baru. |
| 4 | Realtime Supabase | Tabel `whatsapp_conversations` dan `whatsapp_messages` sudah enable Realtime (supaya daftar & thread live chat langsung update). |
| 5 | Log webhook | Jika pesan tidak muncul: Supabase → Edge Functions → whatsapp-webhook → Logs. Cari **"Instagram webhook: message saved"** = sukses; **"config not found"** = cek `organization_meta_config.instagram_business_account_id` = ID akun Instagram (recipient.id). |

---

## Tes di Meta vs pesan asli: Development mode

**Yang terjadi:** Tombol **"Send test message"** di Meta Developer (Webhooks → Instagram → Test) mengirim payload mock ke webhook → kita bisa proses dan dapat **"message saved"**. Tapi saat **pesan asli** (DM dari akun Instagram lain ke @octa.vialdi) tidak sampai ke live chat.

**Penyebab:** Di **Development mode**, Meta **hanya mengirim webhook** jika **pengirim pesan** punya peran di App (Admin, Developer, atau **Tester**). Pengirim yang bukan Tester tidak memicu webhook.

**Solusi (pilih salah satu):**

### A) Tetap Development – tambah pengirim sebagai Tester

1. Buka **Meta for Developers** → App Anda → **App Roles** → **Roles** (atau **Test Users**).
2. Tambah **Instagram account** yang dipakai untuk **mengirim DM** ke @octa.vialdi sebagai **Tester** (atau invite sebagai Tester).
3. Orang itu harus **menerima undangan** dan setuju sebagai Tester.
4. Setelah itu, kirim lagi **pesan asli** dari akun Instagram itu ke @octa.vialdi → webhook akan dikirim dan pesan bisa masuk ke live chat.

### B) Production – terima pesan dari siapa saja

1. **App mode** diubah ke **Live** (toggle di atas dashboard App).
2. **App Review** → minta **Advanced Access** untuk permission yang dipakai (mis. **instagram_manage_messages**, **instagram_basic**, **pages_show_list**, dll.) sesuai kebutuhan Instagram Messaging.
3. Setelah disetujui, webhook akan dikirim untuk **semua pengirim** (tidak hanya Tester).

**Ringkas:** Tes "Send test message" di Meta = payload mock → selalu bisa kita proses. Pesan asli di Development mode hanya memicu webhook jika **akun pengirim** sudah ditambah sebagai **Tester** di App. Untuk pesan asli dari pengguna biasa tanpa Tester, pakai **Live mode** + Advanced Access.
