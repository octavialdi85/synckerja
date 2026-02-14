# Status Audit Bug: /operations/consultant/leads-management

Referensi: [BUG_AUDIT_LEADS_MANAGEMENT.md](BUG_AUDIT_LEADS_MANAGEMENT.md)

---

## 1. Yang sudah diperbaiki

### HIGH (5/5)

| # | Bug | File | Status |
|---|-----|------|--------|
| 1 | Create lead error tidak ditampilkan ke user | ConsultantsPageContent.tsx | **SELESAI** – try/catch, toast, re-throw; dialog tidak ditutup saat gagal |
| 2 | Error submit NewLeadForm tanpa feedback | NewLeadForm.tsx + parent | **SELESAI** – Parent menangkap error dan menampilkan toast; catch di form tidak menutup dialog |
| 3 | Download PDF tanpa error handling | LeadsFilters.tsx | **SELESAI** – Handler async, try/catch, toast, state `isGeneratingPDF`, tombol disabled saat generating |
| 4 | Update lead (assignee/status) unhandled promise | LeadsTableNew.tsx | **SELESAI** – `handleFieldUpdate` async, await + try/catch, toast on error |
| 5 | Import path salah | ConsultantsTableViewContent.tsx (5-3-sales-consultant) | **SELESAI** – Import diganti ke `@/features/5-3-dashboard/...` |

### MEDIUM (7/7)

| # | Bug | File | Status |
|---|-----|------|--------|
| 6 | Search filter null/undefined pada client/title | ConsultantsPageContent.tsx | **SELESAI** – `(lead.client ?? '').toLowerCase()`, `(lead.title ?? '').toLowerCase()` |
| 7 | Fetch client profile status error silent | ConsultantsPageContent.tsx | **SELESAI** – `console.error('Failed to fetch client profile for lead', lead.id, error)` di catch |
| 8 | useQuery cycle metrics tanpa fallback UI | LeadsInsights.tsx | **SELESAI** – `isCycleMetricsError` dari useQuery, teks "Gagal memuat metrik siklus" di Employee Performance |
| 9 | Banyak console.log di production | LeadsInsights.tsx | **SELESAI** – Semua console.log debug dihapus |
| 10 | Error update lead hanya di console | EditLeadDialog.tsx | **SELESAI** – useToast, toast di catch handleSubmit |
| 11 | handleDelete tanpa try/catch | LeadsTableNew.tsx | **SELESAI** – try/catch + toast on error |
| 12 | API fetch filter tanpa feedback | LeadsFilters.tsx | **SELESAI** – State `filtersLoadError`, set on error, banner di atas filter |

### LOW (6/6)

| # | Bug | File | Status |
|---|-----|------|--------|
| 13 | useEffect dependency Object.keys(clientProfiles) | LeadsInsights.tsx | **SELESAI** – Effect debug (beserta dependency tersebut) dihapus |
| 14 | ClientProfilePopup organizationId kosong | LeadsTableNew.tsx | **SELESAI** – `organizationId` dari `useCurrentOrg()`, state async di handleClientClick dihapus |
| 15 | Status "Converted" case-sensitive | LeadsMetricsCards.tsx | **SELESAI** – Normalisasi `.trim().toLowerCase() === 'converted'` |
| 16 | LeadActionsDropdown tidak menampilkan View/Delete | LeadActionsDropdown.tsx | **SELESAI** – Dropdown menu manual lead: Edit, View Detail, Delete (dengan konfirmasi) |
| 17 | Console.log di production | EditLeadDialog.tsx | **SELESAI** – Log debug di fetchLeadStatuses dihapur/disederhanakan |
| 18 | console.log production | ConsultantsTableViewContent.tsx (5-3-sales-consultant) | **SELESAI** – Kedua console.log dihapus |

---

## 2. Yang belum diperbaiki (dari audit awal)

Tidak ada. Semua 18 item dari audit awal sudah ditangani.

---

## 3. Temuan bug / code smell tambahan

### 3.1 Console.log / console.error yang tersisa (Low)

