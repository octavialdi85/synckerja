# Audit Bug: Mobile Android – Halaman /daily-task?view=jobdesc dan /review

**Scope:** Halaman Job Desc (`/tools/daily-task?view=jobdesc`), halaman Review (`/review/:token`), dan dependensi langsung yang dipakai di mobile Android.

**Tujuan:** Daftar bug potensial, error handling, API fallback, dan saran perbaikan untuk membuat aplikasi lebih ringan dan loading lebih cepat.

---

## Ringkasan prioritas

| Prioritas | Jumlah |
|-----------|--------|
| High      | 3      |
| Medium    | 8      |
| Low       | 6      |

---

## HIGH

### 1. ReviewRouteGate.tsx – getSession() tanpa error logging

**File:line:** `src/features/6-1-dashboard/ReviewRouteGate.tsx:36-38`

**Masalah:** Di `useEffect`, `supabase.auth.getSession()` dipanggil dalam try/catch. Saat catch terpanggil, hanya `setHasSession(false)` yang dijalankan; error tidak di-log sehingga sulit debug saat auth gagal (network, invalid token, dll.).

**Saran:** Di blok `catch`, panggil `logger.error('ReviewRouteGate getSession', err)` (atau `devLog.error`) sebelum `setHasSession(false)`.

---

### 2. PublicContentReviewPage – retry tidak reset loading state dengan benar

**File:line:** `src/features/6-1-dashboard/pages/PublicContentReviewPage.tsx:616-622`

**Masalah:** Tombol "Coba lagi" memanggil `setError(null)`, `setLoading(true)`, dan `setRetryTrigger(prev => prev + 1)`. Effect bergantung pada `retryTrigger`, tapi `setLoading(true)` di-click bisa "kalah" dengan effect yang segera set `setLoading(false)` di finally jika ada race. Selain itu, setelah retry sukses, loading false di-set di dalam effect; tidak ada bug kritis tapi alur state bisa membingungkan.

**Saran:** Pastikan effect yang load data benar-benar set `setLoading(true)` di awal (sudah ada). Untuk kejelasan, bisa panggil `setLoading(true)` di dalam effect tepat sebelum try, bukan di handler tombol, dan biarkan tombol hanya `setError(null)` + `setRetryTrigger(prev => prev + 1)`.

---

### 3. useJobDescAssignments – organizationId null saat context belum siap

**File:line:** `src/mobile/pages/job-desc/section/useJobDescAssignments.ts:668-684`

**Masalah:** `useCurrentOrg()` bisa mengembalikan `organizationId` null/undefined saat context belum ter-hydrate (mis. setelah login/switch org). Query punya `enabled: Boolean(organizationId)` dan `queryFn` mengembalikan `Promise.resolve({ summaries: [], meta: {...} })` bila `!organizationId`, jadi tidak ada throw. Namun, UI akan menampilkan daftar kosong tanpa pesan "Pilih organisasi" atau loading yang jelas; pengguna bisa mengira data kosong.

**Saran:** Tambah cabang UI di Job Desc (mis. di JobDescTracker): jika `!organizationId` dan bukan loading, tampilkan pesan singkat (mis. "Pilih organisasi" atau "Memuat organisasi...") alih-alih hanya daftar kosong. Opsional: expose `organizationId` dari hook dan gunakan untuk pesan ini.

---

## MEDIUM

### 4. JobDescEmployeeCard – Supabase .single() bisa return null (PGRST116)

**File:line:** `src/mobile/pages/job-desc/section/JobDescEmployeeCard.tsx:63-68, 88-96`

**Masalah:** Dua query memakai `.single()`. Bila tidak ada baris, Supabase mengembalikan error PGRST116; kode sudah cek `if (error || !data) return null`. Namun, tipe Supabase untuk `.single()` bisa mengizinkan `data: null` tanpa error di edge case. Akses `data.task_step_id` / nested `data.task_steps_to_steps?.parent_step_id` aman karena ada guard `!data`. Tidak ada bug runtime jelas, tapi type assertion/guard konsisten disarankan.

**Saran:** Pastikan setelah `const { data, error } = await ... .single()`, selalu guard `if (error || !data) return null;` (sudah ada). Opsional: gunakan `.maybeSingle()` dan treat null sebagai "not found" agar konsisten dengan kontrak API.

---

### 5. useJobDescAssignments – fetchAssignments tidak menangani statusesRes.error dengan throw

**File:line:** `src/mobile/pages/job-desc/section/useJobDescAssignments.ts:378-385`

**Masalah:** Untuk `employeesRes`, `taskAssignmentsRes`, dll. error di-throw; untuk `statusesRes.error` hanya di-log dengan `devLog.warn` dan filtering memakai `employees.status` saja. Perilaku sengaja (graceful degradation), tapi kalau `employee_statuses` gagal konsisten, beberapa karyawan bisa salah diklasifikasi aktif/non-aktif.

