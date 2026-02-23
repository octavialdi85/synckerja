# Audit Bug – Mobile Android Halaman Home

**Scope:** Halaman home mobile Android (route `/` = Absensi) dan halaman terkait di `src/mobile/pages/home/` (Profile, Reports, ClientVisit, Schedule) beserta hook/komponen yang dipakai.

**Tujuan:** Identifikasi bug, error handling, logic error, performa; rekomendasi perbaikan untuk aplikasi lebih ringan dan loading lebih cepat.

---

## Daftar Bug (file:line)

### HIGH

| # | File:Line | Penjelasan | Saran Perbaikan |
|---|-----------|------------|-----------------|
| 1 | `src/mobile/components/TodaySchedule.tsx:19-43, 60` | **Logic error:** `isCurrentlyWorkTime()` mengembalikan tipe tidak konsisten (object untuk holiday/off, boolean untuk working day). Di `getTimeStatus()` saat hari libur/off, `else if (isCurrentlyWorkTime())` bernilai truthy (object), sehingga UI menampilkan "Sedang dalam jam kerja" padahal hari libur. | Di `getTimeStatus()` cek dulu `schedule.isHoliday` dan `schedule.isWorkingDay === false`, return status holiday/off; baru kemudian panggil `isCurrentlyWorkTime()` untuk cek waktu. Atau ubah `isCurrentlyWorkTime()` agar selalu return boolean dan pisahkan logic status message. |
| 2 | `src/mobile/pages/home/ClientVisit.tsx:82-102` | **Unhandled promise:** `useEffect` memanggil `getCurrentUser()` tanpa `await` atau `.catch()`. Jika `supabase.auth.getUser()` atau query profile gagal, promise rejection tidak tertangkap → console error / unhandled rejection. | Panggil `getCurrentUser().catch((err) => { logger.error('ClientVisit getCurrentUser', err); });` atau wrap dalam try/catch di dalam async dan set state error. |
| 3 | `src/mobile/pages/home/ClientVisit.tsx` (loading/error) | **Tidak ada error UI:** Hook `useClientVisitData()` mengembalikan `error`, tapi halaman tidak render state error. Saat fetch gagal, user hanya melihat konten kosong tanpa pesan error atau tombol retry. | Tambah branch: jika `!loading && error`, render blok error (pesan + tombol retry yang panggil `refetch()`), mirip Absensi.tsx. |
| 4 | `src/mobile/pages/home/Profile.tsx:115-154` | **Error branch tanpa DesktopWarning:** Saat `error || !profile`, return early render layout tanpa wrapper `<DesktopWarning>`. Layout error tidak konsisten dengan loading/success yang pakai DesktopWarning. | Bungkus return error (div utama) dengan `<DesktopWarning>` seperti branch loading/success. |
| 5 | `src/mobile/pages/home/Profile.tsx:144` | **Recovery kasar:** Tombol "Coba Lagi" memakai `window.location.reload()` → full page reload. Berat dan tidak perlu; refetch cukup. | Ganti dengan `onClick={() => refetch()}` dan sembunyikan error state setelah refetch sukses (bisa dengan state lokal atau reset error di hook). |

### MEDIUM

