# Audit Bug: Halaman /digital-marketing/social-media/dashboard

**Tanggal audit:** 2026-02-16  
**Scope:** Route dashboard dan seluruh file di `src/features/6-1-dashboard` (page, container, hooks, data, modal).

---

## Ringkasan eksekutif

- **Refetch berulang / loading tidak smooth:** Ditemukan 2 penyebab utama (mutations + realtime memicu refetch aktif setelah data sudah di-update di cache). Perbaikan disarankan agar halaman tidak refetch berlebihan.
- **Console.log/error di production:** Puluhan pemanggilan `console.log` / `console.error` / `console.warn` masih dipakai; sebaiknya diganti ke `devLog` agar production bersih.
- **Error handling:** Retry button tidak menangani promise rejection; beberapa API hanya log error tanpa feedback ke user.
- **Logic/code smell:** Actual post date pakai "hari ini" saat ada links; realtime setelah CHANNEL_ERROR tidak re-subscribe.

---

## 1. Refetch berulang / loading tidak smooth

| # | File:Line | Deskripsi | Prioritas | Saran perbaikan |
|---|-----------|-----------|-----------|------------------|
| R1 | **useOptimizedSocialMediaMutations.ts:109-112** | Setelah `setQueryData` (optimistic update), kode memanggil `invalidateQueries` dengan `refetchType: 'active'`. Setiap update content plan memicu refetch penuh. Cache sudah benar dari `setQueryData`, refetch redundan dan bisa bikin loading/flicker. | **High** | Hapus `invalidateQueries` setelah optimistic update, atau ganti jadi `refetchType: 'none'` agar tidak auto refetch. Cukup andalkan `setQueryData` untuk UI. |
| R2 | **useRealtimeSocialMedia.ts:219-226, 272-277, 321-326** | Handler realtime untuk `task_steps_assigned` dan `task_steps` DELETE memakai `refetchType: 'active'`. Banyak event dalam waktu singkat = banyak refetch berturut-turut, loading tidak smooth. | **High** | Gunakan `refetchType: 'none'` di sini, atau debounce invalidation (satu refetch per batch). Realtime hanya invalidate; data terbaru bisa dari mutation cache atau satu refetch ter-debounce. |

---

## 2. Console errors / warnings (production)

Semua berikut sebaiknya diganti ke `devLog.debug` / `devLog.warn` / `devLog.error` agar production tidak berisik dan konsisten dengan aturan proyek.

| # | File:Line | Deskripsi | Prioritas | Saran perbaikan |
|---|-----------|-----------|-----------|------------------|
| C1 | **SocialMediaDashboardPage.tsx:124** | `console.error` saat fetch social media links gagal. | Low | Ganti ke `devLog.error(...)`. |
| C2 | **SocialMediaDashboardPage.tsx:280** | `console.error` di catch syncAllExistingPlans. | Low | Ganti ke `devLog.error(...)`. |
| C3 | **SocialMediaDashboardPage.tsx:713, 729, 807, 822, 919, 947, 973, 982, 1018, 1027** | Berbagai `console.error` di handler (select, delete, unapproval, field change, add content, refresh). | Low | Ganti ke `devLog.error(...)`. |
| C4 | **useRealtimeSocialMedia.ts:50, 68, 80, 101, 123, 145, 164, 213, 265, 312, 334, 330** | `console.log` dan `console.error` di subscriber realtime dan CHANNEL_ERROR. | Low | Ganti ke `devLog.debug` / `devLog.error`. |
| C5 | **useBatchApprovalAccess.ts:40, 61, 74, 107, 126** | `console.error` saat fetch profile/role/employee/config gagal. | Low | Ganti ke `devLog.error(...)`. |
| C6 | **useProdApprovalAccess.ts:122** | `console.error` saat check approval access. | Low | Ganti ke `devLog.error(...)`. |
| C7 | **GoogleDriveLinkDialog.tsx** (273, 293, 312, 334, 361, 394, 481, 512, 519) | Banyak `console.error` di handleClose, handleRevision, handleApprove, fetch plan. | Low | Ganti ke `devLog.error(...)`. |
| C8 | **ContentPlanTable.tsx:127** | `console.error` di catch handleUnapproval. | Low | Ganti ke `devLog.error(...)`. |
| C9 | **ContentPlanRow.tsx** (137, 153, 176, 198, 234, 276, 294, 304, 344, 366, 384, 394, 434, 495, 687) | Banyak `console.error` (daily_tasks, approval, revision, production approved). | Low | Ganti ke `devLog.error(...)`. |
| C10 | **BriefDialog.tsx** (178, 207, 224, 241, 258, 277, 310, 328, 346, 370, 387) | Banyak `console.error` di save/request revision/approved/fetch. | Low | Ganti ke `devLog.error(...)`. |
| C11 | **PublicContentReviewPage.tsx** (416, 422, 474, 498, 504) | `console.error` di handleApprove/handleRevision/fetch. | Low | Ganti ke `devLog.error(...)`. |
| C12 | **useApprovalTaskStepCreation.ts** (192, 215, 268, 289, 292, 295, 310, 320, 508, 525) | `console.error` / `console.warn` di task step insert/delete/assign. | Low | Ganti ke `devLog.error` / `devLog.warn`. |
| C13 | **DailyTaskSelectorDialog.tsx:161, 258, 286** | `console.error` saat fetch/select task. | Low | Ganti ke `devLog.error(...)`. |
| C14 | **useLinkCommentsQuery.ts:85** | `console.error` saat fetch link comments. | Low | Ganti ke `devLog.error(...)`. |
| C15 | **OptimizedCommentPanel.tsx** (251, 262, 529, 572) | `console.error` untuk image load/save/error boundary. | Low | Ganti ke `devLog.error(...)`. |
| C16 | **AssignSocialMediaPlanModal.tsx:152, 180** | `console.error` saat assign/auto-assign. | Low | Ganti ke `devLog.error(...)`. |
| C17 | **TitleDialog.tsx:171, 175** | `console.log` dan `console.error` (duplicate check). | Low | Ganti ke `devLog.debug` / `devLog.error`. |

