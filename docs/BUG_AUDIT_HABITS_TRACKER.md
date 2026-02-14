# Audit Bug: Halaman /tools/habits-tracker

**Tanggal:** 2026-02-14  
**Scope:** Fitur Habit Tracker (`src/features/8-2-HabitTracker`) dan halaman `/tools/habits-tracker`.

---

## High priority

### 1. **HabitTrackerContext.tsx — fetchHabits: error hanya console, tidak ada toast**
- **File:Line:** `src/features/8-2-HabitTracker/context/HabitTrackerContext.tsx:121-123`
- **Masalah:** Pada `catch` setelah fetch habits, hanya `console.error`. User tidak dapat feedback saat data habit gagal dimuat; state `habits` bisa tetap kosong atau stale tanpa pesan.
- **Saran:** Set state error (mis. `setError`) atau gunakan toast/notifikasi: "Gagal memuat habits. Silakan refresh." dan opsional set `habits` ke `[]` agar UI konsisten.

### 2. **HabitTrackerContext.tsx — fetchEntries: error hanya console, tidak ada toast**
- **File:Line:** `src/features/8-2-HabitTracker/context/HabitTrackerContext.tsx:138-140`
- **Masalah:** Sama seperti fetchHabits; kegagalan fetch entries hanya di-log. User tidak tahu bahwa data entri tidak ter-load.
- **Saran:** Tambah feedback ke user (toast atau state error) dan pertimbangkan set `entries` ke `[]` pada error.

### 3. **HabitTrackerContext.tsx — refreshData tidak menangani error fetch**
- **File:Line:** `src/features/8-2-HabitTracker/context/HabitTrackerContext.tsx:201-208`
- **Masalah:** `Promise.all([fetchHabits(), fetchEntries()])` tidak di-catch. Jika salah satu fetch gagal, promise reject tidak tertangkap; `setLoading(false)` tetap di `finally` (OK), tetapi caller (mis. setelah add/update) tidak tahu bahwa refresh gagal.
- **Saran:** Try/catch di dalam refreshData; pada catch bisa set error state atau toast "Gagal me-refresh data", dan jangan re-throw jika caller sudah menampilkan toast untuk aksi add/update/delete.

### 4. **Context mutations (addHabit, updateHabit, deleteHabit, addEntry, updateEntry, deleteEntry) melempar error**
- **File:Line:** Berbagai baris di `HabitTrackerContext.tsx` (mis. 253-257, 286-290, 301-305, 334-342, 356-360, 371-377)
- **Masalah:** Semua fungsi tersebut `throw error` setelah `console.error`. Pemanggil yang tidak membungkus dengan try/catch akan menyebabkan unhandled promise rejection. Saat ini pemanggil (HabitFormModal, HabitSpreadsheetView, HabitTargetCountModal, HabitEntryModal) sudah pakai try/catch, tetapi pemanggil baru atau refactor bisa lupa.
- **Saran:** (Pilihan A) Di context: tangkap error, toast di sana, dan jangan re-throw; return void. Atau (Pilihan B) dokumentasikan dengan jelas bahwa semua pemanggil wajib try/catch + toast, dan pertahankan throw. Pilihan A mengurangi risiko unhandled rejection.

---

## Medium priority

### 5. **HabitTrackerContext.tsx — filteredHabits: habit.name bisa null/undefined dari DB**
- **File:Line:** `src/features/8-2-HabitTracker/context/HabitTrackerContext.tsx:383`
- **Masalah:** `habit.name.toLowerCase()` — jika kolom `name` di DB null/undefined (mis. migrasi atau data lama), akan throw TypeError.
- **Saran:** Gunakan optional chaining: `habit.name?.toLowerCase()?.includes(...)` atau filter habit tanpa name: `!(habit.name ?? '').toLowerCase().includes(...)`.

### 6. **HabitTrackerContext.tsx — calculateStats: habit.target_count bisa undefined**
- **File:Line:** `src/features/8-2-HabitTracker/context/HabitTrackerContext.tsx:152`
- **Masalah:** `expectedEntries = targetDays * habit.target_count` — jika `target_count` undefined (DB/null), hasilnya NaN; `completion_rate` jadi NaN. Type mendefinisikan `target_count: number` tetapi runtime bisa lain.
- **Saran:** Guard: `const tc = habit.target_count ?? 0; const expectedEntries = targetDays * tc;` dan handle expectedEntries === 0 (sudah ada).

### 7. **HabitTrackerContext.tsx — updateFilter: value bertipe any**
- **File:Line:** `src/features/8-2-HabitTracker/context/HabitTrackerContext.tsx:14`
- **Masalah:** `updateFilter: (key: keyof HabitFilter, value: any) => void` — `any` menghilangkan type safety untuk value; salah tipe bisa masuk ke state filter.
- **Saran:** Gunakan union atau mapped type untuk value berdasarkan key, mis. `value: HabitFilter[K]` dengan generic, atau overloads per key.

