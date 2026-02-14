# Status Audit Bug: Halaman /tools/daily-task

**Referensi:** [BUG_AUDIT_DAILY_TASK.md](BUG_AUDIT_DAILY_TASK.md)  
**Tanggal audit:** 2026-02-14  
**Tanggal status:** 2026-02-14  

---

## 1. Yang sudah diperbaiki

### High priority (6/6)

| No | Temuan | File | Status |
|----|--------|------|--------|
| 1 | addTask: validasi user + created_by | DailyTaskContext.tsx | **Fixed** – getUser sebelum insert, toast jika !user, created_by: user.id |
| 2 | assignment error tanpa toast | DailyTaskContext.tsx | **Fixed** – toast "Task created but assignment failed." di blok assignmentError |
| 3 | Unhandled promise Approve/Revision di preview | PendingApprovalSection.tsx | **Fixed** – .catch() pada handleApprove dan handleRejectFromPopup dengan toast |
| 4 | updateTask tanpa try/catch (date, priority, reminder) | TaskList.tsx | **Fixed** – try/catch + toast di handleDateChange, handleClearDate, handlePriorityChange, handleToggleReminder |
| 5 | deleteTaskStep tanpa try/catch | TaskStep.tsx | **Fixed** – try/catch + toast; konfirmasi pakai AlertDialog (lihat juga no. 21) |
| 6 | navigateToTask: task.steps bisa undefined | DailyTaskContext.tsx | **Fixed** – task.steps?.find(s => s.id === stepId) |

### Medium priority (6/8, no.14 sengaja tidak diubah)

| No | Temuan | File | Status |
|----|--------|------|--------|
| 7 | Error add task hanya console | CreateTaskDialog.tsx | **Fixed** – useToast + toast di catch handleSubmit |
| 8 | Error update task hanya console | EditTaskDialog.tsx | **Fixed** – useToast + toast di catch handleSubmit |
| 9 | deadlineError hanya console | DailyTaskContext.tsx | **Fixed** – toast "Task assigned; deadline could not be saved." |
| 10 | requestDeadlineExtension via (context as any) | TaskList.tsx | **Fixed** – destructure requestDeadlineExtension dari useDailyTask(), cast dihapus |
| 11 | useQuery departments tanpa fallback UI | TaskFilters.tsx | **Fixed** – isError/refetch, tampilan "Failed to load" + opsi Retry di dropdown |
| 12 | list!.every di syncParentCompletion | ModalViewSubSteps.tsx | **Fixed** – (list ?? []).every(...) |
| 13 | assignment.stepTitle bisa undefined | JobDescEmployeeCard.tsx | **Fixed** – search: assignment.stepTitle ?? '' |
| 14 | fetchTasks console.error vs toast | DailyTaskContext.tsx | **Tidak diubah** – catch fetchTasks sudah menampilkan toast "Failed to load tasks"; tidak ada perubahan. |

### Low priority (5/8)

| No | Temuan | File | Status |
|----|--------|------|--------|
| 16 | fetchCurrentEmployee: error hanya console | TaskInitiative.tsx | **Fixed** – toast "Could not load your profile" di catch |
| 18 | Error message useQuery kurang aman | JobDescTracker.tsx | **Fixed** – helper getErrorMessage(error) untuk Alert |
| 19 | statusesRes.error throw, Job Desc gagal total | useJobDescAssignments.ts | **Fixed** – jika statusesRes.error, statusNameById kosong, lanjut filter pakai employees.status saja |
| 20 | alert ukuran file | TaskStep.tsx | **Fixed** – toast "File too large" |
| 21 | window.confirm hapus step | TaskStep.tsx | **Fixed** – AlertDialog + state deleteStepDialogOpen, handleConfirmDeleteStep |

---

## 2. Yang belum diperbaiki

### Low priority (sengaja/tidak diimplementasi)

| No | Temuan | File | Alasan |
|----|--------|------|--------|
| 15 | localStorage error hanya console.warn | useTaskFilterState.ts | Hook tidak punya akses toast; butuh injeksi callback/context. Opsional. |
| 17 | batchQuery / sync: banyak console.error | DailyTaskContext.tsx | Tidak diubah agar tidak spam toast; kegagalan kritis sudah ada toast. |
| 22 | Task.steps required vs runtime | taskTypes.ts | Refactor besar (steps?: TaskStep[] + task.steps ?? [] di banyak tempat); ditunda. |

### Tidak diubah oleh desain

| No | Temuan | Keputusan |
|----|--------|-----------|
| 14 | fetchTasks: console.error vs toast | Sudah ada toast di catch; tidak perlu perubahan. |

---

## 3. Ringkasan angka

| Kategori | Jumlah |
|----------|--------|
| **Total temuan audit** | 22 |
| **Sudah diperbaiki** | 17 |
| **Belum diperbaiki (opsional/ditunda)** | 3 (no. 15, 17, 22) |
| **Tidak diubah (by design)** | 1 (no. 14) |
| **Sengaja skip (no. 14)** | 1 |

---

## 4. Temuan lain (setelah implementasi)

- **DailyTaskContext.tsx:** Beberapa path lain masih memakai pola `(await supabase.auth.getUser()).data.user?.id` (mis. requestDeadlineExtension, approveDeadlineExtension, rejectDeadlineExtension, updateTask assignment branch). Konsistensi: tambah validasi user + toast di path kritis jika diinginkan.
- **TaskList / handleConfirmDelete:** deleteTask(deleteDialog.taskId) tidak dibungkus try/catch; kegagalan hanya dari context. Bisa ditambah try/catch + toast di sini agar konsisten dengan handleDateChange dll.
- **TaskStep:** useToast diimpor dari `@/features/1-login/hooks/use-toast`; komponen lain pakai `@/features/ui/use-toast`. Tidak bug, tapi tidak konsisten; bisa diseragamkan jika mau.
- **Job Desc / resign filter:** Filter karyawan resign (inactive/terminated) di Job Desc sudah diimplementasi sebelumnya; tidak masuk daftar bug audit ini.

---

## 5. Rekomendasi lanjutan

1. **Opsional:** Tambah try/catch + toast di TaskList.handleConfirmDelete untuk konsistensi.
2. **Opsional:** Implementasi toast di useTaskFilterState saat QuotaExceededError (mis. via callback dari provider).
3. **Refactor nanti:** Pertimbangkan `Task.steps?` dan `task.steps ?? []` jika muncul lagi bug terkait steps undefined.
4. **Konsistensi:** Seragamkan sumber useToast (ui vs 1-login) dan pertimbangkan validasi user di path lain yang mengandalkan getUser().
