# Audit Bug: Mobile Android `/tools/daily-task-report`

**Scope:** Halaman mobile `/tools/daily-task-report` (DailyTaskReportPage, Filters, OverviewCards, PerformanceTable, BlockersAndUpdatesPanel, ReportContext, batchQueryProcessor, filterUtils).

**Tujuan:** Aplikasi lebih ringan, loading lebih cepat, daftar bug dengan prioritas dan saran perbaikan.

---

## Daftar Bug

### 1. **BlockersAndUpdatesPanel.tsx — window.location.reload() setelah edit blocker**

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/daily task report/components/BlockersAndUpdatesPanel.tsx:181` |
| **Penjelasan** | Setelah berhasil update deskripsi blocker, kode memanggil `window.location.reload()`. Ini memuat ulang seluruh halaman, membuang state dan cache, dan membuat pengalaman berat serta loading terasa lambat. |
| **Prioritas** | **High** |
| **Saran** | Hapus `window.location.reload()`. Setelah update sukses, tutup modal dan update state lokal (mis. daftar blocker dari context atau invalidasikan/refetch data blocker) alih-alih full reload. |

---

### 2. **PerformanceTable.tsx — useEffect fetch tanpa cleanup (setState after unmount)**

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/daily task report/components/PerformanceTable.tsx:54–108` |
| **Penjelasan** | `useEffect` memanggil `fetchResolvedDetails()` async. Tidak ada flag `cancelled` atau AbortController. Jika user ganti tab (viewMode) atau navigasi keluar sebelum fetch selesai, `setResolvedRows`/`setLoadingResolved` bisa dipanggil setelah unmount → React warning dan potensi memory leak. |
| **Prioritas** | **High** |
| **Saran** | Tambah `let cancelled = false` di effect; di cleanup set `cancelled = true`. Sebelum setiap `setResolvedRows`/`setLoadingResolved` cek `if (cancelled) return`. Atau gunakan AbortController dan abort di cleanup. |

---

### 3. **BlockersAndUpdatesPanel.tsx & PerformanceTable.tsx — console.error/console.warn**

| Item | Isi |
|------|-----|
| **File:Line** | `BlockersAndUpdatesPanel.tsx`: 52, 67, 69, 85, 109, 125, 137, 164, 183. `PerformanceTable.tsx`: 68, 101, 129, 152, 177, 193, 209. |
| **Penjelasan** | Banyak log pakai `console.error`/`console.warn` instead of `logger`. Tidak konsisten dengan codebase dan bisa mempengaruhi performa ringan di production. |
| **Prioritas** | **Medium** |
| **Saran** | Ganti ke `logger.error` / `logger.warn` (dan hilangkan log debug yang tidak perlu di production). |

---

### 4. **Filters.tsx (mobile) — useDailyTaskReport() as any**

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/daily task report/components/Filters.tsx:33` |
| **Penjelasan** | `const { filters, updateFilter, options } = useDailyTaskReport() as any;` — type cast ke `any` menghilangkan type safety dan menutupi salah prop/typo. |
| **Prioritas** | **Medium** |
| **Saran** | Hapus `as any`. Pastikan `ReportContextType` export dan cocok dengan usage (filters, updateFilter, options). Jika ada field optional, gunakan optional chaining. |

---

### 5. **BlockersAndUpdatesPanel.tsx — useDailyTaskReport() as any**

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/daily task report/components/BlockersAndUpdatesPanel.tsx:24` |
| **Penjelasan** | `useDailyTaskReport() as any` — sama seperti #4, code smell type safety. |
| **Prioritas** | **Medium** |
| **Saran** | Hapus `as any`, pakai tipe dari context. |

---

### 6. **OverviewCards.tsx (mobile) — Judul kartu hardcoded (no i18n)**

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/daily task report/components/OverviewCards.tsx:26–29` |
| **Penjelasan** | Judul "Total Assignments", "Completed", "On Time", "Late" hardcoded dalam bahasa Inggris. Aturan project: halaman harus bisa diterjemahkan saat ganti bahasa di settings. |
| **Prioritas** | **Medium** |
| **Saran** | Gunakan `useAppTranslation()` dan `t('dailyTaskReport.overview.totalAssignments', 'Total Assignments')` (dan key serupa untuk Completed, On Time, Late) untuk keempat kartu. |

---

### 7. **Filters.tsx — Duplikasi find untuk status/time label**

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/daily task report/components/Filters.tsx:54–60` |
| **Penjelasan** | `STATUS_OPTIONS.find((o) => o.value === filters.status)` dipanggil dua kali (satu untuk kondisi, satu untuk label). Begitu juga TIME_OPTIONS.find dua kali. Tidak bug, tapi redundant dan sedikit boros. |
| **Prioritas** | **Low** |
| **Saran** | Simpan hasil find dalam variabel sekali, pakai untuk label dan fallback: `const statusOpt = STATUS_OPTIONS.find(...); const statusLabel = statusOpt ? t(statusOpt.labelKey, ...) : ...`. |

