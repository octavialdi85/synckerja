# Audit Bug: Mobile Android — Halaman /subscription/management

**Lingkup:** `src/mobile/pages/subscription/ManagementTabPage.tsx`, `section/management/*`, skeleton, dan dependency (useOptimizedSubscription, 10-management utils).  
**Tujuan:** Daftar bug, error handling, logic errors, performa, dan saran perbaikan singkat.

---

## Ringkasan prioritas

| Prioritas | Jumlah |
|-----------|--------|
| High      | 2      |
| Medium    | 5      |
| Low       | 4      |

---

## HIGH

### 1. Error subscription tidak ditampilkan — statusError tidak dipakai

**File:line:**  
- `src/mobile/pages/subscription/ManagementTabPage.tsx:23` (destructure useOptimizedSubscription)  
- `src/features/10-management/hooks/useOptimizedSubscription.ts` (mengembalikan statusError)

**Temuan:**  
- Halaman hanya memakai `subscriptionStatus`, `isLoading`, `refreshSubscriptionStatus`.  
- `statusError` dari `useOptimizedSubscription()` tidak di-destructure dan tidak dipakai.  
- Saat fetch subscription gagal (network/API error), `subscriptionStatus` tetap null dan `isLoading` jadi false; user hanya melihat state "Subscription belum tersedia" + tombol "Perbarui Status", tanpa pesan bahwa terjadi error.  
- Tidak ada pembedaan antara "belum ada data" dan "gagal memuat".

**Saran:**  
- Ambil `statusError` dari hook.  
- Jika `statusError` ada, tampilkan Card/state error (mis. "Gagal memuat data subscription") dengan tombol retry yang memanggil `refreshSubscriptionStatus`, jangan hanya tampilan "belum tersedia".

---

### 2. Unduh bukti pembayaran tanpa try/catch — unhandled rejection

**File:line:**  
- `src/mobile/pages/subscription/section/management/MobilePaymentHistory.tsx:73-134` (handleDownloadReceipt)

**Temuan:**  
- `handleDownloadReceipt` async: memanggil Supabase (organizations), lalu jsPDF + autoTable, lalu `doc.save()`.  
- Tidak ada try/catch. Jika `supabase.from(...).single()` error, atau `new Date(payment.created_at)` invalid, atau jsPDF/autoTable error, promise rejection tidak tertangkap.  
- User tidak dapat feedback (toast/error message) dan di konsol muncul unhandled rejection.

**Saran:**  
- Bungkus isi handler dengan try/catch; pada catch tampilkan toast.error dan optionally log (tanpa PII).  
- Pastikan `formatDateTime`/tanggal aman (null check) jika schema mengizinkan created_at null.

---

## MEDIUM

### 3. formatIDR di 10-management tanpa guard NaN/undefined

**File:line:**  
- `src/features/10-management/utils/subscriptionUtils.ts:41-48`  
- Pemakaian: `src/mobile/pages/subscription/section/management/MobilePaymentHistory.tsx:120, 129, 213` (formatIDR(payment.amount))

**Temuan:**  
- `formatIDR(amount: number)` di 10-management memakai `Intl.NumberFormat` langsung tanpa normalisasi.  
- Jika `amount` NaN/undefined (mis. data corrupt atau typo di mapping), tampilan bisa "Rp NaN" atau runtime error.  
- Di 1-login sudah ada guard (`Number(amount)`, `!Number.isFinite(n) return 'Rp 0'`); di 10-management belum.

**Saran:**  
- Tambah guard yang sama seperti di 1-login: normalisasi ke number, jika tidak finite return `'Rp 0'`, lalu format.  
- Atau seragamkan dengan mengimpor formatIDR dari 1-login di MobilePaymentHistory agar satu sumber kebenaran.

---

### 4. Estimasi tagihan tahunan tanpa diskon plan

**File:line:**  
- `src/mobile/pages/subscription/section/management/MobileSubscriptionStats.tsx:56-65` (billingSummary useMemo)

**Temuan:**  
- Untuk `billing_cycle === "yearly"` dipakai: `basePrice * member_count * 12`.  
- Tidak memakai `annual_discount_percentage` dari subscription/plan.  
- Di halaman plans, harga tahunan memakai diskon; di management tampilan "Estimasi tagihan" bisa lebih besar dari nilai sebenarnya.

**Saran:**  
- Untuk yearly: gunakan `basePrice * member_count * 12 * (1 - (annual_discount_percentage ?? 0) / 100)` jika field tersedia di subscriptionStatus/plan, atau ambil dari plan yang sama dengan yang dipakai di plans page.

---

### 5. Payment history query tanpa staleTime/gcTime

**File:line:**  
- `src/mobile/pages/subscription/section/management/MobilePaymentHistory.tsx:48-71`

**Temuan:**  
- useQuery hanya punya `queryKey`, `enabled`, `queryFn`.  
- Tidak ada `staleTime`/`gcTime` → mengandalkan default React Query; setiap mount/focus bisa refetch.  
- Halaman management jadi lebih sering request ke Supabase dan loading terasa kurang ringan.

**Saran:**  
- Tambah `staleTime` (mis. 2–5 menit) dan `gcTime` (mis. 10 menit) agar cache dipakai dan refetch tidak berlebihan.

---

### 6. Duplikasi formatDate di dua komponen