| # | File:Line | Penjelasan | Saran Perbaikan |
|---|-----------|------------|-----------------|
| 6 | `src/mobile/pages/home/ClientVisit.tsx:354, 384, 497, 555, 598, 660, 679` | **console.error di production:** Banyak `console.error(...)` untuk error API/visit. Di production menambah noise dan tidak terpusat. | Ganti dengan `logger.error(...)` (dari `@/config/logger`) agar konsisten dan bisa dikontrol per env. |
| 7 | `src/mobile/hooks/useClientVisitData.ts:94-96, 108, 119-128` | **console.error / console.log:** Error dan log pakai `console.*`. Tidak konsisten dengan logger dan sulit dikontrol. | Gunakan `logger.error` / `logger.debug` seperti di useAttendanceData. |
| 8 | `src/mobile/pages/home/ClientVisit.tsx:38` | **Import confetti tanpa fallback:** `import confetti from "canvas-confetti"` langsung. Jika package tidak terpasang, build/runtime error. Absensi pakai try/require + fallback. | Gunakan dynamic import atau require dalam try/catch seperti Absensi; cek `typeof confetti === 'function'` sebelum panggil. |
| 9 | `src/mobile/hooks/useAttendanceData.ts:184` | **Stale closure officeLocation:** Saat `setTodaySchedule(...)` dipanggil, `officeLocation` di closure bisa masih null (setState async). Nama kantor bisa tampil "Kantor Pusat" di render pertama meski data office sudah di-fetch. | Gunakan variabel lokal dari hasil fetch (mis. `office` dari `offices[0]`) untuk `name` saat membangun objek todaySchedule, bukan `officeLocation?.name`. |
| 10 | `src/mobile/pages/home/ClientVisit.tsx:416` | **Potensi null/undefined:** `validation.location_id` dipakai di `.eq('id', validation.location_id)` tanpa pengecekan. Jika RPC mengembalikan shape tak terduga, bisa error. | Tambah guard: `if (!validation?.location_id) { toast(...); return; }` sebelum query office_locations. |
| 11 | `src/mobile/components/LocationChecker.tsx:106` | **Property mungkin tidak ada:** `nearest.radius_meters` dipakai; object dari spread `...office` bisa punya `radius` saja (dari DB). LocationButton juga pakai `radius_meters`. | Gunakan `(nearest.radius_meters ?? nearest.radius)` atau satu nama property yang konsisten dari API. |
| 12 | `src/mobile/pages/home/Reports.tsx` | **Tidak ada error state halaman:** `useAttendanceHistory()` mengembalikan `error`, tapi halaman hanya menampilkan loading vs konten. Jika fetch history gagal, tidak ada banner error + retry di level halaman. | Tambah conditional: jika `error && !loading`, tampilkan pesan error + retry (serta optional fallback untuk stats). |

### LOW

| # | File:Line | Penjelasan | Saran Perbaikan |
|---|-----------|------------|-----------------|
| 13 | `src/mobile/pages/home/Absensi.tsx:36-41` | **confetti optional:** Pakai require dalam try/catch, baik. `confetti` bisa `undefined`; di `triggerConfetti` sudah ada cek `typeof confetti !== 'function'`. Tidak bug, hanya code smell (any). | Typing: `let confetti: typeof import('canvas-confetti') | undefined;` atau type yang sesuai. |
| 14 | `src/mobile/hooks/useProfile.ts:61-63, 87-89, 137-139` | **console.log/error hanya di DEV:** Sudah di guard `import.meta.env?.DEV`. Aman, tapi tidak konsisten dengan logger. | Ganti dengan `logger.debug` / `logger.warn` agar satu channel dan bisa diatur level-nya. |
| 15 | `src/mobile/pages/home/ClientVisit.tsx:192-194` | **periodLabel double find:** `periodOptions.find((o) => o.value === dateFilter)` dipanggil dua kali. Minor inefficiency. | Simpan hasil: `const selected = periodOptions.find((o) => o.value === dateFilter); periodLabel = selected ? t(selected.labelKey, dateFilter) : t(...)`. |
| 16 | `src/mobile/pages/home/Reports.tsx:72-74` | **Sama:** Double find untuk periodLabel. | Sama seperti #15, simpan hasil find sekali. |
| 17 | `src/mobile/pages/home/ClientVisit.tsx:455` | **Typo / risiko:** Komentar "If no clients exist, create a default one" — membuat client default otomatis bisa menabrak business rule. | Pastikan product mengizinkan; kalau tidak, tampilkan error "Belum ada client, hubungi admin" dan jangan auto-create. |
| 18 | `src/mobile/components/TodaySchedule.tsx` | **Duplicate logic:** `isCurrentlyWorkTime()` dan `getTimeStatus()` sama-sama hitung status (holiday/off/upcoming/active/completed). Return type `isCurrentlyWorkTime()` campur object dan boolean. | Refactor: satu fungsi yang return status + message; atau dua fungsi dengan return type konsisten (boolean vs object) dan nama yang jelas. |
| 19 | `src/mobile/hooks/useRealtimePresence.ts:88` | **currentUser dependency:** Dependency array `[organizationId, currentUser]`. Jika parent re-create object `currentUser` tiap render, effect jalan terus. Di Absensi `userForPresence` dari state hook lain (stabil). Aman selama object dari state. | Pastikan caller (Absensi/ClientVisit) pass object dari state, bukan object literal inline. Atau gunakan `currentUser?.id` saja di dependency. |
| 20 | `src/mobile/pages/home/Profile.tsx:271` | **Role hardcoded:** Teks selalu "Owner" untuk semua user. Mungkin harus dari data role. | Ambil role dari API/profile lalu tampilkan; atau hapus jika tidak dipakai. |

