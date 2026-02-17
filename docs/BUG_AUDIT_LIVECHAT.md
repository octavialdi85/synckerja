# Bug Audit: Livechat `/operations/consultant/all/livechat` (Mobile & Desktop)

## Ringkasan
Audit fokus pada halaman livechat (desktop: `WhatsAppInboxPage`, mobile: `LiveChatPage` → `LiveChatChatView` / `LiveChatListView`), daftar percakapan, thread chat/email, quick action, dan hooks terkait.

---

## Refetch & loading (smooth page)

| # | File:Line | Temuan | Prioritas | Saran perbaikan |
|---|-----------|--------|-----------|------------------|
| R1 | `useWhatsAppConversations.ts:65` | `refetchInterval: 10000` tanpa `staleTime`; default global `refetchOnMount: false` (App.tsx) mengurangi refetch berulang, tapi interval 10s tetap refetch di background. Kombinasi dengan realtime invalidation bisa menyebabkan loading berulang saat banyak event. | Medium | Tambah `staleTime: 30_000` dan pertimbangkan `refetchOnWindowFocus: false` agar konsisten dengan global; atau kurangi refetchInterval. |
| R2 | `useEmailConversations.ts:64` | Sama: `refetchInterval: 10000` tanpa `staleTime`. | Medium | Sama seperti R1. |
| R3 | `useInstagramConversations.ts:64` | Sama: `refetchInterval: 10000` tanpa `staleTime`. | Medium | Sama seperti R1. |
| R4 | `useEmailMessages.ts:30-31` | Pada realtime INSERT/UPDATE email_messages, invalidate `['email-conversations']` → seluruh daftar conversation refetch saat ada pesan baru di satu thread. Bisa bikin loading/flicker di sidebar. | Medium | Pertimbangkan hanya invalidate `['email-messages', conversationId]`; atau gunakan `setQueryData` untuk update cache daftar alih-alih invalidate penuh. |
| R5 | `useWhatsAppMessages.ts:78-79` | `refetchOnWindowFocus: true` → setiap kali user kembali ke tab, messages refetch. Bisa terasa tidak smooth. | Low | Set `refetchOnWindowFocus: false` (sesuai global) atau gunakan `staleTime` cukup besar. |
| R6 | `useInstagramMessages.ts:59-60` | `refetchOnWindowFocus: true` (sama seperti R5). | Low | Sama seperti R5. |

---

## Unhandled promises & console

| # | File:Line | Temuan | Prioritas | Saran perbaikan |
|---|-----------|--------|-----------|------------------|
| U1 | `ConversationList.tsx:255` | `supabase.from('whatsapp_conversations').update(...).catch((err) => console.warn(...))` — promise di-handle; hanya console.warn; user tidak dapat feedback jika update last_opened_at gagal. | Low | Opsional: toast ringan atau abaikan (non-critical). |
| U2 | `ConversationList.tsx:267, 280, 285` | Sama: `markConversationRead` dan update `last_opened_at` di handleSelect hanya .catch(console.warn). | Low | Sama seperti U1. |
| U3 | `WhatsAppInboxPage.tsx:34-46` | Prefetch lead-statuses: .catch(console.warn). Tidak ada feedback ke user jika gagal. | Low | Non-blocking; bisa dibiarkan atau log ke monitoring. |
| U4 | `LiveChatPage.tsx:45-61` | Sama: prefetch lead-statuses .catch(console.warn). | Low | Sama seperti U3. |
| U5 | `useLiveChatInboundNotification.ts:122-126` | Realtime subscribe: hanya console.warn pada CHANNEL_ERROR. User tidak tahu jika realtime putus. | Low | Opsional: toast "Koneksi realtime terganggu" atau retry. |
| U6 | `LiveChatChatView.tsx:108, 112` | Push subscription: console.error dan tidak ada toast. User tidak tahu kenapa notifikasi tidak aktif. | Medium | Tampilkan toast.error dengan pesan yang ramah setelah console.error. |

---

## Error handling & fallback UI

| # | File:Line | Temuan | Prioritas | Saran perbaikan |
|---|-----------|--------|-----------|------------------|
| E1 | `ConversationList.tsx:298-304` | Saat `error` ada, hanya tampil "Failed to load conversations." tanpa tombol retry. | Medium | Tambah tombol "Coba lagi" yang memanggil refetch dari parent atau queryClient.invalidateQueries. |
| E2 | `WhatsAppInboxPage.tsx` | `waError`, `igError`, `emailError` di-pass ke ConversationList; jika salah satu error, seluruh list tampil error. Tidak ada fallback partial (mis. tampilkan WA saja jika email error). | Low | Opsional: tampilkan per-source error atau partial list. |
| E3 | `EmailChatThread.tsx:142` | `useEmailMessages` mengembalikan error; hanya destructure `data`, `isLoading`. Tidak ada pengecekan `isError`/`error`. Jika fetch messages gagal, hanya loading hilang dan messages = []. | Medium | Destructure `isError`, `error`, `refetch`; tampilkan pesan error + tombol retry bila `isError`. |
| E4 | `useSendEmailReply.ts` | Mutation bisa error; EmailChatThread handleSendFromPopup sudah try/catch dan toast. Tapi `mutation.error` tidak di-reset/di-display di UI (mis. inline error). | Low | Sudah cukup dengan toast; opsional tampilkan error inline. |

---

## API & network

