# Audit Bug: Halaman /tools/daily-task (Menyeluruh)

**Scope:** Fitur Daily Task (`src/features/8-2-DailyTask`) dan halaman `/tools/daily-task`.  
**Tanggal:** 2026-02-16.

---

## Daftar Bug (file:line)

### 1. **TaskList.tsx:266** — Unhandled promise dari `reorderTaskSteps`
- **Deskripsi:** `reorderTaskSteps(task.id, stepIds)` dipanggil tanpa `await` atau `.catch()`. Jika promise ditolak (mis. jaringan/API gagal), akan terjadi unhandled rejection dan tidak ada umpan balik ke user.
- **Prioritas:** High
- **Saran:** Panggil dengan `reorderTaskSteps(task.id, stepIds).catch((err) => { toast({ title: 'Error', description: 'Failed to reorder steps', variant: 'destructive' }); });` atau bungkus dalam async handler dan try/catch.

---

### 2. **TaskList.tsx:258** — Mutasi state: `task.steps.sort()`
- **Deskripsi:** `task.steps.sort((a, b) => a.order - b.order)` memakai `.sort()` in-place, sehingga memutasi array `task.steps` di state/context. Dapat menyebabkan perilaku tidak konsisten dan pelanggaran immutability di React.
- **Prioritas:** Medium
- **Saran:** Gunakan salinan sebelum sort: `const sortedSteps = [...task.steps].sort((a, b) => a.order - b.order);`

---

### 3. **DailyTaskContext.tsx:279–291** — Fitur “Recent Step Updates” nonaktif
- **Deskripsi:** `fetchRecentStepUpdates` selalu `return` di awal (query dinonaktifkan untuk menghindari timeout). `setRecentStepUpdates([])` selalu kosong, sehingga “Recent Step Updates” di sidebar tidak pernah menampilkan data.
- **Prioritas:** High (fitur rusak)
- **Saran:** Aktifkan kembali query dengan strategi aman (lazy load saat tab Summary/Recent dibuka, batas limit, atau pagination) atau hapus UI-nya jika fitur sengaja dinonaktifkan.

---

### 4. **DailyTaskContext.tsx (background due dates, ~line 738–754)** — Risiko `task.steps` undefined di `setTasks`
- **Deskripsi:** Di IIFE background due dates, callback `setTasks(prevTasks => prevTasks.map(task => ({ ...task, steps: task.steps.map(...) })))` mengasumsikan `task.steps` selalu ada. Jika suatu task di state tidak punya `steps`, `task.steps.map` akan throw.
- **Prioritas:** Low (edge case)
- **Saran:** Gunakan safe access: `steps: (task.steps ?? []).map(step => ...)`.

---

### 5. **taskListHelpers.tsx:81–83** — Akses `task.steps` tanpa optional chaining
- **Deskripsi:** `isTaskFullyCompleteBySteps` memakai `task.steps.length` dan `task.steps.filter`. Tipe mendefinisikan `steps` wajib, tetapi runtime (mis. data lama/API) bisa mengembalikan task tanpa `steps`, sehingga bisa throw.
- **Prioritas:** Low
- **Saran:** Gunakan `(task.steps?.length ?? 0) > 0` dan `task.steps?.filter(...)` (atau default ke array kosong) untuk aman terhadap undefined.

---

### 6. **PendingApprovalSection.tsx:106, 175** — `refetchTasks()` tanpa error handling
- **Deskripsi:** Setelah reject/approve, `await refetchTasks()` dipanggil tanpa try/catch. Jika `refetchTasks()` gagal, error tidak ditangani dan user tidak dapat diberi tahu.
- **Prioritas:** Medium
- **Saran:** Bungkus dalam try/catch dan tampilkan toast error, atau `refetchTasks().catch(() => { /* optional toast */ });`.

---

