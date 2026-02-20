# Audit Bug: Mobile Android – Halaman /tools/daily-task

**Lingkup:** Mobile Android, halaman `/tools/daily-task` (Daily Task + Initiative view).  
**Tanggal:** 2026-02-20.

---

## Ringkasan

| Prioritas | Jumlah |
|-----------|--------|
| High      | 4      |
| Medium    | 14     |
| Low       | 12     |

---

## HIGH

### 1. `src/mobile/pages/daily task/section/TaskList.tsx:212-216` — Unhandled promise: deleteTask

**Masalah:** `handleConfirmDelete` memanggil `await deleteTask(deleteDialog.taskId)` tanpa try/catch. Jika `deleteTask` reject, unhandled rejection dan user tidak dapat feedback.

**Saran:** Bungkus dengan try/catch; pada catch tampilkan toast error dan jangan tutup dialog (atau tutup dialog dan toast).

---

### 2. `src/mobile/pages/daily task/section/TaskList.tsx:198-201` — Unhandled promise: updateTask (priority)

**Masalah:** `handlePriorityChange` memanggil `await updateTask(taskId, { priority: newPriority })` tanpa catch. Rejection tidak tertangkap.

**Saran:** Tambah .catch() atau try/catch + toast error.

---

### 3. `src/mobile/pages/daily task/section/TaskList.tsx:224-236` — Unhandled promise: updateTask (reminder)

**Masalah:** `handleToggleReminder` memanggil `await updateTask(task.id, { has_reminder: newReminderValue })` tanpa catch.

**Saran:** Tambah .catch() atau try/catch + toast; pertimbangkan rollback state reminder jika gagal.

---

### 4. `src/mobile/pages/daily task/section/TaskList.tsx:278` — Unhandled promise: reorderTaskSteps

**Masalah:** `reorderTaskSteps(task.id, stepIds)` dipanggil tanpa .catch(). Jika gagal, user tidak dapat feedback dan UI bisa out-of-sync.

**Saran:** Panggil `reorderTaskSteps(task.id, stepIds).catch((err) => { toast error; })` atau tampilkan pesan error.

---

## MEDIUM

### 5. `src/mobile/pages/daily task/section/TaskList.tsx:142,185` — console.error di production

**Lokasi:** Catch handler untuk updateTask status.

**Masalah:** Langsung pakai `console.error`; tidak konsisten dengan logger dan sulit dikontrol di production.

**Saran:** Ganti dengan `logger.error` (dari `@/config/logger`).

---

### 6. `src/mobile/pages/daily task/section/TaskList.tsx:43` — Type safety: (context as any)

**Masalah:** `const requestDeadlineExtension = (context as any).requestDeadlineExtension` menghilangkan pengecekan tipe; jika context berubah bisa runtime error.

**Saran:** Ekspos `requestDeadlineExtension` di tipe DailyTaskContext dan destructure normal dari `useDailyTask()`.

---

### 7. `src/mobile/pages/daily task/section/TaskList.tsx:49-52` — Type assertion currentEmployee

**Masalah:** `(currentEmployee as any).id` untuk akses id; rapuh jika bentuk response berubah.

**Saran:** Gunakan tipe dari useCurrentEmployee atau type guard; hindari `as any` jika memungkinkan.

---

### 8. `src/mobile/pages/daily task/components/MobileAssignStepDialog.tsx:133,262,303` — console.warn/error

**Masalah:** Log ke console untuk load assignment, autosave due date/time; tidak melalui logger.

**Saran:** Ganti dengan logger.warn / logger.error.

---

### 9. `src/mobile/pages/daily task/section/hooks/useBlockerCounts.ts:5,80,102,123,165` — supabase as any + console.warn

**Masalah:** `const supabaseClient = supabase as any`; semua error hanya console.warn, tidak ada logger.

**Saran:** Hapus `as any` (gunakan type assertion pada response jika perlu); ganti console.warn dengan logger.warn.

---

### 10. `src/mobile/pages/daily task/section/hooks/useTaskBlockers.ts:5,105,124` — supabase as any + console

**Masalah:** Sama: supabase as any; console.warn/error.

**Saran:** Type assertion pada response; ganti console dengan logger.

---

### 11. `src/features/8-2-DailyTask/DailyTaskContext.tsx` — Banyak console.* (shared oleh mobile)

**Lokasi:** Puluhan baris (474, 554-555, 571, 624, 665, 706, 745, 784, 868, 870, 894, 1019, 1057-1058, 1061, 1098, 1103, 1170, 1198, 1228, 1364, 1379, 1391, 1443, 1456, 1485, 1489, 1535, 1546, 1549, 1559, 1750, 1754, 1788, 1880, 1950, 1961, 2045, 2056, 2072, 2196, 2207, 2210, 2230, 2233, 2235, 2240, 2245, 2253, 2278, 2337, 2384, 2416, 2436, 2490, 2544, 2584, 2677).

**Masalah:** Context dipakai oleh halaman daily-task mobile; semua log ke console, tidak melalui logger → noise di production dan tidak konsisten.

