# Audit Bug: Mobile Android — tools/daily-task & /review

## Ringkasan
Audit fokus pada halaman **tools/daily-task** (DailyTaskPage, DailyTaskLayout, TaskList, PendingApprovalSection, hooks) dan **/review** (ReviewRouteGate, PublicContentReviewPage). Temuan: error handling yang hilang, potensi null reference, dan risiko setState setelah unmount.

---

## Daftar Bug & Temuan

### HIGH

| File:Line | Bug | Penjelasan | Saran perbaikan |
|-----------|-----|------------|------------------|
| `src/features/6-1-dashboard/pages/PublicContentReviewPage.tsx:510` | **Null reference saat Request Revision** | Setelah `supabase.from('social_media_plans').select(...).eq('id', planId).single()`, hanya `fetchError` yang dicek. Jika `.single()` tidak menemukan baris, Supabase bisa mengembalikan `{ data: null, error: null }` atau error dengan kode PGRST116. Akses `currentPlan.production_status` dan `currentPlan.production_revision_count` akan throw bila `currentPlan` null/undefined. | Tambah guard: `if (fetchError || !currentPlan) { setApprovalLoading(false); toast.error(...); return; }` sebelum menggunakan `currentPlan`. |

---

### MEDIUM

| File:Line | Bug | Penjelasan | Saran perbaikan |
|-----------|-----|------------|------------------|
| `src/features/6-1-dashboard/pages/PublicContentReviewPage.tsx:169-179` | **loadComments gagal tanpa umpan ke user** | Pada `loadComments`, jika `rpcError` ada, fungsi hanya `return` tanpa `setError`, toast, atau feedback. User tidak tahu bahwa daftar komentar gagal dimuat. | Pada `rpcError`: set state error atau toast.error; opsional set comments ke [] agar UI konsisten. |
| `src/features/6-1-dashboard/pages/PublicContentReviewPage.tsx:183-198` | **loadBriefExtended gagal tanpa umpan ke user** | Sama seperti loadComments: `rpcError` diabaikan, tidak ada toast atau setError. Target audience/caption bisa kosong tanpa penjelasan. | Pada `rpcError`: log dan/atau toast ringan; set briefExtended ke null atau state error. |
| `src/features/8-2-DailyTask/DailyTaskContext.tsx:2609-2627` | **Risiko setState setelah unmount (cache)** | Di dalam `useEffect` initial load, IIFE `(async () => { ... setTasks(cached); })()` tidak memeriksa apakah komponen masih mounted. Jika user cepat ganti org/navigasi, `setTasks` bisa dipanggil setelah unmount → peringatan React / perilaku tidak konsisten. | Gunakan flag `let cancelled = false` di scope effect; di dalam IIFE sebelum `setTasks(cached)` cek `if (!cancelled) setTasks(cached)`. Di cleanup effect set `cancelled = true`. |

---

### LOW / CODE SMELL

| File:Line | Bug | Penjelasan | Saran perbaikan |
|-----------|-----|------------|------------------|
| `src/features/8-2-DailyTask/DailyTaskContext.tsx:2635-2636` | **Dependency effect sengaja tidak lengkap** | `useEffect` initial load memakai `// eslint-disable-next-line react-hooks/exhaustive-deps` dan hanya `[organizationId]`. `fetchTasks` tidak di dependency. | Biarkan jika memang disengaja (load sekali per org). Kalau ingin ketat, bungkus `fetchTasks` dengan useCallback yang stabil dan masukkan ke deps. |
| `src/features/8-2-DailyTask/section/PendingApprovalSection.tsx:145` | **Fallback link 'default-link'** | Jika `google_drive_link` kosong, dipakai `'default-link'` untuk `getOrCreate`. Bisa membuat token review dengan link tidak nyata. | Pertimbangkan: tidak panggil getOrCreate jika tidak ada link nyata, atau tampilkan pesan "No content link" dan jangan navigasi ke /review. |
| `src/mobile/pages/daily task/section/hooks/useTaskBlockers.ts:15,47,48,65,88` | **Pemakaian `any`** | `blockerModalItems: any[]`, `subById: Record<string, any>`, dan map/filter dengan `(h: any)` mengurangi type safety dan maintainability. | Ganti dengan tipe yang sesuai (mis. interface untuk history row dan employee map). |
| `src/mobile/pages/daily task/section/hooks/useTaskBlockers.ts:29-33` | **Query Supabase tanpa cek error** | `subStepsResult` dari supabase tidak cek `.error`. Jika error, `data` bisa null dan kita pakai `[]` — tidak crash tapi error tidak dilog. | Setelah query, jika `subStepsResult.error` ada, log (logger.warn) dan tetap gunakan [] untuk degradasi. |
| `src/mobile/pages/daily task/components/MobileAssignStepDialog.tsx:100-104` | **Query tanpa cek error** | `const { data: assignsRaw } = await supabase...` tidak memeriksa `error`. Pada kegagalan jaringan/RLS, `assignsRaw` bisa null dan assign = undefined → aman, tapi kegagalan tidak terlihat. | Cek `error`; jika ada, log dan set state yang sesuai (mis. setIsInitialized(true)) agar loading tidak menggantung. |

---

## Yang sudah baik (tidak diubah)

- **ReviewRouteGate**: try/catch, cancelled flag, dan set state hanya bila `!cancelled`.
- **PublicContentReviewPage**: handleSubmitComment, handleSaveEdit, handleDeleteComment, handleApprove punya try/catch dan toast; handleRevision punya try/catch (yang perlu ditambah hanya guard `currentPlan`).
- **TaskList**: Semua `updateTask(..., reorderTaskSteps(...)).catch(...)` disertai toast error.
- **DailyTaskLayout**: handleRefresh try/catch + toast.
- **PendingApprovalSection**: handleViewContent dan handleRejectSubmit punya try/catch dan toast; handleApprove/handleRejectSubmit menangani error dari hook.
- **useBlockerCounts**: cancelled flag, try/catch, debounce, dan cleanup timeout.
- **DailyTaskContext**: fetchTasks().catch(logger.warn) pada initial load; batchQuery dengan retry dan timeout.

---

## Rekomendasi performa / ringan

- **DailyTaskContext**: Cache check (getUser + getCached) sudah non-blocking; baik untuk loading cepat. Pastikan cleanup cache-IIFE dengan cancelled flag agar tidak set state setelah unmount.
- **PublicContentReviewPage**: Tiga load (content, brief, comments) sudah di-Promise.all untuk load paralel; loading state dan finally setLoading(false) sudah benar.
- **useBlockerCounts**: Debounce 300ms dan batch query sudah membantu mengurangi spam request.

---

## Checklist perbaikan singkat

1. **[High]** PublicContentReviewPage: tambah guard `!currentPlan` setelah fetch plan di handleRevision.
2. **[Medium]** PublicContentReviewPage: loadComments dan loadBriefExtended — tambah feedback error (toast atau setError).
3. **[Medium]** DailyTaskContext: tambah cancelled flag di cache IIFE dan jangan setTasks jika cancelled.
4. **[Low]** useTaskBlockers: cek error pada query Supabase dan ganti `any` dengan tipe yang jelas.
5. **[Low]** MobileAssignStepDialog: cek error pada query assignment/due date dan log atau handle state.

Setelah perbaikan High dan Medium, aplikasi lebih stabil dan loading/error behavior lebih bisa diandalkan; perbaikan Low memperbaiki maintainability dan observability.
