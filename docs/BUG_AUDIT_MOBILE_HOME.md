# Audit Bug: Mobile Android – Halaman Home

**Lingkup:** Mobile Android, halaman home (route `/` → komponen `Absensi.tsx`).  
**Tanggal:** 2026-02-20.

---

## Ringkasan

| Prioritas | Jumlah |
|-----------|--------|
| High      | 6      |
| Medium    | 12     |
| Low       | 10     |

---

## HIGH

### 1. `src/mobile/pages/home/Absensi.tsx` — Confetti crash jika modul tidak ada

**Lokasi:** Baris 27–32 (optional require), 119–165 (`triggerConfetti`).

**Masalah:** `confetti` di-require secara optional; jika gagal, `confetti` jadi `undefined`. Pemanggilan `confetti({...})` di `triggerConfetti()` akan throw (TypeError), dan error hanya tertangkap di `handleCameraCapture` catch. Jika confetti dipanggil dari jalur lain tanpa try/catch, aplikasi bisa crash.

**Saran:** Guard sebelum panggil: `if (typeof confetti === 'function') { confetti(...); }` atau wrap seluruh isi `triggerConfetti` dengan try/catch dan log/ignore.

---

### 2. `src/mobile/pages/home/Absensi.tsx` — Null reference saat clock out

**Lokasi:** Baris 421: `working_hours_minutes: todayAttendance ? Math.floor(...) : 0`.

**Masalah:** Di dalam callback async `handleCameraCapture`, `todayAttendance` berasal dari closure. Setelah clock in berhasil, `refetch()` dijalankan tapi state mungkin belum ter-update saat user langsung lanjut clock out. Jika `todayAttendance` masih null/lama, perhitungan `working_hours_minutes` bisa salah atau pakai data usang.

**Saran:** Hitung `working_hours_minutes` dari `insertedRecord` (clock in) atau dari `new Date()` vs `check_in_time` dari response/refetch, jangan andalkan hanya `todayAttendance` dari state di dalam callback async.

---

### 3. `src/mobile/hooks/useAttendanceData.ts` — Error fetch tidak ditampilkan ke user

**Lokasi:** Baris 181–184 (`catch`), tidak ada state `error` di return.

**Masalah:** Jika `fetchAttendanceData` gagal (network, RLS, dll.), hanya `console.error` yang dipanggil. `loading` jadi `false`, data tetap `null`. UI hanya tampil state kosong tanpa pesan error atau retry.

**Saran:** Tambah state `error` (mis. `Error | null`), set di catch, return dari hook. Di `Absensi.tsx` tampilkan pesan error + tombol retry saat `error && !loading`.

---

### 4. `src/mobile/hooks/useRealtimePresence.ts` — Leak channel saat `updateStatus` dipanggil

**Lokasi:** Baris 86–96 (`updateStatus`).

**Masalah:** `updateStatus` memanggil `supabase.channel(\`organization-${organizationId}\`)` tanpa `subscribe()` dan tanpa `removeChannel()`. Setiap panggil membuat channel baru yang tidak pernah di-cleanup → potensi memory leak dan koneksi menumpuk.

**Saran:** Jangan buat channel baru di `updateStatus`. Simpan reference channel yang sudah di-subscribe di effect (ref atau state), dan panggil `channel.track(...)` pada channel yang sama. Atau hapus `updateStatus` jika tidak dipakai, atau implementasi track via channel yang sudah ada.

---

### 5. `src/mobile/components/NavigationFooter.tsx` + `src/hooks/useParallelHomeData.ts` — Prefetch home tidak relevan di mobile dan bisa error

**Lokasi:**  
- `NavigationFooter.tsx` baris 24–25: `prefetchHomeData()` saat path === `/`.  
- `useParallelHomeData.ts` baris 200–218: `prefetchQuery` hanya dengan `queryKey` + `staleTime`, tanpa `queryFn`.

**Masalah:**  
- Di mobile, home = `Absensi` yang pakai `useAttendanceData`, bukan `useParallelHomeData`. Prefetch ini untuk data desktop (profile, objectives, tasks parallel).  
- Tanpa `queryFn`, `prefetchQuery` bisa throw jika query dengan key tersebut belum pernah didaftarkan (no queryFn). Error di-swallow dengan `.catch(() => {})`, sehingga request sia-sia dan error tidak terlihat.

