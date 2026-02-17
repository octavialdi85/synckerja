# Audit Bug: Halaman /tools/habits-tracker

**Scope:** Fitur Habit Tracker (`src/features/8-2-HabitTracker`) dan halaman `/tools/habits-tracker`.  
**Tanggal:** 2026-02-16.

---

## Daftar Bug (file:line)

### 1. **HabitTrackerContext.tsx (useEffect refreshData)** — setState setelah unmount
- **Deskripsi:** `useEffect` memanggil `refreshData()` tanpa pengecekan unmount. Jika user pindah halaman sebelum fetch selesai, `fetchHabits`/`fetchEntries` akan memanggil `setHabits`, `setEntries`, dan (lewat `calculateStats`) `setStats` setelah komponen unmount. Menyebabkan warning React dan risiko memory leak.
- **Prioritas:** High
- **Saran:** Tambah variabel `let isActive = true` di effect, di cleanup set `isActive = false`. Di `fetchHabits` dan `fetchEntries`, sebelum setiap `setHabits`/`setEntries` cek `if (!isActive) return;`. Di effect yang memanggil `calculateStats`, pastikan `calculateStats` hanya memanggil `setStats` jika `isActive` (bisa dengan mengoper `isActive` ke callback atau memeriksa di dalam setelah async selesai).

---

### 2. **HabitTrackerContext.tsx:76, 91, 108, 124, 125, 149, 274, 313, 331, 368, 396, 417** — Banyak `console.error`
- **Deskripsi:** Pemanggilan `console.error` di path production untuk parsing JSON dan error fetch/mutation. Tidak konsisten dengan logger terpusat.
- **Prioritas:** Low (code smell)
- **Saran:** Ganti dengan `logger.warn` / `logger.error` (import dari `@/config/logger`).

---

### 3. **HabitTrackerContext.tsx (addHabit, addEntry)** — Fetch `profiles` tanpa penanganan error
- **Deskripsi:** `const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();` tidak memeriksa `error`. Jika query gagal, `profile` bisa null dan insert tetap jalan dengan `created_by: profile?.id || null`. Data masuk tanpa `created_by`; tidak ada toast atau fallback.
- **Prioritas:** Medium
- **Saran:** Cek `error` dari query profiles; jika gagal, tampilkan toast dan return, atau log dan tetap lanjut dengan `created_by: null` (dokumentasikan sebagai sengaja).

---

### 4. **HabitTrackerContext.tsx (calculateStats)** — Mutasi array dengan `.sort()`
- **Deskripsi:** `const habitEntries = entries.filter(...).sort(...)` — `.sort()` memutasi array in-place. `entries.filter()` mengembalikan array baru, lalu `.sort()` memutasi array tersebut. Secara teknis tidak memutasi state `entries`, tetapi pola mutasi array bisa menyebabkan bug di lingkungan concurrent. Juga, `habitStats` dihitung dari `habits` yang sama dan memanggil `setStats(habitStats)` di akhir tanpa guard unmount.
- **Prioritas:** Low (code smell)
- **Saran:** Gunakan `const habitEntries = [...entries].filter(...).sort(...)` atau `entries.filter(...).slice().sort(...)` agar tidak memutasi. Tambah guard unmount di effect yang memanggil `calculateStats` jika digabung dengan fix #1.

---

### 5. **HabitFormModal.tsx (useEffect load habit)** — requestAnimationFrame + setTimeout tanpa cleanup
- **Deskripsi:** Di `useEffect` yang load data habit untuk edit, kode memakai `requestAnimationFrame(() => { setChecklistNames(...); ...; setTimeout(() => setIsInitializing(false), 100); })`. Jika user menutup modal sebelum timeout 100ms, callback tetap jalan dan memanggil `setIsInitializing(false)` (dan state lain) setelah modal unmount → setState on unmounted component.
- **Prioritas:** Medium
- **Saran:** Simpan handle `requestAnimationFrame` dan `setTimeout`, dan di cleanup effect panggil `cancelAnimationFrame` dan `clearTimeout`. Atau gunakan flag `let isMounted = true` di effect, di cleanup set `false`, dan di dalam rAF/setTimeout cek `if (!isMounted) return` sebelum setState.

---

### 6. **HabitFormModal.tsx:432** — Mutasi state saat render
- **Deskripsi:** `monthlyDates.sort((a, b) => a - b).join(', ')` — `.sort()` memutasi array `monthlyDates` in-place. Dipanggil di dalam render, sehingga state array termutasi setiap render dan bisa menyebabkan perilaku tidak konsisten atau re-render berlebihan.
- **Prioritas:** Medium
- **Saran:** Gunakan `[...monthlyDates].sort((a, b) => a - b).join(', ')` agar tidak memutasi state.

---