---

## Error handling yang kurang / tidak ada

- **ClientVisit:** Error dari `useClientVisitData` tidak di-render; tidak ada fallback UI.
- **ClientVisit:** `getCurrentUser()` di useEffect tidak punya .catch → unhandled rejection.
- **Reports:** Error dari `useAttendanceHistory` tidak ditampilkan di level halaman (hanya di tabel).
- **Profile:** Error recovery dengan full reload; sebaiknya refetch saja.
- **ClientVisit / Absensi:** Beberapa path API error hanya toast, tanpa logging terpusat (logger).

---

## API calls tanpa fallback / risiko gagal

- **useClientVisitData:** Jika `getUser`, profile, atau employee gagal, set error dan return; tidak ada retry otomatis. User harus pindah halaman atau refresh. Tambah tombol retry di UI.
- **useAttendanceData:** Error diset dan ditampilkan di Absensi dengan tombol "Coba lagi" — sudah baik.
- **useProfile:** Error diset; Profile menampilkan error tapi recovery dengan reload — bisa diperbaiki seperti #5.
- **LocationChecker / LocationButton:** `findNearestOffice` dan `getCurrentPosition` sudah di try/catch + toast; cukup.

---

## Performa & beban aplikasi

- **Confetti (ClientVisit):** Import langsung canvas-confetti menambah bundle; optional chunk atau lazy load akan meringankan.
- **Double find (ClientVisit, Reports):** periodLabel double find — minor, bisa dirapikan.
- **useAttendanceData:** Banyak sequential fetch (user → profile → employee → attendance → offices → work_schedule → holidays). Pertimbangkan parallel (Promise.all) untuk yang independen agar loading lebih cepat.
- **useProfile:** Realtime channel + visibility listener; wajar. Pastikan cleanup channel (sudah ada).
- **Prefetch (NavigationFooter):** Prefetch home data sudah .catch; tidak membebani. Pastikan prefetch tidak memblok navigasi.

---

## Rekomendasi singkat

1. **High:** Perbaiki logic TodaySchedule (holiday/off tampil salah), tambah error UI + retry di ClientVisit, handle promise getCurrentUser, seragamkan error branch Profile dengan DesktopWarning dan refetch.
2. **Medium:** Ganti semua console.error/log di ClientVisit & useClientVisitData dengan logger; optional import confetti di ClientVisit; perbaiki stale officeLocation di useAttendanceData; tambah guard validation.location_id; konsistenkan radius_meters/radius; tambah error state di Reports.
3. **Low:** Typing confetti, gunakan logger di useProfile untuk debug, hilangkan double find, pastikan role Profile dari data, refactor TodaySchedule return type.

Dengan perbaikan di atas, aplikasi lebih konsisten, tidak ada unhandled promise di halaman home, error state jelas, dan loading bisa ditingkatkan (parallel fetch di useAttendanceData).
