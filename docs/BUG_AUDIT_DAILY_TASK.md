# Audit Bug: Halaman /tools/daily-task

**Tanggal:** 2026-02-14  
**Scope:** Fitur Daily Task (`src/features/8-2-DailyTask`) dan halaman `/tools/daily-task`.

---

## High priority

### 1. **DailyTaskContext.tsx — addTask: created_by bisa null tanpa penanganan**
- **File:Line:** `src/features/8-2-DailyTask/DailyTaskContext.tsx:1120`
- **Masalah:** `(await supabase.auth.getUser()).data.user?.id` bisa `undefined`; task tetap di-insert dengan `created_by: null`. Tidak ada validasi atau toast jika user tidak ada.
- **Saran:** Sebelum insert, cek `const user = (await supabase.auth.getUser()).data?.user; if (!user) { toast error; return; }` dan gunakan `user.id` untuk `created_by`.

### 2. **DailyTaskContext.tsx — addTask: assignment error hanya console, tidak ada toast**
- **File:Line:** `src/features/8-2-DailyTask/DailyTaskContext.tsx:1161-1163`
- **Masalah:** Jika `assignmentError` saat insert `daily_tasks_assigned`, hanya `console.error`; user tidak dapat feedback dan task sudah terbuat tanpa assignment.
- **Saran:** Setelah `if (assignmentError)` panggil `toast({ title: 'Error', description: 'Task created but assignment failed.', variant: 'destructive' })` dan tetap refresh/clear cache.

### 3. **PendingApprovalSection.tsx — Unhandled promise rejection pada Approve/Revision di preview**
- **File:Line:** `src/features/8-2-DailyTask/section/PendingApprovalSection.tsx:350-354`
- **Masalah:** `void handleApprove(previewRow).then(() => refresh())` dan `void handleRejectFromPopup(previewRow)` tidak punya `.catch()`. Jika `approve`/`reject` throw atau return error yang di-throw, promise rejection tidak tertangkap.
- **Saran:** Tambah `.catch((err) => { toast({ title: 'Error', description: err?.message ?? 'Action failed', variant: 'destructive' }); })` pada kedua pemanggilan.

### 4. **TaskList.tsx — handleDateChange / handleClearDate / handlePriorityChange / handleToggleReminder tanpa try/catch**
- **File:Line:** `src/features/8-2-DailyTask/section/TaskList.tsx:182-224`
- **Masalah:** `await updateTask(...)` tanpa try/catch. Jika `updateTask` reject (network/API error), error tidak tertangkap dan bisa unhandled rejection; user tidak dapat pesan error.
- **Saran:** Bungkus dengan try/catch dan tampilkan toast pada catch, atau pastikan `updateTask` di context selalu menampilkan toast dan return (jangan re-throw).

### 5. **TaskStep.tsx — handleDelete: deleteTaskStep tanpa try/catch**
- **File:Line:** `src/features/8-2-DailyTask/section/TaskStep.tsx:646-649`
- **Masalah:** `await deleteTaskStep(step.id)` tanpa try/catch. Kegagalan delete hanya terlihat di console.
- **Saran:** Try/catch dan toast error; atau pastikan `deleteTaskStep` di context selalu toast + tidak re-throw.

### 6. **DailyTaskContext.tsx — navigateToTask: task.steps bisa undefined**
- **File:Line:** `src/features/8-2-DailyTask/DailyTaskContext.tsx:2659`
- **Masalah:** `const step = task.steps.find(s => s.id === stepId)` — tipe `Task` mendefinisikan `steps: TaskStep[]`, tetapi data runtime (cache/partial) bisa membuat `task.steps` undefined, sehingga `.find` throw.
- **Saran:** Gunakan optional chaining: `const step = task.steps?.find(s => s.id === stepId)`.

---

## Medium priority

