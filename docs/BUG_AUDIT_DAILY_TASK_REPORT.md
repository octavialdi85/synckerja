# Audit Bug: Halaman /tools/daily-task-report

**Scope:** Fitur Daily Task Report (`src/features/8-2-DailyTaskReport`) dan halaman `/tools/daily-task-report`.  
**Tanggal:** 2026-02-16.

---

## Daftar Bug (file:line)

### 1. **ReportContext.tsx (load / loadFreshData)** — setState setelah unmount
- **Deskripsi:** Effect set `isActive = true` dan cleanup set `isActive = false`, tetapi di dalam `load()` dan `loadFreshData()` tidak ada pengecekan `isActive` sebelum memanggil `setRows`, `setBlockers`, `setRecentUpdates`, `setLoading`, `setCompletionDateMap`, dll. Jika user pindah halaman sebelum fetch selesai, state akan di-update setelah komponen unmount (warning React, potensi memory leak).
- **Prioritas:** High
- **Saran:** Sebelum setiap `setRows`/`setBlockers`/`setRecentUpdates`/`setLoading`/setState lain di `load` dan `loadFreshData` (termasuk di dalam IIFE background), tambahkan `if (!isActive) return;`. Pastikan `loadFreshData` bisa mengakses `isActive` (closure dari effect).

---

### 2. **ReportContext.tsx:290** — Unhandled promise dari background refresh
- **Deskripsi:** `loadFreshData().catch(err => console.error('Background refresh failed:', err));` hanya log ke console. Jika background refresh gagal, user tidak diberi tahu dan data tetap tampil dari cache (mungkin usang). Tidak ada fallback UI atau retry.
- **Prioritas:** Medium
- **Saran:** Selain log, pertimbangkan toast ringan (“Gagal memperbarui data”) atau set flag error di context agar UI bisa menampilkan “Data mungkin tidak terbarui” / tombol retry.

---

### 3. **ReportContext.tsx:156, 161, 176, 189, 228, 296, 334–336, 595, 632, 689, 709–711, 782, 850, 944, 948, 950, 975** — Banyak `console.warn` / `console.error`
- **Deskripsi:** Puluhan pemanggilan `console.warn` dan `console.error` di path production. Tidak konsisten dengan logger terpusat dan bisa membanjiri console.
- **Prioritas:** Low (code smell)
- **Saran:** Ganti dengan `logger.warn` / `logger.error` (logger sudah di-import) agar konsisten dengan konfigurasi logging aplikasi.

---

### 4. **ReportContext.tsx (fetchHistoryBatch)** — Error di-throw tanpa fallback di pemanggil
- **Deskripsi:** `fetchHistoryBatch` melempar error (baris 177, 190) saat legacy API gagal. Pemanggil di background IIFE (sekitar 553–560) memanggil `fetchHistoryBatch(...)` di dalam try/catch yang hanya `console.warn` dan tidak meng-update state dengan data kosong atau pesan error. Alur tetap jalan, tetapi history/recent updates bisa kosong tanpa umpan balik ke user.
- **Prioritas:** Medium
- **Saran:** Di pemanggil, pada catch set `setRecentUpdates([])` atau set error state agar UI bisa menampilkan “Gagal memuat riwayat” atau tombol retry; hindari hanya log.

---

### 5. **ReportContext.tsx (fetchCompletionDates / blockers)** — Fitur completion dates & blockers dinonaktifkan
- **Deskripsi:** `fetchCompletionDates` di `batchQueryProcessor.ts` selalu return `{}`; query completion dates dan blockers di context dibungkus `if (false && ...)` sehingga tidak pernah jalan. Kolom “Finished” / on-time dan data blockers di report bisa kosong atau tidak akurat.
- **Prioritas:** High (fitur tidak berfungsi)
- **Saran:** Putuskan: aktifkan kembali query dengan strategi aman (limit, batch kecil, timeout) atau hilangkan/sembunyikan UI yang bergantung pada data tersebut dan tampilkan pesan “Fitur sementara dinonaktifkan”.

---

### 6. **Filters.tsx:90, 108, 125, 138** — Akses `options.pics/tasks/steps/subSteps` tanpa optional chaining
- **Deskripsi:** `options.pics.map(...)`, `options.tasks.map(...)`, dll. Jika `options` atau salah satu properti belum terisi (race/edge case), akan terjadi runtime error.
- **Prioritas:** Low
- **Saran:** Gunakan `(options?.pics ?? []).map(...)` dan sama untuk `tasks`, `steps`, `subSteps`.

---

### 7. **BlockersAndUpdatesPanel.tsx:184** — `window.location.reload()` setelah edit blocker
- **Deskripsi:** Setelah berhasil update deskripsi blocker, kode memanggil `window.location.reload()`. Seluruh aplikasi di-reload; UX buruk dan kehilangan state (scroll, tab, filter).
- **Prioritas:** Medium
- **Saran:** Hapus `window.location.reload()`. Update state lokal (mis. dari context atau refetch blockers) atau panggil fungsi refresh dari ReportContext agar daftar blocker ter-update tanpa reload halaman.

---

