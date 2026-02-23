# Audit Bug: Mobile Android `/tools/daily-task`

**Scope:** Halaman mobile `/tools/daily-task` (DailyTaskPage, DailyTaskLayout, TaskList, filter, summary, context & hooks yang dipakai).

**Tujuan:** Aplikasi lebih ringan, loading lebih cepat, daftar bug dengan prioritas dan saran perbaikan.

---

## Daftar Bug

### 1. **useTaskBlockers.ts — Referensi variabel tidak didefinisikan (logic error)** ✅ DIPERBAIKI

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/daily task/section/hooks/useTaskBlockers.ts:77` |
| **Penjelasan** | `stepHistoryResult` dipakai di `if (stepHistoryResult?.data)` tetapi tidak pernah dideklarasikan. Hanya `subStepsResult` dan `subStepHistoryResult` yang di-fetch. Blocker modal hanya menampilkan blocker level sub-step, tidak step-level. |
| **Prioritas** | **High** |
| **Saran** | Tambah fetch step-level history (task_step_history dengan task_step_id dari stepIds, action_type blocker_added), simpan ke variabel `stepHistoryResult`, lalu gabung ke `allHistory` seperti sub-step. **DONE:** Fetch step-level history ditambah; `task.steps` di-safe dengan `task.steps ?? []`. |

---

### 2. **DailyTaskContext.tsx — setState setelah unmount (memory leak / warning)**

| Item | Isi |
|------|-----|
| **File:Line** | `src/features/8-2-DailyTask/DailyTaskContext.tsx` (useEffect initial load ~2588–2640, dan seluruh `fetchTasks`) |
| **Penjelasan** | Effect initial load set `cancelled = true` di cleanup, tetapi `fetchTasks()` tidak menerima atau mengecek `cancelled`. Jika user keluar dari halaman sebelum fetch selesai, `setTasks`/`setIsLoading` tetap dipanggil setelah unmount → React warning dan potensi leak. |
| **Prioritas** | **High** |
| **Saran** | Oper `cancelled` ke dalam `fetchTasks` (mis. lewat ref yang di-set di cleanup), dan sebelum setiap `setTasks`/`setIsLoading` cek `if (cancelledRef.current) return`. |

---

### 3. **DailyTaskContext.tsx — navigateToTask setTimeout tanpa cleanup**

| Item | Isi |
|------|-----|
| **File:Line** | `src/features/8-2-DailyTask/DailyTaskContext.tsx:2656–2659` (dan setTimeout scroll 2674–2676) |
| **Penjelasan** | `setTimeout(() => setHighlightedTask(null), 3000)` dan setTimeout untuk `scrollToStep` tidak disimpan/dibersihkan. Jika user pindah halaman dalam 3 detik, callback tetap jalan → setState setelah unmount. |
| **Prioritas** | **Medium** |
| **Saran** | Simpan ID timer di ref, clear di cleanup (atau di useEffect return). Atau batalkan saat `navigateToTask` dipanggil lagi (replace timer). |

---

### 4. **TaskList.tsx — Akses `task.steps` tanpa optional chaining** ✅ DIPERBAIKI

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/daily task/section/TaskList.tsx:289, 294` |
| **Penjelasan** | `t.steps.some(...)` dan `[...task.steps]` akan throw jika `steps` undefined (mis. data API belum lengkap). |
| **Prioritas** | **High** |
| **Saran** | Gunakan `t.steps?.some(...)` dan `[...(task.steps ?? [])]`. **DONE.** |

---

### 5. **useBlockerCounts.ts — Akses `t.steps` tanpa optional chaining** ✅ DIPERBAIKI

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/daily task/section/hooks/useBlockerCounts.ts:20, 57` |
| **Penjelasan** | `t.steps.length` dan `t.steps.map(...)` bisa throw jika `steps` undefined. |
| **Prioritas** | **High** |
| **Saran** | Gunakan `(t.steps ?? []).length` dan `(t.steps ?? []).map(...)`. **DONE.** |

---

### 6. **useTaskBlockers.ts — Akses `task.steps` tanpa optional chaining** ✅ DIPERBAIKI

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/daily task/section/hooks/useTaskBlockers.ts:120, 126` |
| **Penjelasan** | `task.steps.find(...)` bisa throw jika `task.steps` undefined. |
| **Prioritas** | **Medium** |
| **Saran** | Gunakan `task.steps?.find(...)` atau `(task.steps ?? []).find(...)`. **DONE:** pakai `const steps = task.steps ?? []` lalu `steps.find`. |

---

### 7. **DailyTaskLayout.tsx — Pesan error refresh tidak i18n**

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/daily task/section/DailyTaskLayout.tsx:47` |
| **Penjelasan** | `description: 'Failed to refresh tasks'` hardcoded bahasa Inggris, tidak melalui `t()`. |
| **Prioritas** | **Low** |
| **Saran** | Ganti ke `description: t('dailyTask.filters.refreshFailed', 'Failed to refresh tasks')` (atau key i18n yang sesuai). |

---

### 8. **TaskList.tsx — Beberapa toast error tanpa i18n**

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/daily task/section/TaskList.tsx:154–156, 197–199, 210–212, 235–237, 260–262, 310–312` |
| **Penjelasan** | Beberapa `description: 'Failed to update task status'`, 'Failed to update priority', dll. tidak memakai `t()`. |
| **Prioritas** | **Low** |
| **Saran** | Gunakan key i18n untuk semua pesan error (mis. `dailyTask.errors.updateStatus`, `dailyTask.errors.updatePriority`, dll.). |

