# Audit Bug – Halaman /employees/reprimand

## 1. Null/undefined reference (runtime crash)

| File:Line | Bug | Prioritas | Perbaikan |
|-----------|-----|-----------|-----------|
| `ReprimandManagementPage.tsx:63-64` | Saat filter search dipakai dan reprimand mengacu ke karyawan yang sudah tidak ada di daftar (mis. resign), `employees.find()` mengembalikan `undefined`. Ekspresi `employee?.full_name.toLowerCase()` tetap aman hanya untuk `employee`; jika `employee` ada tapi `full_name` null/undefined, atau jika ada typo dan yang dipanggil `.toLowerCase()` bukan dari optional chain, bisa throw. Di kode saat ini: `!employee?.full_name.toLowerCase()` — jika `employee` undefined maka `employee?.full_name` undefined, lalu `undefined.toLowerCase()` **throw**. | **High** | Gunakan: `!(employee?.full_name ?? '').toLowerCase().includes(searchLower)` (dan tetap cek violation_description). |

---

## 2. Potensi undefined array (runtime crash)

| File:Line | Bug | Prioritas | Perbaikan |
|-----------|-----|-----------|-----------|
| `ReprimandManagementTable.tsx:62-68` | `employeesByDepartment[departmentName]` bisa `undefined` (mis. filter department tidak konsisten dengan data). Nilai itu diteruskan ke `ReprimandDepartmentCard` sebagai `employees`; di dalam card ada `employees.map(...)`. Memanggil `.map` pada `undefined` menyebabkan **TypeError**. | **High** | Beri fallback: `employees={departmentEmployees ?? []}`. |

---

## 3. Invalid date / optional field

| File:Line | Bug | Prioritas | Perbaikan |
|-----------|-----|-----------|-----------|
| `ReprimandViewDropdown.tsx:67-74, 247, 294` | `formatDate(dateString)` dipanggil dengan `reprimand.incident_date`. Jika `incident_date` null/undefined, `new Date(undefined)` menghasilkan Invalid Date; `toLocaleDateString` bisa mengembalikan string aneh (mis. "Invalid Date") dan mengacaukan UI. | **Medium** | Di `formatDate` guard: `if (!dateString) return '—';` dan gunakan `new Date(dateString)` hanya jika valid, atau tampilkan fallback untuk Invalid Date. |
| `ReprimandManagementOverview.tsx:80-94, 15-18` | `formatDate(dateString)` dan penggunaan `r.created_at` tanpa pengecekan. Jika `created_at` null/undefined, `new Date(undefined)` sama seperti di atas. | **Medium** | Guard null/undefined dan Invalid Date di `formatDate`; untuk `thisMonth` filter pastikan `r.created_at` ada sebelum `new Date(r.created_at)`. |

---

## 4. Error handling & fallback UI

| File:Line | Bug | Prioritas | Perbaikan |
|-----------|-----|-----------|-----------|
| `ReprimandManagementPage.tsx:29-31` | `useReprimands()` dan `useEmployees()` mengembalikan `error`, tetapi di halaman **tidak dipakai**. Jika fetch reprimands/employees gagal, pengguna hanya melihat loading lalu daftar kosong tanpa pesan error. | **Medium** | Tampilkan state error: jika `error` dari salah satu hook, render pesan (dan optional retry), jangan hanya daftar kosong. |
| `hooks/useEmployees.ts:50-54` | Pada error fetch employees, hanya `throw error` dan `console.error`. React Query menandai query sebagai error; tanpa UI error di page, pengguna tidak tahu bahwa data gagal dimuat. | **Medium** | Sudah ter-cover oleh saran di atas (tampilkan error di page). |
| `hooks/useReprimands.ts:68-92` | Sama: `error` dari `useQuery` tidak ditampilkan di UI. | **Medium** | Sama: tampilkan error di ReprimandManagementPage. |

---

## 5. API & logic

| File:Line | Bug | Prioritas | Perbaikan |
|-----------|-----|-----------|-----------|
| `hooks/useReprimands.ts:104-107, 252-255` | `getUser()` dipanggil **dua kali** di satu request create: untuk `created_by` dan `issued_by`. Tidak perlu dan menambah latency; juga jika session berubah di antara dua panggilan, nilai bisa tidak konsisten. | **Low** | Panggil sekali: `const { data: { user } } = await supabase.auth.getUser();` lalu pakai `user?.id` untuk `created_by` dan `issued_by`. |
| `AddReprimandDialog.tsx:72-88` | Pada `!user?.id` hanya `console.error` dan `return`. User tidak dapat feedback bahwa "session tidak valid" atau "harap login lagi". | **Low** | Tampilkan toast error (mis. "Session tidak valid, silakan login kembali") sebelum return. |
| `AddReprimandDialog.tsx:86` | `catch` hanya `console.error`; mutation `onError` memang menampilkan toast, tapi pesan di catch bisa membantu logging. Tidak critical. | **Low** | Opsional: tetap log, pastikan toast dari mutation sudah cukup untuk user. |