| # | File:Line | Temuan | Prioritas | Saran perbaikan |
|---|-----------|--------|-----------|------------------|
| A1 | `useSendEmailReply.ts:24-45` | `fetch(send-email-reply)` — jika res.ok false, json.error bisa bukan string; sudah ada fallback 'Failed to send reply'. Res.json().catch(() => ({})) aman. | Low | Sudah cukup. |
| A2 | `LivechatQuickActionPanel.tsx` | Banyak operasi Supabase (update lead, mark/unmark lead, status, follow-up). Semua punya try/catch + toast.error. Tidak ada fallback retry. | Low | Opsional: tombol retry di toast atau inline. |
| A3 | `useWhatsAppConversations.ts:57-61` | RPC `get_whatsapp_conversations_with_preview` — jika error, useQuery throw; UI dapat error dari useQuery. Desktop menampilkan di ConversationList. | - | OK. |
| A4 | Realtime subscribe (useWhatsAppConversations, useEmailConversations, useInstagramConversations) | `.subscribe()` tanpa callback; tidak cek status SUBSCRIBED/CHANNEL_ERROR. Jika subscribe gagal, tidak ada invalidation dan tidak ada feedback. | Medium | Simpan channel, panggil .subscribe((status) => { if (status === 'CHANNEL_ERROR') ... }); log atau toast. |

---

## Null / undefined & logic

| # | File:Line | Temuan | Prioritas | Saran perbaikan |
|---|-----------|--------|-----------|------------------|
| L1 | `LiveChatPage.tsx:127-128` | `invalidTicketId = !!(ticketId?.trim() && !isLoading && !selectedConversation)` — jika ticketId ada tapi conversation belum ketemu (masih loading), invalidTicketId false. Setelah loading selesai dan tidak ketemu, effect navigate jalan. Tapi saat navigate replace, ticketId hilang; selectedConversation tetap null. Tidak ada loop. | - | OK. |
| L2 | `LiveChatPage.tsx:129-133` | Effect `if (invalidTicketId) { setShowInvalidTicketBanner(true); navigate(...) }` — navigate replace menghapus ticket_id. Pada render berikut (setelah navigate), ticketId jadi null, invalidTicketId false. Effect tidak jalan lagi. | - | OK. |
| L3 | `ConversationList.tsx:236-241` | Mencari conv by initialConversationId atau initialTicketId; jika ketemu, onSelect(conv) dan initialSelectionApplied = true. Tapi onSelect dari WhatsAppInboxPage adalah setSelectedId + setSearchParams. Tidak ada race. | - | OK. |
| L4 | `MobileConversationList.tsx` | Hanya wrapper ConversationList; selectedId selalu null dari LiveChatListView. Jadi di mobile list tidak highlight selected (karena selection pakai URL ticket_id dan view pisah). | Low | Expected behavior; tidak bug. |
| L5 | `EmailChatThread.tsx:155` | `lastInboundSubject = messages.filter(...).slice(-1)[0]?.subject` — aman terhadap empty array. | - | OK. |

---

## Memory leak & cleanup

| # | File:Line | Temuan | Prioritas | Saran perbaikan |
|---|-----------|--------|-----------|------------------|
| M1 | `useWhatsAppMessages.ts:40-45` | `fallbackTimeoutRef` di-clear di cleanup; channel dan timeout di-clear. | - | OK. |
| M2 | Realtime hooks (useWhatsAppConversations, useEmailConversations, useEmailMessages, useInstagramConversations, useLiveChatInboundNotification) | Semua pakai channelRef dan removeChannel di return cleanup. | - | OK. |

---

## Code smells & konsistensi

| # | File:Line | Temuan | Prioritas | Saran perbaikan |
|---|-----------|--------|-----------|------------------|
| C1 | `ConversationList.tsx:255, 267, 280, 285` | Langsung pakai console.warn. | Low | Ganti ke logger terpusat (devLog) atau pertahankan jika sengaja hanya dev. |
| C2 | `WhatsAppInboxPage.tsx:45`, `LiveChatPage.tsx:61` | console.warn prefetch. | Low | Sama seperti C1. |
| C3 | `LivechatQuickActionPanel.tsx:223, 287, 303, 470, 507` | console.error + toast — user dapat feedback; console untuk debug. | Low | Opsional: gunakan devLog. |
| C4 | `useLiveChatInboundNotification.ts:126` | console.warn. | Low | Sama seperti C1. |
| C5 | `LiveChatChatView.tsx:108, 112` | console.error. | Low | Sama seperti C1. |
| C6 | `useWhatsAppConfig.ts:303` | console.error ensureOrgMetaConfig. | Low | Di luar livechat page; tetap catat. |

---

## Daftar prioritas High

- Tidak ada temuan High dalam audit ini.

---

## Daftar prioritas Medium

- R1, R2, R3: Refetch interval tanpa staleTime (loading bisa kurang smooth).
- R4: Invalidate email-conversations saat message update → refetch berat.
- E1: Error list conversation tanpa retry.
- E3: EmailChatThread tidak menampilkan error messages.
- U6: Push subscription error tanpa toast.
- A4: Realtime subscribe tanpa penanganan CHANNEL_ERROR.

---

## Rekomendasi cepat (smooth loading)

1. Tambah `staleTime: 30_000` (atau 15_000) pada `useWhatsAppConversations`, `useEmailConversations`, `useInstagramConversations` agar refetch interval tidak selalu trigger refetch jika data masih fresh.
2. Set `refetchOnWindowFocus: false` pada `useWhatsAppMessages` dan `useInstagramMessages` (konsisten dengan App default) untuk mengurangi refetch saat pindah tab.
3. Di `useEmailMessages`, pertimbangkan untuk tidak invalidate `['email-conversations']` pada setiap message event, atau batasi dengan debounce/single invalidation per session.
4. Di ConversationList dan EmailChatThread: tampilkan error state dengan tombol retry (refetch/invalidate query).

---

*Audit berdasarkan pembacaan kode; tidak menjalankan aplikasi. Verifikasi dengan runtime (console, network, React DevTools) disarankan.*