### 8. **BlockersAndUpdatesPanel.tsx:55** — `console.error` di path production
- **Deskripsi:** `console.error('Error updating blocker resolution status:', error);` sebaiknya diganti logger.
- **Prioritas:** Low
- **Saran:** Ganti dengan `logger.warn` atau `logger.error`.

---

### 9. **PerformanceTable.tsx (handleSaveEdit)** — Kolom yang di-update mungkin salah
- **Deskripsi:** Update resolution memakai `.update({ description: editResolutionText.trim() })` pada tabel `task_step_history_blocker_resolved`. Data row diambil dari RPC yang memakai `resolution_description`. Jika nama kolom di DB adalah `resolution_description` atau lain, update bisa tidak berpengaruh.
- **Prioritas:** Medium
- **Saran:** Pastikan nama kolom di `.update({ ... })` sesuai skema tabel (description vs resolution_description); sesuaikan jika perlu.

---

### 10. **BlockerResolutionModal.tsx:49** — `onResolutionComplete()` tanpa try/catch
- **Deskripsi:** `await onResolutionComplete();` dipanggil tanpa try/catch. Jika callback melempar (mis. gagal update `task_step_history`), error tidak tertangkap di modal dan `setSaving(false)` tetap dijalankan di finally, tetapi toast sukses sudah bisa terlihat.
- **Prioritas:** Low
- **Saran:** Bungkus `await onResolutionComplete();` dengan try/catch; pada error tampilkan toast error dan jangan panggil `onOpenChange(false)`.

---

### 11. **ReportContext.tsx (load)** — Cache path tidak cek `isActive` sebelum setState
- **Deskripsi:** Di branch “cache hit”, kode memanggil `setRows`, `setBlockers`, `setRecentUpdates`, `setLoading` tanpa cek `isActive`. Jika unmount terjadi tepat setelah cache hit dan sebelum setState selesai, bisa terjadi setState on unmounted component.
- **Prioritas:** Medium
- **Saran:** Sebelum setiap setState di branch cache, tambahkan `if (!isActive) return;`.

---

### 12. **DailyTaskReportPage.tsx** — Scroll area tanpa class `max-h` pada sidebar
- **Deskripsi:** Sesuai aturan proyek (seamless-scroll, max-h konsisten): area konten utama sudah pakai `max-h-[calc(100vh-120px)]` dan `seamless-scroll`. Sidebar (BlockersAndUpdatesPanel) di dalam `col-span-3` juga punya `max-h-[calc(100vh-120px)]`. Perlu pastikan panel dalamnya (Tabs content) punya overflow yang konsisten agar scroll halus.
- **Prioritas:** Low
- **Saran:** Pastikan container scroll di BlockersAndUpdatesPanel memakai `seamless-scroll` dan constraint tinggi yang sama; sudah ada `seamless-scroll` di dalam, verifikasi tidak ada overflow ganda.

---

### 13. **filterUtils.ts** — Aman terhadap null/undefined
- **Deskripsi:** `filterPerformanceData` dan `filterBySearchAndFilters` memakai optional chaining / default (e.g. `(d.subStepTitle || '')`). Tidak ada bug null ref yang terlihat.
- **Prioritas:** —
- **Saran:** —

---

### 14. **ReportContext.tsx (value.options)** — Options di-assign via mutation
- **Deskripsi:** `(value as any).options = { pics, tasks, steps, subSteps };` memutasi objek value setelah dibuat. Secara teknis berfungsi, tetapi pola ini rentan jika value di-memo atau dianggap immutable.
- **Prioritas:** Low (code smell)
- **Saran:** Bangun `value` sekali dengan memasukkan `options: { pics, tasks, steps, subSteps }` di dalam objek, tanpa mutasi setelahnya.

---

## Ringkasan prioritas

| Prioritas | Jumlah | Item |
|-----------|--------|------|
| High     | 2      | #1 (setState after unmount), #5 (completion dates & blockers disabled) |
| Medium   | 5      | #2 (background refresh unhandled), #4 (history fetch error), #7 (location.reload), #9 (column name), #11 (cache path isActive) |
| Low      | 5      | #3 (console.*), #6 (options optional chaining), #8 (console.error), #10 (onResolutionComplete catch), #12 (#14 options mutation) |

---

## Rekomendasi perbaikan (urutan)

1. Tambah pengecekan `isActive` di seluruh path setState di ReportContext (load + loadFreshData + IIFE background) (#1, #11).
2. Putuskan kebijakan fitur completion dates & blockers: aktifkan dengan query aman atau nonaktifkan secara eksplisit di UI (#5).
3. Background refresh: tambah toast atau error state + retry (#2).
4. History fetch error: set state error / empty dan tampilkan umpan balik di UI (#4).
5. Hapus `window.location.reload()` di BlockersAndUpdatesPanel dan ganti dengan update state/refetch (#7).
6. Verifikasi nama kolom update resolution dan tambah try/catch untuk `onResolutionComplete` (#9, #10).
7. Ganti `console.*` dengan logger; tambah optional chaining untuk `options`; hindari mutasi `value.options` (#3, #6, #8, #14).