---

## 6. Code smell & maintainability

| File:Line | Bug | Prioritas | Perbaikan |
|-----------|-----|-----------|-----------|
| `ReprimandManagementPage.tsx:151` | `departments` dari `Set` tidak di-sort. Urutan filter "Department" bisa berubah-ubah (tergantung urutan data). | **Low** | Sort: `[...new Set(...)].sort()`. |
| Duplikasi type `ReprimandData` | `ReprimandData` (atau interface serupa) didefinisikan ulang di beberapa file: `useReprimands.ts`, `ReprimandViewDropdown.tsx`, `ReprimandDepartmentCard.tsx`, `ReprimandManagementTable.tsx`. Perubahan salah satu bisa tidak konsisten. | **Low** | Ekspor satu definisi (mis. dari `useReprimands` atau `types.ts`) dan impor di komponen lain. |
| `ReprimandManagementOverview.tsx:6` | Props `reprimands: any[]`, `employees: any[]` memakai `any` sehingga kehilangan type safety. | **Low** | Ganti ke tipe yang diimpor (mis. `ReprimandData[]`, tipe employee dari hook). |

---

## 7. Unhandled promise / async

| File:Line | Bug | Prioritas | Perbaikan |
|-----------|-----|-----------|-----------|
| `AddReprimandDialog.tsx:83` | `createReprimand.mutateAsync(reprimandData)` di dalam try/catch; error sudah ditangkap. Tidak ada unhandled rejection selama catch ada. | - | Cukup aman. |
| `hooks/useReprimands.ts` | Semua mutation punya `onError` dan melempar di `mutationFn`; React Query menangani rejection. | - | Cukup aman. |

---

## 8. Potensi logic / data

| File:Line | Bug | Prioritas | Perbaikan |
|-----------|-----|-----------|-----------|
| `ReprimandManagementPage.tsx:119-124` | `reprimandCounts` dihitung dari **semua** reprimands (termasuk yang employee_id-nya tidak ada di daftar karyawan aktif). Jadi angka "X violations" per karyawan hanya untuk karyawan yang ada di daftar; reprimands untuk karyawan resign tetap masuk hitungan kalau ada referensi lain. Untuk tampilan per karyawan aktif, ini sudah benar. | **Low** | Opsional: jika ingin konsisten dengan daftar karyawan, bisa filter reprimands by `employees` yang aktif dulu sebelum reduce. |
| Filter type/status casing | Filter "Status" dan "Type" memakai nilai dari data (e.g. `r.status`, `r.reprimand_type`). Jika backend mengembalikan nilai dengan kapitalisasi berbeda, filter bisa tidak match. | **Low** | Normalisasi ke lowercase saat membandingkan, atau pastikan backend konsisten. |

---

## Ringkasan prioritas

- **High (2):** ReprimandManagementPage search filter null ref; ReprimandManagementTable undefined employees array.
- **Medium (4):** Invalid date di ReprimandViewDropdown & Overview; tidak ada tampilan error untuk useReprimands/useEmployees.
- **Low (6):** Double getAuth; feedback saat !user?.id; sort departments; duplikasi type; any[]; logic reprimandCounts/filter.

---

## Rekomendasi perbaikan pertama

1. **ReprimandManagementPage.tsx** – Perbaikan search filter agar aman saat `employee` undefined dan `full_name` null/undefined.
2. **ReprimandManagementTable.tsx** – Pastikan `employees` ke `ReprimandDepartmentCard` selalu array: `employees={departmentEmployees ?? []}`.
3. **ReprimandManagementPage.tsx** – Gunakan `error` dari `useReprimands()` dan `useEmployees()` untuk menampilkan state error dan (opsional) tombol retry.
4. **ReprimandViewDropdown.tsx** & **ReprimandManagementOverview.tsx** – Guard null/undefined dan Invalid Date di `formatDate` serta pada akses `created_at`/`incident_date`.
