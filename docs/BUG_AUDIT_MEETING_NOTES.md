# Bug Audit: Halaman /meeting-notes (Meeting Notes)

Audit menyeluruh untuk fitur meeting notes (desktop: `src/features/8-1-meeting-notes/`, route: `/tools/meeting-notes`).

---

## High Priority

### 1. `getIssueCount` selalu mengembalikan 0 (logic error)
- **File:Line:** `src/features/8-1-meeting-notes/MeetingNotesContext.tsx:430-432`
- **Penjelasan:** `getIssueCount(meetingPointId)` mengembalikan `issues.filter(...).length`, tetapi state `issues` tidak pernah di-set di context (hanya `useState<MeetingPointIssue[]>([])`). Semua data issue di-fetch on-demand lewat `getIssueHistory`. Jadi pemanggil `getIssueCount` akan selalu dapat 0.
- **Prioritas:** High (API context salah; jika ada UI yang bergantung pada ini, tampilan salah).
- **Saran:** Hapus `getIssueCount` dari context dan gunakan hasil `getIssueHistory` (seperti di `MeetingPointsTable` yang sudah benar dengan `issueCounts`), atau maintain cache issues per meeting point dan isi saat fetch (lebih berat). Pilihan paling aman: hapus dari context dan pastikan tidak ada yang memanggil; table sudah pakai `getIssueHistory` + local state.

### 2. Null/undefined reference di Recent Updates — runtime error
- **File:Line:** `src/features/8-1-meeting-notes/section/MeetingSummaryCards.tsx:118`, `121`
- **Penjelasan:**  
  - Baris 118: `update.meeting_points?.discussion_point` — response API `fetchRecentUpdates` memakai `.select('*, meeting_point_solutions(solution_description, meeting_point_id)')`, jadi yang ada adalah `meeting_point_solutions`, bukan `meeting_points`. Property `meeting_points` undefined, tampil "undefined...".  
  - Baris 121: `update.update_details.substring(0, 80)` — jika `update_details` null/undefined, akan throw.
- **Prioritas:** High (salah data + potensi crash).
- **Saran:**  
  - Untuk judul: pakai `update.meeting_point_solutions?.solution_description?.substring(0, 30)` (atau tampilkan "Update" jika tidak ada), dan sesuaikan tipe/select jika perlu.  
  - Untuk body: gunakan `(update.update_details ?? '').substring(0, 80)` atau cek null sebelum substring.

### 3. Set state setelah unmount (memory leak / warning)
- **File:Line:** `src/features/8-1-meeting-notes/MeetingNotesContext.tsx:471-478`, `518`, `533`
- **Penjelasan:**  
  - `loadData()` di useEffect dipanggil async; saat selesai memanggil `setMeetingPoints`, `setRecentUpdates`, `setIsLoading` tanpa cek apakah komponen masih mounted. Navigasi cepat bisa memicu setState setelah unmount.  
  - Callback real-time (line 518, 533) memanggil `fetchMeetingPoints()` / `fetchRecentUpdates()` tanpa guard; sama-sama bisa set state setelah unmount.
- **Prioritas:** High (React warning, potensi leak).
- **Saran:** Gunakan `isActiveRef` (useRef) di provider: set `true` di awal effect, `false` di cleanup. Di `fetchMeetingPoints`, `fetchRecentUpdates`, dan di akhir `loadData` (setIsLoading), cek `if (!isActiveRef.current) return` sebelum setiap setState. Di callback real-time, juga cek ref sebelum memanggil fetch.

### 4. `updateMeetingPoint` / `deleteMeetingPoint` tanpa cek `organizationId`
- **File:Line:** `src/features/8-1-meeting-notes/MeetingNotesContext.tsx:252-275`, `278-301`
- **Penjelasan:** `addMeetingPoint` ada guard `if (!organizationId) return`, tetapi `updateMeetingPoint` dan `deleteMeetingPoint` langsung memanggil Supabase. Jika `organizationId` belum tersedia (mis. saat ganti org), bisa terjadi update/delete di konteks yang salah atau error.
- **Prioritas:** High (konsistensi & keamanan data).
- **Saran:** Tambah di awal: `if (!organizationId) return;` (dan optional: toast "Organization not loaded").

---

## Medium Priority

