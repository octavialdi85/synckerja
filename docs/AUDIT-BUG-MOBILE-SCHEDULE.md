# Audit Bug – Mobile Android Halaman /schedule

**Scope:** Halaman Schedule (route `/schedule`) dan semua dependensi: `Schedule.tsx`, `ScheduleSkeleton.tsx`, `useWorkSchedule`, `useAttendanceStats`, `useNationalHolidays`, `OfficeScheduleCard`, `MonthlyHolidaysCard`.

**Tujuan:** Identifikasi bug, error handling, logic error, performa; rekomendasi perbaikan agar aplikasi lebih ringan dan loading lebih cepat.

---

## Daftar Bug (file:line)

### HIGH

| # | File:Line | Penjelasan | Prioritas | Saran Perbaikan |
|---|-----------|------------|-----------|-----------------|
| 1 | `useAttendanceStats.ts:36-41` | **Logic error / null reference:** `setOrgId(profileData.active_organization_id)` dan `cacheKey` memakai `profileData` sebelum pengecekan `profileError \|\| !profileData?.active_organization_id`. Jika `profileData` null (mis. `.single()` tidak dapat baris), akses `profileData.active_organization_id` bisa throw; juga `setOrgId(undefined)` dan cacheKey `"mobile.attendanceStats.undefined.2026-2"`. | High | Pindahkan pengecekan `if (profileError \|\| !profileData?.active_organization_id) throw ...` ke tepat setelah ambil profile; baru kemudian panggil `setOrgId`, buat `cacheKey`, dan lanjutkan. |
| 2 | `useAttendanceStats.ts:62-71` | **Null reference:** Hanya `if (employeeError) throw`; tidak cek `!employeeData`. Dengan `.single()` bila tidak ada baris bisa dapat `employeeData === null` dan error code PGRST116. Lalu `employeeData.organization_id` / `employeeData.id` akan throw. | High | Tambah `if (!employeeData) throw new Error('Employee not found');` setelah cek employeeError. |
| 3 | `Schedule.tsx` (conditional render) | **Tidak ada error UI:** Halaman hanya punya `(scheduleLoading \|\| statsLoading) ? skeleton : konten`. Tidak ada cabang untuk `error` dari `useWorkSchedule` atau `useAttendanceStats`. Saat fetch gagal, user tetap lihat konten (dengan data kosong/partial) tanpa pesan error atau retry. | High | Destructure `error` dan `refetch` dari kedua hook; tambah cabang: jika `error` (dari schedule atau stats) tampilkan blok error + tombol "Coba lagi" yang panggil refetch. |

### MEDIUM

| # | File:Line | Penjelasan | Prioritas | Saran Perbaikan |
|---|-----------|------------|-----------|-----------------|
| 4 | `Schedule.tsx:101, 108, 118` | **Null/undefined reference:** `workSchedule.start_time.slice(0,5)`, `workSchedule.end_time.slice(0,5)`, `workSchedule.break_start_time/break_end_time.slice(0,5)`, `workSchedule.working_days.length`. Jika API mengembalikan null/undefined untuk field tersebut, akan runtime error. | Medium | Gunakan optional chaining + fallback: `workSchedule.start_time?.slice(0,5) ?? '08:00'`, sama untuk end_time; untuk break hanya render blok jika `workSchedule.break_start_time && workSchedule.break_end_time` (sudah ada); `workSchedule.working_days?.length ?? 0`. |
| 5 | `useWorkSchedule.ts:234` | **console.error di production:** Error fetch work schedule di-log pakai `console.error`. Tidak konsisten dengan logger dan sulit dikontrol per env. | Medium | Import `logger` dari `@/config/logger`; ganti `console.error('Error fetching work schedule:', err)` dengan `logger.error('Error fetching work schedule:', err)`. |
| 6 | `useAttendanceStats.ts:76, 98, 118, 127, 171, 204, 274, 299, 313, 323` | **console.warn / console.log / console.error:** Banyak `console.warn`, `console.log`, dan `console.error`. Menambah noise di production dan tidak terpusat. | Medium | Ganti dengan `logger.warn`, `logger.debug`, `logger.error` dari `@/config/logger`. Hapus atau kurangi log debug (mis. "Day 17", "Total working days") untuk production. |
| 7 | `useNationalHolidays.ts:89, 111` | **console.error / console.log:** Error dan callback realtime pakai `console.*`. | Medium | Ganti dengan `logger.error` dan `logger.debug`. |
| 8 | `useWorkSchedule.ts:173-183` | **Cache tidak skip fetch:** Setelah set state dari cache (`setWorkSchedule`, `setHolidays`, `setInitialized`), kode tidak return; fetch dari API tetap jalan. Menambah beban jaringan dan loading. | Medium | Tambah early return setelah set dari cache (dengan optional: hanya jika cache masih segar, mis. ts < 2 menit), atau set flag dan skip fetch ketika cache hit agar loading lebih cepat. |
| 9 | `OfficeScheduleCard.tsx:99` | **Duplicate useWorkSchedule:** `OfficeScheduleCard` memanggil `useWorkSchedule()` sendiri, sementara halaman Schedule juga memanggil `useWorkSchedule()`. Dua request paralel untuk data yang sama; halaman lebih berat dan loading dobel. | Medium | Hanya satu sumber kebenaran: Schedule page pass `workSchedule`, `scheduleData`, `loading`, `error`, `refetch` ke `OfficeScheduleCard` sebagai props, atau pakai context; hapus pemanggilan `useWorkSchedule` di dalam OfficeScheduleCard. |