**Saran:**  
- Di `NavigationFooter`, hanya panggil prefetch jika **bukan** mobile (mis. pakai `useIsMobile()`). Atau pindah prefetch ke desktop-only (mis. di layout desktop).  
- Atau beri `queryFn` yang sama dengan di `useParallelHomeData` saat memanggil `prefetchQuery` (tetap hanya berguna untuk desktop).

---

### 6. `src/mobile/hooks/useAttendanceData.ts` — Banyak `console.log` di production

**Lokasi:** Baris 37, 144, 191, 212.

**Masalah:** Log (organisasi berubah, working day, realtime, profile update) ikut ke production. Menambah noise, sedikit overhead, dan bisa bocor informasi.

**Saran:** Ganti dengan `logger.debug` (atau logger lain) dan pastikan logger non-production tidak print ke console, atau guard dengan `import.meta.env.DEV`.

---

## MEDIUM

### 7. `src/mobile/pages/home/Absensi.tsx` — Debug log left in

**Lokasi:** Baris 378–384 (`console.log('Lateness calculation:', ...)`).

**Saran:** Hapus atau ganti dengan `logger.debug` di belakang env check.

---

### 8. `src/mobile/pages/home/Absensi.tsx` — Type safety diabaikan dengan `(supabase as any)`

**Lokasi:** Beberapa tempat (mis. 348–352, 367–372, 383–388, 422–425, dll.).

**Masalah:** Cast `(supabase as any)` menghilangkan pengecekan tipe dan bisa menyembunyikan error struktur response.

**Saran:** Gunakan type yang benar dari Supabase (generated types) dan hapus `as any`; tangani `error` dan `data` dengan type yang tepat.

---

### 9. `src/mobile/components/AttendanceStatus.tsx` — Parsing waktu check-in bisa salah untuk locale 12 jam

**Lokasi:** Baris 32–34 (regex `timeOnly`), 54–65 (fallback `new Date(checkIn)`).

**Masalah:** `Absensi` mengirim `checkIn` dari `toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })` tanpa `hour12: false`. Untuk `en-US` bisa dapat string seperti "02:32:00 PM". Regex `^(\d{1,2})[.:](\d{1,2})[.:](\d{1,2})$` tidak match → fallback ke `new Date(checkIn)` yang bisa invalid atau salah tergantung locale.

**Saran:** Di `Absensi.tsx` panggil `toLocaleTimeString` dengan `hour12: false`, atau kirim ISO time string ke `AttendanceStatus` dan parse di sana dengan `new Date(...)` saja.

---

### 10. `src/mobile/hooks/useAttendanceData.ts` — `useEffect` tanpa dependency lengkap

**Lokasi:** Baris 205–207: `useEffect(() => { fetchAttendanceData(); }, []);`  
Baris 202–224: effect profile changes dengan `[]`.

**Masalah:** `fetchAttendanceData` tidak ada di dependency. ESLint biasanya mengingatkan. Secara logika, intent “run once on mount” ok, tapi jika nanti ada dependency (mis. org id) yang berubah, refetch tidak otomatis ter-trigger dari effect ini.

**Saran:** Tambah dependency yang memang disengaja (mis. `[]` dengan komentar), atau pakai `useCallback` untuk `fetchAttendanceData` dan masukkan ke dependency jika ingin refetch saat org berubah.

---

### 11. `src/mobile/hooks/useRealtimeData.ts` — Banyak `console.log` di production

**Lokasi:** Baris 59, 64, 89–90, 110–114, 123, 164–188, 228–236, 276–284, dll.

**Saran:** Ganti dengan logger (mis. `logger.debug`) dan matikan di production, atau guard dengan env.

---

### 12. `src/mobile/hooks/useRealtimePresence.ts` — Banyak `console.log` di production

**Lokasi:** Baris 33, 45, 48, 51, 56.

**Saran:** Sama seperti di atas: logger + non-production only.

---

### 13. `src/mobile/components/TimeDisplay.tsx` — Interval 1 detik selalu jalan

**Lokasi:** Baris 9–14: `setInterval(..., 1000)`.

**Masalah:** Setiap detik setState → re-render. Di mobile bisa sedikit boros baterai/CPU jika halaman lama terbuka.

