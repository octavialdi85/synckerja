# Audit Bug: Mobile Android — /tools/daily-task?view=jobdesc & /review

**Lingkup:** Halaman `/tools/daily-task?view=jobdesc` (Job Desc) dan `/review` (Public Content Review) versi mobile Android.  
**Tujuan:** Identifikasi bug, error handling, code smells; saran perbaikan untuk performa dan kecepatan loading.

---

## Daftar Bug & Temuan

### HIGH

| # | File:Line | Temuan | Penjelasan | Saran Perbaikan |
|---|-----------|--------|------------|------------------|
| 1 | `src/mobile/pages/job-desc/section/JobDescEmployeeCard.tsx:77` | **console.error di production** | `console.error('Error fetching stepId:', error)` — log ke console saat fetch stepId gagal; di production menambah noise dan bisa expose detail error. | Ganti ke `devLog.warn` atau `devLog.error` dari `@/config/logger`; jangan pakai `console.error` di path production. |
| 2 | `src/mobile/pages/job-desc/section/JobDescEmployeeCard.tsx:109` | **console.error di production** | `console.error('Error fetching parentStepId:', error)` — sama seperti #1. | Ganti ke `devLog.warn` atau `devLog.error`. |
| 3 | `src/mobile/pages/job-desc/section/useJobDescAssignments.ts:507` | **console.warn di production** | `console.warn('Job Desc: employee_statuses fetch failed, ...')` — hanya di-guard dengan `import.meta.env.DEV`; di build production tetap bisa terpanggil tergantung bundler. | Pastikan hanya log di dev, atau ganti ke `devLog.warn` dan filter level di logger. |
| 4 | `src/features/6-1-dashboard/pages/PublicContentReviewPage.tsx` (loadContent/loadBriefExtended/loadComments) | **Tidak ada retry/fallback untuk RPC gagal** | `loadContent`, `loadBriefExtended`, `loadComments` — bila RPC gagal (network/5xx), user hanya dapat error state; tidak ada tombol retry atau auto-retry. | Tambah tombol "Coba lagi" di state error, dan/atau retry 1x dengan backoff untuk RPC. |
| 5 | `src/mobile/pages/job-desc/section/JobDescEmployeeCard.tsx:56-79, 81-111` | **Cache state di dependency useCallback menyebabkan re-create callback tiap cache berubah** | `getStepId` / `getParentStepId` punya dependency `[stepIdCache]` / `[parentStepIdCache]`. Setiap cache update (setStepIdCache/setParentStepIdCache) membuat callback baru → potensi re-render dan re-fetch tidak perlu. | Gunakan ref untuk cache (e.g. `useRef<Map>(new Map())`) dan baca/tulis lewat ref; hapus cache dari dependency useCallback agar callback stabil. |

---

### MEDIUM

| # | File:Line | Temuan | Penjelasan | Saran Perbaikan |
|---|-----------|--------|------------|------------------|
| 6 | `src/mobile/pages/job-desc/section/JobDescTracker.tsx:59-63` | **useJobDescAssignments dipanggil tanpa memo/stable options** | `timeframe`, `customRange`, `includeOverdue` dari useState — object `customRange` baru tiap render (reference berubah). React Query `queryKey` pakai `range.start?.toISOString()` (dari useMemo), jadi sebenarnya range stabil; tapi dependency array di useMemo di useJobDescAssignments bergantung pada customRange. | Sudah pakai useMemo untuk range di useJobDescAssignments; pastikan customRange tidak di-spread ke queryKey yang berubah tiap render. (Saat ini queryKey pakai range, bukan customRange — OK.) |
| 7 | `src/features/6-1-dashboard/pages/PublicContentReviewPage.tsx` (useEffect load) | **Tidak ada timeout untuk load awal** | Jika RPC `get_public_review_content_by_token` atau `get_public_review_brief_extended_by_token` hang (network/slow), user terjebak di loading tanpa batas. | Tambah timeout (e.g. AbortController + setTimeout) atau Promise.race dengan timeout; tampilkan error setelah timeout. |
| 8 | `src/mobile/pages/job-desc/section/JobDescEmployeeCard.tsx:138-141` | **setTimeout untuk scrollToStep tanpa cleanup** | `setTimeout(() => { scrollToStep(stepId); }, 300);` — jika komponen unmount dalam 300ms, scrollToStep tetap dipanggil; bisa akses context/ref yang sudah unmount. | Simpan handle timeout dan clear di cleanup: `const t = setTimeout(...); return () => clearTimeout(t);` (dalam useEffect) atau pakai ref untuk cancel. |
| 9 | `src/mobile/pages/job-desc/section/JobDescEmployeeCard.tsx:167-171` | **Sama: setTimeout tanpa cleanup** | Sama seperti #8 untuk parentStepId + scrollToStep. | Sama: clearTimeout di cleanup. |
| 10 | `src/features/6-1-dashboard/hook/useProdApprovalAccess.ts:38-129` | **Async check() tanpa abort/cancel token** | `check()` melakukan beberapa await (getUser, profiles, user_roles, employees, approval_access_configurations). Hanya flag `cancelled`; jika Supabase lambat, banyak request bisa tetap selesai setelah unmount. | Gunakan AbortController dan pass signal ke Supabase query jika didukung; atau pastikan setiap setState setelah await selalu cek `if (cancelled) return`. |
| 11 | `src/features/8-2-DailyTask/section/PendingApprovalSection.tsx:115-118` | **refetchTasks() error hanya toast, tidak set state error** | `try { await refetchTasks(); } catch { toast(...); }` — tidak ada state error untuk ditampilkan di UI; user hanya lihat toast. | Opsional: set state error lokal agar bisa tampil "Gagal memuat ulang tugas" dengan tombol retry. |
| 12 | `src/mobile/pages/job-desc/section/JobDescTracker.tsx:116-132` | **renderFilters() dipanggil 2x (Overview + Detail tab)** | `renderFilters()` dipanggil di dalam masing-masing TabsContent. Filter di-render dua kali (dua pohon DOM) — tidak salah secara logic, tapi duplikasi DOM dan state tetap satu. | Tidak wajib diubah; jika ingin kurangi DOM, angkat filter ke atas Tabs (satu instance) dan biarkan konten tab saja yang ganti. |

