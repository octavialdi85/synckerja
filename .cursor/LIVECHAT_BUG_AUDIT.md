# Audit Bug: Live Chat (/operations/consultant/all/livechat)
## Mobile & Desktop

---

## HIGH

### 1. **LiveChatPage.tsx:34-46** — Unhandled promise rejection (prefetch)
- **Deskripsi:** `queryClient.prefetchQuery` untuk `lead-statuses` memakai `void`; jika `queryFn` melempar (mis. Supabase error), promise rejection tidak tertangkap.
- **Dampak:** Unhandled rejection di konsol; pada lingkungan ketat bisa mengganggu error handling global.
- **Perbaikan:** Tambah `.catch()` pada prefetch, atau bungkus queryFn dengan try/catch dan return fallback (mis. `[]`), lalu log error jika perlu.

### 2. **WhatsAppInboxPage.tsx:34-42** — Unhandled promise rejection (prefetch)
- **Deskripsi:** Sama seperti di LiveChatPage: prefetch `lead-statuses` tanpa penanganan error.
- **Perbaikan:** Sama seperti poin 1.

### 3. **ChatThread.tsx:911, 922** — Non-null assertion pada `customerId` yang bisa undefined
- **Deskripsi:** `customerId = isInstagram ? conversation?.customer_ig_id : conversation?.customer_wa_id` bisa `undefined` (mis. obrolan Instagram tanpa `customer_ig_id`). Pemanggilan `sendInstagram({ to: customerId! })` dan `send({ to: customerId!, ... })` memakai non-null assertion.
- **Dampak:** Kirim pesan dengan `to: undefined` → error dari API atau perilaku tidak terduga.
- **Perbaikan:** Sebelum kirim, cek `if (!customerId) { toast.error(...); return; }`. Hapus `!` dan gunakan `customerId` setelah guard.

### 4. **ChatThread.tsx:804** — `conversation.id` di `sendMediaWithCaption` saat conversation null
- **Keterangan:** Setelah pengecekan `if (!conversation) return` di line 854, `conversation` dianggap ada. Di `sendMediaWithCaption` (line 804) dipakai `conversation.id`; fungsi ini dipanggil dari `handleSend` yang sudah guard. Jadi ini aman selama `handleSend` tidak dipanggil tanpa conversation. **Tetap waspada:** pastikan `sendMediaWithCaption` hanya dipanggil ketika conversation sudah pasti ada (saat ini sudah benar).

---

## MEDIUM

### 5. **LiveChatPage.tsx:118-126** — URL `ticket_id` tidak valid tidak diurus
- **Deskripsi:** Jika `ticketId` ada di URL tetapi `selectedConversation` null (obrolan tidak ada, dihapus, atau ticket_id salah), yang di-render tetap `LiveChatListView` tanpa feedback.
- **Dampak:** Pengguna melihat daftar obrolan sementara URL masih berisi ticket_id yang tidak cocok; tidak ada pesan “Obrolan tidak ditemukan”.
- **Perbaikan:** Jika `ticketId && !selectedConversation` (dan daftar sudah selesai load), tampilkan pesan “Obrolan tidak ditemukan” dan/atau bersihkan query `ticket_id` dari URL (replace search params).

### 6. **useLiveChatInboundNotification.ts:58-75** — Error subscription realtime tidak ditangani
- **Deskripsi:** `supabase.channel(...).on(...).subscribe()` mengembalikan promise; kegagalan subscribe (jaringan, auth, batas realtime) tidak di-handle.
- **Dampak:** Notifikasi inbound bisa tidak jalan tanpa pesan error.
- **Perbaikan:** Panggil `.subscribe().then((status) => { ... }).catch((err) => { ... })` dan log atau tampilkan feedback; optional: fallback polling jika subscribe gagal.

### 7. **LiveChatChatView.tsx:58** — Promise `Notification.requestPermission` tanpa catch
- **Deskripsi:** `Notification.requestPermission().then((p) => setNotificationPermission(p))` tidak punya `.catch()`.
- **Dampak:** Di lingkungan yang menolak atau error saat request permission, unhandled rejection.
- **Perbaikan:** Tambah `.catch(() => setNotificationPermission('denied'))` (atau log) agar state permission tetap konsisten.

