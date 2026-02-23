# Audit: Mobile Android — `/tools/meeting-notes`

**Scope:** Halaman meeting notes versi mobile Android (`src/mobile/pages/meeting notes/` + `src/features/8-1-meeting-notes/` yang dipakai oleh halaman ini).

**Tujuan:** Mengidentifikasi bug, error, warning, code smells; memprioritaskan perbaikan untuk aplikasi lebih ringan dan loading lebih cepat.

---

## Daftar Bug & Temuan

### High priority

| # | File:Line | Penjelasan | Saran perbaikan |
|---|-----------|------------|------------------|
| 1 | `MeetingNotesContent.tsx:17-27` | **Filter Time tidak dipakai.** `filters.timeFilter` (Today, Yesterday, This Week, dll.) tidak digunakan saat memfilter `meetingPoints`. Filter Time di UI tidak mengubah hasil list. | Tambahkan logika filter berdasarkan `meeting_date` sesuai `filters.timeFilter` (bandingkan tanggal dengan hari ini / minggu / bulan), sama seperti filter status/requestBy. |
| 2 | `MeetingPointsTable.tsx:35-56` | **useEffect loadCounts tergantung fungsi context.** `getIssueHistory` dan `getUpdateCount` dari context tidak di-wrap `useCallback`, sehingga referensi berubah tiap render. Effect jalan tiap render → N+1 API call (getIssueHistory per point) berulang, halaman berat dan lambat. | Di `MeetingNotesContext.tsx` bungkus `getIssueHistory` dan `getUpdateCount` dengan `useCallback` (deps yang perlu). Atau pindah beban hitung issue/update count ke context (satu kali fetch/aggregate) dan hanya baca dari state, jangan panggil per point di child. |
| 3 | `MeetingSummaryCards.tsx:121` | **Properti salah untuk Recent Updates.** Data `recentUpdates` dari context adalah hasil select `meeting_point_updates` + `meeting_point_solutions`, bukan `meeting_points`. Jadi `update.meeting_points?.discussion_point` selalu undefined; label diskusi di kartu "Recent Updates" kosong/undefined. | Gunakan relasi yang benar: mis. extend select di context jadi include `meeting_point_solutions(meeting_point_id, meeting_points(discussion_point))` lalu pakai `update.meeting_point_solutions?.meeting_points?.discussion_point`, atau tampilkan teks fallback (mis. "Update") jika tidak ada. |
| 4 | `MeetingNotesContent.tsx:18` & `MeetingPointsTable.tsx:61` | **Potensi null/undefined pada `discussion_point`.** `point.discussion_point` bisa null dari DB. Pemanggilan `.toLowerCase()` tanpa guard bisa throw. | Gunakan optional chaining + fallback: `(point.discussion_point ?? '').toLowerCase()` seperti di feature desktop `MeetingPointsTable.tsx:69`. |
| 5 | `MeetingPointsTable.tsx:36-55` | **loadCounts tanpa error handling & tanpa abort.** Jika salah satu `getIssueHistory(point.id)` gagal, seluruh loadCounts bisa gagal diam-diam atau state setengah. Tidak ada cancel saat unmount/meetingPoints berubah. | Bungkus isi loadCounts dengan try/catch; set state counts hanya untuk yang sukses; tampilkan toast/fallback pada error. Gunakan AbortController atau flag (mis. `isMounted`) dan ignore setState jika sudah unmount atau ids berubah. |

### Medium priority