### 5. Filter "Time" tidak mempengaruhi daftar (logic error)
- **File:Line:** `src/features/8-1-meeting-notes/MeetingFilters.tsx:44-45`, `113-139`; `MeetingNotesPage.tsx:17-28`
- **Penjelasan:** `timeFilter` diset di state filters dan ditampilkan di dropdown ("Today", "This Week", "This Month", dll.), tetapi di `MeetingNotesPage` (dan `MeetingPointsTable`) filtering hanya memakai `search`, `status`, `requestBy`. `filters.timeFilter` tidak pernah dipakai, jadi filter waktu tidak berpengaruh.
- **Prioritas:** Medium (fitur setengah jalan).
- **Saran:** Di logic filter (mis. di `MeetingNotesPage` atau table), tambahkan filter berdasarkan `filters.timeFilter` terhadap `point.meeting_date` (Today = hari ini, This Week = minggu ini, This Month = bulan ini, Last Month = bulan lalu), atau hapus dropdown time filter jika tidak dipakai.

### 6. Tanggal hardcoded di header filter
- **File:Line:** `src/features/8-1-meeting-notes/section/MeetingFilters.tsx:49`
- **Penjelasan:** Teks "July 6, 2025" hardcoded; tidak mengikuti tanggal hari ini atau meeting date.
- **Prioritas:** Medium (UX menyesatkan).
- **Saran:** Ganti dengan `new Date().toLocaleDateString(...)` atau hapus jika tidak diperlukan.

### 7. `fetchRecentUpdates` error tanpa feedback ke user
- **File:Line:** `src/features/8-1-meeting-notes/MeetingNotesContext.tsx:196-199`
- **Penjelasan:** Pada error hanya `console.error`; tidak ada toast. User tidak tahu jika "Recent Updates" gagal load.
- **Prioritas:** Medium (error handling).
- **Saran:** Di blok catch, tampilkan toast error (mis. "Failed to load recent updates") sama seperti `fetchMeetingPoints`.

### 8. `MeetingPointsTable` — load issue counts tanpa unmount guard
- **File:Line:** `src/features/8-1-meeting-notes/section/MeetingPointsTable.tsx:40-53`
- **Penjelasan:** `loadIssueCounts` async; saat selesai memanggil `setIssueCounts` tanpa cek mounted. Jika user buka-tutup cepat atau ganti halaman, bisa setState setelah unmount. Juga dependency `getIssueHistory` bisa berubah tiap render (context value) dan memicu effect berulang.
- **Prioritas:** Medium (warning + kemungkinan banyak request).
- **Saran:** Gunakan flag `isMounted` di effect (true di awal, false di cleanup); sebelum `setIssueCounts(counts)` cek `if (!isMounted) return`. Stabilkan dependency: jangan masukkan `getIssueHistory` ke deps jika tidak perlu, atau wrap di context dengan useCallback.

### 9. Potensi null pada `point.discussion_point`
- **File:Line:** `src/features/8-1-meeting-notes/section/MeetingPointsTable.tsx:176`, `178`, `194`, `206`
- **Penjelasan:** `point.discussion_point` dipakai langsung (`.length`, ditampilkan). Di DB/interface bisa null; di context insert pakai `data.discussion_point || ''` sehingga biasanya string, tapi defensif lebih aman.
- **Prioritas:** Medium (defensive).
- **Saran:** Tampilkan dengan `(point.discussion_point ?? '').length` dan `(point.discussion_point ?? '')` untuk teks; atau pastikan tipe/DB selalu string.

### 10. IssuesDialog / UpdateHistoryDialog — catch kosong, tidak ada toast
- **File:Line:**  
  - `src/features/8-1-meeting-notes/modal/IssuesDialog.tsx:104-106`, `119-121`, `139-141`, dll.  
  - `src/features/8-1-meeting-notes/modal/UpdateHistoryDialog.tsx:101-103`, `132-133`, `169-171`, dll.
- **Penjelasan:** Banyak blok `catch { // Load failed }` atau `catch { // Add issue failed }` tanpa toast. Context sudah menampilkan toast untuk beberapa error, tapi tidak semua (mis. load data di modal). User bisa bingung saat operasi gagal tanpa pesan.
- **Prioritas:** Medium (UX).
- **Saran:** Di catch yang hanya komentar, panggil toast error (atau gunakan toast dari context/useToast) dengan pesan singkat (mis. "Failed to load issues", "Failed to add issue").

### 11. UpdateHistoryDialog — `loadIssues` memakai `selectedIssueId` (stale closure)
- **File:Line:** `src/features/8-1-meeting-notes/modal/UpdateHistoryDialog.tsx:91-104`
- **Penjelasan:** Di `loadIssues`, ada `if (issuesData.length > 0 && !selectedIssueId) setSelectedIssueId(issuesData[0].id)`. `selectedIssueId` dari closure; untuk panggilan pertama biasanya ''. Tapi effect memanggil `loadIssues` tanpa `selectedIssueId` di dependency (eslint-disable). Secara perilaku bisa ok, tapi rawan stale.
- **Prioritas:** Medium (code smell).
- **Saran:** Tidak perlu set selectedIssueId di dalam loadIssues; set di effect setelah loadIssues selesai (mis. dengan callback atau state dari loadIssues), atau tambah selectedIssueId ke deps jika memang ingin re-run saat berubah.

