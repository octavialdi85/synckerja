# Audit Bug: Mobile Android – `/operations/consultant/all/livechat`

**Scope:** Halaman Live Chat versi mobile Android dan semua file yang dipakai langsung oleh halaman ini.

**Tujuan:** Daftar potential bugs, error, warning, code smells; rekomendasi agar aplikasi lebih ringan dan loading lebih cepat.

---

## Daftar Bug & Temuan

### 1. **useLiveChatFCM.ts** – Listener push tidak di-cleanup (memory leak / stale closure)

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/livechat/hooks/useLiveChatFCM.ts:54-86` |
| **Penjelasan** | `PushNotifications.addListener()` mengembalikan `Promise<PluginListenerHandle>`. Kode tidak meng-await atau menyimpan handle, sehingga listener tidak pernah di-remove. Effect tidak punya cleanup; saat unmount listener tetap aktif dan bisa memanggil `navigate` dari closure lama. |
| **Prioritas** | **High** |
| **Saran** | Simpan return value (await addListener), simpan handle di ref/array, di cleanup effect panggil `handle.remove()` untuk setiap listener. Atau pindahkan registrasi FCM ke app shell (satu listener global) agar lifecycle jelas. |

---

### 2. **useLiveChatFCM.ts** – Gagal simpan FCM token tanpa feedback ke user

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/livechat/hooks/useLiveChatFCM.ts:33-39` |
| **Penjelasan** | Jika `livechat-save-fcm-token` mengembalikan `!res.ok` atau throw, hanya `devLog.error` yang dipanggil. User tidak dapat tahu bahwa notifikasi push mungkin tidak berfungsi. |
| **Prioritas** | **Medium** |
| **Saran** | Tambah `toast.error` (atau pesan inline) saat gagal, plus opsi retry (mis. saat token berubah). |

---

### 3. **LiveChatPage.tsx** – Query `lead_statuses` gagal tidak ditampilkan ke user

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/livechat/LiveChatPage.tsx:51-63` |
| **Penjelasan** | `useQuery(['lead-statuses'], ...)` tidak punya penanganan error di UI. Jika query gagal, `statusOptions` pakai `[]` dan filter status tetap "All Status" tanpa tahu bahwa daftar status mungkin tidak lengkap. |
| **Prioritas** | **Low** |
| **Saran** | Tampilkan pesan error/retry saat `error` dari query (toast atau inline kecil), atau fallback ke status default tanpa block UI. |

---

### 4. **useLiveChatInboundNotification.ts** – Notifikasi sistem timeout tidak di-clear

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/livechat/hooks/useLiveChatInboundNotification.ts:38` |
| **Penjelasan** | `setTimeout(() => n.close(), 6000)` tidak disimpan atau di-clear. Jika component unmount sebelum 6 detik, timeout tetap jalan (minor, tapi tidak rapi). |
| **Prioritas** | **Low** |
| **Saran** | Simpan id timeout dan clear di cleanup (atau saat menutup notifikasi lebih dulu). |

---

### 5. **LiveChatChatView.tsx** – Non-null assertion pada key push subscription

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/livechat/LiveChatChatView.tsx:113-114` |
| **Penjelasan** | `subscription.getKey('p256dh')!` dan `subscription.getKey('auth')!` memakai non-null assertion. Jika browser/plugin mengembalikan null/undefined, akan throw saat encode. |
| **Prioritas** | **Low** |
| **Saran** | Cek hasil `getKey()`; jika null/undefined, return early dan tampilkan toast error (mis. "Notifikasi tidak didukung"). |

---

### 6. **LiveChatListView.tsx** – Judul "Live Chat" hardcoded (tanpa i18n)

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/livechat/LiveChatListView.tsx:97` |
| **Penjelasan** | `<h1 className="...">Live Chat</h1>` tidak memakai `t()`. Ganti bahasa di Settings tidak mengubah judul ini. |
| **Prioritas** | **Low** |
| **Saran** | Ganti ke `t('sidebar.operations.livechat.title', 'Live Chat')` (atau key yang dipakai di sidebar). |

---