### LOW

| # | File:Line | Penjelasan | Prioritas | Saran Perbaikan |
|---|-----------|------------|-----------|-----------------|
| 10 | `useWorkSchedule.ts:119-120` | **Potensi null:** `schedule.start_time.slice(0, 5)` dan `schedule.end_time.slice(0, 5)` di `generateWeeklySchedule`. Jika baris DB punya start_time/end_time null, akan throw. | Low | Gunakan `schedule.start_time?.slice(0, 5) ?? '-'` dan sama untuk end_time. |
| 11 | `Schedule.tsx:70-71` | **statsLoading di kartu:** Di blok konten (bukan loading), kartu "Hadir Bulan Ini" / "Tidak Hadir Bulan Ini" masih cek `statsLoading` untuk Skeleton. Secara logic saat kita di cabang konten, `statsLoading` seharusnya false; redundant. | Low | Bisa disederhanakan: tampilkan `stats?.present_days ?? 0` tanpa Skeleton di cabang konten, atau pastikan conditional loading konsisten. |
| 12 | `useAttendanceStats.ts:171` | **Debug log hardcoded:** `if (day === 17) { console.log(...) }` untuk debug tanggal 17. Tidak perlu di production. | Low | Hapus atau ganti dengan `logger.debug` dan guard env DEV. |
| 13 | `MonthlyHolidaysCard.tsx` | **Duplicate useNationalHolidays:** Halaman Schedule tidak memanggil `useNationalHolidays`; hanya `OfficeScheduleCard` dan `MonthlyHolidaysCard` yang masing-masing punya hook sendiri. MonthlyHolidaysCard memanggil `useNationalHolidays` — satu kali per card, wajar. Tidak duplicate dengan Schedule page. Tapi `OfficeScheduleCard` + Schedule page sama-sama pakai `useWorkSchedule` (duplicate). Sudah masuk di #9. | Low | - |
| 14 | `useWorkSchedule.ts:246` | **Realtime tanpa filter org di listener:** `useRealtimeData` dipanggil dengan `organizationId ? [...] : []`. Saat mount `organizationId` masih null (belum di-set dari fetch), jadi realtime tidak subscribe sampai fetch selesai. Setelah fetch, organizationId di-set tapi effect useRealtimeData tidak dijalankan ulang karena dependency array `organizationId ? [...]` — sebenarnya config berubah saat organizationId dari null ke string, jadi effect akan re-run. Cukup aman. | Low | Opsional: pastikan cleanup channel saat organizationId berubah. |
| 15 | `ScheduleSkeleton.tsx` | **Import React tidak dipakai:** `import React from 'react'` — dengan JSX transform bisa tidak perlu. | Low | Hapus atau ganti dengan `import * as React from 'react'` jika hanya butuh type. |

---

## Error handling yang kurang

- **Schedule.tsx:** Tidak menampilkan error dari `useWorkSchedule` atau `useAttendanceStats`; tidak ada retry.
- **useWorkSchedule:** Error diset ke state dan dikembalikan; dipakai oleh `OfficeScheduleCard` untuk tampil "Jadwal Belum Dikonfigurasi", tapi halaman Schedule sendiri tidak menampilkan error global atau retry.
- **useAttendanceStats:** Error diset tapi Schedule page tidak baca `error` dari hook ini; tidak ada UI error untuk stats.
- **useNationalHolidays:** Error ditampilkan di dalam `MonthlyHolidaysCard`; cukup.

---

## API calls tanpa fallback / risiko gagal

- **useWorkSchedule:** Bila getUser, profile, atau employee gagal, throw dan set error; tidak ada retry otomatis. User harus refresh atau navigasi. Tambah tombol retry di halaman.
- **useAttendanceStats:** Sama; tambah retry di level halaman.
- **useNationalHolidays:** Sama; card sudah tampil pesan error, bisa ditambah tombol retry di card.

---

## Performa & beban

- **Duplicate fetch work schedule:** Schedule page + OfficeScheduleCard masing-masing panggil `useWorkSchedule()` → dua kali fetch/cache untuk data yang sama. Unifikasi sumber data (props atau context) agar satu fetch saja.
- **Cache useWorkSchedule:** Setelah baca dari cache tetap lanjut fetch API; bisa early return bila cache segar agar loading lebih cepat.
- **console.log/warn di useAttendanceStats:** Banyak log; kurangi atau ganti logger dengan level yang sesuai agar production lebih ringan.

---

## Ringkasan rekomendasi

1. **High:** Perbaiki urutan validasi profile dan pengecekan employeeData di useAttendanceStats; tambah error UI + retry di Schedule.tsx untuk schedule dan stats.
2. **Medium:** Null-safe workSchedule di Schedule.tsx dan generateWeeklySchedule; ganti semua console di useWorkSchedule, useAttendanceStats, useNationalHolidays dengan logger; optimasi cache useWorkSchedule; hilangkan duplicate useWorkSchedule (data dari Schedule page ke OfficeScheduleCard).
3. **Low:** Optional chaining untuk start_time/end_time di generateWeeklySchedule; hapus/simplify debug log; bersihkan import ScheduleSkeleton.

Dengan ini, halaman /schedule lebih aman dari null/undefined, error punya fallback dan retry, dan loading bisa lebih cepat dengan satu sumber data work schedule serta cache yang skip fetch bila segar.