**Saran:** Untuk tampilan jam yang tidak perlu detik, pakai interval 60.000 ms; atau komponen lazy/conditional mount hanya ketika terlihat.

---

### 14. `src/mobile/components/AttendanceStatus.tsx` — Interval 1 detik + error hanya di-log

**Lokasi:** Baris 77–81 (interval), 73 (`console.error`).

**Masalah:** Sama seperti TimeDisplay, interval 1 detik; error parsing hanya di-log, user tidak dapat feedback.

**Saran:** Interval bisa diperbesar jika tampilan tidak butuh detik; untuk error, tampilkan fallback teks (mis. "--") dan optional logger.

---

### 15. `src/mobile/pages/home/Absensi.tsx` — Double fetch user + org

**Lokasi:** Baris 75–103 (`getCurrentUser`), dan di dalam `useAttendanceData` juga ada get user + profile + org.

**Masalah:** User dan `active_organization_id` di-fetch lagi di Absensi padahal `useAttendanceData` sudah fetch profile/org untuk attendance. Bisa dua round-trip untuk data yang sama saat mount.

**Saran:** Ambil user/org dari satu sumber (mis. context atau hook bersama) dan pass ke `useAttendanceData` / `useRealtimePresence`, atau ekspos org dari `useAttendanceData` agar Absensi tidak perlu `getCurrentUser` hanya untuk presence.

---

### 16. `src/components/HomeAccessGuard.tsx` — Banyak query sebelum render home

**Lokasi:** Auth, CentralizedUserData, subscription check, expiry check.

**Masalah:** Beberapa sequential/parallel request (org, subscription, expiry) harus selesai dulu sebelum anak (termasuk Absensi) di-render. Di jaringan lambat, waktu sampai “home siap” bisa panjang.

**Saran:** Pertahankan guard yang wajib (auth, org, subscription), tapi pertimbangkan cache (sudah ada), skeleton yang lebih informatif, atau defer non-critical checks setelah first paint.

---

### 17. `src/mobile/pages/home/Absensi.tsx` — Hardcoded string Indonesia

**Lokasi:** Baris 408–412 ("Lokasi Tidak Valid", "Anda tidak berada dalam radius...").

**Masalah:** String tidak melalui i18n; pengguna bahasa lain tetap dapat teks Indonesia.

**Saran:** Pakai `t('...')` dengan key yang sesuai (mis. di `mobileHome.*`) seperti bagian lain di halaman.

---

### 18. `src/features/5-3-whatsapp/components/LiveChatAppBadgeSync.tsx` — Badge sync di-render di mobile home

**Lokasi:** `Absensi.tsx` baris 453: `<LiveChatAppBadgeSync />`.

**Masalah:** Setiap mount home (Absensi) memakai hook `useWhatsAppUnreadCount` → tambahan request/subscription. Bisa sedikit memperlambat first paint home.

**Saran:** Lazy load komponen ini (React.lazy + Suspense) atau pindah ke layout level dan render hanya sekali; atau defer fetch badge sampai setelah data attendance tampil.

---

## LOW

### 19. `src/mobile/pages/home/Absensi.tsx` — `console.error` di catch

**Lokasi:** Baris 537, 566, 601, 627.

**Saran:** Untuk konsistensi dan kontrol di production, ganti dengan `logger.error` (atau logger yang sama dengan guard env).

---

### 20. `src/mobile/pages/home/Profile.tsx` — `console.error` / `console.warn`

**Lokasi:** Baris 104, 144.

**Saran:** Ganti dengan logger.

---

### 21. `src/mobile/components/LocationChecker.tsx` — `console.error` + `.single()` tanpa handle error

**Lokasi:** Baris 52 (`.single()`), 89, 253.

**Masalah:** Jika tidak ada profile, `.single()` mengembalikan error; kode hanya cek `!profile?.active_organization_id`. Error dari Supabase tidak di-handle (hanya try/catch di level luar).

**Saran:** Cek `error` dari response profile; jika error (mis. PGRST116), set state error atau return null dengan aman. Ganti `console.error` dengan logger.

---

### 22. `src/mobile/components/CameraModal.tsx` — `console.error` dan dependency effect

