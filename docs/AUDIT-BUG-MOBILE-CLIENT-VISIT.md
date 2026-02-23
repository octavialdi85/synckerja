# Audit Bug: Mobile Android Halaman /client-visit

Scope: [src/mobile/pages/home/ClientVisit.tsx](src/mobile/pages/home/ClientVisit.tsx), [src/mobile/hooks/useClientVisitData.ts](src/mobile/hooks/useClientVisitData.ts), dan komponen terkait (LocationChecker, TodayVisitSchedule, dll.).

---

## Daftar Bug (file:line)

### HIGH

| # | File:Line | Penjelasan | Saran perbaikan |
|---|-----------|------------|------------------|
| 1 | useClientVisitData.ts:57–66 | Query `profiles` tidak mendestructure `error`. Jika terjadi error selain PGRST116 (no rows), state error tidak di-set dengan pesan asli; user hanya bisa dapat "No active organization found". | Destructure `error: profileError`; jika `profileError && profileError.code !== 'PGRST116'` panggil `setError(profileError.message ?? '...')` dan return. |
| 2 | useClientVisitData.ts:83–94, ClientVisit.tsx:218–224 | Hook hanya fetch `visit_date = today`. Filter periode (this_week, this_month, custom) hanya memfilter array yang isinya cuma kunjungan hari ini; user pilih "Bulan Ini" tetap hanya lihat data hari ini. | Ubah hook agar menerima range (start/end) dan query `.gte('visit_date', start).lte('visit_date', end)` atau tambah endpoint/param; atau tampilkan teks "Menampilkan kunjungan hari ini" dan sembunyikan filter periode sampai data per periode diimplementasi. |
| 3 | ClientVisit.tsx:63, 560–564 | `locationValidation` di-set dengan `useState` tapi tidak pernah di-update (`setLocationValidation` tidak dipanggil). End visit selalu mengirim `locationValidation` kosong sehingga `end_validation` tidak pernah terisi. | Panggil `setLocationValidation(validation)` setelah validasi lokasi di flow end visit (sebelum update), atau hapus state dan isi `end_validation` dari validasi yang dijalankan saat end visit. |

### MEDIUM

| # | File:Line | Penjelasan | Saran perbaikan |
|---|-----------|------------|------------------|
| 4 | ClientVisit.tsx:201 | `t(selectedPeriod.labelKey, dateFilter)` — argumen kedua `t` adalah fallback string; `dateFilter` bernilai "this_month", "today", dll. Jika terjemahan kosong, user lihat "this_month" bukan teks manusia. | Ganti jadi fallback yang benar, mis. `t(selectedPeriod.labelKey, "This Month")` atau gunakan objek fallback per value (today → "Today", dll.). |
| 5 | ClientVisit.tsx:121–132 | Effect visibility memakai `[refetch]`. `refetch` = `fetchClientVisitData` yang baru tiap render, sehingga effect cleanup/setup jalan tiap render dan listener visibilitychange terpasang berulang. | Stabilkan refetch dengan `useCallback` di useClientVisitData, atau simpan ref ke refetch dan di effect baca ref.current. |
| 6 | useClientVisitData.ts:45–114 | Tidak ada guard unmount: jika user keluar dari halaman saat fetch berjalan, `setLoading`/`setError`/`setTodayVisits` bisa dipanggil setelah unmount → warning React. | Tambah `cancelledRef`; di awal fetch set false, sebelum tiap setState cek ref; di cleanup effect set true. |
| 7 | useClientVisitData.ts:117–134 | Realtime hanya subscribe ke tabel `clients`. Perubahan di tabel `client_visits` (mulai/selesai kunjungan dari device lain) tidak memicu refetch. | Tambah konfigurasi realtime untuk tabel `client_visits` (filter by employee_id atau organization) dan panggil refetch di callback. |
| 8 | ClientVisit.tsx:356, 373–378 | RPC `validate_client_visit_location` dipanggil dengan `client_id_param: null`. Jika RPC mengembalikan `is_valid: true` tapi `location_id` null/undefined, query office_locations berikut bisa tidak sesuai. | Guard setelah validasi: jika `!validation?.location_id` tampilkan toast error dan return (sudah ada di 384–390; pastikan tidak ada path yang skip). |
| 9 | ClientVisit.tsx:448–478 | Auto-create "Client Default" bila tidak ada client. Perilaku ini product-sensitive; bisa dianggap bug (data sampah) atau fitur. | Dokumentasi atau flag; atau ganti dengan toast "Belum ada client, hubungi admin" dan return tanpa insert. |
| 10 | ClientVisit.tsx:530–533, 589–592 | `setTimeout(..., 500)` untuk confetti tidak di-clear. Jika komponen unmount sebelum 500 ms, callback tetap jalan. | Simpan timeoutId dan clear di cleanup (useEffect return atau onClose modal). |

### LOW

| # | File:Line | Penjelasan | Saran perbaikan |
|---|-----------|------------|------------------|
| 11 | useClientVisitData.ts:6–31 (interface) | Interface `ClientVisit` punya `client_id`; di insert/update dan baca kode pakai `lead_client_id`. Ketidaksesuaian nama bisa bingung dan typo. | Sesuaikan interface dengan DB: gunakan `lead_client_id` jika itu kolom sebenarnya, atau alias di select. |
| 12 | ClientVisit.tsx:199–200, 730–754 | `periodLabel` (untuk drawer button) dan `getPeriodLabel()` (untuk kartu) menghitung hal serupa dengan dua cara. Duplikasi dan risiko inkonsistensi. | Satu sumber: pakai `getPeriodLabel()` untuk drawer juga, atau derive periodLabel dari getPeriodLabel(). |
| 13 | ClientVisit.tsx:92–96 | Cast `(supabase as any)` dan `.from('profiles')` + type `any` untuk profile. Menurunkan type safety. | Hapus cast jika typings Supabase sudah punya `profiles`; gunakan type yang benar untuk response. |
| 14 | LocationChecker.tsx:106, 113–114 | Pemakaian `nearest.radius_meters ?? nearest.radius` sudah konsisten. Pastikan tipedata office_locations punya salah satu; jika DB hanya punya `radius`, bisa undefined. | Sudah aman dengan fallback; opsional: normalisasi di satu helper (e.g. `getRadiusMeters(office)`) untuk konsistensi. |
| 15 | ClientVisit.tsx:41–46 | Dynamic require untuk `canvas-confetti` dengan `any`. Bisa gagal di environment yang tidak support require. | Guard `typeof confetti !== 'function'` sudah ada di triggerConfetti; opsional: beri tipe yang lebih ketat (e.g. type import) untuk confetti. |

---

## Ringkasan prioritas

- **High:** 3 (error profile tidak tertangani, data periode hanya hari ini, end_validation tidak pernah terisi).
- **Medium:** 7 (i18n fallback, effect deps, setState after unmount, realtime client_visits, validation guard, auto-create client, setTimeout cleanup).
- **Low:** 5 (interface client_id vs lead_client_id, duplikasi period label, cast any, radius fallback, typing confetti).

---

## Catatan performa / loading

- Satu kali mount: useClientVisitData fetch + getCurrentUser (profile) + visibility listener. Realtime hanya ke `clients`; menambah subscription ke `client_visits` akan sedikit menambah penggunaan realtime tapi memperbaikan konsistensi data.
- Effect dengan dependency `[refetch]` yang tidak stabil menyebabkan re-register listener; menstabilkan refetch mengurangi kerja saat render.

Tidak ada infinite loop yang terdeteksi; memory leak potensial hanya dari setTimeout confetti dan (jika refetch tidak stabil) listener visibility yang menumpuk.