---

## 3. Unhandled promises / error handling

| # | File:Line | Deskripsi | Prioritas | Saran perbaikan |
|---|-----------|-----------|-----------|------------------|
| U1 | **SocialMediaDashboardPage.tsx:1118** | Tombol Retry memanggil `onClick={() => refreshAll()}`. `refreshAll()` mengembalikan Promise tanpa `.catch()`. Jika invalidate/refetch gagal, unhandled rejection. | **Medium** | Pakai `onClick={async () => { try { await refreshAll(); } catch (e) { toast.error('Retry failed. Try again.'); } }}` atau handler serupa yang menampilkan toast on error. |
| U2 | **SocialMediaContext.tsx:126-134** | `refreshAll` hanya `await Promise.all([invalidateQueries...])`. Jika salah satu reject, seluruh promise reject dan pemanggil harus handle. Pemanggil (Retry) saat ini tidak handle (lihat U1). | Medium | Tetap di context; pastikan satu-satunya pemanggil (Retry) handle error (U1). |
| U3 | **useOptimizedSocialMediaMutations.ts:136, 157** | `completeStepAndCreateApprovalFromDriveLink` dan `revertStepCompletionFromDriveLinkRemovalWithRpc` dipanggil dengan `.then(({ error }) => ...)` tanpa `.catch()`. Jika promise reject (network/exception), unhandled. | **Medium** | Tambah `.catch((err) => { devLog.error(...); toast.error('Action failed.'); })` atau setara. |
| U4 | **all-social-media-links (SocialMediaDashboardPage.tsx:117-128)** | Query `queryFn` pada error hanya `return []` dan `console.error`. User tidak dapat feedback bahwa data links bisa stale. | Low | Selain devLog, pertimbangkan toast ringan (mis. "Could not load links") atau set error state jika perlu ditampilkan di UI. |

---

## 4. Logic errors / code smells