### 7. **CreateTaskDialog.tsx — Error add task hanya console, tanpa toast**
- **File:Line:** `src/features/8-2-DailyTask/section/CreateTaskDialog.tsx:262-264`
- **Masalah:** Catch hanya `console.error`; user tidak dapat feedback saat create task gagal.
- **Saran:** Tambah `toast({ title: 'Error', description: 'Failed to add task', variant: 'destructive' })` di catch.

### 8. **EditTaskDialog.tsx — Error update task hanya console, tanpa toast**
- **File:Line:** `src/features/8-2-DailyTask/section/EditTaskDialog.tsx:265-266`
- **Masalah:** Sama seperti CreateTaskDialog; error update hanya di-log.
- **Saran:** Tambah toast error di catch.

### 9. **DailyTaskContext.tsx — addTask: deadlineError hanya console**
- **File:Line:** `src/features/8-2-DailyTask/DailyTaskContext.tsx:1184-1185`
- **Masalah:** Jika simpan deadline ke `task_steps_assigned_duedate` gagal, hanya `console.error`; assignment sudah ada tapi deadline tidak tersimpan.
- **Saran:** Toast ringan (mis. "Task assigned; deadline could not be saved") atau retry/feedback.

### 10. **TaskList.tsx — requestDeadlineExtension diambil via (context as any)**
- **File:Line:** `src/features/8-2-DailyTask/section/TaskList.tsx:39`
- **Masalah:** `const requestDeadlineExtension = (context as any).requestDeadlineExtension` menghindari type safety; jika nama/interface context berubah, runtime error tidak terdeteksi.
- **Saran:** Ekspos `requestDeadlineExtension` di `DailyTaskContextType` dan gunakan dari context tanpa cast.

### 11. **TaskFilters.tsx — useQuery departments: error hanya throw, tanpa fallback UI**
- **File:Line:** `src/features/8-2-DailyTask/section/TaskFilters.tsx:49-60`
- **Masalah:** `if (error) throw error` — React Query menandai query error, tetapi tidak ada fallback UI (mis. placeholder "Failed to load departments" atau retry).
- **Saran:** Gunakan `isError`/`error` dari useQuery dan tampilkan pesan/retry di dropdown departments.

### 12. **ModalViewSubSteps.tsx — syncParentCompletion: list!.every**
- **File:Line:** `src/features/8-2-DailyTask/section/ModalViewSubSteps.tsx:254`
- **Masalah:** `list!.every(s => s.is_completed)` — non-null assertion; jika `list` null/undefined akan throw.
- **Saran:** Gunakan `(list ?? []).every(...)` atau pastikan `list` selalu array sebelum pemanggilan.

### 13. **JobDescEmployeeCard.tsx — assignment.stepTitle bisa undefined**
- **File:Line:** `src/features/8-2-DailyTask/section/JobDescTracker/JobDescEmployeeCard.tsx:125`
- **Masalah:** `search: assignment.stepTitle` — untuk tipe `step`, `stepTitle` bisa undefined; filter search bisa dapat nilai undefined.
- **Saran:** `search: assignment.stepTitle ?? ''` atau skip navigate jika tidak ada stepTitle.

### 14. **DailyTaskContext.tsx — fetchTasks: console.error tanpa toast untuk user**
- **File:Line:** `src/features/8-2-DailyTask/DailyTaskContext.tsx:555-568`
- **Masalah:** Error fetch tasks sudah ada toast; di baris 1062-1067 juga. Di baris 556-563 hanya `console.error` + throw — throw ditangkap oleh catch di 1061 yang sudah toast. Jadi konsisten. Namun baris 573-574: `console.warn('⚠️ No tasks found...')` tidak memberi feedback ke user (bisa normal untuk org baru).
- **Catatan:** Prioritas rendah; toast "Failed to load tasks" sudah ada di catch. Bisa dianggap Medium jika ingin membedakan "error" vs "no data".

---

## Low priority