**Saran:** Ganti bertahap dengan logger (logger.error, logger.warn, logger.debug); fokus dulu pada path yang dipanggil dari mobile (fetchTasks, updateTask, deleteTask, reorderTaskSteps, dll.).

---

### 12. `src/features/8-2-DailyTask/DailyTaskContext.tsx:2677` — fetchTasks().catch(() => {})

**Masalah:** Error saat load awal di-swallow tanpa log; user bisa melihat loading selesai tapi data kosong tanpa alasan.

**Saran:** Minimal log: `.catch((err) => { logger.warn('Initial fetchTasks failed', err); })` dan pastikan UI menampilkan error state jika perlu.

---

### 13. `src/mobile/pages/Initiative/section/MobileTaskInitiative.tsx` — Banyak console.* (73, 79, 87, 101, 108, 111, 119, 282, 286, 347, 352, 368, 536, 551)

**Masalah:** Halaman Initiative (route yang sama /tools/daily-task?view=initiative) penuh console.log/error/warn; tidak pakai logger.

**Saran:** Ganti dengan logger; untuk log dev-only (e.g. "Current employee ID loaded") pakai logger.debug atau guard import.meta.env.DEV.

---

### 14. `src/mobile/pages/Initiative/section/MobileTaskInitiative.tsx:282-368` — API error handling partial

**Masalah:** Beberapa branch hanya console.error tanpa toast; user tidak dapat feedback (mis. sub-steps fetch, parent step fetch).

**Saran:** Untuk error yang mempengaruhi tampilan daftar, tampilkan toast atau state error; untuk non-critical bisa tetap log saja.

---

### 15. `src/mobile/pages/Initiative/components/MobileAssignInitiativeItemDialog.tsx:197` — console.error tanpa toast

**Masalah:** Error assigning task hanya di-log; user mungkin tidak tahu kenapa assign gagal.

**Saran:** Tambah toast error setelah console.error, atau ganti dengan logger.error + toast.

---

### 16. `src/mobile/pages/daily task/section/components/TaskDetailModal.tsx:365` — step as any

**Masalah:** Prop `step={step as any}` menyembunyikan tipe; rawan runtime error jika bentuk step salah.

**Saran:** Pastikan tipe TaskStep dari context/types dipakai; hapus as any.

---

### 17. `src/mobile/pages/daily task/section/ObjectiveHierarchyDialog.tsx:188,209,226` — (companyObjectives as any[]), (company as any)

**Masalah:** Type assertion any menghilangkan pengecekan; progress_percentage dan struktur company bisa salah.

**Saran:** Definisikan interface untuk company/objective response dan gunakan assertion ke tipe tersebut.

---

### 18. `src/mobile/components/ToolsNavigationFooter.tsx:31,34` — isActive dengan location.search exact

**Masalah:** `location.search === "?view=initiative"` gagal jika ada query lain (e.g. `?view=initiative&foo=1`). Tab "Initiative" bisa tidak ter-highlight.

**Saran:** Gunakan `new URLSearchParams(location.search).get('view') === 'initiative'` untuk isActive.

---

## LOW

### 19. `src/mobile/pages/daily task/section/components/EmptyState.tsx` — Hardcoded string EN

**Masalah:** "No tasks found", "Create your first task to get started" tidak melalui i18n.

**Saran:** Pakai useAppTranslation dan key mis. dailyTask.emptyTitle, dailyTask.emptyDescription.

---

### 20. `src/mobile/pages/daily task/section/TaskList.tsx:136-138,169-172` — Hardcoded string toast

**Masalah:** "Task Completed", "Task Reopened", "Cannot Uncheck Task", "Please complete all assigned steps first" tidak melalui i18n.

**Saran:** Tambah key di translations (dailyTask.*) dan pakai t().

---

### 21. `src/mobile/pages/daily task/section/TaskList.tsx:314` — Button "Add Task" hardcoded

**Masalah:** Label "Add Task" tidak di-translate.

**Saran:** t('dailyTask.addTask', 'Add Task').

---

### 22. `src/mobile/pages/daily task/section/hooks/useBlockerCounts.ts` — Debounce 300ms tanpa cleanup state

**Masalah:** Jika unmount sangat cepat, loadCounts bisa tetap run setelah unmount (cancelled = true mencegah setState, sudah aman). Tidak ada bug kritis; hanya pastikan timeout di-clear (sudah ada di cleanup). Low untuk kemungkinan race pada sangat cepat navigate.

**Saran:** Sudah ada cancelled flag; optional: abort controller untuk cancel fetch jika tersedia.

---

### 23. `src/mobile/pages/daily task/section/hooks/useTaskBlockers.ts` — Modal open before data; no loading state

**Masalah:** Modal dibuka dengan setBlockerModalOpen(true) dan setBlockerModalItems([]); tidak ada indikator loading eksplisit di UI (items kosong bisa berarti loading atau error). User mungkin bingung.

