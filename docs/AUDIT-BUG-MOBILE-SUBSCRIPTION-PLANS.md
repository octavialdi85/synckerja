# Audit Bug: Mobile Android — Halaman /subscription/plans

**Lingkup:** `src/mobile/pages/subscription/*`, hooks & modals terkait, serta dependency (10-Plans, 10-management, 1-login utils).  
**Tujuan:** Daftar bug, error handling, logic errors, performa, dan saran perbaikan singkat.

---

## Ringkasan prioritas

| Prioritas | Jumlah |
|-----------|--------|
| High      | 4      |
| Medium    | 8      |
| Low       | 6      |

---

## HIGH

### 1. Duplicate fetch daftar plan — loading lebih berat & lambat

**File:line:**  
- `src/mobile/pages/subscription/section/HRISSubscriptionPlansTab.tsx:358` (useSubscriptionPlans)  
- `src/features/10-management/hooks/useOptimizedSubscription.ts:203-223` (subscriptionPlans query)

**Temuan:**  
- Halaman memakai `useSubscriptionPlans()` (queryKey `['subscription-plans']`) untuk list plan.  
- `useOptimizedSubscription()` juga fetch `subscription_plans` dengan queryKey `['subscriptionPlans']`.  
- Dua query key berbeda → dua request ke Supabase untuk data yang sama.  
- Akibat: loading halaman lebih lambat, bandwidth dobel, cache terpecah.

**Saran:**  
- Pakai satu sumber saja: mis. hanya `useOptimizedSubscription()` dan turunkan `subscriptionPlans` ke konten; atau  
- Samakan query key (mis. pakai `optimizedQueryKeys.subscription.plans`) di `useSubscriptionPlans` agar cache dipakai bersama dan request tidak dobel.

---

### 2. `formatIDR` tanpa guard NaN/undefined — tampilan "Rp NaN"

**File:line:**  
- `src/features/1-login/utils/subscriptionUtils.ts:2-8`  
- Pemakaian: `HRISSubscriptionPlansTab.tsx` (totalPrice, monthlyPrice, base_price_per_member), modals, PendingChangesCard.

**Temuan:**  
- `formatIDR(amount: number)` memakai `Intl.NumberFormat`. Jika `amount` adalah `NaN` atau `undefined`, hasil bisa "Rp NaN" atau error.  
- `calculatePlanPrice` pakai `plan.base_price_per_member * members`; jika `base_price_per_member` undefined → NaN.  
- `formatIDR(plan.base_price_per_member)` di PlanCard (line 329) juga rentan jika field tidak ada.

**Saran:**  
- Di `formatIDR`: normalisasi input, mis. `const n = Number(amount); if (!Number.isFinite(n)) return 'Rp 0';` lalu format `n`.  
- Di `calculatePlanPrice` dan tempat lain: pastikan `base_price_per_member` punya default (mis. 0) sebelum hitung/format.

---

### 3. Harga tahunan salah pakai diskon 20% tetap

**File:line:**  
- `src/features/1-login/utils/subscriptionUtils.ts:14-16` (`getYearlyPriceForMembers`)  
- `src/mobile/pages/subscription/section/HRISSubscriptionPlansTab.tsx:419-421` (handleConfirmUpgrade – fullPrice tahunan)

**Temuan:**  
- `getYearlyPriceForMembers` selalu pakai `* 0.8` (20% discount).  
- Di UI, diskon per plan dipakai `plan.annual_discount_percentage` (calculatePlanPrice, PlanCard).  
- Saat konfirmasi bayar, fullPrice tahunan dihitung dengan `getYearlyPriceForMembers` → mengabaikan `annual_discount_percentage` plan.  
- Akibat: total yang dihitung bisa tidak sesuai plan (terlalu besar/kecil).

**Saran:**  
- Tambah parameter diskon ke util, mis. `getYearlyPriceForMembers(basePrice, memberCount, annualDiscountPercent?)` dan pakai `(1 - (annualDiscountPercent ?? 20) / 100)`.  
- Atau hitung fullPrice tahunan inline dengan `plan.annual_discount_percentage` seperti di `calculatePlanPrice`, jangan pakai util yang fix 20%.

