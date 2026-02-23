# Audit Bug – Mobile Android Halaman /profile

**Scope:** Halaman Profile mobile Android (route `/profile`), komponen [src/mobile/pages/home/Profile.tsx](src/mobile/pages/home/Profile.tsx), [ProfileSkeleton.tsx](src/mobile/pages/home/ProfileSkeleton.tsx), hook [useProfile.ts](src/mobile/hooks/useProfile.ts), dan komponen yang dipakai (ProfilePhotoUpload, OrganizationSelectDrawer, ChangePasswordModal, useOrganizationList, useOrganizationSwitchCallback).

**Tujuan:** Identifikasi bug, error handling, logic error, performa; list file:line, prioritas, dan saran perbaikan agar aplikasi lebih ringan dan loading lebih cepat.

---

## Daftar Bug (file:line)

### HIGH

| # | File:Line | Penjelasan | Saran Perbaikan |
|---|-----------|------------|-----------------|
| 1 | `src/mobile/hooks/useProfile.ts:44-58` | **Profiles query error tidak ditangani:** Query `profiles` pakai `.single()`; hanya `data: profile` yang dipakai, `error` tidak didestructure. Jika gagal (network, RLS), kita dapat `{ data: null, error }`. Kode hanya cek `!profile?.active_organization_id` lalu set fallback profile; error tidak diset sehingga user lihat profil minimal tanpa pesan error/retry. | Destructure `error: profileError`. Jika `profileError && profileError.code !== 'PGRST116'`, setError dan return (atau throw). Untuk PGRST116/no row, tetap fallback ke auth user. |
| 2 | `src/mobile/hooks/useProfile.ts:165-209` | **SetState setelah unmount:** `fetchProfile()` async; jika user keluar dari /profile sebelum selesai, `setProfile`/`setLoading`/`setError` bisa dipanggil setelah unmount → peringatan React. | Gunakan `cancelledRef` (useRef): di awal fetch set false, sebelum setiap setState cek ref, di cleanup effect set true. Sama seperti pola di useAttendanceHistory/useAttendanceStats. |

### MEDIUM