**Saran:** Tambah state loadingBlockers; tampilkan spinner/skeleton di dalam modal saat loading; set loading false setelah fetch selesai.

---

### 24. `src/features/8-2-DailyTask/DailyTaskContext.tsx` — fetchTasks dipanggil banyak; cache/skip duplicate

**Masalah:** Context besar; banyak effect dan callback yang memanggil fetchTasks(true). Risiko request berlebihan jika banyak trigger (mis. tab switch, visibility). Sudah ada skip duplicate untuk org (logger.debug 'Skipping duplicate daily-task load').

**Saran:** Pastikan dedupe dan throttle sudah memadai; monitor network tab saat buka daily-task. Low karena sudah ada mekanisme skip.

---

### 25. `src/mobile/pages/daily task/DailyTaskPage.tsx` — MeetingNotesProvider wrap

**Masalah:** Seluruh halaman dibungkus MeetingNotesProvider; jika daily-task tidak butuh meeting notes, provider tetap mount dan bisa menambah memory/context.

**Saran:** Cek apakah TaskList atau child daily-task benar-benar butuh MeetingNotesProvider; jika tidak, pindah provider ke route yang butuh saja (low impact).

---

### 26. `src/mobile/pages/Initiative/section/MobileTaskInitiative.tsx` — N+1 query parent step

**Lokasi:** Loop for (substep of incompleteSubSteps) dengan await supabase... parent step (baris ~310-326).

**Masalah:** Satu query per sub-step; bisa lambat jika banyak item.

**Saran:** Batch: kumpulkan parent_step_id unik, satu query .in('id', parentStepIds) untuk semua parent step, lalu map di memory.

---

### 27. `src/mobile/pages/daily task/section/hooks/useBlockerCounts.ts` — Batched query tapi 3 round-trip

**Masalah:** Tiga query terpisah (sub-steps, step blockers, sub-step blockers); bisa digabung atau diparalel dengan Promise.all jika schema mendukung.

**Saran:** Opsional: jalankan query 2 dan 3 paralel (Promise.all) untuk kurangi latency; tidak mengubah perilaku.

---

### 28. `src/mobile/pages/daily task/section/TaskList.tsx:274` — task.steps.sort mutates array

**Masalah:** `task.steps.sort((a, b) => a.order - b.order)` memutasi steps in-place; bisa mempengaruhi state context jika steps adalah referensi yang sama.

**Saran:** Gunakan [...task.steps].sort(...) agar tidak mutasi original.

---

### 29. `src/mobile/pages/daily task/meeting notes modal` — AddSolutionAsDailyTaskModal (mobile)

**Lokasi:** src/mobile/pages/meeting notes/modal/AddSolutionAsDailyTaskModal.tsx (dan desktop 8-1-meeting-notes).

**Masalah:** Modal ini dipakai dari meeting notes; jika dipanggil dari flow yang terkait daily-task, error handling dan log perlu dicek. Belum di-audit detail.

**Saran:** Verifikasi try/catch dan toast untuk create task dari solution; ganti console dengan logger jika ada.

---

### 30. `src/mobile/pages/daily task report` — useDailyTaskReport() as any

**Lokasi:** BlockersAndUpdatesPanel.tsx:24, Filters.tsx:8.

**Masalah:** `useDailyTaskReport() as any` menghilangkan tipe; ini halaman report, bukan daily-task list, tapi tetap code smell.

**Saran:** Ekspos tipe yang benar dari ReportContext agar tidak perlu as any.

---

## Rekomendasi singkat (ringan & loading)

1. **Tangani promise:** Semua updateTask, deleteTask, reorderTaskSteps dari TaskList harus punya .catch() atau try/catch + toast.
2. **Logger konsisten:** Ganti console.* di path daily-task (TaskList, MobileAssignStepDialog, useBlockerCounts, useTaskBlockers, DailyTaskContext, MobileTaskInitiative) dengan logger.
3. **Jangan swallow error load awal:** DailyTaskContext fetchTasks().catch(() => {}) minimal log error.
4. **Type safety:** Kurangi (context as any), (currentEmployee as any), supabase as any; gunakan tipe/assertion yang sempit.
5. **Initiative N+1:** Batch query parent step di MobileTaskInitiative untuk kurangi round-trip.
6. **i18n:** EmptyState, toast di TaskList, dan label "Add Task" pakai t().
7. **Tab Initiative isActive:** Pakai URLSearchParams.get('view') === 'initiative' di ToolsNavigationFooter.
8. **Mutasi array:** TaskList onDragEnd pakai [...task.steps].sort, jangan task.steps.sort.

---

**File yang paling sering muncul:**  
TaskList.tsx, DailyTaskContext.tsx, useBlockerCounts.ts, useTaskBlockers.ts, MobileAssignStepDialog.tsx, MobileTaskInitiative.tsx, MobileAssignInitiativeItemDialog.tsx, ToolsNavigationFooter.tsx, TaskDetailModal.tsx, ObjectiveHierarchyDialog.tsx, EmptyState.tsx.