---

### 9. **DailyTaskContext.tsx — Banyak console.error/console.warn**

| Item | Isi |
|------|-----|
| **File:Line** | `DailyTaskContext.tsx` — banyak baris (474, 554–560, 571, 624, 738, 822, 824, 848, 973, 1012, 1015, 1052, 1057, 1124, 1152, 1182, 1318, 1333, 1345, 1397, 1410, 1439, 1443, 1489, 1513, 1704, 1708, 1742, 1834, 1904, 1915, 1999, 2010, 2026, 2150, 2161, 2164, 2184, 2187, 2189, 2194, 2199, 2207, 2232, 2291, 2338, 2370, 2390, 2444, 2498, 2538) |
| **Penjelasan** | Logging pakai `console.*` instead of `logger` → tidak konsisten, sulit dikontrol di production, dan bisa mempengaruhi performa ringan. |
| **Prioritas** | **Medium** |
| **Saran** | Ganti ke `logger.error` / `logger.warn` (dan hapus log debug yang tidak perlu di production) agar bisa di-filter dan aplikasi lebih ringan. |

---

### 10. **DailyTaskContext.tsx — Initial load error hanya log di effect**

| Item | Isi |
|------|-----|
| **File:Line** | `src/features/8-2-DailyTask/DailyTaskContext.tsx:2630–2632` |
| **Penjelasan** | `fetchTasks().catch((err) => { logger.warn('Initial fetchTasks failed', err); });` — error initial load sudah ditangani di dalam `fetchTasks` dengan toast, jadi user tetap dapat feedback. Tambahan: jika `fetchTasks` tidak throw (mis. catch internal tidak rethrow), effect `.catch` hanya menangkap jika ada reject dari promise yang tidak di-handle. Secara praktis error initial load sudah ada toast. |
| **Prioritas** | **Low** (informatif) |
| **Saran** | Opsional: ekspos state `loadError` dari context agar UI bisa menampilkan pesan error + tombol retry di atas list (untuk UX lebih baik). |

---

### 11. **TaskCard.tsx — Beberapa string hardcoded (bukan bug, code smell)**

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/daily task/section/components/TaskCard.tsx:64–74` (title tooltip) |
| **Penjelasan** | String seperti 'Mark incomplete', 'Mark complete', 'Complete all assigned steps...' tidak melalui i18n. |
| **Prioritas** | **Low** |
| **Saran** | Gunakan `t('dailyTask.markIncomplete', ...)` dll. agar konsisten dengan aturan translate on settings. |

---

### 12. **MobileAssignStepDialog.tsx — Toast error hardcoded**

| Item | Isi |
|------|-----|
| **File:Line** | `src/mobile/pages/daily task/components/MobileAssignStepDialog.tsx:276, 317` |
| **Penjelasan** | 'Failed to save due date' dan 'Failed to save due time' tidak i18n. |
| **Prioritas** | **Low** |
| **Saran** | Gunakan key i18n untuk kedua pesan. |

---

### 13. **API / fallback**

| Item | Isi |
|------|-----|
| **File:Line** | Context & hooks (fetch tasks, blocker counts, task blockers) |
| **Penjelasan** | Error handling: fetch tasks sudah ada toast; refetch di DailyTaskLayout ada try/catch + toast. Blocker counts/hooks ada try-catch dan graceful degradation (counts kosong). Tidak ada retry otomatis untuk initial load — jika jaringan gagal, user harus refresh/retry manual. |
| **Prioritas** | **Low** (peningkatan) |
| **Saran** | Opsional: tombol "Retry" di UI saat error load tasks (dengan state error dari context) untuk loading page speed perceived lebih baik. |

---

## Ringkasan Prioritas

| Prioritas | Jumlah | Action |
|-----------|--------|--------|
| High     | 4      | Perbaiki segera (undefined variable, setState after unmount, null refs) |
| Medium   | 3      | Cleanup timer, logger, optional chaining di blocker modal |
| Low      | 5+     | i18n, error UX, code smell |

---

## Dampak ke Ringan & Kecepatan Loading

- **Lebih ringan:** Mengganti banyak `console.*` di DailyTaskContext ke `logger` (dan matikan di production) mengurangi overhead logging. Menghindari setState setelah unmount mengurangi re-render dan warning.
- **Loading lebih cepat:** Memperbaiki bug logic (stepHistoryResult, optional chaining) mencegah throw dan retry tidak perlu. Menambah pengecekan `cancelled` di fetchTasks mencegah kerja sia-sia setelah navigasi keluar. Opsional: tombol retry dan error state membuat perceived speed lebih baik saat jaringan gagal.

---

*Audit ini berdasarkan static analysis kode. Untuk konfirmasi di device Android, jalankan aplikasi, buka `/tools/daily-task`, dan cek console/logger untuk error dan warning.*