| # | File:Line | Penjelasan | Saran Perbaikan |
|---|-----------|------------|-----------------|
| 3 | `src/mobile/hooks/useProfile.ts:171-209` | **Realtime hanya saat tab visible:** Saat `document.visibilityState !== 'visible'`, effect hanya pasang listener visibility dan return; channel tidak pernah dibuat. Jika user buka /profile di tab background, setelah switch tab hanya satu kali fetch, tidak ada subscription realtime untuk UPDATE profiles. | Bangun channel di semua path; atau saat onVisible panggil fetchProfile dan (opsional) setup channel. Atau dokumentasikan bahwa realtime hanya aktif bila halaman dibuka dengan tab visible. |
| 4 | `src/mobile/hooks/useProfile.ts:194-196` | **setTimeout tanpa cleanup:** Realtime callback pakai `setTimeout(() => fetchProfile(), 150)`. Jika komponen unmount dalam 150ms, fetchProfile tetap jalan → setState setelah unmount. | Simpan timeoutId; di cleanup effect panggil clearTimeout(timeoutId). Atau pakai cancelledRef dan di dalam fetchProfile cek ref sebelum setState (menggabungkan dengan bug #2). |
| 5 | `src/mobile/pages/home/Profile.tsx:271` | **Role hardcoded:** Teks selalu "Owner" untuk semua user. Tidak dari data API. | Ambil role dari API/profile atau dari useOrganizationList/activeOrganization jika tersedia; tampilkan atau hapus baris jika tidak dipakai. |
| 6 | `src/mobile/hooks/useProfile.ts:44-48` | **Variable shadowing:** Destructure `const { data: profile }` dari query profiles; nama `profile` sama dengan state `profile`. Membingungkan dan rawan salah baca. | Rename jadi `profileRow` atau `activeOrgProfile` (hanya active_organization_id), agar tidak menimpa makna state profile. |

### LOW

| # | File:Line | Penjelasan | Saran Perbaikan |
|---|-----------|------------|-----------------|
| 7 | `src/mobile/pages/home/Profile.tsx:114-155` | **Error branch sudah benar:** Error branch sudah dibungkus DesktopWarning dan tombol "Coba Lagi" memanggil `refetch()`. Tidak ada window.location.reload(). Tidak ada bug; dicatat agar konsisten dengan audit lain. | Tidak ada. |
| 8 | `src/mobile/pages/home/ProfileSkeleton.tsx:1` | **Import React:** `import React from 'react'` — dengan JSX transform tidak wajib. | Hapus jika project memakai automatic JSX runtime. |
| 9 | `src/mobile/components/ProfilePhotoUpload.tsx:1` | **Import React:** Sama; dan props `profile: ProfileData` required. Di Profile hanya dipanggil setelah `profile` ada (success branch). Aman. | Hapus import React jika tidak diperlukan. |
| 10 | `src/mobile/pages/home/Profile.tsx:286` | **organizations.length:** useOrganizationList bisa mengembalikan array kosong; `organizations.length` aman. Tidak ada null reference. | Opsional: tampilkan fallback jika organizations undefined (mis. "0") untuk defensive. |

---

## Error handling yang kurang / tidak ada

- **useProfile:** Error dari query `profiles` (selain no-row) tidak diset ke state error; user dapat fallback profil minimal tanpa tahu ada error. Perlu setError atau throw agar UI error + retry tampil.
- **useProfile:** Auth error sudah di-handle (cleanup + redirect). Employee error di-handle (throw / setError). Cukup.
- **Profile.tsx:** Error dan refetch sudah di-render; retry pakai refetch(). Cukup.

---

## API calls tanpa fallback / risiko gagal

- **useProfile:** `getUser` → error ditangkap, cleanup, throw. `profiles` (active_organization_id) → error tidak ditangkap (lihat bug #1). `employees` (maybeSingle) → error ditangkap, throw. Fallback ke auth user saat no org / no employee. Tambah penanganan error untuk query profiles.
- **ProfilePhotoUpload / useProfilePhoto:** Dipanggil dari Profile dengan profile valid; failure upload/delete biasanya di-handle di hook (toast). Cek useProfilePhoto untuk unhandled promise jika perlu.
- **useOrganizationList:** Dipakai untuk daftar organisasi; jika gagal, organizations bisa kosong. Profile tetap render; organisasi hanya tampil "Pilih Organisasi" atau loading. Dapat ditambah banner error organisasi (opsional).

---

## Performa & beban aplikasi

- **useProfile:** Satu sequential flow (getUser → profiles → employees); wajar. Cache tidak dipakai; setiap mount + realtime trigger refetch. Bisa pertimbangkan cache ringan (sessionStorage) dengan TTL singkat untuk mengurangi refetch bila user bolak-balik ke Profile.
- **Realtime channel:** Satu channel untuk tabel profiles; cleanup ada. Wajar.
- **Profile.tsx:** Banyak conditional render (profile.mobile_phone, profile.address, dll.); tidak ada loop tak terbatas. useOrganizationList dan useProfile dipanggil sekali. Wajar.

---

## Rekomendasi singkat

1. **High:** Tangani error query profiles di useProfile (setError/throw selain no-row); tambah cancelledRef di useProfile untuk hindari setState setelah unmount.
2. **Medium:** Pastikan realtime channel atau dokumentasi untuk tab background; clearTimeout untuk setTimeout di realtime callback; role dari data atau hapus; rename variabel profile (query) agar tidak shadowing.
3. **Low:** Hapus import React di ProfileSkeleton dan ProfilePhotoUpload jika memakai JSX transform; optional defensive untuk organizations.

Setelah perbaikan, halaman /profile punya error state yang jelas untuk kegagalan API, tidak ada setState setelah unmount, dan realtime/timeout aman terhadap unmount.
