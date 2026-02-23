# Audit Bug – Mobile Android Halaman /reports

**Scope:** Halaman Reports mobile Android (route `/reports`), komponen `src/mobile/pages/home/Reports.tsx`, `ReportsSkeleton.tsx`, hook `useAttendanceHistory`, `useAttendanceStats`, `useAttendanceCalculations`, dan komponen yang dipakai (MonthlyStatsCards, DetailedStatsCard, AttendanceHistoryTable, WorkTimeAnalysisCard, AttendanceChart, CustomDatePicker, RealtimeStatusIndicator).

**Tujuan:** Identifikasi bug, error handling, logic error, performa; list file:line, prioritas, dan saran perbaikan agar aplikasi lebih ringan dan loading lebih cepat.

---

## Daftar Bug (file:line)

### HIGH

| # | File:Line | Penjelasan | Saran Perbaikan |
|---|-----------|------------|-----------------|
| 1 | `src/mobile/hooks/useAttendanceHistory.ts:47-60` | **Null reference:** Setelah `.single()` untuk `employees`, hanya `employeeError` yang dicek. Jika Supabase mengembalikan `{ data: null, error: null }` (edge case), `employee` bisa null dan akses `employee.id` akan throw. | Tambah guard: `if (!employee) { setError("Employee not found"); return; }` setelah blok `if (employeeError)`. |

### MEDIUM

| # | File:Line | Penjelasan | Saran Perbaikan |
|---|-----------|------------|-----------------|
| 2 | `src/mobile/hooks/useAttendanceHistory.ts:94-95` | **Query penalties dengan array kosong:** Jika `attendanceIds` kosong, `.in('attendance_record_id', [])` tidak perlu dijalankan; hindari round-trip network yang sia-sia. | Guard: jika `attendanceIds.length === 0` skip query penalties, set `penaltiesData = []`; jalankan query hanya jika `attendanceIds.length > 0`. |
| 3 | `src/mobile/pages/home/Reports.tsx` (useAttendanceStats) | **Stats error/refetch tidak dipakai:** Halaman hanya destructure `stats`, `statsLoading` dari `useAttendanceStats`. Jika fetch stats gagal, user hanya melihat angka 0 (dari `attendanceStats?.... \|\| 0`) tanpa pesan error atau tombol retry. | Destructure `error: statsError`, `refetch: refetchStats`; tambah conditional: jika `statsError && !statsLoading`, tampilkan banner error stats + tombol retry yang panggil `refetchStats()`, atau gabungkan dengan error history (satu blok error + retry untuk keduanya). |
| 4 | `src/mobile/hooks/useAttendanceHistory.ts:134-161` | **console.log di production:** Callback realtime (`onInsert`, `onUpdate`, `onDelete`) memakai `console.log('📡 ...')`. Menambah noise di production dan tidak terpusat. | Ganti dengan `logger.debug(...)` (dari `@/config/logger`) atau hapus jika tidak diperlukan. |
| 5 | `src/mobile/hooks/useAttendanceHistory.ts:107` | **console.warn untuk penalties:** Saat fetch penalties gagal hanya `console.warn`. Tidak konsisten dengan logger. | Ganti dengan `logger.warn('Failed to fetch penalties:', penaltiesError)`. |
| 6 | `src/mobile/hooks/useAttendanceHistory.ts` (useEffect) | **SetState setelah unmount:** `fetchAttendanceHistory()` async; jika user keluar dari /reports sebelum fetch selesai, `setLoading`/`setError`/`setAttendanceHistory` bisa dipanggil setelah unmount → peringatan React. | Gunakan flag/ref: `let cancelled = false` di awal fetch; di finally/ sebelum setiap setState cek `if (!cancelled)`; di cleanup effect set `cancelled = true`. |
| 7 | `src/mobile/hooks/useAttendanceStats.ts:286-339` | **SetState setelah unmount:** Sama seperti #6; `fetchAttendanceStats()` async dan channel callback memanggil refetch. Jika unmount saat fetch/channel callback jalan, setState bisa setelah unmount. | Sama: gunakan cancelled ref di dalam fetch dan di cleanup effect set cancelled = true; sebelum setState cek `if (!cancelled)`. |
| 8 | `src/mobile/hooks/useAttendanceStats.ts` + `useAttendanceHistory.ts` | **Duplicate realtime subscription:** Di halaman Reports, `useAttendanceHistory` memakai `useRealtimeData` untuk tabel `attendance_records` (dan `attendance_penalties`). `useAttendanceStats` di useEffect juga subscribe ke `attendance_records` via `supabase.channel('attendance-stats-updates')`. Satu halaman = dua subscription ke `attendance_records` → refetch ganda dan beban tidak perlu. | Pertimbangkan: (a) hanya pakai realtime di satu hook (mis. useAttendanceHistory) dan trigger refetch stats dari sana (callback/share state), atau (b) satu hook realtime bersama yang memberitahu kedua hook untuk refetch, agar hanya satu channel ke `attendance_records`. |
| 9 | `src/mobile/pages/home/Reports.tsx:188-204` | **Loading gabungan bisa menutupi error:** Kondisi `(loading \|\| statsLoading)` menampilkan skeleton; baru setelah itu `error` dicek. Jika history sukses cepat tapi stats loading lama, user lama di skeleton. Jika history error dan stats loading, user lihat skeleton sampai stats selesai. | Pertimbangkan: tampilkan error history segera jika `error && !loading` (jangan tunggu statsLoading), dan tampilkan konten history + skeleton/placeholder hanya untuk bagian stats saat `statsLoading`. Atau pisahkan UI: error history + retry di atas, stats loading di bawah. |

### LOW

