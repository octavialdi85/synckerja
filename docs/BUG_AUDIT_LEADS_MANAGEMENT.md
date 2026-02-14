# Bug Audit: /operations/consultant/leads-management

Halaman yang di-audit: route `/operations/consultant/leads-management` → `ConsultantDashboardPage` → `ConsultantsPageContent` dan semua komponen terkait (filters, table, insights, forms, dialogs).

---

## HIGH

### 1. `src/features/5-3-dashboard/ConsultantsPageContent.tsx` — Create lead error tidak ditampilkan ke user
- **Lokasi:** ~40–47 (`handleCreateLead`)
- **Masalah:** `await createLead(leadData)` tidak di-wrap try/catch. Jika `createLead` throw (mis. RLS / network), hanya `finally` yang jalan; user tidak dapat feedback (toast/alert).
- **Perbaikan:** Tambah `try { await createLead(leadData); ... } catch (e) { toast.error(...) atau setError(...); return; }` dan jangan tutup dialog saat gagal.

### 2. `src/features/5-3-dashboard/NewLeadForm.tsx` — Error submit hanya di-catch tanpa feedback
- **Lokasi:** ~156–159 (`handleSubmit` catch)
- **Masalah:** Komentar "Error is handled in the hook" — padahal parent tidak menampilkan error ke user. Dialog tetap tertutup (karena onClose dipanggil di success), tapi saat gagal hanya catch kosong; user tidak tahu create gagal.
- **Perbaikan:** Di parent (`ConsultantsPageContent`) tangkap error dari `handleCreateLead` dan tampilkan toast/alert; atau di `NewLeadForm` terima callback `onError?: (err) => void` dan panggil di catch, lalu tampilkan toast di parent.

### 3. `src/features/5-3-dashboard/LeadsFilters.tsx` — Download PDF tanpa error handling
- **Lokasi:** ~314–321 (tombol Download PDF)
- **Masalah:** `onClick={() => generateLeadsPDF({ leads: filteredLeads, filters })}` — `generateLeadsPDF` bisa throw (mis. jsPDF / data invalid). Tidak ada try/catch; unhandled exception.
- **Perbaikan:** Wrap dalam async handler dengan try/catch, tampilkan toast/alert pada error, dan disable button saat generating (sama seperti di `ConsultantsPageContent` / `LeadsInsights`).

### 4. `src/features/5-3-dashboard/LeadsTableNew.tsx` — Update lead (assignee/status) unhandled promise
- **Lokasi:** ~99 (`onUpdateLead(updatedLead as NewLead)`)
- **Masalah:** `onUpdateLead` adalah `updateLeadMutation.mutateAsync`; dipanggil tanpa `await` dan tanpa catch. Jika mutation gagal → unhandled promise rejection, tidak ada feedback ke user.
- **Perbaikan:** Panggil `onUpdateLead` dalam async handler: `try { await onUpdateLead(updatedLead); } catch (e) { toast.error(...); }` atau kembalikan Promise dari parent dan handle error di parent (toast/retry).

### 5. `src/features/5-3-sales-consultant/ConsultantsTableViewContent.tsx` — Import path salah
- **Lokasi:** 2–6 (import dari `@/components/1_halaman/5_3_leads-management/...`)
- **Masalah:** Path `@/components/1_halaman/5_3_leads-management` tidak ada di codebase (komponen asli ada di `features/5-3-dashboard`). Jika komponen ini di-render (mis. dari tab/view lain), build atau runtime error.
- **Perbaikan:** Ganti import ke `@/features/5-3-dashboard/...` (LeadsFilters, LeadsMetricsCards, LeadsTableNew, LeadsInsights, NewLeadForm) atau hapus file jika view ini tidak dipakai.

---

## MEDIUM

### 6. `src/features/5-3-dashboard/ConsultantsPageContent.tsx` — Search filter potensi null/undefined
- **Lokasi:** ~123–127 (filter search)
- **Masalah:** `lead.client.toLowerCase()` dan `lead.title.toLowerCase()`. Tipe `NewLead` mendefinisikan `client` dan `title` sebagai string, tapi data gabungan (leads + WhatsApp/email) bisa punya nilai null/undefined (mis. `customer_name` kosong). Panggilan `.toLowerCase()` pada null/undefined akan throw.
- **Perbaikan:** Gunakan optional chaining + fallback: `(lead.client ?? '').toLowerCase()`, `(lead.title ?? '').toLowerCase()`.

### 7. `src/features/5-3-dashboard/ConsultantsPageContent.tsx` — Fetch client profile status: error silent
- **Lokasi:** ~103–106 (catch di loop `fetchStatuses`)
- **Masalah:** Pada error (network/DB), hanya set `statusMap[lead.id] = 'empty'` dan `profileMap[lead.id] = null`; tidak ada logging atau feedback. Sulit debug saat ada masalah backend.
- **Perbaikan:** Minimal `console.error` atau log ke monitoring; optional: tampilkan banner "Some profile data could not be loaded" jika ada error.

### 8. `src/features/5-3-dashboard/LeadsInsights.tsx` — useQuery WhatsApp cycle metrics tanpa fallback UI
- **Lokasi:** ~45–54 (useQuery `get_whatsapp_cycle_metrics`)
- **Masalah:** `queryFn` throw on error; tidak ada `retry: false` atau penanganan error di UI. User hanya tidak melihat metrik; tidak ada pesan "Failed to load cycle metrics".
- **Perbaikan:** Handle `isError` / `error` dari useQuery dan tampilkan pesan fallback (mis. "Cycle metrics unavailable") alih-alih bagian kosong/blank.