| # | File:Line | Deskripsi | Prioritas | Saran perbaikan |
|---|-----------|-----------|-----------|------------------|
| L1 | **SocialMediaDashboardPage.tsx:533** | `calculateOnTimeStatusForPlan`: jika `hasLinks` true, `actualPostDate` pakai `new Date().toISOString().split('T')[0]` (hari ini). Untuk post yang sebenarnya sudah lama diposting, status "on time" bisa salah. | **Medium** | Gunakan `actual_post_date` dari plan atau dari `social_media_links` (created_at/link date) jika ada; fallback ke "hari ini" hanya jika tidak ada data. |
| L2 | **useRealtimeSocialMedia.ts:328-337** | Pada `CHANNEL_ERROR`, kode hanya `setTimeout` lalu `removeChannel` dan `channelRef.current = null`. Tidak ada re-subscribe. Setelah error, realtime mati sampai reload. | **Medium** | Setelah remove channel, panggil ulang logic subscribe (mis. ekstrak ke function dan panggil lagi setelah delay), atau tampilkan toast "Connection lost. Refresh to reconnect." agar user sadar. |
| L3 | **ContentPlanRow.tsx** (berbagai) | Banyak akses `(plan as any)` untuk property yang tidak ada di type (mis. `organization_id`). | Low | Perluas type `ContentPlan` / interface row dengan field yang dipakai agar tidak perlu `as any`. |
| L4 | **dashboardQueryOptions.ts:155** | `@ts-expect-error` untuk bypass inferensi "excessively deep" pada select employees. | Low | Boleh dipertahankan; alternatif: query tanpa nested relation atau query terpisah untuk job_positions. |
| L5 | **SocialMediaContext.tsx:116** | `getFilteredContentPlans` memakai `(contentPlans as any[]).filter((plan: any) => ...)`. | Low | Gunakan type `ContentPlan[]` dan tipikan plan di callback. |

---

## 5. API calls tanpa fallback / feedback

| # | File:Line | Deskripsi | Prioritas | Saran perbaikan |
|---|-----------|-----------|-----------|------------------|
| A1 | **useBatchApprovalAccess** | Jika fetch profile/role/employee/config gagal, hanya `console.error` dan return false. User tidak tahu bahwa tombol approval bisa hilang karena error. | Low | Selain devLog, pertimbangkan toast sekali ("Could not load approval settings") atau set error state di context agar UI bisa menampilkan pesan. |
| A2 | **useOptimizedSocialMediaData** | `contentPlansQuery` dan `masterDataQuery` memakai query options yang throw on error. React Query menampilkan error state; dashboard sudah pakai `dataError` + banner + Retry. Cukup. | - | Tidak perlu perubahan. |
| A3 | **DashboardDataPreloader** | Prefetch catch sudah ada toast dan setReady(true). Cukup. | - | Tidak perlu perubahan. |

---

## 6. Null / undefined references

Tidak ditemukan akses langsung ke property tanpa pengecekan yang berpotensi crash di path kritis. Pemakaian `organizationId` di query/mutation umumnya dijaga dengan `if (!organizationId) return` atau `enabled: !!organizationId`. Optional chaining dan fallback (e.g. `data || []`) dipakai di banyak tempat.

---

## 7. Infinite loops / memory leaks

- **useRealtimeSocialMedia:** Effect dependency `[organizationId, queryClient, syncPicProduction]`. `syncPicProduction` dari hook; pastikan referensi stabil (useCallback di useSyncPicProduction). Jika stabil, tidak ada loop.
- **Sync on mount (SocialMediaDashboardPage.tsx:269-288):** `hasSyncedRef.current = true` mencegah sync berulang; cleanup hanya `clearTimeout`. Aman.
- **Realtime cleanup:** Return cleanup di effect memanggil `removeChannel` dan set `channelRef.current = null`. Aman.

Tidak ada indikasi infinite loop atau leak yang jelas; pastikan `syncPicProduction` di `useSyncPicProduction` dibungkus `useCallback` dengan deps yang tepat.

---

## 8. Prioritas perbaikan (rekomendasi urutan)

1. **High:** R1, R2 (refetch berulang) — agar loading smooth dan tidak refetch berlebihan.
2. **Medium:** U1 (Retry catch), U3 (catch pada drive link RPC), L1 (actual post date), L2 (realtime re-subscribe atau feedback).
3. **Low:** Semua item console → devLog (C1–C17), U4, A1, L3–L5.

---

## 9. Checklist singkat

- [x] R1: Hapus atau ubah invalidate setelah setQueryData di useOptimizedSocialMediaMutations.
- [x] R2: refetchType: 'none' atau debounce di useRealtimeSocialMedia untuk task_steps.
- [x] U1: Retry button handle promise rejection + toast.
- [x] U3: .catch pada completeStepAndCreateApprovalFromDriveLink dan revertStepCompletionFromDriveLinkRemovalWithRpc.
- [x] L1: Perbaiki sumber actual post date di calculateOnTimeStatusForPlan.
- [x] L2: Re-subscribe atau toast pada CHANNEL_ERROR.
- [x] C1–C17: Ganti console.* ke devLog di seluruh file yang tercantum.

Dokumen ini melengkapi `AUDIT_DASHBOARD_BUGS.md` yang ada di feature folder dengan temuan terbaru dan fokus refetch + loading smooth.