### 7. **useLiveChatInboundNotification.ts** – Teks toast/notifikasi hardcoded

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/livechat/hooks/useLiveChatInboundNotification.ts:61-72, 98-101, 130` |
| **Penjelasan** | "Pesan baru", "Koneksi notifikasi terganggu", dan classNames toast hardcoded. Tidak ikut bahasa yang dipilih user. |
| **Prioritas** | **Low** |
| **Saran** | Gunakan `useAppTranslation()` di hook (atau inject `t` lewat parameter) dan pakai key i18n untuk semua teks user-facing. |

---

### 8. **LiveChatChatView.tsx** – Tombol enable notification bisa diklik berulang

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/livechat/LiveChatChatView.tsx:92-134, 206-216` |
| **Penjelasan** | `handleRequestNotificationPermission` async tanpa guard. User bisa tap berkali-kali dan memicu banyak `subscribe()` / request permission. |
| **Prioritas** | **Low** |
| **Saran** | Tambah state `isRequestingPermission` (atau disable button) saat `handleRequestNotificationPermission` jalan; set true di awal, false di finally. |

---

### 9. **LiveChatPage.tsx** – Banyak query refetch bersamaan (beban jaringan)

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/livechat/LiveChatPage.tsx` (via useWhatsAppConversations, useInstagramConversations, useEmailConversations) |
| **Penjelasan** | Tiga hook masing-masing pakai `refetchInterval: 10000` dan `staleTime: 30_000`. Setiap 10 detik tiga request (WA, IG, Email) jalan bersamaan. Di mobile bisa bikin loading terasa berat dan boros baterai. |
| **Prioritas** | **Medium** (dampak ke kecepatan/ringan) |
| **Saran** | Naikkan `refetchInterval` (mis. 20–30s) atau hentikan refetch saat tab/visibility hidden (`refetchOnWindowFocus: false` dan pause interval saat document.hidden). Pertimbangkan satu polling window untuk ketiga sumber. |

---

### 10. **ConversationList (shared)** – Retry hanya invalidate, tidak per-source

| Item | Isi |
|------|-----|
| **File:Line** | `src/features/5-3-whatsapp/components/inbox/ConversationList.tsx:301-305` |
| **Penjelasan** | Saat error, "Coba lagi" memanggil invalidate untuk ketiga query (whatsapp, instagram, email). User tidak tahu sumber mana yang gagal; semua di-retry sekaligus. Cukup fungsional, tapi UX bisa lebih informatif. |
| **Prioritas** | **Low** |
| **Saran** | Opsional: tampilkan pesan mana yang gagal (dari parent) atau tombol retry per sumber. |

---

## Ringkasan Prioritas

| Prioritas | Jumlah | Nomor |
|-----------|--------|--------|
| High     | 1      | 1      |
| Medium   | 2      | 2, 9   |
| Low      | 7      | 3, 4, 5, 6, 7, 8, 10 |

---

## Yang Sudah Cukup Aman

- **Error list conversation:** Error dari WA/IG/Email di-pass ke `LiveChatListView` → `MobileConversationList` → `ConversationList`; ada UI error + tombol retry (ConversationList.tsx ~300).
- **Invalid ticket_id:** Ada effect yang set banner dan navigate replace; banner auto-hide 4s (LiveChatPage.tsx).
- **Push subscription (web) di LiveChatChatView:** Ada try/catch, toast error, dan .catch pada res.json().
- **Realtime inbound (useLiveChatInboundNotification):** Channel di-cleanup di return effect; satu toast per CHANNEL_ERROR (ref per run).
- **Tidak ada `console.log`/`console.error`** di folder livechat; pakai `devLog`.

---

## Rekomendasi Ringkas (ringan & loading)

1. **FCM listener cleanup (bug #1)** – kurangi risiko leak dan stale closure.
2. **Refetch interval / visibility (bug #9)** – kurangi request bersamaan dan beban di mobile; loading terasa lebih ringan.
3. **Feedback gagal FCM token (bug #2)** – user paham jika notifikasi tidak aktif.

Setelah itu bisa susul: i18n (6, 7), guard permission button (8), error lead_statuses (3), timeout notif (4), getKey null check (5), retry per source (10).