### 15. **useTaskFilterState.ts — localStorage error hanya console.warn**
- **File:Line:** `src/features/8-2-DailyTask/hooks/useTaskFilterState.ts:47-49, 57-78, 106**
- **Masalah:** QuotaExceededError atau parse error hanya di-warn; filter tetap jalan di memory.
- **Saran:** Opsional: toast sekali ("Filter preferences could not be saved") agar user sadar.

### 16. **TaskInitiative.tsx — fetchCurrentEmployee: error hanya console**
- **File:Line:** `src/features/8-2-DailyTask/section/TaskInitiative.tsx:126-127, 149-151, 165-166`
- **Masalah:** Error getUser / fetch employee hanya `console.error`; sudah ada toast untuk "no employee record".
- **Saran:** Untuk error network/API, tambah toast generik "Could not load your profile".

### 17. **DailyTaskContext.tsx — batchQuery / fetchTasks: console.error**
- **File:Line:** `src/features/8-2-DailyTask/DailyTaskContext.tsx:69, 127, 475, 1100, 1109`
- **Masalah:** Banyak `console.error`/`console.warn` untuk batch query dan sync status; user tidak melihat feedback.
- **Saran:** Untuk kegagalan kritis (mis. fetch tasks) sudah ada toast; untuk background sync bisa tetap console atau log ke monitoring.

### 18. **JobDescTracker.tsx — Error message dari useQuery**
- **File:Line:** `src/features/8-2-DailyTask/section/JobDescTracker/JobDescTracker.tsx:164-171`
- **Masalah:** `(error as Error)?.message ?? 'Unknown'` — jika error bukan instance Error, message bisa kurang informatif.
- **Saran:** `error?.message ?? (typeof error === 'string' ? error : 'Unknown')` atau gunakan helper `getErrorMessage(error)`.

### 19. **useJobDescAssignments.ts — statusesRes.error throw**
- **File:Line:** `src/features/8-2-DailyTask/section/JobDescTracker/useJobDescAssignments.ts:501`
- **Masalah:** Jika `employee_statuses` tidak ada atau RLS menolak, seluruh query Job Desc gagal; fallback bisa hanya menganggap semua karyawan "active".
- **Saran:** Opsional: pada error statusesRes, lanjutkan dengan `statusNameById` kosong dan filter hanya berdasarkan `employees.status` (dan pending_removal).

### 20. **TaskStep.tsx — handleFileSelect: alert untuk ukuran file**
- **File:Line:** `src/features/8-2-DailyTask/section/TaskStep.tsx:558`
- **Masalah:** `alert('File size must be less than 10MB')` — konsisten dengan UX aplikasi lebih baik pakai toast.
- **Saran:** Ganti dengan `toast({ title: 'File too large', description: '...', variant: 'destructive' })`.

### 21. **TaskStep.tsx — handleDelete: window.confirm**
- **File:Line:** `src/features/8-2-DailyTask/section/TaskStep.tsx:651`
- **Masalah:** `window.confirm` tidak konsisten dengan dialog/UI lain (biasanya komponen Dialog).
- **Saran:** Gunakan state + Dialog konfirmasi seperti di TaskList delete task.

### 22. **Code smell: Task type steps required vs runtime**
- **File:Line:** `src/features/8-2-DailyTask/types/taskTypes.ts:145`
- **Masalah:** `Task.steps: TaskStep[]` required; di beberapa path (cache, partial load) steps bisa belum diisi.
- **Saran:** Pertimbangkan `steps?: TaskStep[]` dan gunakan `task.steps ?? []` di semua pemakaian, atau jamin selalu diisi saat set state.

---

## Ringkasan

| Prioritas | Jumlah |
|-----------|--------|
| High      | 6      |
| Medium    | 8      |
| Low       | 8      |

**Rekomendasi perbaikan pertama:**  
1) Unhandled promise di PendingApprovalSection (no 3).  
2) Error handling untuk updateTask di TaskList (no 4).  
3) Defensive `task.steps?.find` di navigateToTask (no 6).  
4) Toast untuk assignmentError dan created_by di addTask (no 1, 2).