### 8. **ChatThread.tsx:888** — Media + caption send tanpa try/catch di handleSend
- **Deskripsi:** `await sendMediaWithCaption(...)` di `handleSend` tidak dibungkus try/catch. `sendMediaWithCaption` sendiri sudah ada try/catch dan tidak rethrow, jadi saat ini tidak ada unhandled rejection.
- **Prioritas:** Low–medium; untuk konsistensi dan antisipasi perubahan di `sendMediaWithCaption`, bisa dibungkus try/catch di `handleSend` dan tampilkan toast generik.

---

## LOW

### 9. **ConversationList.tsx:244-254** — Error update `last_opened_at` di-swallow
- **Deskripsi:** `supabase.from('whatsapp_conversations').update({ last_opened_at: ... }).then(...).catch(() => {})` menelan semua error tanpa log atau feedback.
- **Dampak:** Gagal update (mis. RLS, jaringan) tidak terlihat; dampak terbatas ke analytics/ordering.
- **Perbaikan:** Log error di catch (e.g. `console.warn` atau logger); optional: retry atau cue untuk sync nanti.

### 10. **ConversationList.tsx:265-274** — Error mark read & update last_opened_at di-swallow
- **Deskripsi:** `markConversationRead(conv.id).catch(() => {})` dan update `last_opened_at` dengan `.catch(() => {})` tanpa log.
- **Perbaikan:** Sama seperti poin 9: log di catch, jangan swallow tanpa jejak.

### 11. **LiveChatListView.tsx:39** — Props `igAccounts` dan `emailConnections` tidak dipakai
- **Deskripsi:** Interface mendefinisikan `igAccounts` dan `emailConnections` tetapi komponen tidak mendestructure dan tidak menggunakannya (hanya `waAccounts`, `accountOptions`, dll).
- **Dampak:** Code smell; tidak mempengaruhi perilaku.
- **Perbaikan:** Hapus dari props dan interface jika memang tidak dipakai, atau gunakan (mis. untuk empty state / filter) agar konsisten dengan parent.

### 12. **getConversationTicketId (ConversationList vs QuickActionPanel)** — Dua definisi ticket ID
- **Deskripsi:** `ConversationList.getConversationTicketId` selalu turunan dari `id` (WA-/IG-/EMAIL- + 8 karakter). `LivechatQuickActionPanel.getTicketIdForConversation` memakai `conv.ticket_id` jika ada, baru fallback ke format yang sama. URL dan daftar pakai yang pertama; lead lookup bisa pakai yang kedua.
- **Dampak:** Jika ada sumber yang mengisi `ticket_id` dengan format lain, bisa ada inkonsistensi antara URL dan lead. Risiko rendah selama semua ticket_id mengikuti format yang sama.
- **Perbaikan:** Seragamkan sumber kebenaran (satu helper untuk “ticket_id untuk URL” dan “ticket_id untuk lead”) dan pastikan backend/RLS selaras.

---

## CODE SMELLS / PERBAIKAN RINGAN

### 13. **ChatThread.tsx** — Module-level mutable state untuk audio
- **Deskripsi:** `sharedNotificationAudio` dan `sharedAudioContext` adalah variabel global di modul. Berfungsi untuk “unlock once” di Android, tetapi menyulitkan testing dan bisa konflik jika banyak instance.
- **Saran:** Pertahankan untuk sementara; jika nanti ada masalah (e.g. multiple tabs), pertimbangkan context atau singleton yang di-inject.

### 14. **LivechatQuickActionPanel.tsx:499** — `conversation.organization_id`
- **Deskripsi:** `updateLead` memakai `conversation.organization_id`. Tipe `LiveChatConversation` adalah union; pastikan semua variant (WhatsApp, Instagram, Email) memiliki `organization_id` di type dan di data.
- **Saran:** Cek type definition dan data dari API; jika ada variant tanpa `organization_id`, tambah guard atau fallback (e.g. dari `useCurrentOrg()`).

---

## RINGKASAN

| Prioritas | Jumlah |
|-----------|--------|
| High     | 3 (prefetch x2, customerId!) |
| Medium   | 4 (stale URL, realtime subscribe, requestPermission, send media consistency) |
| Low      | 4 (swallowed errors x2, unused props, ticket_id consistency) |
| Code smell | 2 |

**Rekomendasi perbaikan pertama:**  
1) Tangani error prefetch (LiveChatPage + WhatsAppInboxPage).  
2) Guard `customerId` di ChatThread sebelum `send`/`sendInstagram` dan hapus non-null assertion.  
3) Handle promise dari `subscribe()` di useLiveChatInboundNotification dan `requestPermission()` di LiveChatChatView.
