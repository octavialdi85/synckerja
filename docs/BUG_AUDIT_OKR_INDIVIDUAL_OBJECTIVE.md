# Audit Bug: /okr/individual-objective

**Scope:** Halaman `/okr/individual-objective` dan seluruh file terkait (OKRPage, IndividualObjectivesView, IndividualObjectivesProgressCard, hooks useObjectives, useIndividualObjectives, useObjectiveStats, useOkrCycles, modal/dialog, dll.).

---

## Ringkasan: Refetch & Loading Smooth

- **Refetch berulang:** Ditemukan beberapa penyebab potensial loading tidak smooth: (1) Dua sumber realtime untuk tabel yang sama → double invalidation/refetch (lihat bug #2). (2) `useObjectives` tidak punya `staleTime`/`refetchOnMount: false` → refetch bisa sering (bug #3). (3) Dua fase loading (page menunggu stats, lalu view menunggu objectives/employees/departments) membuat kesan “loading dua kali” (bug #8).
- **Rekomendasi:** Satu sumber realtime untuk individual objectives di level view; tambah `staleTime` dan opsi refetch pada `useObjectives`; pertimbangkan satu fase loading atau skeleton agar terasa smooth.

---

## Daftar Bug & Temuan

### High Priority

| # | File:Line | Deskripsi | Prioritas | Saran perbaikan |
|---|-----------|-----------|-----------|------------------|
| 1 | **useObjectives.ts:284** | Untuk level `individual`, jika query Supabase error: `if (error) { console.error(...); throw error; }`. Tidak ada fallback; query masuk state error dan UI bisa kosong/error tanpa pesan ramah. | High | Tangani error di queryFn: return `[]` dan log, atau set error message di state/context agar UI bisa tampil empty state + pesan error. |
| 2 | **IndividualObjectivesView.tsx:117-136** dan **useObjectives.ts:56-71** | Dua subscription realtime untuk tabel `individual_objectives`: (1) di IndividualObjectivesView `supabase.channel('individual-objectives-changes').on(..., individual_objectives, ...)` + invalidate `['individual-objectives']`; (2) di useObjectives `individual_objectives_realtime` + invalidate `['individual-objectives']` dan query key level. Satu perubahan DB bisa memicu dua kali invalidation → refetch ganda → loading tidak smooth. | High | Hapus subscription di IndividualObjectivesView (rely on useObjectives realtime saja), atau hapus dari useObjectives untuk level individual dan hanya pakai yang di View; pastikan hanya satu yang invalidate. |
| 3 | **useObjectives.ts:113-384** | `useQuery` untuk objectives tidak punya `staleTime` atau `refetchOnMount: false`. Default React Query akan refetch on mount/window focus, sehingga setiap buka tab/focus bisa refetch → loading berulang. | High | Tambah `staleTime: 5 * 60 * 1000` (atau setara) dan `refetchOnMount: false` (atau true dengan staleTime cukup besar) agar refetch tidak terlalu sering dan halaman terasa smooth. |
| 4 | **useIndividualObjectives.ts:376** | Di `useDeleteIndividualObjective` mutationFn, blok `catch` memanggil `throw error` setelah `console.error`. Jika `error` bukan instance Error (mis. object dari Supabase), re-throw bisa mengubah bentuk error. Selain itu, seluruh blok delete (beberapa await) tidak pakai try/finally untuk loading state di UI; mutation isPending akan false setelah selesai, tapi jika throw di tengah, onError jalan—konsisten. Yang riskan: tidak ada fallback bila salah satu delete child (checkins/activities) gagal tapi kita lanjut; bisa data inconsistent. | High | Pastikan catch hanya re-throw setelah log; pertimbangkan rollback atau pesan jelas ke user bila delete partial. Untuk loading state, mutation already handles; fokus ke konsistensi data dan error handling. |
| 5 | **useOkrCycles.ts:30** | `if (error) throw error;` — tidak ada fallback. Bila fetch cycles gagal (network/DB), seluruh halaman bergantung pada cycles (activeCycleId, filteredCycleIds) jadi bisa error/blank. | High | Return `[]` on error dan log, atau set error state agar OKRPage bisa tampil pesan/retry tanpa crash. |

---

### Medium Priority

| # | File:Line | Deskripsi | Prioritas | Saran perbaikan |
|---|-----------|-----------|-----------|------------------|
| 6 | **IndividualObjectivesView.tsx:118-136** | Realtime cleanup: `channels.forEach(channel => supabase.removeChannel(channel))`. `channels` diisi dengan satu elemen hasil `.subscribe()`. Di Supabase Realtime, `channel.subscribe()` mengembalikan channel; pastikan tipe yang di-remove benar. Jika yang disimpan bukan channel object, cleanup bisa tidak efektif (channel tetap hidup setelah unmount) → memory leak / duplicate events. | Medium | Simpan reference ke channel (bukan hanya return value subscribe jika berbeda), dan panggil `supabase.removeChannel(channel)` di cleanup. Cek dokumentasi Supabase untuk API yang benar. |
| 7 | **IndividualObjectivesView.tsx:286-294** | `getSyncedProgress`: untuk metric `number`, `targetValue` bisa 0: `const targetValue = keyResult.target_value \|\| 1;` mencegah division by zero, tapi jika `target_value` sengaja 0 di DB, progress akan dihitung dengan 1 → logic salah. | Medium | Cek `target_value > 0` sebelum bagi; jika 0, return 0 atau nilai aman lain, dan jangan pakai fallback 1 untuk denominator. |
| 8 | **OKRPage.tsx:86-92** dan **IndividualObjectivesView.tsx:286-291** | Dua fase loading: (1) OKRPage menunggu `individualReady` (org + cycles + individualStats) baru render konten; (2) IndividualObjectivesView punya loading sendiri (`loadingEmployees \|\| loadingObjectives \|\| loadingDepartments`). User melihat loading “Objectives...” di page, lalu setelah konten tampil bisa lagi loading “Loading objectives...” di view → tidak smooth. | Medium | Satu fase loading: tampilkan skeleton/placeholder di area konten sambil data view load, atau gabung kriteria “ready” (mis. hanya tampilkan view ketika objectives/employees/departments sudah siap) agar tidak dua kali spinner. |
| 9 | **IndividualObjectivesProgressCard.tsx:186** | `ModalAddIndividualContribution` menerima `cycleId={cycleId}`; `cycleId` optional (`cycleId?: string`). Bisa undefined. Jika modal membutuhkan cycleId untuk create, form bisa submit dengan cycle kosong atau error. | Medium | Pastikan parent (OKRPage) selalu pass `activeCycleId` yang valid saat di individual tab, atau di modal validasi: jika `!cycleId` tampilkan pesan/disable submit. |
| 10 | **HeaderAndTab.tsx:37-42** | `handleTabClick(tab)`: panggil `navigate(tab.route)` lalu `onTabChange(tab.id)`. Urutan benar, tapi jika `tab.route` kosong/undefined, navigate bisa ke path tidak valid. Semua tab di array punya `route`; tetap aman untuk validasi route sebelum navigate. | Low | Opsional: if (!tab.route) return; sebelum navigate. |
| 11 | **DeleteIndividualObjectiveDialog.tsx:47** | `AlertDialog open={isOpen} onOpenChange={onClose}`. `onOpenChange` di Radix menerima `(open: boolean)`. Parent pass `onClose` yang tidak menerima argumen. Saat dialog ditutup (open=false), `onClose()` dipanggil—benar. Tapi saat user menekan Cancel, `onOpenChange(false)` dipanggil lalu `onClose()`—dua kali set state bisa. Secara perilaku umumnya aman. | Low | Tidak wajib; jika ingin konsisten dengan signature: onOpenChange={(open) => { if (!open) onClose(); }}. |
| 12 | **useIndividualObjectives.ts:154-165** | Promise.race dengan timeout: jika timeout menang, `result` dari queryPromise tidak pernah dipakai dan `data`/`error` bisa undefined; kode pakai `return []` di catch. Tapi `const result = await Promise.race(...) as any` — jika timeout reject, kita masuk catch dan return []. Jika query menang tapi return shape aneh, `data = result.data` bisa undefined. Sudah ada `return data \|\| []`. | Low | Sudah aman; optional: pastikan result.data selalu array-like sebelum return. |
| 13 | **IndividualObjectivesView.tsx:403** | `handleAddContribution(employee.department_id)` — `employee.department_id` bisa undefined. Diteruskan ke `setSelectedDepartmentId(departmentId)` dan ke modal. Perlu cek apakah modal handle departmentId kosong. | Medium | Guard: handleAddContribution(departmentId: string) hanya dipanggil jika employee.department_id ada; atau modal tampilkan pesan “Select department” bila kosong. |
| 14 | **CreateIndividualObjectiveModal.tsx:111** | `await createIndividualObjective.mutateAsync(objectiveData)` — jika mutation throw, toast sukses di baris 114-117 tetap tidak jalan (kode setelah await). Tapi tidak ada try/catch di handleSubmit; jika mutateAsync reject, error bisa unhandled dan toast Error dari mutation onError akan tampil. Ada toast Success setelah await yang hanya jalan kalau sukses. | Low | Tambah try/catch di handleSubmit; pada catch jangan panggil toast Success dan pastikan onError toast sudah cukup atau tampilkan pesan spesifik. |

---

### Low Priority / Code Smell

| # | File:Line | Deskripsi | Prioritas | Saran perbaikan |
|---|-----------|-----------|-----------|------------------|
| 15 | **IndividualObjectivesView.tsx:87-109** | `debugInfo` useMemo dan useEffect yang di-comment untuk console.log — sisa code mati. | Low | Hapus useMemo debugInfo dan useEffect jika tidak dipakai, untuk kurangi noise. |
| 16 | **IndividualObjectivesView.tsx:319-324** | Dropdown “Create Activity” / “Add Milestone” tidak memanggil handler (hanya icon); `handleCreateActivity` ada tapi tidak di-onClick. | Low | Wire menu item “Create Activity” ke `handleCreateActivity` dengan objective/employee context yang benar. |
| 17 | **useObjectiveStats.ts** | Untuk type `individual`, ada dua request: satu untuk objectives, satu untuk key_results. Jika key_results gagal, fallback ke progress_percentage objective—sudah baik. Tidak ada timeout; query bisa lama. | Low | Opsional: tambah timeout atau batasan jumlah objectiveIds untuk key_results request. |
| 18 | **OKRPage.tsx:36** | `const [activeTab, setActiveTab] = useState(getActiveTab());` — getActiveTab dipanggil setiap render (di body) untuk useEffect; tidak dimemo. Tidak bug, hanya getActiveTab() bergantung hanya location.pathname; effect dependency [location.pathname] sudah cukup. | Low | Opsi: useMemo(getActiveTab, [location.pathname]) atau tetap fungsi. |
| 19 | **DeleteIndividualObjectiveDialog.tsx:31,35,39** | `console.log` / `console.error` di production. | Low | Ganti ke logger atau hapus untuk production. |

---

## Checklist prioritas perbaikan

- [ ] **High:** useObjectives error fallback untuk level individual (#1)
- [ ] **High:** Satu sumber realtime individual_objectives, hilangkan duplikat (#2)
- [ ] **High:** useObjectives tambah staleTime / refetchOnMount (#3)
- [ ] **High:** useIndividualObjectives delete error handling / consistency (#4)
- [ ] **High:** useOkrCycles fallback on error (#5)
- [ ] **Medium:** IndividualObjectivesView realtime cleanup channel ref (#6)
- [ ] **Medium:** getSyncedProgress target_value 0 (#7)
- [ ] **Medium:** Satu fase loading / skeleton (#8)
- [ ] **Medium:** IndividualObjectivesProgressCard / Modal cycleId undefined (#9)
- [ ] **Medium:** department_id undefined di Add Contribution (#13)

---

## Tidak diubah (sudah aman)

- useObjectiveStats: error return default object; individual type punya fallback dari key_results ke progress_percentage.
- OKRPage: pageReady mencegah flash konten kosong; layout satu untuk loading dan loaded.
- useDepartmentObjectives: staleTime dan refetchOnMount: false sudah ada; bisa jadi referensi untuk useObjectives.