---

### 8. **PerformanceTable.tsx — (supabase as any).rpc**

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/daily task report/components/PerformanceTable.tsx:61` |
| **Penjelasan** | `(supabase as any).rpc('get_all_resolved_blockers', ...)` — cast ke any menghindari type check. Jika signature RPC berubah, error tidak terdeteksi di compile time. |
| **Prioritas** | **Low** |
| **Saran** | Gunakan tipe Supabase client yang benar untuk RPC (generate types dari DB atau deklarasikan interface untuk RPC) dan hapus `as any`. |

---

### 9. **Mobile page tidak menampilkan refreshError / retry**

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/daily task report/DailyTaskReportPage.tsx` (dan DailyTaskReportContent) |
| **Penjelasan** | Context menyediakan `refreshError` dan `retryRefresh`, tetapi halaman mobile tidak mengonsumsi keduanya. Jika load gagal atau background refresh gagal, user tidak melihat pesan error dan tidak punya tombol retry → UX buruk dan perceived loading lambat. |
| **Prioritas** | **Medium** |
| **Saran** | Di `DailyTaskReportContent` (atau di bawah header), jika `refreshError` tidak null tampilkan banner error + tombol "Retry" yang memanggil `retryRefresh()`. Ini membuat loading page speed perceived lebih baik saat ada kegagalan. |

---

### 10. **PerformanceTable & BlockersAndUpdatesPanel — Toast pesan hardcoded**

| Item | Isi |
|------|-----|
| **File:Line** | PerformanceTable: 130–131, 154–156, 179–180, 203–205, 212–214, dll. BlockersAndUpdatesPanel: 54–56, 70–73, 86–88, 110–113, 132–134, 164–166, 174–176, 183–185. |
| **Penjelasan** | Banyak `title: 'Error'`, `description: 'Failed to...'`, `'Success'`, dll. dalam bahasa Inggris tanpa i18n. |
| **Prioritas** | **Low** |
| **Saran** | Gunakan key i18n untuk semua toast (mis. `dailyTaskReport.errors.updateResolution`, `dailyTaskReport.success.updated`, dll.). |

---

### 11. **ReportContext.tsx — load().finally reset ref di luar guard**