---

### 4. Promise dalam executor `new Promise(async ...)` — unhandled rejection & race

**File:line:**  
- `src/features/10-Plans/hooks/useMidtransPayment.ts:224-266` (`loadMidtransScript`)

**Temuan:**  
- `return new Promise(async (resolve, reject) => { ... })`.  
- Async executor: rejection di dalam tidak otomatis memanggil `reject`; error bisa jadi unhandled.  
- Race: executor return Promise, bukan nilai sync; resolve/reject bisa dipanggil setelah promise selesai.

**Saran:**  
- Jangan pakai async di executor. Pakai `.then()/.catch()` di dalam, atau refactor ke `async function loadMidtransScript()` dan `return` hasil dari fungsi async (tanpa `new Promise(async ...)`).

---

## MEDIUM

### 5. `isPopular` tidak dihitung di mobile — badge "Paling Populer" tidak pernah muncul

**File:line:**  
- `src/mobile/pages/subscription/section/HRISSubscriptionPlansTab.tsx:384-395` (planMetaList), `461-469` (sortedPlans.map)

**Temuan:**  
- `PlanMeta` hanya punya `{ plan, maxMembers, isCurrent, isTrial }`.  
- Di map dipakai `isPopular` dari destructure, tapi tidak ada di `PlanMeta` → selalu `undefined`.  
- Desktop (`features/10-Plans/HRISSubscriptionPlansTab.tsx`) menghitung `isPopular = plan.name.toLowerCase().includes('professional')`.

**Saran:**  
- Tambah `isPopular` ke `PlanMeta` (mis. `plan.name.toLowerCase().includes('professional')` atau logic yang sama dengan desktop) dan isi di `planMetaList`.  
- Pass `isPopular` ke `PlanCard` seperti di desktop.

---

### 6. Double toast saat batalkan perubahan terjadwal

**File:line:**  
- `src/features/10-Plans/hooks/useCancelScheduledChange.ts:32-35` (onSuccess: toast.success)  
- `src/mobile/pages/subscription/section/HRISSubscriptionPlansTab.tsx:164-167` (handleCancel: toast.success)

**Temuan:**  
- Mutation `useCancelScheduledChange` di onSuccess memanggil `toast.success(data.message)`.  
- Di `MobilePendingChangesCard`, setelah `cancelScheduledChange.mutateAsync(changeId)` sukses, juga dipanggil `toast.success("Perubahan berhasil dibatalkan.")`.  
- Hasil: dua toast untuk satu aksi.

**Saran:**  
- Hapus toast di salah satu tempat: cukup di hook onSuccess, atau cukup di handleCancel; jangan keduanya.

---

### 7. Error handling fetch employee count — hanya console + throw

**File:line:**  
- `src/features/share/hooks/useEmployeeCount.ts:19-22`

**Temuan:**  
- `if (error) { console.error('...'); throw error; }`.  
- User tidak dapat feedback; halaman plans bisa tampil dengan `currentEmployeeCount = 0` (default) tanpa tahu bahwa data employee gagal.  
- Bisa mempengaruhi logic downgrade / batas member.

**Saran:**  
- Tidak perlu toast di hook (bisa spam).  
- Pastikan UI (mis. error state atau fallback) menangani `isError` dari query dan tampilkan pesan singkat atau retry, terutama jika halaman mengandalkan employee count untuk keputusan plan.

---

### 8. Konfirmasi batalkan pakai `window.confirm` — UX mobile buruk

**File:line:**  
- `src/mobile/pages/subscription/section/HRISSubscriptionPlansTab.tsx:158`

**Temuan:**  
- `const confirmed = window.confirm("Batalkan perubahan terjadwal ini?");`  
- Di Android, dialog native confirm sering tidak konsisten dengan tema app dan kurang aksesibel.

**Saran:**  
- Ganti dengan modal/Dialog dalam app (mis. komponen konfirmasi yang sudah dipakai di tempat lain) dengan teks dari i18n.