### 7. **HabitSpreadsheetView.tsx (handleCheckboxToggle)** — Kemungkinan `habit` undefined
- **Deskripsi:** `const habit = filteredHabits.find((h) => h.id === habitId);` — jika habit dihapus atau filter berubah, `habit` bisa undefined. Lalu `getEntryForDate(habitId, date)` dan `existingEntry` dipakai; untuk `addEntry`/`deleteEntry` hanya butuh `habitId`, jadi aman. Tetapi untuk branch `habit && habit.frequency === 'daily' && habit.target_count > 1` kita return early. Jika `habit` undefined, kita lanjut ke `getEntryForDate(habitId, date)` dan seterusnya — aman. Tidak ada bug kritis di sini, hanya defensive.
- **Prioritas:** Low
- **Saran:** Opsional: tambah early return `if (!habit) return;` di awal handler setelah `find` untuk kejelasan.

---

### 8. **HabitTrackerContext.tsx (refreshData)** — Tidak ada guard unmount
- **Deskripsi:** `refreshData` memanggil `fetchHabits()` dan `fetchEntries()` lalu di `finally` memanggil `setLoading(false)`. Jika komponen unmount saat fetch masih berjalan, `setLoading(false)` dan setState di dalam fetch tetap dipanggil.
- **Prioritas:** High (bagian dari #1)
- **Saran:** Selesaikan bersama #1 dengan `isActive` dan cek sebelum semua setState di `fetchHabits`, `fetchEntries`, dan di `refreshData` (setLoading).

---

### 9. **HabitStats.tsx** — Aman terhadap NaN
- **Deskripsi:** `stats.reduce(..., 0)` dan `Number.isFinite(s.completion_rate)` sudah dipakai; tidak ada bug null/undefined yang jelas.
- **Prioritas:** —
- **Saran:** —

---

### 10. **HabitTrackerPage.tsx** — Scroll container
- **Deskripsi:** Area konten punya `max-h-[calc(100vh-120px)]` dan `flex-1 min-h-0`. `HabitSpreadsheetView` di dalam punya `seamless-scroll` di scroll container-nya. Sesuai aturan proyek, layout sudah konsisten.
- **Prioritas:** Low
- **Saran:** Verifikasi di browser bahwa scroll halus dan tidak ada overflow ganda; jika sudah ok, tidak perlu perubahan.

---

### 11. **HabitTargetCountModal (handleSave)** — Beberapa await dalam loop tanpa rollback
- **Deskripsi:** `for (const entry of currentEntries) { await deleteEntry(entry.id); }` lalu `for (let i = 0; i < checkedCount; i++) { await addEntry(...); }`. Jika salah satu `deleteEntry` atau `addEntry` gagal di tengah, state bisa tidak konsisten (sebagian terhapus, sebagian belum ditambah). Saat ini error ditangkap di catch dan toast ditampilkan, tetapi tidak ada rollback atau refetch yang eksplisit.
- **Prioritas:** Medium
- **Saran:** Di blok catch, panggil `refreshData()` agar UI kembali sinkron dengan server; atau implementasi rollback (lebih rumit). Paling tidak pastikan setelah error user bisa retry dengan state bersih (refreshData di catch sudah cukup).

---

### 12. **HabitEntryModal** — Tidak ada penanganan khusus untuk habit tidak ditemukan
- **Deskripsi:** `const habit = habits.find((h) => h.id === habitId);` — jika habit belum ter-load atau sudah dihapus, `habit` undefined. Modal tetap render dan `habit?.name` di description aman. Submit memanggil `addEntry(habitId, date, count, notes)` yang valid. Risiko rendah.
- **Prioritas:** Low
- **Saran:** Opsional: jika `!habit && habits.length > 0`, tampilkan pesan "Habit not found" dan nonaktifkan submit.

---

## Ringkasan prioritas

| Prioritas | Jumlah | Item |
|-----------|--------|------|
| High     | 2      | #1, #8 (setState after unmount / no unmount guard) |
| Medium   | 4      | #3 (profiles fetch), #5 (rAF/setTimeout cleanup), #6 (sort mutasi), #11 (rollback/refresh on error) |
| Low      | 4      | #2 (console.error), #4 (sort code smell), #7 (#12 defensive) |

---

## Rekomendasi perbaikan (urutan)

1. Tambah guard unmount (`isActive`) di HabitTrackerContext: effect yang memanggil `refreshData`, dan di dalam `fetchHabits`/`fetchEntries`/`refreshData` cek `isActive` sebelum semua setState (#1, #8).
2. Penanganan error fetch profiles di addHabit/addEntry: toast + return atau log + lanjut (#3).
3. Cleanup requestAnimationFrame dan setTimeout di HabitFormModal useEffect (#5).
4. Hindari mutasi state di render: pakai `[...monthlyDates].sort(...)` di HabitFormModal (#6).
5. Di HabitTargetCountModal handleSave, di catch panggil `refreshData()` (#11).
6. Ganti semua `console.error` dengan logger di context (#2); perbaikan code smell `.sort()` di calculateStats (#4).