### 8. **HabitFormModal.tsx — early return tanpa setLoading(false) yang perlu**
- **File:Line:** `src/features/8-2-HabitTracker/components/HabitFormModal.tsx:279, 288, 297, 310, 319, 328`
- **Masalah:** Di beberapa branch validasi (weekly/monthly) memanggil `setLoading(false)` padahal `setLoading(true)` baru dipanggil di baris 334. Tidak menyebabkan bug fungsional, tetapi membingungkan dan redundant.
- **Saran:** Hapus `setLoading(false)` dari branch yang return sebelum `setLoading(true)`; atau pindahkan `setLoading(true)` ke awal handleSubmit (sebelum validasi) jika ingin loading state saat validasi pun konsisten.

### 9. **HabitStats.tsx — stats.reduce tanpa guard array kosong**
- **File:Line:** `src/features/8-2-HabitTracker/components/HabitStats.tsx:14`
- **Masalah:** `stats.reduce((sum, s) => sum + s.current_streak, 0)` aman untuk array kosong (return 0). Tetapi `s.completion_rate` bisa NaN jika calculateStats pernah produce NaN (lihat bug #6). Maka `totalCompletionRate` bisa NaN.
- **Saran:** Setelah perbaikan #6, NaN tidak akan muncul; atau di sini gunakan `Number.isFinite(s.completion_rate) ? s.completion_rate : 0` di reduce.

### 10. **useCurrentUser dari 2-1-employees vs share**
- **File:Line:** `src/features/8-2-HabitTracker/context/HabitTrackerContext.tsx:4`
- **Masalah:** Import `useCurrentUser` dari `@/features/2-1-employees/hooks/useCurrentUser`; fitur lain (Daily Task, Home) memakai `@/features/share/hooks/useCurrentUser`. Inkonsistensi bisa menyebabkan perbedaan perilaku (mis. source data user) atau duplikasi logika.
- **Saran:** Seragamkan ke `@/features/share/hooks/useCurrentUser` kecuali ada alasan khusus memakai hook employees; jika perlu employee-specific, pertimbangkan `useCurrentEmployee` (sudah dipakai di file yang sama).

---

## Low priority

### 11. **HabitTrackerContext.tsx — fetchHabits: parsing checklist_names/weekly_days/monthly_dates error hanya console**
- **File:Line:** `src/features/8-2-HabitTracker/context/HabitTrackerContext.tsx:72-73, 89-90, 108-109`
- **Masalah:** Jika `JSON.parse` atau parsing gagal, hanya `console.error`; baris tersebut set variabel ke undefined dan parsing dilanjutkan. Tidak memecah aplikasi, tetapi error parsing tidak terlihat oleh user.
- **Saran:** Low impact; bisa biarkan atau log ke monitoring. Opsional: tambah flag "partial parse" dan tampilkan toast sekali saja "Beberapa data habit tidak dapat di-parse lengkap."

### 12. **HabitEntryModal.tsx — existingEntry: hanya toast "Entry already exists", tidak update**
- **File:Line:** `src/features/8-2-HabitTracker/components/HabitEntryModal.tsx:42-47`
- **Masalah:** Jika entry sudah ada, hanya menampilkan toast "Entry already exists" dan tidak memanggil update. Secara teknis bukan bug jika product requirement memang "tidak bisa edit dari modal ini", tetapi UX bisa membingungkan (user ubah count/notes lalu submit dan hanya dapat info).
- **Saran:** Jika diinginkan, tambah alur update entry (updateEntry) ketika existingEntry ada; atau ubah copy toast menjadi "Entry for this date already exists. Remove it first to log again." agar jelas.

### 13. **HabitSpreadsheetView.tsx — getEntryForDate / getEntriesForDate: asumsi data dari context**
- **File:Line:** Berbagai penggunaan `entries` dan `habits` di HabitSpreadsheetView
- **Masalah:** Tidak ada null check untuk `habit` di beberapa tempat; sebagian sudah dengan optional chaining (mis. `habit?.monthly_dates`). Pastikan semua akses ke `habit` setelah `.find()` di-guard (habit mungkin undefined).
- **Saran:** Setelah `const habit = filteredHabits.find(...)` pastikan `if (!habit) return null` atau guard sebelum akses `habit.id`, `habit.name`, dll.

### 14. **HabitTrackerPage.tsx — onTabChange kosong**
- **File:Line:** `src/features/8-2-HabitTracker/pages/HabitTrackerPage.tsx:15`
- **Masalah:** `HeaderAndTab activeTab="habits-tracker" onTabChange={() => {}}` — callback kosong. Jika tab lain diklik, tidak ada navigasi. Bisa intentional (halaman ini hanya habits), tetapi bisa dianggap bug jika user mengharapkan pindah tab.
- **Saran:** Jika HeaderAndTab dipakai untuk navigasi antar tools, isi onTabChange dengan navigasi (mis. navigate('/tools/daily-task') untuk tab lain). Jika tidak, bisa abaikan atau sembunyikan tab lain di halaman ini.

---

## Ringkasan

| Prioritas | Jumlah |
|-----------|--------|
| High      | 4      |
| Medium    | 6      |
| Low       | 4      |

**Rekomendasi perbaikan pertama:**  
1) Tambah feedback ke user pada fetch error (toast/state error) di HabitTrackerContext (#1, #2, #3).  
2) Hindari unhandled rejection: either toast di context dan jangan re-throw (#4), atau pastikan semua pemanggil try/catch.  
3) Defensive null/undefined untuk `habit.name` dan `habit.target_count` (#5, #6).