### 9. `src/features/5-3-dashboard/LeadsInsights.tsx` — Banyak console.log production
- **Lokasi:** 57–64, 80–81, 92–95, 107–108, 128–137, 139–146, 156–172, 294–298, dll.
- **Masalah:** Banyak `console.log` debug tetap di kode; mengotori console dan sedikit beban di production.
- **Perbaikan:** Hapus atau wrap dengan env check (mis. `if (import.meta.env.DEV) { ... }`).

### 10. `src/features/5-3-dashboard/EditLeadDialog.tsx` — Error update lead hanya di console
- **Lokasi:** ~119–122 (`handleSubmit` catch)
- **Masalah:** `await onUpdateLead(updatedLead)` on error hanya `console.error`; user tidak dapat feedback (toast/alert). Dialog bisa tertutup atau form tetap terbuka tanpa penjelasan.
- **Perbaikan:** Tampilkan toast.error / setError state dan jangan panggil `onClose()` saat gagal; optional retry.

### 11. `src/features/5-3-dashboard/LeadsTableNew.tsx` — handleDelete tanpa try/catch
- **Lokasi:** ~115–117
- **Masalah:** `await onDeleteLead(leadId)` — jika `deleteLead` throw, promise rejection tidak di-handle; tidak ada feedback ke user. (Catatan: Delete saat ini tidak ditampilkan di `LeadActionsDropdown` untuk manual lead; hanya relevan jika nanti ada entry point delete.)
- **Perbaikan:** Wrap dengan try/catch dan tampilkan toast/alert on error.

### 12. `src/features/5-3-dashboard/LeadsFilters.tsx` — API fetch error tanpa feedback
- **Lokasi:** 76–86, 88–98, 99–110, 111–122 (fetchLeadStatuses, fetchLeadSources, fetchServices, fetchSubServices)
- **Masalah:** Jika Supabase return error, hanya tidak memanggil `setData`; user tidak tahu bahwa status/source/services gagal load (dropdown kosong tanpa penjelasan).
- **Perbaikan:** Set state error (mis. `setLoadError`) dan tampilkan pesan kecil atau toast "Failed to load filters"; optional retry.

---

## LOW

### 13. `src/features/5-3-dashboard/LeadsInsights.tsx` — useEffect dependency Object.keys(clientProfiles)
- **Lokasi:** ~65 (dependency array `[leads.length, Object.keys(clientProfiles).length, filters?.dateRange]`)
- **Masalah:** `Object.keys(clientProfiles).length` membuat reference baru setiap render; bisa memicu effect berulang tanpa perlu.
- **Perbaikan:** Simpan length di variable (mis. `clientProfileKeysLength`) dengan useMemo dari `Object.keys(clientProfiles).length`, atau hapus dari deps jika tidak perlu re-run pada perubahan keys.

### 14. `src/features/5-3-dashboard/LeadsTableNew.tsx` — ClientProfilePopup dengan organizationId kosong
- **Lokasi:** ~357 (`organizationId={organizationId}`)
- **Masalah:** `organizationId` di-set lewat state yang awalnya `''` dan diisi async dari `handleClientClick`. Jika user buka Client Profile sebelum data org ter-load, `organizationId` bisa tetap `''`; query Supabase dengan `organization_id: ''` bisa tidak sesuai ekspektasi.
- **Perbaikan:** Jangan render ClientProfilePopup (atau disable save) saat `organizationId` kosong; atau ambil organizationId dari context/hook yang sudah tersedia di level parent dan pass ke table.

### 15. `src/features/5-3-dashboard/LeadsMetricsCards.tsx` — Status "Converted" case-sensitive
- **Lokasi:** ~12 (`lead.lead_status?.name === 'Converted'`)
- **Masalah:** Di tempat lain (LeadsInsights, filter) dipakai `.trim().toLowerCase() === 'converted'`. Jika DB mengembalikan "CONVERTED" atau "converted ", card "Converted" bisa salah hitung.
- **Perbaikan:** Normalisasi: `(lead.lead_status?.name?.trim().toLowerCase() ?? '') === 'converted'`.

### 16. `src/features/5-3-dashboard/LeadsTableNew.tsx` — LeadActionsDropdown tidak menampilkan View/Delete
- **Lokasi:** LeadActionsDropdown hanya menampilkan "Open Chat" atau "Edit"; props `onViewDetail` dan `onDelete` tidak dipakai di dropdown.
- **Masalah:** UI View Detail dan Delete tidak tersedia dari tabel; jika itu fitur yang diinginkan, user tidak bisa akses. Jika sengaja disembunyikan, props yang tidak dipakai bisa membingungkan.
- **Perbaikan:** Jika View/Delete memang fitur: tambahkan item dropdown (View Detail, Delete) dan panggil callback. Jika tidak: hapus props dari interface dan dari pemanggil untuk menghindari dead code.

### 17. `src/features/5-3-dashboard/EditLeadDialog.tsx` — Console.log di production
- **Lokasi:** 41, 46, 56, 60, 72–73
- **Masalah:** Beberapa `console.log` / `console.error` untuk debug; sebaiknya tidak berlebihan di production.
- **Perbaikan:** Kurangi atau wrap dengan env check; untuk error tetap boleh log ke monitoring.

### 18. `src/features/5-3-sales-consultant/ConsultantsTableViewContent.tsx` — console.log production
- **Lokasi:** 31, 123
- **Masalah:** Debug log left in code.
- **Perbaikan:** Hapus atau guard dengan `import.meta.env.DEV`.

---

## Ringkasan

| Prioritas | Jumlah |
|-----------|--------|
| High     | 5      |
| Medium   | 7      |
| Low      | 6      |

Disarankan untuk memperbaiki semua item **High** terlebih dahulu (error handling create/update, PDF download, dan import path), lalu **Medium** (null-safety search, feedback error API, dan kebersihan log), dan terakhir **Low** (konsistensi status, dependency effect, dan dead props).