| Item | Isi |
|------|-----|
| **File:Line** | `src/features/8-2-DailyTaskReport/context/ReportContext.tsx:1012–1018` |
| **Penjelasan** | `load().finally(() => { if (isActive) { isLoadingOrgRef.current = false; inFlightOrgRef.current = null; } });` — finally dijalankan ketika promise load() selesai. Jika user sudah navigasi keluar, isActive = false dan kita tidak reset ref. Itu benar. Tapi jika load() throw sebelum await loadFreshData(), load() reject dan finally tetap jalan. Di dalam load(), setLoading(true) sudah dipanggil; jika throw, kita tidak pernah setLoading(false) di dalam loadFreshData (karena finally di load hanya reset ref). Cek: load() punya try di dalam loadFreshData dan finally setLoading(false) hanya di loadFreshData. Jadi setLoading(false) ada di loadFreshData's finally (line 1011). Jadi ketika load() reject (mis. dari cache/load path yang throw), load() tidak punya catch — jadi setLoading(false) tidak dipanggil kecuali dari loadFreshData. Di path "cached + background load": load() tidak await loadFreshData(), jadi load() selesai cepat dan finally jalan. loadFreshData().catch(...) jalan di background. Jika loadFreshData reject, catch hanya set refreshError. Tidak set setLoading(false) di sini — dan setLoading sudah di-set false di baris 292 saat cache hit. Jadi OK. Untuk path "no cache - fetch normally": await loadFreshData() dan loadFreshData's finally set setLoading(false). So we're good. Satu hal: load() tidak punya try/catch sendiri; jika getCached atau getUser throw, load() reject dan finally hanya reset ref. setLoading(true) sudah dipanggil di 277, jadi loading tetap true sampai kapan? Hanya loadFreshData's finally yang set false. Jika throw sebelum await loadFreshData(), loadFreshData tidak pernah dipanggil, jadi setLoading(false) tidak pernah dipanggil → loading stuck true. Jadi ada edge case: jika di dalam load() sebelum await loadFreshData() ada throw (mis. getUser throw), maka setLoading(false) tidak pernah dipanggil. Cek: 281 await supabase.auth.getUser() - if this throw, we go to catch (303) and logger.warn. We don't rethrow. So we don't throw. Then 284 cached check - if cached, we set setLoading(false) at 292 and return. So the only path that doesn't set loading false is: no user (301), then we don't set loading false and we don't return - we fall through. Actually 282-301: if (!user) we don't setLoading(false). So we fall through to 307 "No cache available - await loadFreshData()". So we do call loadFreshData(). So loading will be set false in loadFreshData's finally. Unless loadFreshData() throws before the try block? loadFreshData is async and its first line is try {. So any throw inside will be caught by its catch... there's no catch in loadFreshData, only finally. So if loadFreshData throws, we don't setLoading(false) — the finally only runs if we enter try. So actually in loadFreshData, the structure is try { ... } finally { if (isActive) setLoading(false); }. So if we throw in try, finally still runs. So setLoading(false) is always called when loadFreshData exits. So we're good. I'll remove #11 from the list or mark as low/inconclusive. Actually I'll keep a simpler note: "Ensure loading is cleared on all paths" — we already verified it's OK. I'll skip #11. |
| **Prioritas** | - |
| **Saran** | - |

Saya hapus #11 karena setelah dicek alur sudah benar.

---

### 12. **batchQueryProcessor — fetchCompletionDates / fetchStepBlockers disabled**

| Item | Isi |
|------|-----|
| **File:Line** | `src/features/8-2-DailyTaskReport/utils/batchQueryProcessor.ts:85–106` |
| **Penjelasan** | Kedua fungsi selalu return empty (completion dates = {}, blockers = []) karena query dinonaktifkan (500/timeout). Laporan tidak menampilkan completion dates dan blocker dari DB; data "On Time"/"Late" bisa tidak akurat jika bergantung pada completion date. Bukan bug kode, tapi batasan fungsional. |
| **Prioritas** | **Low** (documentation / product decision) |
| **Saran** | Dokumentasikan di UI (mis. disclaimer "Completion and blocker data may be limited") atau perbaiki query/DB agar bisa di-enable lagi. OverviewCards sudah pakai disclaimer di feature folder; pastikan mobile juga tampil jika memakai data tersebut. |

---

### 13. **ReportContext — Background fetch .then tanpa check isActive**

| Item | Isi |
|------|-----|
| **File:Line** | `src/features/8-2-DailyTaskReport/context/ReportContext.tsx:603–614` |
| **Penjelasan** | `fetchCompletionDates(...).then(completionDateMap => { if (!isActive) return; startTransition(...); }).catch(...)` — sudah ada `if (!isActive) return` sebelum setState. OK. |
| **Prioritas** | - |
| **Saran** | - |

---

## Ringkasan Prioritas

| Prioritas | Jumlah | Action |
|-----------|--------|--------|
| High     | 2      | Hapus full reload; tambah cleanup di PerformanceTable useEffect |
| Medium   | 4      | Logger instead of console; hapus as any; i18n OverviewCards; tampilkan refreshError + Retry |
| Low      | 4      | Duplikasi find; supabase RPC type; toast i18n; dokumentasi completion/blocker disabled |

---

## Dampak ke Ringan & Kecepatan Loading

- **Lebih ringan:** Menghapus `window.location.reload()` dan mengganti `console.*` dengan `logger` mengurangi kerja sia-sia dan kebisingan log. Guard setState setelah unmount mengurangi re-render dan warning.
- **Loading lebih cepat:** Menampilkan `refreshError` + tombol Retry membuat kegagalan load tidak "hang"; user bisa retry tanpa reload manual. Memperbaiki useEffect cleanup di PerformanceTable mencegah race dan perilaku aneh saat ganti tab.

---

*Audit berdasarkan static analysis. Untuk konfirmasi di device Android, jalankan aplikasi, buka `/tools/daily-task-report`, dan cek alur load, filter, resolved tab, dan edit/delete blocker.*