---

### 9. Modal konfirmasi upgrade tanpa loading state dari payment

**File:line:**  
- `src/mobile/pages/subscription/section/HRISSubscriptionPlansTab.tsx:521-535` (MobileUpgradeConfirmationModal)  
- `src/mobile/pages/subscription/section/modal/MobileUpgradeConfirmationModal.tsx:61, 221-234`

**Temuan:**  
- Modal menerima `isLoading` optional tapi pemanggil tidak pass `isLoading`.  
- `handleConfirmUpgrade` memanggil `await initiateMidtransPayment(...)`; selama proses tombol "Konfirmasi & Bayar" tidak disabled dan tidak ada spinner.  
- User bisa double-tap dan memicu dua kali payment flow.

**Saran:**  
- Pass state loading (mis. dari `useMidtransPayment().isLoading` atau state lokal saat `handleConfirmUpgrade` jalan) ke modal sebagai `isLoading` dan disable tombol + tampilkan spinner sesuai aturan modal Android.

---

### 10. Redirect penuh setelah payment (onError/onClose) — berat di mobile

**File:line:**  
- `src/features/10-Plans/hooks/useMidtransPayment.ts:186-194`

**Temuan:**  
- `onError` dan `onClose` memanggil `window.location.href = fallbackRedirectUrl` (full page reload).  
- Di mobile/Capacitor, full reload lebih berat dan bisa kehilangan state; lebih baik navigasi SPA.

**Saran:**  
- Gunakan `navigate('/subscription/plans')` (React Router) jika hook bisa mengonsumsi `useNavigate`, atau callback `onPaymentClose` yang di-inject dari halaman agar tetap SPA.

---

### 11. Tab label subscription tidak ikut i18n

**File:line:**  
- `src/mobile/pages/subscription/shared/SubscriptionTabs.tsx:19-31, 43-50`

**Temuan:**  
- `useAppTranslation` lokal hanya replace variable `{{x}}`, tidak memakai sistem i18n app.  
- Default string "Overview", "Plans", "Management" dipakai; saat bahasa diganti di settings, tab tidak berubah.

**Saran:**  
- Gunakan `useAppTranslation` dari `@/features/share/i18n/useAppTranslation` dan key yang sama dengan translations (mis. `subscription.tabs.overview`, `subscription.tabs.plans`, `subscription.tabs.management`).

---

### 12. ProRate calculation gagal tetap buka konfirmasi

**File:line:**  
- `src/mobile/pages/subscription/section/HRISSubscriptionPlansTab.tsx:417-420` (catch block di handleUpgrade)

**Temuan:**  
- Di catch: `setProRatedData(null); setConfirmationOpen(true)`.  
- Modal konfirmasi tetap terbuka tanpa data prorate; total bisa pakai fullPrice (ok), tapi teks "Tidak ada biaya tambahan" atau detail prorate bisa membingungkan.  
- Error sudah di-toast oleh `useProRateCalculation` onError, tapi UX konfirmasi tidak konsisten.

**Saran:**  
- Di catch jangan buka konfirmasi; cukup toast error dan jangan `setConfirmationOpen(true)`. Atau buka konfirmasi hanya untuk alur "tanpa prorate" dengan copy yang jelas (mis. "Bayar penuh" vs "Perubahan di akhir periode").

---

## LOW

### 13. Hardcoded copy Indonesia di PlanCard & PendingChangesCard

**File:line:**  
- `src/mobile/pages/subscription/section/HRISSubscriptionPlansTab.tsx` (banyak string: "Plan Aktif", "Paling Populer", "Segera Hadir", "Jumlah member", "Pembayaran Tahunan", "Fitur yang disertakan", "Batalkan perubahan terjadwal ini?", dll.)

**Temuan:**  
- Halaman tidak memakai `t()` untuk teks ini; ganti bahasa di settings tidak mengubah teks.