| File | Lokasi | Keterangan |
|------|--------|------------|
| ConsultantsPageContent.tsx | ~223, 225 | `console.log('✅ PDF generated successfully')` dan `console.error` di generatePDFReport – log sukses sebaiknya dihapus; error boleh dipertahankan atau diganti toast (sudah ada alert). |
| LeadsTableViewContent.tsx | 34, 116, 191 | Tiga console.log debug – sama seperti yang pernah ada di ConsultantsTableViewContent; sebaiknya dihapus atau di-guard dengan DEV. |
| ConsultantsTableViewContent.tsx (5-3-dashboard) | 31, 113, 177 | Tiga console.log debug – file ini di folder **5-3-dashboard** (bukan sales-consultant); belum diubah. |

### 3.2 ClientProfilePopup saat organizationId kosong (Low)

- **File:** ClientProfilePopup.tsx (dipakai dari LeadsTableNew).
- **Masalah:** `organizationId` sekarang dari `useCurrentOrg()`. Jika hook belum siap (mis. saat hydration atau sebelum auth/org resolve), bisa tetap `undefined` lalu di-pass sebagai `''`. Query dengan `organization_id: ''` bisa tidak valid atau tidak mengembalikan data.
- **Saran:** Tidak render ClientProfilePopup saat `!organizationId`, atau disable tombol Simpan dan tampilkan pesan "Memuat..." sampai `organizationId` tersedia.

### 3.3 Duplikasi view content (Low / maintainability)

- Ada **LeadsTableViewContent** dan **ConsultantsTableViewContent** di `5-3-dashboard`, plus **ConsultantsTableViewContent** di `5-3-sales-consultant`. Masing-masing punya logic filter/leads yang mirip. Console.log dan pola error handling tidak seragam.
- **Saran:** Pertimbangkan satu sumber kebenaran (satu komponen atau shared hook) untuk halaman leads-management agar perbaikan bug dan konsistensi lebih mudah.

### 3.4 NewLeadForm – Assignee required (Low)

- **File:** NewLeadForm.tsx.
- **Masalah:** Label "Assignee *" dan Select required, tapi tipe `CreateLeadData.assignee` bisa string kosong jika user tidak pilih; backend/hook bisa menerima `''`.
- **Saran:** Pastikan validasi (required) di form dan/atau di backend konsisten; kalau assignee wajib, tampilkan error di form sebelum submit.

### 3.5 GenerateLeadsPDF async (Low)

- **File:** ConsultantsPageContent.tsx – `await generateLeadsPDF(pdfData)`.
- **Masalah:** `generateLeadsPDF` di LeadsPDFGenerator.tsx bersifat **sync** (tidak return Promise). Memakai `await` tidak salah (undefined resolved), tapi jika di dalam generateLeadsPDF ada operasi async di masa depan, signature perlu diubah.
- **Saran:** Opsional: ubah `generateLeadsPDF` jadi `async` atau return `Promise<void>` agar konsisten dengan pemanggil.

### 3.6 Lead status "Open" di LeadsMetricsCards (Low)

- **File:** LeadsMetricsCards.tsx – `lead.lead_status?.name === 'Open'`.
- **Masalah:** Untuk "Converted" sudah dinormalisasi; "Open" masih case-sensitive. Untuk konsistensi bisa dipakai pola yang sama: `(lead.lead_status?.name?.trim().toLowerCase() ?? '') === 'open'`.

---

## 4. Ringkasan

| Kategori | Jumlah |
|----------|--------|
| Dari audit awal (sudah diperbaiki) | 18 |
| Belum diperbaiki dari audit awal | 0 |
| Temuan baru / sisa (disarankan) | 6 (semua Low / maintainability) |

**Kesimpulan:** Semua bug yang tercantum di BUG_AUDIT_LEADS_MANAGEMENT.md sudah diperbaiki. Yang tersisa adalah pembersihan log, hardening edge case (organizationId kosong, normalisasi status "Open"), dan perbaikan maintainability (duplikasi view, validasi assignee, signature PDF). Prioritas bisa mengikuti urutan: hapus console.log di file yang belum dibersihkan → guard ClientProfilePopup saat `!organizationId` → sisanya sesuai kebutuhan.