| # | File:Line | Penjelasan | Saran Perbaikan |
|---|-----------|------------|-----------------|
| 10 | `src/mobile/pages/home/Reports.tsx:77, 132-137` | **Naming misleading:** `getDateRange` adalah hasil `useMemo` yang mengembalikan object `{ start, end }`, bukan fungsi. Dipakai di `filteredAttendanceHistory` sebagai object. Nama berbentuk function. | Rename jadi `dateRange` agar konsisten dengan tipe (object). |
| 11 | `src/mobile/pages/home/Reports.tsx:73-74` | **Double find:** `periodOptions.find((o) => o.value === dateFilter)` dipanggil untuk `selectedPeriod` dan lagi implisit lewat periodLabel. Sebenarnya hanya satu find; baris 74 sudah pakai `selectedPeriod`. Tidak bug, hanya bisa dirapikan (pastikan satu find, simpan di variabel). | Sudah efisien; optional: pastikan tidak ada find duplikat di tempat lain. |
| 12 | `src/mobile/hooks/useAttendanceHistory.ts:64-69, 117-119` | **Empty catch:** `JSON.parse(cached)` dan `sessionStorage.setItem` di-wrap try/catch kosong. Error di-swallow. | Log minimal: `catch (e) { logger.debug('Attendance cache read/write failed', e); }` agar traceable tanpa mengganggu user. |
| 13 | `src/mobile/hooks/useAttendanceStats.ts:106` | **Set tanpa tipe:** `const holidayDates = new Set();` — TypeScript inferensi bisa jadi `Set<unknown>`. | Tulis eksplisit: `const holidayDates = new Set<number>();` (karena yang di-add adalah `holidayDate.getDate()`). |
| 14 | `src/mobile/pages/home/Reports.tsx:274-278` | **Props redundant di success branch:** Di branch `!loading && !error` kita tetap pass `loading` dan `error` ke `AttendanceHistoryTable`. Di branch itu nilai selalu false/null. Tidak salah, hanya redundant. | Opsional: tetap pass agar komponen bisa dipakai di konteks lain yang punya loading/error partial; atau dokumentasikan bahwa di Reports success branch nilai itu selalu false/null. |
| 15 | `src/mobile/pages/home/ReportsSkeleton.tsx:1` | **Import React tidak perlu:** `import React from 'react'` — dengan JSX transform modern tidak wajib. | Hapus jika project sudah pakai automatic JSX runtime. |

---

## Error handling yang kurang / tidak ada

- **Reports:** Error dari `useAttendanceHistory` sudah ditampilkan dengan retry (blok error + tombol "Coba lagi"). Cukup.
- **Reports:** Error dari `useAttendanceStats` **tidak** ditampilkan; tidak ada fallback UI atau retry untuk stats. User hanya lihat angka 0.
- **useAttendanceHistory:** Fetch penalties gagal hanya di-log (console.warn); data attendance tetap dipakai tanpa penalties. Perilaku bisa diterima; disarankan pakai logger.
- **useAttendanceHistory:** Early return (no user, no org, employee error) sudah diikuti `finally { setLoading(false) }` — benar.

---

## API calls tanpa fallback / risiko gagal

- **useAttendanceHistory:** `getUser`, profile, employee, attendance_records — error diset dan return; halaman menampilkan error + retry. Fallback OK.
- **useAttendanceHistory:** Query `attendance_penalties` — jika gagal hanya warn; combined data dipakai tanpa penalties. Bisa tambah fallback: tampilkan pesan "Penalty tidak dapat dimuat" di tabel atau retry hanya untuk penalties.
- **useAttendanceStats:** Semua error di-throw dan ditangkap catch; setError + finally setLoading. Tidak ada retry di UI karena halaman tidak pakai error/refetch stats.
- **useAttendanceCalculations:** Pure calculation dari `attendanceHistory`; tidak ada API. Aman.

---

## Performa & beban aplikasi

- **Duplicate realtime:** Dua subscription ke `attendance_records` (useAttendanceHistory + useAttendanceStats) saat di /reports → refetch bisa dua kali per event. Konsolidasi channel (lihat bug #8) akan meringankan.
- **useAttendanceHistory:** Limit 20 record; cache sessionStorage per employee. Wajar. Cache parse/setItem di try/catch — failure silent, tidak membebani.
- **useAttendanceStats:** Cache per org+bulan; realtime + visibility listener. Cleanup channel ada. Wajar.
- **Reports.tsx:** `getDateRange` (atau `dateRange`) dan `filteredAttendanceHistory` pakai useMemo dengan dependency benar; tidak ada loop tak terbatas.
- **CustomDatePicker:** Dialog mount hanya saat `isOpen`; state lokal. Tidak ada memory leak yang jelas.

---

## Rekomendasi singkat

1. **High:** Tambah guard `!employee` di useAttendanceHistory setelah cek employeeError.
2. **Medium:** Guard query penalties saat `attendanceIds.length === 0`; pakai error/refetch stats di Reports (tampilkan error stats + retry); ganti console.log/console.warn dengan logger di useAttendanceHistory; tambah cancelled ref di useAttendanceHistory dan useAttendanceStats untuk hindari setState setelah unmount; konsolidasi realtime subscription ke attendance_records; pertimbangkan tampilkan error history tanpa menunggu stats loading.
3. **Low:** Rename getDateRange → dateRange; typings Set holidayDates; optional log di cache catch; hapus import React di ReportsSkeleton jika tidak perlu.

Setelah perbaikan, halaman /reports lebih aman dari null reference, error stats bisa di-retry, tidak ada console noise di production, dan beban realtime berkurang (satu channel untuk attendance_records).