**Saran:** Biarkan perilaku saat ini; pastikan devLog.warn tetap ada. Opsional: di UI Job Desc, jika ingin transparan, bisa tampilkan banner singkat "Status karyawan mungkin tidak lengkap" hanya saat statusesRes.error (perlu expose flag dari fetchAssignments atau dari hook).

---

### 6. JobDescTracker – isError ditampilkan tapi tidak ada tombol retry

**File:line:** `src/mobile/pages/job-desc/section/JobDescTracker.tsx:173-184`

**Masalah:** Saat `isError`, Alert dengan pesan error ditampilkan. Tidak ada tombol "Coba lagi" yang memanggil `refetch()`. Pengguna harus refresh halaman atau ubah filter untuk trigger refetch.

**Saran:** Tambah tombol "Coba lagi" di dalam Alert yang memanggil `refetch()`, mirip pola di Schedule/Reports.

---

### 7. PublicContentReviewPage – withTimeout reject tidak dibersihkan

**File:line:** `src/features/6-1-dashboard/pages/PublicContentReviewPage.tsx:26-32`

**Masalah:** `withTimeout` memakai `setTimeout(..., ms)` untuk reject. Jika komponen unmount atau effect di-cleanup (cancelled) sebelum timeout, timer tetap jalan dan akan memanggil `reject`. Itu bisa trigger setState setelah unmount (React warning). Effect utama pakai `cancelled` dan tidak set state jika `cancelled`, tapi promise rejection tetap terjadi.

**Saran:** Simpan reference ke timeout id dan di cleanup effect clear timeout. Atau wrap reject sehingga jika `cancelled` tidak reject (mis. pass `cancelled` ref ke withTimeout dan reject hanya jika !cancelled.current). Opsi paling sederhana: clear timeout di return cleanup effect dan abaikan rejection jika cancelled.

---

### 8. JobDescFilters – custom range timezone

**File:line:** `src/mobile/pages/job-desc/section/JobDescFilters.tsx:99-120`

**Masalah:** `customRange.start` / `customRange.end` dipakai dengan `new Date(event.target.value)` (date input). Di beberapa browser/Android, value dari input type="date" bisa diinterpretasikan sebagai UTC midnight; konversi ke Date lalu `toISOString().slice(0, 10)` bisa bergeser satu hari untuk timezone tertentu.

**Saran:** Untuk tampilan dan konsistensi, gunakan helper yang parse date-only string sebagai local date (mis. `new Date(value + 'T00:00:00')` atau parse manual) agar tidak ada shift hari. Cek juga di `computeRange` (useJobDescAssignments) bahwa custom range dipakai konsisten (startOfDay/endOfDay sudah pakai Date object, jadi aman selama start/end dari input konsisten).

---

### 9. PendingApprovalSection – refetchTasks() setelah reject tanpa batasan

**File:line:** `src/features/8-2-DailyTask/section/PendingApprovalSection.tsx:115-121`

**Masalah:** Setelah reject berhasil, `refetchTasks()` dipanggil. Jika `refetchTasks` dari DailyTaskContext melakukan full refetch yang berat, bisa menambah loading setelah aksi. Tidak ada bug logic; lebih ke performa.

**Saran:** Pastikan refetchTasks tidak memicu cascade request berlebihan. Jika sudah di-debounce atau di-cache di context, tidak perlu ubah. Kalau belum, pertimbangkan debounce atau hanya invalidate query tanpa refetch penuh.

---

### 10. PublicContentReviewPage – handleRevision double fetch comments

**File:line:** `src/features/6-1-dashboard/pages/PublicContentReviewPage.tsx:517-524`

**Masalah:** Sebelum update status, halaman memanggil `get_public_review_comments` lagi untuk verifikasi server-side bahwa user punya komentar. Itu menambah satu round-trip setiap kali user klik Request Revision. Perilaku benar secara bisnis; dampak ke kecepatan halaman kecil tapi bisa dioptimasi.

**Saran:** Low priority: pertimbangkan cache hasil komentar (mis. dari state comments yang baru di-load) dan hanya panggil RPC comments lagi jika data komentar dianggap stale (mis. lebih dari 30 detik). Bukan wajib.

---

### 11. JobDescPage – tidak ada error boundary

**File:line:** `src/mobile/pages/job-desc/JobDescPage.tsx` (seluruh komponen)

**Masalah:** Jika JobDescTracker atau child throw (mis. dari dependency yang bermasalah), seluruh halaman Job Desc bisa putih atau crash tanpa fallback UI.

**Saran:** Opsional: bungkus konten Job Desc (mis. JobDescTracker) dengan Error Boundary dan tampilkan pesan + tombol "Coba lagi" atau "Kembali".

---

## LOW

### 12. useJobDescAssignments – daily_tasks select tanpa finish_date

**File:line:** `src/mobile/pages/job-desc/section/useJobDescAssignments.ts:428-429`

**Masalah:** Query `daily_tasks` hanya select `id, title, status, priority, due_date`. Tidak ada `finish_date`. TaskMap diisi dari hasil ini; lalu di-overwrite oleh `assignment.daily_task` yang dari join dan punya `finish_date`. Untuk task yang hanya muncul dari step (bukan dari task assignment), taskMap hanya punya data tanpa finish_date. Di buildSummaries, `completedAt` untuk task assignment selalu dari `assignment.daily_task` atau task yang di-merge dari assignment, jadi ada finish_date. Tidak ada crash; hanya kelengkapan data untuk edge case.