**Saran:**  
- Ganti string dengan key i18n yang sudah ada di `subscription.plans.*` (atau tambah jika belum) dan pakai `useAppTranslation` di komponen.

---

### 14. `subscriptionStatus` bertipe `any` di modal

**File:line:**  
- `src/mobile/pages/subscription/section/modal/MobileUpgradeConfirmationModal.tsx:43`

**Temuan:**  
- `subscriptionStatus: any` mengurangi type safety; typo atau property tidak ada tidak terdeteksi.

**Saran:**  
- Import tipe `SubscriptionStatus` dari `useOptimizedSubscription` dan pakai sebagai tipe prop.

---

### 15. Key list fitur pakai index

**File:line:**  
- `src/mobile/pages/subscription/section/HRISSubscriptionPlansTab.tsx:416`  
- `plan.features?.map((feature, index) => ( ... key={index} ... ))`

**Temuan:**  
- Key berbasis index bisa menyebabkan salah reuse DOM jika list berubah (reorder/tambah/hapus).

**Saran:**  
- Gunakan `key={feature}` jika isi unik, atau `key={`${plan.id}-${feature.slice(0,20)}`}`; hindari key murni index untuk list dinamis.

---

### 16. Console.log sisa di production path

**File:line:**  
- `src/mobile/pages/subscription/section/HRISSubscriptionPlansTab.tsx:419`  
- `console.log('⚠️ Subscription expired - forcing immediate charge:', ...);`

**Temuan:**  
- Log di branch expired subscription akan tampil di production.

**Saran:**  
- Hapus atau bungkus dengan `if (process.env.NODE_ENV === 'development')` / logger.

---

### 17. useOptimizedPerformanceMonitor — dependency tidak dipakai

**File:line:**  
- `src/features/10-management/hooks/useOptimizedPerformanceMonitor.ts:22`  
- `measurePerformance` useCallback dependency: `[componentName]`; `componentName` tidak dipakai di body.

**Temuan:**  
- Code smell kecil; dependency bisa menyesatkan.

**Saran:**  
- Hapus `componentName` dari dependency array jika tidak dipakai, atau gunakan untuk logging/identifier.

---

### 18. Duplicate toast di useSchedulePlanChange

**File:line:**  
- `src/features/10-Plans/hooks/useSchedulePlanChange.ts:49-51` (onSuccess: toast.success)  
- `src/mobile/pages/subscription/section/HRISSubscriptionPlansTab.tsx:457` (toast.success("Perubahan dijadwalkan."))

**Temuan:**  
- Setelah schedule dari mobile, mutation onSuccess dan handleChooseScheduled keduanya memanggil toast → dua toast.

**Saran:**  
- Hapus salah satu: cukup di hook onSuccess atau cukup di handleChooseScheduled.

---

## Checklist singkat perbaikan

- [ ] Satu sumber data plan (hapus duplicate fetch).  
- [ ] formatIDR aman untuk NaN/undefined.  
- [ ] Harga tahunan pakai annual_discount_percentage plan.  
- [ ] loadMidtransScript tanpa async di Promise executor.  
- [ ] isPopular dihitung dan dipass di mobile.  
- [ ] Satu toast untuk cancel scheduled & satu untuk schedule success.  
- [ ] Konfirmasi batalkan pakai Dialog, bukan window.confirm.  
- [ ] Modal konfirmasi upgrade pakai isLoading dari payment.  
- [ ] Redirect setelah payment pakai navigate (SPA).  
- [ ] Tab subscription pakai i18n asli.  
- [ ] Catch proRate tidak otomatis buka konfirmasi (atau copy jelas).  
- [ ] Teks hardcoded diganti i18n.  
- [ ] Tipe subscriptionStatus di modal diperketat.  
- [ ] Key fitur bukan index.  
- [ ] Hapus/guard console.log production.  
- [ ] Optional: bersihkan dependency useOptimizedPerformanceMonitor.

Setelah perbaikan High dan Medium, aplikasi di halaman `/subscription/plans` diharapkan lebih ringan, loading lebih cepat, dan lebih konsisten (error handling, UX, i18n).