### 12. AddSolutionAsDailyTaskModal — console.error
- **File:Line:** `src/features/8-1-meeting-notes/modal/AddSolutionAsDailyTaskModal.tsx:172`
- **Penjelasan:** `console.error('Error fetching meeting point:', error);` — konsisten dengan project pakai logger.
- **Prioritas:** Medium (code smell).
- **Saran:** Ganti dengan `logger.error(...)` (import dari `@/config/logger`).

---

## Low Priority (Code smell / defensive)

### 13. Banyak `console.error` di MeetingNotesContext
- **File:Line:** `MeetingNotesContext.tsx`: 154, 198, 243, 268, 294, 312, 347, 395, 417, 447, 366, 424, 437, 455, 468, 486, 503, 519, 534, 550, 565, 581, 596, 612, 627, 643, 658, 674, 689, 705, 720, 735, 751, 767, 783
- **Penjelasan:** Logging pakai `console.error`; project lain pakai `logger` (`@/config/logger`).
- **Prioritas:** Low
- **Saran:** Ganti ke `logger.error` atau `logger.warn` sesuai konteks (mis. parsing = warn, gagal mutasi = error).

### 14. Type assertion `(update as any)` di getUpdateCount
- **File:Line:** `src/features/8-1-meeting-notes/MeetingNotesContext.tsx:352-358`
- **Penjelasan:** `(update as any).meeting_point_solutions` dipakai untuk cek `meeting_point_id`. Response Supabase join memang punya shape tersebut, tapi pakai any menghilangkan type safety.
- **Prioritas:** Low
- **Saran:** Perpanjang interface `MeetingPointUpdate` dengan `meeting_point_solutions?: { meeting_point_id: string }` (atau sesuai response) dan hapus `as any`.

### 15. MeetingNotesPage — scroll consistency
- **File:Line:** `src/features/8-1-meeting-notes/MeetingNotesPage.tsx:41-75`
- **Penjelasan:** User rule menyebut class `seamless-scroll` dan `max-h-[calc(100vh-120px)]` untuk scroll yang konsisten (contoh: EmployeeManagementMain). Di sini dipakai `min-h-0 overflow-hidden` dan `overflow-y-auto seamless-scroll` di sidebar; area table pakai `overflow-x-auto overflow-y-auto seamless-scroll`. Tidak ada `max-h-[calc(100vh-120px)]` eksplisit di container utama.
- **Prioritas:** Low
- **Saran:** Verifikasi perilaku scroll di berbagai resolusi; jika perlu, terapkan pola yang sama dengan halaman lain (seamless-scroll + max-h calc) untuk konsistensi.

### 16. Unique key di MeetingFilters — `name` bisa duplicate
- **File:Line:** `src/features/8-1-meeting-notes/section/MeetingFilters.tsx:103-106`
- **Penjelasan:** `uniqueRequestBy.map((name) => (... key={name} ...))` — jika dua meeting point punya `request_by` sama, key tetap unik (nama). Tapi jika nama null/undefined sudah difilter dengan `.filter(Boolean)`, aman. Hanya perlu pastikan key unik; kalau suatu saat request_by diganti ke ID, key harus ID.
- **Prioritas:** Low
- **Saran:** Cukup pastikan key unik (nama saat ini ok); jika nanti pakai ID, ganti ke ID.

### 17. DeleteMeetingPointDialog — tidak tangkap error dari onDeleteSuccess
- **File:Line:** `src/features/8-1-meeting-notes/modal/DeleteMeetingPointDialog.tsx:34-42`
- **Penjelasan:** `await onDeleteSuccess(meetingPoint.id)` di try; jika throw, finally tetap set isDeleting false (bagus), tapi error tidak ditangkap. Context sudah toast error, jadi error akan bubble; modal tidak tutup. Perilaku bisa diterima.
- **Prioritas:** Low
- **Saran:** Opsional: catch dan tutup modal onClose() setelah toast, atau biarkan seperti sekarang jika UX diinginkan (modal tetap terbuka sampai user tutup manual).

---

## Ringkasan

| Prioritas | Jumlah |
|-----------|--------|
| High      | 4      |
| Medium    | 8      |
| Low       | 5      |

**Rekomendasi urutan perbaikan:** 1 → 2 → 3 → 4 (High), lalu 5, 7, 8, 9, 10 (Medium), terakhir 13, 14 dan sisanya (Low).
