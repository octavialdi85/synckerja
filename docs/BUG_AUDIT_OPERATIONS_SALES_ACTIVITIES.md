# Audit Bug: Halaman /operations/sales/activities

**Tanggal audit:** 2026-02-16  
**Scope:** Route `/operations/sales/activities`, `SalesOperationsPage` → `SalesActivitiesPageContent`, hooks di `src/hooks/organized/sales.ts` (useSalesActivities, useSalesActivityMasterData, useSalesActivityItems, useSalesActivityPayments, useIncomeTransactions), dan semua komponen di `src/features/5-2-activities`.

---

## 1. Refetch berulang / loading tidak smooth

| # | File:Line | Deskripsi | Prioritas | Saran perbaikan |
|---|-----------|-----------|-----------|------------------|
| R1 | **hooks/organized/sales.ts:107-156** | Query `useSalesActivities` tidak punya `staleTime`, `refetchOnMount`, `refetchOnWindowFocus`. Default React Query = refetch on mount dan window focus, sehingga halaman bisa refetch berulang saat switch tab/window. | **High** | Tambah `staleTime: 30_000`, `refetchOnMount: false`, `refetchOnWindowFocus: false` agar loading smooth dan tidak refetch berlebihan. |
| R2 | **SalesActivitiesPageContent.tsx:51, 137, 233** | `refetch()` dipanggil di: handleDialogSuccess (setelah simpan), handleDelete (setelah hapus), dan onUpdate di SalesActivitiesTable. Delete mutation sudah punya onSuccess invalidate di hook; refetch() tambahan bisa memicu double refetch. | Medium | Setelah delete, andalkan invalidateQueries di mutation onSuccess; panggil refetch() hanya jika perlu (mis. hanya di handleDialogSuccess). Atau satu refetch saja setelah aksi, tanpa gabungan invalidate + refetch. |

---

## 2. Console.log / console.error / console.warn (production)

| # | File:Line | Deskripsi | Prioritas | Saran perbaikan |
|---|-----------|-----------|-----------|------------------|
| C1 | **SalesActivitiesPageContent.tsx:139** | `console.error` di catch handleDelete. | Low | Ganti ke `devLog.error` (import dari `@/config/logger`). |
| C2 | **hooks/organized/sales.ts:119-120, 144-153, 163-174, 169-173, 184, 187, 196, 205, 211, 214** | Banyak `console.error` dan `console.log` di queryFn useSalesActivities dan delete mutation. | Low | Ganti ke `devLog.error` / `devLog.debug`. |
| C3 | **hooks/organized/sales.ts:239-241, 262-264, 285-286, 304, 330-331, 352-358** | `console.log` / `console.error` di useSalesActivityMasterData (income types, services, categories, debug state). | Low | Ganti ke `devLog.debug` / `devLog.error`. |
| C4 | **SalesActivityForm.tsx:83-86, 184, 228, 232, 242-247, 251, 272, 274, 289, 310, 312, 339, 343, 358, 361, 367-371, 377, 394, 399, 402, 412, 429, 431, 449, 455** | Banyak `console.log` dan `console.error` (debug income types, upload, update, payment, insert). | Low | Ganti ke `devLog.debug` / `devLog.error`. |
| C5 | **SalesActivityItemsManager.tsx:80** | `console.error` saat sync draft items gagal. | Low | Ganti ke `devLog.error`; pertimbangkan toast ke user. |
| C6 | **AddItemDialog.tsx:148, 168-172** | `console.error` di catch submit; `console.log` debug services. | Low | Ganti ke `devLog.error` / `devLog.debug`. |
| C7 | **SalesActivitiesTable.tsx:91** | `console.log('View details:', activity)`. | Low | Ganti ke `devLog.debug` atau hapus. |
| C8 | **components/SopSelectionPopup.tsx:113** | `console.error(err)` di catch handleConfirm. | Low | Ganti ke `devLog.error(err)`. |

---

## 3. Unhandled promises / error handling

| # | File:Line | Deskripsi | Prioritas | Saran perbaikan |
|---|-----------|-----------|-----------|------------------|
| U1 | **hooks/organized/sales.ts:321-322** | `syncActivityTotalFromItems()` dipanggil di onSuccess createItem/updateItem/deleteItem tanpa await. Fungsi async; jika throw, rejection tidak tertangkap. | **Medium** | Panggil dengan `.catch((e) => devLog.error('syncActivityTotalFromItems failed', e))` atau await dalam onSuccess (atau void promise). |
| U2 | **SalesActivityItemsManager.tsx:71-84** | `sync()` di useEffect dipanggil tanpa await. Catch hanya `console.error`; user tidak dapat feedback bila sync draft items gagal. | **Medium** | Tambah toast error di catch; pertimbangkan state error untuk ditampilkan di UI. |
| U3 | **AddItemDialog.tsx:147-151** | Catch submit hanya `console.error`; tidak ada toast atau feedback ke user. | Medium | Tampilkan toast error dan/atau set state error. |
| U4 | **SalesActivityForm.tsx:449-452** | `setTimeout(() => onSuccess(), 100)` — onSuccess memicu refetch; delay 100ms untuk "ensure commit" bersifat spekulatif dan bisa race. | Low | Pertimbangkan panggil onSuccess() langsung atau gunakan callback setelah mutation settle (bukan setTimeout). |
| U5 | **hooks/organized/sales.ts:389-402** | `createIncomeTransaction` dari useIncomeTransactions: mutation tidak punya onError. Caller (SalesActivityForm) menangani error di try/catch. Cukup aman. | - | Opsional: tambah onError di mutation untuk log global. |