**File:line:**  
- `src/mobile/pages/subscription/section/management/MobileCurrentPlanCard.tsx:15-23`  
- `src/mobile/pages/subscription/section/management/MobileSubscriptionStats.tsx:11-20`

**Temuan:**  
- Fungsi `formatDate` (value → string untuk tampilan) didefinisikan dua kali dengan logic hampir sama (null check, NaN check, toLocaleDateString; beda opsi month "long" vs "short").  
- Code smell dan risiko inkonsistensi jika salah satu diubah.

**Saran:**  
- Ekstrak ke util bersama (mis. di `@/features/10-management/utils` atau `@/mobile/utils`) dengan opsi format (long/short month); pakai di kedua komponen.

---

### 7. Tidak ada loading/error state saat unduh PDF

**File:line:**  
- `src/mobile/pages/subscription/section/management/MobilePaymentHistory.tsx:241-247` (Button Unduh bukti pembayaran)

**Temuan:**  
- Tombol "Unduh bukti pembayaran" memanggil `handleDownloadReceipt(payment)` tanpa state loading.  
- User bisa klik berkali kali saat PDF sedang digenerate; tidak ada disabled state atau spinner.  
- Setelah ditambah try/catch (bug #2), error akan ke toast tapi UX loading tetap kurang.

**Saran:**  
- Tambah state lokal (mis. `downloadingId: string | null`); saat klik set id, di akhir (dalam finally) clear.  
- Disable tombol atau tampilkan spinner untuk item yang `payment.id === downloadingId`.

---

## LOW

### 8. Teks hardcoded Indonesia tanpa i18n

**File:line:**  
- `MobileCurrentPlanCard.tsx`: "Ringkasan Subscription", "Detail plan aktif...", "Aktif", "Trial", "Tidak Aktif", "Plan aktif", "Penggunaan member", "Model pembayaran", "Berakhir pada", "Pembayaran berikutnya", dll.  
- `MobileSubscriptionStats.tsx`: "Status Plan", "Trial aktif", "Periode Berakhir", "Anggota Terpakai", "Sisa Hari", "Rangkuman billing", "Estimasi tagihan".  
- `MobilePaymentHistory.tsx`: "Riwayat Pembayaran", "Berhasil", "Menunggu", "Gagal", "ID Transaksi", "Tanggal", "Siklus tagihan", "Unduh bukti pembayaran", "ProfitLoop Invoice", dll.

**Temuan:**  
- Semua string di atas hardcoded; ganti bahasa di settings tidak mengubah teks di halaman management.

**Saran:**  
- Ganti dengan `t('subscription.management.*')` (atau key yang sesuai) mengacu ke translations; tambah key baru jika belum ada.

---

### 9. Skeleton list pakai key={index}

**File:line:**  
- `src/mobile/pages/subscription/section/management/MobilePaymentHistory.tsx:146-148`  
- `src/mobile/pages/subscription/ManagementTabPageSkeleton.tsx:26-28`

**Temuan:**  
- `[1,2,3,4,5].map((i) => <Skeleton key={i} />)` dan serupa.  
- Untuk list statis yang tidak reorder, key index bisa diterima; untuk konsistensi dan menghindari peringatan jika list nanti dinamis, lebih aman key yang stabil (mis. `key={`skeleton-${i}`}`).

**Saran:**  
- Opsional: ganti ke key stabil seperti `key={`payment-skeleton-${i}`}` agar tidak konflik dengan key lain dan konsisten.

---

### 10. renderContent sebagai fungsi biasa — recreated tiap render

**File:line:**  
- `src/mobile/pages/subscription/ManagementTabPage.tsx:29-62`

**Temuan:**  
- `const renderContent = () => { ... }` lalu `{renderContent()}`.  
- Fungsi baru setiap render; isi (children) ikut direcreate. Tidak critical karena React tetap reconcile, tapi sedikit tidak efisien dan bisa dihindari dengan langsung JSX di return atau useMemo untuk konten.

**Saran:**  
- Ganti dengan variabel konten (mis. `const content = ...; return (... content ...)`) atau useMemo untuk node yang berat; tidak wajib.

---

### 11. PDF invoice: company name fallback hardcoded

**File:line:**  
- `src/mobile/pages/subscription/section/management/MobilePaymentHistory.tsx:107`

**Temuan:**  
- `orgData?.company_name || "Perusahaan Anda"`.  
- Fallback "Perusahaan Anda" hardcoded; tidak ikut i18n.

**Saran:**  
- Gunakan `t('subscription.management.invoiceCompanyFallback', 'Perusahaan Anda')` atau key serupa.

---

## Checklist singkat perbaikan

- [ ] Tampilkan state error subscription (pakai statusError) dan retry.  
- [ ] handleDownloadReceipt dibungkus try/catch + toast error; optional loading state tombol.  
- [ ] formatIDR di 10-management di-guard (atau pakai dari 1-login).  
- [ ] Estimasi tagihan tahunan pakai annual_discount_percentage jika ada.  
- [ ] Payment history query: tambah staleTime/gcTime.  
- [ ] formatDate diekstrak ke util bersama.  
- [ ] Loading state tombol unduh PDF.  
- [ ] i18n untuk string hardcoded (incremental).  
- [ ] Optional: key skeleton stabil; renderContent → variabel/useMemo; invoice fallback i18n.

Setelah perbaikan High dan Medium, halaman management lebih aman (error + PDF), tampilan harga konsisten, dan loading lebih ringan berkat cache payment history.