**Lokasi:** Baris 36, 95–104: effect dengan `[isOpen, stream, startCamera, stopCamera]`.

**Masalah:** `startCamera` dan `stopCamera` berubah tiap render (karena `useCallback` dengan `[toast]`), bisa menyebabkan effect jalan berulang.

**Saran:** Ganti `console.error` dengan logger. Stabilkan dependency (mis. ref untuk start/stop) atau pastikan effect idempoten.

---

### 23. `src/mobile/hooks/useRealtimeData.ts` — Memo config dengan `JSON.stringify`

**Lokasi:** Baris 22–34: `useMemo(..., [JSON.stringify(...)])`.

**Masalah:** `JSON.stringify` pada object bisa mahal dan tidak disarankan sebagai dependency; juga callback (onInsert dll.) tidak ikut di stringify sehingga tetap bisa stale.

**Saran:** Dependency pakai array primitif (table, filter column, eq value). Untuk callback, gunakan ref terbaru (useRef) dan baca ref di dalam handler, atau pastikan callback stabil (useCallback dengan deps yang benar).

---

### 24. `src/mobile/utils/geolocation.ts` — Error message hardcoded Indonesia

**Lokasi:** Baris 27–29, 41–42, 49, 62–64.

**Saran:** Pindah ke i18n atau terima message dari pemanggil agar konsisten dengan locale.

---

### 25. `src/mobile/pages/home/Absensi.tsx` — Foto attendance tidak di-upload

**Lokasi:** Baris 396–397, 429: `check_in_photo_path` / `check_out_photo_path` di-set ke path string, bukan upload ke storage.

**Masalah:** `handleCameraCapture` dapat `imageData` (base64) tapi tidak meng-upload ke Supabase Storage; path hanya string lokal. Data foto tidak tersimpan di server.

**Saran:** Upload blob/base64 ke Storage (mis. bucket attendance), dapatkan path/public URL, lalu simpan path/URL tersebut ke `attendance_records`. Atau dokumentasikan bahwa fitur “simpan foto” belum diimplementasi dan path hanya placeholder.

---

### 26. Scroll & layout

**Lokasi:** `Absensi.tsx` baris 461: `seamless-scroll` dan `overflow-y-auto` sudah dipakai.

**Catatan:** Sesuai aturan project, halaman sudah pakai pola scroll yang benar (`seamless-scroll`, `min-h-0`, `overflow-hidden`). Tidak ada bug tambahan untuk poin ini.

---

## Rekomendasi singkat (loading & bobot halaman)

1. **Kurangi round-trip:** Satu sumber untuk user/org (context/hook), hindari double fetch di Absensi + useAttendanceData.
2. **Prefetch hanya di desktop:** Jangan panggil `prefetchHomeData` di mobile; atau beri `queryFn` dan hanya panggil saat desktop.
3. **Error state di home:** Expose error dari `useAttendanceData` dan tampilkan pesan + retry di Absensi.
4. **Kurangi log production:** Ganti semua `console.log/error/warn` di path home/realtime dengan logger yang bisa dimatikan di production.
5. **Guard confetti:** Cek `typeof confetti === 'function'` sebelum panggil agar tidak crash jika modul tidak ada.
6. **Defer non-critical:** Pertimbangkan defer LiveChatAppBadgeSync atau fetch-nya setelah data utama home selesai.

---

**File yang paling sering muncul:**  
`Absensi.tsx`, `useAttendanceData.ts`, `useRealtimePresence.ts`, `useRealtimeData.ts`, `NavigationFooter.tsx`, `useParallelHomeData.ts`, `HomeAccessGuard.tsx`, `AttendanceStatus.tsx`, `TimeDisplay.tsx`, `LocationChecker.tsx`, `CameraModal.tsx`.

---

## Audit Pasca-Implementasi (Post-Implementation)

**Tanggal:** 2026-02-20.  
**Lingkup:** Verifikasi halaman home mobile Android setelah implementasi perbaikan (Fase 1–3).

### Status rencana perbaikan