### 7. **TaskInitiative.tsx:86** — Kemungkinan `undefined` masuk ke `Set` expanded tasks
- **Deskripsi:** Untuk item type `'step'`, `item.taskId` bersifat optional. `setExpandedTasks(prev => new Set([...prev, item.taskId]))` dapat menambahkan `undefined` ke Set jika `item.taskId` tidak ada.
- **Prioritas:** Medium
- **Saran:** Hanya tambah jika defined: `if (item.taskId) setExpandedTasks(prev => new Set([...prev, item.taskId]));`

---

### 8. **TaskInitiative.tsx:119–176** — `fetchCurrentEmployee` tanpa cancel/cleanup
- **Deskripsi:** `useEffect` memanggil async `fetchCurrentEmployee()` tanpa flag batal atau cleanup. Jika komponen unmount saat fetch masih berjalan, `setCurrentEmployeeId` / `setIsLoading` / `toast` bisa dipanggil setelah unmount (warning React / memory leak).
- **Prioritas:** Medium
- **Saran:** Gunakan `let cancelled = false` di dalam effect, set `cancelled = true` di cleanup; sebelum setiap `setState`/toast cek `if (cancelled) return;`. Atau pakai AbortController dan batalkan di cleanup.

---

### 9. **useCompletionApprovals.ts (useEffect dengan refresh)** — SetState setelah unmount
- **Deskripsi:** `refresh()` async; setelah timeout, `refresh()` dipanggil dan akan memanggil `setPending`, `setLoading`, dll. Jika komponen sudah unmount saat `refresh()` selesai, terjadi setState on unmounted component.
- **Prioritas:** Medium
- **Saran:** Di dalam `refresh`, gunakan ref `isMounted` yang di-set false di cleanup effect yang memanggil refresh, dan sebelum setState cek `if (!isMounted.current) return;`. Atau batalkan fetch (AbortController) di cleanup.

---

### 10. **CreateTaskDialog.tsx:220** — Validasi pakai `alert()` dan tidak i18n
- **Deskripsi:** Pesan “Please select a Plan date before creating the task.” lewat `alert()`, tidak pakai `t()` dan tidak konsisten dengan toast/UI lain.
- **Prioritas:** Low
- **Saran:** Ganti dengan `toast({ title: t('...'), description: t('...'), variant: 'destructive' })` dan gunakan key terjemahan.

---

### 11. **TaskSummaryCards.tsx:19–80** — Label kartu hardcoded (tidak i18n)
- **Deskripsi:** Label seperti 'Pending', 'In Progress', 'Completed', 'Overdue', 'Total Steps', 'Completed Steps', 'Planned This Month' hardcoded dalam bahasa Inggris. Halaman seharusnya bisa diterjemahkan lewat pengaturan bahasa.
- **Prioritas:** Medium
- **Saran:** Gunakan `useAppTranslation()` dan `t('dailyTask.summary.pending', 'Pending')` (atau key yang sesuai) untuk semua label.

---

### 12. **RecentUpdateSteps.tsx** — Teks hardcoded (tidak i18n)
- **Deskripsi:** String seperti "Recent Step Updates", "Loading...", "No updates found for selected filters", "Just now", "All Actions", "Completed", "Updated", "Created", "Reopened", "Custom Range", "Start Date", "End Date", "Apply", "Cancel" tidak memakai i18n.
- **Prioritas:** Medium
- **Saran:** Tambah key di `translations.ts` dan gunakan `t(...)` di komponen.

---

### 13. **RecentUpdateSteps.tsx:125–128** — `setTimeout` tanpa cleanup
- **Deskripsi:** `setTimeout(() => setClickedUpdateId(null), 2000)` dijalankan tanpa disimpan atau dibatalkan. Jika komponen unmount sebelum 2 detik, callback tetap jalan dan memanggil setState setelah unmount.
- **Prioritas:** Low
- **Saran:** Simpan id timer dan clear di cleanup: `const id = setTimeout(...); return () => clearTimeout(id);` (dalam useEffect jika perlu, atau simpan ref dan clear on unmount).

