# Audit Bug – Halaman Home "/" (Re-audit)

Ringkasan audit untuk route `/` (ProtectedRoute → HomeAccessGuard → HomeRouteElement → **ModernHomePage** desktop atau **MobileHome** = `Absensi.tsx` mobile). Format: **file:line | penjelasan | prioritas | saran**.

---

## Status perbaikan audit sebelumnya

| Item audit sebelumnya | Status |
|----------------------|--------|
| usePrefetchHomeData invalid hook call | **Sudah diperbaiki** – `useQueryClient()` dipanggil di top-level hook. |
| Task query kolom `status` tidak ada | **Sudah diperbaiki** – Satu query count saja, return `{ total, completed: 0, pending: total }`. |
| Profile/role error tidak dicek | **Sudah diperbaiki** – `throw profileResult.error` / `throw roleResult.error`. |
| Delete status catch kosong | **Sudah diperbaiki** – Toast error + `refetch()` di catch. |
| Console → logger (useParallelHomeData, HomeAccessGuard, SectionActivityNotifikasi) | **Sudah diperbaiki** – Pakai `logger`. |
| SectionProfile setTimeout refetch | **Sudah diperbaiki** – Refetch langsung tanpa delay. |

---

## Temuan baru / sisa (re-audit)

### High

*(Tidak ada temuan High baru setelah perbaikan.)*

### Medium

| Lokasi | Penjelasan | Saran |
|--------|------------|--------|
| `src/hooks/useParallelHomeData.ts` (whole module) | **Dead code di halaman home:** `useParallelHomeData` dan `usePrefetchHomeData` **tidak dipanggil** oleh ModernHomePage maupun MobileHome (Absensi). Data home di-load oleh masing-masing section (useCurrentEmployee, useUserData, useEmployeeAssignments, dll.), bukan oleh parallel loader. | Pilih salah satu: (1) Integrasikan: panggil `useParallelHomeData()` di ModernHomePage (atau layout) dan oper data ke section yang membutuhkan, atau (2) Gunakan hanya untuk prefetch: panggil `usePrefetchHomeData()` dari link/navigasi ke "/" agar cache terisi sebelum render. Kalau tidak dipakai, pertimbangkan hapus atau dokumentasi "optional prefetch". |
| `src/mobile/pages/home/Absensi.tsx:76-97` | **Unhandled rejection & type smell:** `getCurrentUser` di `useEffect` tidak punya try/catch. Jika `supabase.auth.getUser()` atau query `profiles` gagal, promise rejection tidak tertangkap dan `currentUser`/`organizationId` bisa tetap null tanpa feedback. Juga `(supabase as any)` untuk query profiles. | Bungkus isi `getCurrentUser` dengan try/catch; pada error panggil logger dan optional toast. Ganti `(supabase as any)` dengan import tiped client atau type assertion yang aman. |

### Low

| Lokasi | Penjelasan | Saran |
|--------|------------|--------|
| `src/features/1_home/components/HomeOKRDashboard/component/SectionQuickMenu.tsx:65-69` | **Catch tidak pernah terpicu:** `navigate()` dari react-router tidak throw; catch hanya terpicu jika ada throw sebelum/sesudah. Error dari "gagal buka halaman" (mis. router error) tidak akan masuk ke sini. | Jika tujuannya menangkap error navigasi, router tidak melempar; bisa hapus catch atau gunakan untuk error lain (mis. jika nanti ada async sebelum navigate). |
| **Dua sumber organizationId:** `useCurrentOrg` dari `@/features/1-login/hooks/useCurrentOrg` (guard, auth flow) vs `useCurrentOrg` dari `features/1_home/HomeOKRDashboard/hooks/useCurrentOrg` (OKR dashboard). | Bisa menyebabkan inkonsistensi jika cache/state tidak sinkron. | Pertimbangkan satu sumber kebenaran (mis. context dari login) dan pakai di home/OKR; atau dokumentasikan mengapa dua hook terpisah. |
| **Banyak `console.log` / `console.error` / `console.warn` di pohon Home (1_home):** useObjectiveStats, SectionGreetingsImport/useUserData, useDepartmentObjectives, useIndividualObjectives, AttendanceStatusProvider, SimpleAttendanceCamera, globalDepartmentObjectivesCache, CreateIndividualObjectiveModal, ObjectiveCheckinForm, ActivitiesTab, officeLocationUtils, useCurrentUserRole, useKeyResultApprovals, useLeaveRequest, useSimpleAttendance, useTrainingParticipants, useLocationServices, useTrainingPrograms. | Konsistensi logging dan kebisingan di production. | Ganti bertahap dengan `logger` dari `@/config/logger` (error/warn/debug) dan guard dengan env jika hanya ingin di dev. |
| `src/features/1_home/components/HomeOKRDashboard/hooks/useObjectiveStats.ts:48-49, 84, 171` | **Console di hook home:** `console.error` saat fetch objectives/key results error. | Ganti dengan `logger.error` agar selaras dengan useParallelHomeData dan HomeAccessGuard. |

---

## Sudah dicek (bukan bug / aman)

- **SectionActivityNotifikasi – `summary`:** `useEmployeeAssignments` return `data: query.data ?? createEmptySummary()`, jadi `summary.assignments` / `summary.activeAssignments` selalu ada (array minimal).
- **SectionMotifation – carousel:** Interval hanya jalan jika `totalItems > 1`; tidak ada `% 0` → NaN.
- **HomeOKRDashboard – getActiveCycleId:** Return `undefined` bila `cycles.length === 0`; tidak memicu query dengan UUID invalid.
- **SectionMotifation – isOwner:** Dipanggil dengan `await` di dalam handler async (onClick), bukan di render; aman.
- **SectionProfile – employeeData:** Akses pakai optional chaining (`employeeData?.id`, dll.); aman saat loading/error.
- **HomeAccessGuard:** Alur subscription/expiry dan redirect sudah pakai logger; tidak ada console tersisa di file ini.

---

## Rekomendasi singkat (setelah re-audit)

1. **Medium:** Putuskan apakah `useParallelHomeData` / `usePrefetchHomeData` akan dipakai di home; jika ya, integrasikan atau pakai untuk prefetch; jika tidak, dokumentasikan atau hapus.
2. **Medium:** Tambah try/catch di `getCurrentUser` (Absensi.tsx) dan hilangkan `(supabase as any)`.
3. **Low:** Satu sumber organizationId untuk home/OKR jika memungkinkan; ganti sisa `console.*` di 1_home dengan logger (prioritas: useObjectiveStats, useUserData SectionGreetings, lalu file lain bertahap).