| Item rencana | Status | Catatan |
|--------------|--------|--------|
| Confetti guard (1.1) | ✅ | `typeof confetti === 'function'` + try/catch di Absensi |
| Working hours clock out ref (1.2) | ✅ | `lastCheckInTimeRef` dipakai di handleCameraCapture |
| Error state + retry UI (1.3) | ✅ | `error`, `clearError` dari hook; UI error + "Coba lagi" di Absensi |
| useRealtimePresence channel ref (1.4) | ✅ | `channelRef` + `updateStatus` pakai channel yang sama |
| Prefetch home hanya desktop (1.5) | ✅ | NavigationFooter: `useIsMobile()`, prefetch hanya saat `!isMobile` |
| Logger useAttendanceData (1.6) | ✅ | Tidak ada `console.*` di useAttendanceData |
| Debug log + logger Absensi (2.1) | ✅ | Tidak ada `console.*` di Absensi |
| Type safety Supabase Absensi (2.2) | ✅ | Type assertion, satu `@ts-expect-error` untuk employee query |
| hour12: false AttendanceStatus (2.3) | ✅ | toLocaleTimeString dengan hour12: false |
| useEffect deps useAttendanceData (2.4) | ✅ | eslint-disable dengan komentar intent |
| Logger useRealtimeData + useRealtimePresence (2.5) | ✅ | logger dipakai |
| TimeDisplay/AttendanceStatus interval + logger (2.6) | ✅ | TimeDisplay punya `showSeconds`; AttendanceStatus pakai logger |
| Satu sumber user/org (2.7) | ✅ | userForPresence, organizationId dari useAttendanceData; tidak ada getCurrentUser di Absensi |
| i18n lokasi + jadwal (2.8) | ✅ | Key mobileHome.* untuk error/lokasi/jadwal/retry |
| LiveChatAppBadgeSync (2.9) | ⏸️ | Rencana: opsi minimal, dibiarkan seperti semula |
| Logger Profile, LocationChecker, CameraModal (3.1) | ✅ | Semua pakai logger |
| useRealtimeData memo dependency (3.2) | ✅ | configDeps + configs di useMemo |
| Komentar placeholder foto (3.4) | ✅ | TODO di Absensi baris 514, 597 |

### Bug / isu yang masih ada (sisa)

| # | File:Baris | Penjelasan singkat | Prioritas | Saran perbaikan |
|---|------------|---------------------|-----------|------------------|
| 1 | `useAttendanceData.ts:30,40,68` | Early return saat `!user`, `!profile?.active_organization_id`, atau `!employee` tidak set `error`; loading jadi false (finally) sehingga UI tampil konten kosong, bukan error + retry. | **Medium** | Di setiap early return panggil `setError(new Error('...'))` (mis. "User tidak ditemukan", "Organisasi tidak ditemukan", "Data karyawan tidak ditemukan") agar user melihat UI error dan tombol "Coba lagi". |
| 2 | `Absensi.tsx:514,597` | Foto attendance belum di-upload ke Storage; path hanya placeholder (TODO). | **Low** | **Dokumentasi (Opsi B):** Komentar di kode dan dokumen ini menyatakan fitur upload foto belum diimplementasi; path saat ini placeholder. Implementasi upload (Opsi A) dapat dilakukan nanti. |
| 3 | `useAttendanceData.ts` (query Supabase) | Beberapa query selain profile/employee masih memicu error tipe TypeScript (SelectQueryError / "excessively deep"). | **Low** | Tambah type assertion/`@ts-expect-error` yang konsisten atau perbaiki tipe Supabase generated; tidak mengubah perilaku runtime. |
| 4 | `NavigationFooter.tsx` (prefetch) | `prefetchHomeData().catch(() => {})` tetap menelan error; hanya berguna di desktop setelah pengecekan `!isMobile`. | **Low** | Opsional: log error di catch (logger) untuk debugging; atau biarkan karena prefetch non-critical. |

### Ringkasan pasca-implementasi

- **High:** Semua item high dari audit awal sudah diperbaiki (confetti, working hours ref, error state + retry, channel ref, prefetch mobile, console → logger).
- **Medium:** Sebagian besar diperbaiki; tersisa **early return tanpa setError** di useAttendanceData (satu isu medium).
- **Low:** Beberapa low tetap (placeholder foto, TypeScript types, prefetch catch); sesuai ekspektasi.
- **Loading & bobot:** Satu sumber user/org, prefetch hanya desktop, dan error + retry sudah diterapkan; halaman home lebih ringan dan error handling lebih jelas.