---

### 14. **DailyTaskContext.tsx:69, 127** — `console.error` di production path
- **Deskripsi:** `batchQuery` memakai `console.error('Batch query failed after retries:', lastError)`. Log ke console di path production bisa mengekspos detail error dan tidak terpusat.
- **Prioritas:** Low (code smell)
- **Saran:** Ganti dengan `logger` (mis. `logger.error` atau `logger.warn`) agar konsisten dengan konfigurasi logging aplikasi.

---

### 15. **DailyTaskPage.tsx — Scroll utama tanpa class konsisten**
- **Deskripsi:** Sesuai aturan proyek, halaman lain (mis. EmployeeManagementMain) memakai `seamless-scroll` dan `max-h-[calc(100vh-120px)]` agar scroll konsisten. Area daftar task utama di Daily Task tidak memakai `max-h-[calc(100vh-120px)]` yang sama; hanya sidebar yang memakainya.
- **Prioritas:** Low
- **Saran:** Terapkan class yang sama pada container scroll utama (mis. wrapper TaskList) agar perilaku scroll seragam di semua halaman.

---

### 16. **useJobDescAssignments.ts (fetchAssignments)** — Error hanya di-throw, tanpa fallback data
- **Deskripsi:** Banyak `if (x.error) throw x.error` dan `throw` di dalam `fetchAssignments`. React Query menangani error dan meng-set `isError`, tetapi tidak ada fallback data (mis. array kosong) di level fungsi; UI sudah menangani isError. Risiko tambahan: jika ada branch yang tidak throw dan mengembalikan data partial, bisa tampil data tidak lengkap.
- **Prioritas:** Low
- **Saran:** Pastikan semua path error konsisten (throw atau return { error }) dan di UI selalu cek `isError` dan tampilkan pesan/retry; pastikan return value sukses selalu berbentuk { summaries, meta } yang jelas.

---

### 17. **TaskFilters.tsx:503–506** — Refresh button async tanpa feedback error
- **Deskripsi:** `onClick={async () => { await refetchTasks(); }}` tidak ada try/catch atau toast bila `refetchTasks()` gagal. User tidak tahu kalau refresh gagal.
- **Prioritas:** Low
- **Saran:** `onClick={async () => { try { await refetchTasks(); } catch { toast({ title: 'Error', description: 'Failed to refresh', variant: 'destructive' }); } }}` atau serupa.

---

## Ringkasan prioritas

| Prioritas | Jumlah | Item |
|-----------|--------|------|
| High     | 2      | #1 (reorderTaskSteps unhandled), #3 (Recent Step Updates disabled) |
| Medium   | 6      | #2 (mutasi sort), #6 (refetchTasks), #7 (undefined di Set), #8 (fetch employee cleanup), #9 (refresh unmount), #11–12 (i18n) |
| Low      | 7      | #4, #5 (steps undefined), #10 (alert), #13 (setTimeout), #14 (console), #15 (scroll), #16–17 (error handling/feedback) |

---

## Rekomendasi perbaikan (urutan)

1. Perbaiki unhandled promise (#1) dan mutasi state (#2) di TaskList.
2. Putuskan nasib fitur Recent Step Updates: aktifkan dengan query aman atau sembunyikan UI (#3).
3. Tambah error handling untuk `refetchTasks` di PendingApprovalSection (#6) dan TaskFilters (#17).
4. Perbaiki TaskInitiative: guard `item.taskId` (#7) dan cleanup fetch/effect (#8).
5. Tambah guard unmount di useCompletionApprovals (#9).
6. I18n: TaskSummaryCards (#11), RecentUpdateSteps (#12), CreateTaskDialog alert (#10).
7. Defensive coding: optional chaining/fallback untuk `task.steps` (#4, #5); cleanup setTimeout (#13); ganti console dengan logger (#14); konsistensi scroll (#15).