---

### LOW

| # | File:Line | Temuan | Penjelasan | Saran Perbaikan |
|---|-----------|--------|------------|------------------|
| 13 | `src/mobile/pages/job-desc/section/JobDescEmployeeCard.tsx:100` | **Type assertion (data as any)** | `(data as any).task_steps_to_steps?.parent_step_id` — menghindari type Supabase yang dalam. | Definisikan interface untuk response (task_steps_to_steps: { parent_step_id: string \| null }) dan gunakan type assertion ke interface tersebut. |
| 14 | `src/features/6-1-dashboard/pages/PublicContentReviewPage.tsx` | **Banyak state useState (20+)** | Satu komponen dengan banyak state bisa membuat re-render sering dan sulit dilacak. | Pertimbangkan useReducer atau pecah ke custom hook (e.g. useReviewComments, useReviewApproval) untuk state terkait. |
| 15 | `src/mobile/pages/job-desc/section/useJobDescAssignments.ts:499-502` | **Throw langsung error Supabase** | `if (employeesRes.error) throw employeesRes.error` — error object Supabase di-throw; di React Query akan masuk ke queryFn rejection dan ditangani oleh isError/error. Tidak ada transformasi pesan user-friendly. | Opsional: transform ke Error dengan message yang user-friendly sebelum throw, atau pastikan UI (JobDescTracker) menampilkan getErrorMessage(error) yang cukup jelas. |
| 16 | `src/mobile/pages/job-desc/section/JobDescTracker.tsx:246-248` | **key hanya summary.employeeId** | `key={summary.employeeId}` — aman selama employeeId unik. Jika suatu saat ada duplikat (data bug), React bisa warning/duplicate key. | Pastikan backend/API menjamin employeeId unik per list; tidak perlu ubah kode kecuali ada kasus duplikat. |
| 17 | `src/features/6-1-dashboard/pages/PublicContentReviewPage.tsx` (visualViewport) | **Listener resize/scroll tanpa passive** | `vv.addEventListener('resize', check); vv.addEventListener('scroll', check)` — scroll listener bisa blocking scroll jika check berat. | Tambah `{ passive: true }` untuk scroll listener jika check tidak memanggil preventDefault. |

---

## Ringkasan prioritas

- **High:** 5 — hapus console.* di production, tambah retry/fallback review, perbaiki cache/callback di JobDescEmployeeCard.
- **Medium:** 7 — race/cleanup (setTimeout, async), AbortController di useProdApprovalAccess, error state refetchTasks, optional DOM dedupe filter.
- **Low:** 5 — type assertion, banyak state, error message, key, passive listener.

---

## Rekomendasi performa & loading

1. **Job Desc:**  
   - Ganti cache di JobDescEmployeeCard dari state ke ref agar callback stabil dan kurangi re-fetch.  
   - Pastikan React Query staleTime (60s) cukup; bisa naik sedikit untuk jobdesc jika data tidak perlu real-time.

2. **Review page:**  
   - Tambah retry 1x (atau tombol "Coba lagi") untuk loadContent / loadComments / loadBriefExtended.  
   - Pertimbangkan preload/parallel: loadContent + loadBriefExtended sudah Promise.all; loadComments setelah itu — OK.

3. **Umum:**  
   - Hapus semua console.log/warn/error dari path production; gunakan devLog dan level log.  
   - Clear timeout/interval dan cancel async (AbortController atau cancelled flag) pada unmount.

---

*Audit ini berdasarkan static code analysis. Verifikasi dengan runtime (log/reproduce) disarankan untuk high-priority items sebelum deploy.*