**Saran:** Untuk konsistensi, tambahkan `finish_date` ke select daily_tasks: `.select("id, title, status, priority, due_date, finish_date")`.

---

### 13. JobDescTracker – LoadingDots di dua tab

**File:line:** `src/mobile/pages/job-desc/section/JobDescTracker.tsx:191-194, 239-242`

**Masalah:** Overview dan Detail tab masing-masing punya blok `isLoading ? <LoadingDots /> : ...`. Satu query dipakai untuk kedua tab; loading hanya sekali. Tidak salah, hanya redundant di UI (dua tempat tampil loading yang sama).

**Saran:** Boleh dipertahankan; atau angkat loading ke atas Tabs sehingga satu skeleton/loading dipakai untuk seluruh konten tab.

---

### 14. ReviewRouteGate – "Loading..." hardcoded

**File:line:** `src/features/6-1-dashboard/ReviewRouteGate.tsx:50`

**Masalah:** Teks "Loading..." tidak memakai i18n. Untuk konsistensi dengan halaman lain yang pakai terjemahan.

**Saran:** Gunakan terjemahan (mis. dari useAppTranslation atau defaultTranslations) untuk teks loading, atau constant yang dipakai juga di PublicContentReviewPage.

---

### 15. JobDescEmployeeCard – scrollTimeoutRef cleanup

**File:line:** `src/mobile/pages/job-desc/section/JobDescEmployeeCard.tsx:111-116`

**Masalah:** Cleanup effect hanya clear timeout. Jika komponen unmount saat getStepId/getParentStepId masih jalan, callback async bisa tetap memanggil setExpandedTasks/scrollToStep setelah unmount. Risiko kecil karena delay 300ms.

**Saran:** Opsional: gunakan ref "mounted" dan cek di dalam callback setTimeout sebelum memanggil setExpandedTasks/scrollToStep; atau batalkan promise getStepId/getParentStepId saat unmount (lebih rumit). Bisa ditunda ke iterasi berikutnya.

---

### 16. PublicContentReviewPage – localStorage JSON parse tanpa validasi ketat

**File:line:** `src/features/6-1-dashboard/pages/PublicContentReviewPage.tsx:268-276`

**Masalah:** `JSON.parse(raw)` di try/catch; jika invalid hanya ignore. Tidak ada validasi bahwa hasil punya shape `{ displayName?: string }`. Nilai aneh bisa masuk ke `commenterDisplayName`.

**Saran:** Setelah parse, validasi: `if (parsed && typeof parsed.displayName === 'string' && parsed.displayName.trim())` baru set. Sudah mendekati itu; pastikan trim dipakai konsisten.

---

### 17. DailyTaskPage – view null/undefined

**File:line:** `src/mobile/pages/daily task/DailyTaskPage.tsx:19, 38`

**Masalah:** `const view = searchParams.get('view');` bisa null. Ekspresi `view === 'jobdesc' ? ... : view === 'summary' ? ... : <DailyTaskLayout />` mengarahkan null ke DailyTaskLayout. Itu perilaku yang masuk akal (default ke task list).

**Saran:** Tidak wajib; untuk kejelasan bisa tulis eksplisit: `view === 'jobdesc' ? ... : view === 'summary' ? ... : <DailyTaskLayout />` (tetap sama). Atau dokumentasikan bahwa null/undefined = default layout.

---

## Code smells / performa (tanpa nomor bug)

- **Job Desc – banyak state di JobDescTracker:** Banyak useState (timeframe, customRange, searchTerm, showIdleOnly, selectedEmployeeId, includeOverdue, activeTab). Pertimbangkan useReducer atau satu state object jika refactor besar; tidak wajib.
- **Review – dependency effect load:** Effect load di PublicContentReviewPage bergantung pada `loadContent`, `loadBriefExtended`, `loadComments`, `t`. Fungsi-fungsi itu dari useCallback dengan dependency [token] atau [token, t]. Pastikan `t` stabil (usePublicReviewT sudah useCallback dengan []), agar effect tidak jalan ulang tanpa perlu.
- **Job Desc – filter search:** Filter client-side di useMemo; untuk ratusan karyawan + assignments masih bisa. Jika nanti data besar, pertimbangkan server-side search.

---

## Rekomendasi prioritas implementasi

1. **High:** 1 (ReviewRouteGate logging), 2 (retry state), 3 (organizationId empty state).
2. **Medium:** 6 (tombol retry Job Desc), 7 (withTimeout cleanup), lalu 4, 5, 8, 9, 10, 11 sesuai kebutuhan.
3. **Low:** 12 (finish_date), 14 (i18n Loading), sisanya opsional.

Tidak ada perubahan skema API atau dependency baru yang wajib; hanya penyesuaian kode dan tambahan UI/error handling.