---

## 4. API calls tanpa fallback / error feedback

| # | File:Line | Deskripsi | Prioritas | Saran perbaikan |
|---|-----------|-----------|-----------|------------------|
| A1 | **hooks/organized/sales.ts:107-156** | queryFn useSalesActivities: on error throw; React Query akan retry dan set error state. Tidak ada fallback UI di halaman (mis. banner error + Retry). | Medium | Tampilkan error state dari useQuery (error + isError) di SalesActivitiesPageContent: banner + tombol Retry yang panggil refetch. |
| A2 | **hooks/organized/sales.ts:236-270, 272-292, 296-314** | useSalesActivityMasterData: income types, services, sub-services, income categories — on error throw. Halaman form mengandalkan data ini; jika gagal, form bisa kosong tanpa pesan. | Medium | Expose error/isError dari tiap query atau gabungan; tampilkan pesan/toast saat master data gagal load. |
| A3 | **deleteSalesActivityMutation** | Tidak ada onError di mutation; error dibawa ke mutateAsync dan ditangkap di handleDelete dengan toast. Cukup. | - | Tidak perlu perubahan. |

---

## 5. Logic / null-undefined / code smells

| # | File:Line | Deskripsi | Prioritas | Saran perbaikan |
|---|-----------|-----------|-----------|------------------|
| L1 | **SalesActivitiesPageContent.tsx:21, 44-45, 70-71** | `editingActivity` dan `selectedActivityForPayment` bertipe `useState<any>(null)`. | Low | Ganti ke type yang sesuai (mis. `SalesActivity \| null`) untuk type safety. |
| L2 | **SalesActivityForm.tsx:54** | `activity?: any` di props. | Low | Gunakan type `SalesActivity` atau interface yang sesuai. |
| L3 | **hooks/organized/sales.ts:125-134** | Untuk setiap activity dilakukan 2 query (services, sub_services) — N+1. Banyak activity = banyak request. | Medium | Fetch semua unique service_id dan sub_service_id sekali, lalu map di memori; atau gunakan select dengan join jika Supabase mendukung. |
| L4 | **SalesActivitiesTable.tsx (ActivityRow)** | Props `activity: any`. | Low | Import dan gunakan type `SalesActivity`. |
| L5 | **SalesActivityForm.tsx:355-356** | `itemsManagerRef.current?.getDraftPayloads?.()` — jika getDraftPayloads throw, tidak tertangkap (dalam try/catch yang sama ada supabase update). | Low | Sudah dalam try/catch; cukup pastikan getDraftPayloads tidak throw tanpa perlu. |

---

## 6. Error handling yang kurang

| # | File:Line | Deskripsi | Prioritas | Saran perbaikan |
|---|-----------|-----------|-----------|------------------|
| E1 | **hooks/organized/sales.ts:164-172, 183-187, 196-201, 205-210** | Delete mutation: jika items/payments/sales_payments delete gagal, hanya log dan lanjut. Data bisa inconsistent (activity terhapus tapi items tetap). | Medium | Dokumentasikan perilaku "best effort"; atau rollback / batalkan delete activity jika salah satu step gagal. |
| E2 | **SalesActivityForm onSubmit** | Banyak branch payment (down payment increase, final payment, new activity down/full). Beberapa catch hanya toast warning; activity sudah tersimpan. Cukup. | - | Opsional: log ke devLog.error. |
| E3 | **SopSelectionPopup handleConfirm** | Catch menampilkan toast; baik. | - | Tidak perlu perubahan. |

---

## 7. Ringkasan prioritas

- **High:** R1 (staleTime + refetch options agar loading smooth).
- **Medium:** R2, U1, U2, U3, A1, A2, L3, E1.
- **Low:** C1–C8, U4, L1, L2, L4, L5.

---

## 8. Checklist singkat

- [ ] R1: Tambah staleTime dan refetchOnMount/refetchOnWindowFocus di useSalesActivities.
- [ ] R2: Kurangi pemanggilan refetch yang redundan (andalkan invalidate dari mutation).
- [ ] U1: Handle promise syncActivityTotalFromItems (catch atau await).
- [ ] U2: Toast error saat sync draft items gagal.
- [ ] U3: Toast/feedback di AddItemDialog saat submit item gagal.
- [ ] A1: Tampilkan error state + Retry di halaman activities.
- [ ] A2: Tampilkan error master data di form (atau toast).
- [ ] E1: Putuskan kebijakan delete (rollback vs best effort) dan dokumentasi.
- [ ] C1–C8: Ganti console.* ke devLog di semua file yang tercantum.
- [ ] L1, L2, L4: Ganti `any` dengan type yang sesuai.