| # | File:Line | Penjelasan | Saran perbaikan |
|---|-----------|------------|------------------|
| 6 | `MeetingNotesInput.tsx:61` | **console.error di production.** Error submit meeting point hanya di-log ke console. | Ganti dengan `logger.error` (sesuai `@/config/logger`) dan/atau toast error ke user. |
| 7 | `EditMeetingPointDialog.tsx:83` | **console.error di production.** Error update meeting point hanya di-log. | Sama: gunakan logger + toast; jangan hanya console. |
| 8 | `UpdateHistoryDialog.tsx:105,135,172,203,236,256` | **Banyak console.error tanpa feedback user.** Load issues/solutions, load history, add/update/delete update hanya console.error. | Ganti dengan logger; untuk error yang mempengaruhi UI (load/add/update/delete) tambahkan toast atau pesan inline. |
| 9 | `IssuesDialog.tsx:108,114,129,149,167,181,201,219,235,256` | **Banyak console.error.** Sama seperti UpdateHistoryDialog. | Ganti dengan logger + toast/feedback di UI. |
| 10 | `DeleteMeetingPointDialog.tsx:38-43` | **handleDelete tanpa try/catch.** Jika `onDeleteSuccess` throw (mis. API gagal), promise rejection tidak tertangkap; tombol bisa tetap "Deleting...". | Bungkus `await onDeleteSuccess(...)` dengan try/catch; di catch panggil toast error dan pastikan `setIsDeleting(false)`. |
| 11 | `MeetingPointsTable.tsx:115-124` | **handleEditSuccess / handleDeleteSuccess tidak try/catch.** Jika `updateMeetingPoint` atau `deleteMeetingPoint` throw, error tidak ditangani di sini; dialog bisa tertutup sementara operasi gagal. | Bungkus dengan try/catch; pada error tampilkan toast (context sudah toast) dan jangan panggil setEditingPoint(null)/setDeletingPoint(null) agar user bisa retry. |
| 12 | `MeetingSummaryCards.tsx:124` | **update_details bisa null/undefined.** `update.update_details.substring(0, 80)` bisa throw jika `update_details` null. | Gunakan optional chaining: `update.update_details?.substring(0, 80) ?? ''` dan hindari "..." jika string kosong. |
| 13 | `MeetingNotesContext.tsx` (getUpdateCount) | **Update count per point tidak akurat.** `getUpdateCount` memakai `recentUpdates` yang di-fetch dengan `.limit(20)`. Jadi badge "Updates" per meeting point maksimal 20, bukan total riil. | Untuk akurasi: hitung dari `getUpdateHistoryByMeetingPoint` (atau endpoint count) saat load table, atau tampilkan "20+" jika >= 20. Untuk performa tetap pakai cache, dokumentasikan bahwa count adalah "recent 20". |
| 14 | `MeetingTableFooter.tsx` | **Hardcoded string.** "Total Meeting Points" dan "Showing X points" tidak pakai i18n. | Gunakan `useAppTranslation()` dan key `meetingNotes.*` (atau tambahkan key baru) agar konsisten dengan aturan translate. |
| 15 | `MeetingSummaryCards.tsx` | **Label & teks hardcoded.** "Not Started", "On Going", "Meeting Summary", "Recent Updates", "Loading summary..." tidak i18n. | Tambah key di translations dan pakai `t(...)` di komponen. |
| 16 | `MeetingPointsTable.tsx:27-30` | **useState dengan `any`.** `editingPoint`, `deletingPoint`, `historyPoint`, `issuesPoint` memakai `any`. | Definisikan tipe (mis. `MeetingPoint \| null`) dan gunakan di state. |
| 17 | `UpdateHistoryDialog.tsx:191` & `IssuesDialog.tsx:159,206` | **window.confirm / alert.** Bergantung pada `window.confirm` dan `alert`; di lingkungan native/certain WebView bisa tidak konsisten. | Ganti dengan AlertDialog/Modal konfirmasi dari design system agar konsisten dan bisa di-style/i18n. |

### Low priority / code smell

| # | File:Line | Penjelasan | Saran perbaikan |
|---|-----------|------------|------------------|
| 18 | `MeetingNotesInput.tsx:84-86` | **Duplicate find.** `STATUS_OPTIONS.find` dipanggil dua kali untuk statusLabel. | Simpan hasil find dalam variabel sekali, lalu pakai untuk label dan fallback. |
| 19 | `MeetingNotesContent.tsx` vs `MeetingPointsTable.tsx` | **Duplikasi logika filter.** Filter search/status/requestBy dihitung di Content (filteredPoints) dan lagi di Table (filteredPoints). Time filter juga harus dipakai di satu tempat yang dipakai Table. | Pusatkan perhitungan filtered list di satu tempat (mis. di context atau Content) dan oper ke Table sebagai props; atau export helper filter dan pakai di keduanya. |
| 20 | `EditMeetingPointDialog.tsx:31` | **onEditSuccess data: any.** Prop `onEditSuccess(id, data: any)` tidak ter-type. | Gunakan tipe yang sesuai, mis. `Partial<MeetingPoint>` atau interface payload edit. |
| 21 | `MeetingNotesPage.tsx` | **Struktur scroll.** Sudah pakai `seamless-scroll` dan flex min-h-0; baik. Pastikan `max-h-[calc(100vh-420px)]` di Content tidak memotong di device kecil. | Cek di device target; jika perlu, gunakan konstanta atau token spacing (mis. dari layout rule) agar konsisten. |
| 22 | `AddSolutionAsDailyTaskModal.tsx` (mobile) | **Beberapa console.error.** Baris 157, 179, 238, 258, 302, 334. | Ganti dengan logger; untuk error yang user-facing tambah toast. |

---

## Ringkasan prioritas

- **High:** Perbaikan logic (filter time, N+1 API, wrong field Recent Updates, null-safety, error/abort di loadCounts) agar fitur benar dan halaman tidak berat.
- **Medium:** Error handling & feedback (try/catch, toast, logger), akurasi count, i18n, ganti confirm/alert dengan modal.
- **Low:** Code smell (duplikasi filter, duplicate find, typing, console → logger).

---

## Dampak ke “lebih ringan & loading lebih cepat”

- **Langsung:** Perbaikan #2 (useCallback / pindah load count ke context) mengurangi banyak panggilan API berulang dan re-render, sehingga halaman lebih ringan dan loading lebih cepat.
- **Langsung:** #5 (abort/ignore setState saat unmount) mencegah kerja sia-sia dan race condition setelah navigasi cepat.
- **Tidak langsung:** #4, #12 (null-safety) mencegah crash yang bisa bikin user reload; #6–9, #22 (logger/toast) tidak menambah berat signifikan tapi meningkatkan keandalan.

Setelah perbaikan High dan Medium, lakukan tes ulang di perangkat Android target dan ukur waktu sampai list tampil (mis. sampai skeleton hilang dan kartu terisi).
