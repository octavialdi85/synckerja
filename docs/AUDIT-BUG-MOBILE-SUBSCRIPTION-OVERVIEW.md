# Audit Bug: Mobile Subscription Overview (`/subscription/overview`)

Scope: halaman mobile Android `/subscription/overview`, `OverviewTabPage.tsx`, komponen shared dari `10-overview` (CurrentSubscription, EmployeeGrowthChart, UsageMetricsCards), hook `useOptimizedSubscription`, `useSubscriptionAnalytics`.

---

## Daftar Bug / Temuan

### High priority

| File:Line | Penjelasan | Saran perbaikan |
|-----------|------------|-----------------|
| **src/features/10-overview/hooks/useSubscriptionAnalytics.ts:145-146** | **Division by zero:** `growth_rate` dihitung dengan `(last - first) / employee_growth[0].count`. Jika `employee_growth[0].count === 0` maka pembagian menghasilkan `Infinity`. Nilai itu dipakai di `UsageMetricsCards` dengan `Math.round(metrics.growth_rate)%` → tampil "Infinity%". | Guard: `const firstCount = employee_growth[0].count; const growthRate = firstCount === 0 ? 0 : ((employee_growth[employee_growth.length - 1].count - firstCount) / firstCount) * 100;` atau clamp/fallback 0. |
| **src/features/10-overview/section/CurrentSubscription.tsx:6** | **Import path salah:** `import type { SubscriptionStatus } from '@/hooks/useOptimizedSubscription'`. File `src/hooks/useOptimizedSubscription.ts` tidak ada; type SubscriptionStatus ada di `@/features/10-management/hooks/useOptimizedSubscription`. Dapat menyebabkan build/runtime error atau type tidak konsisten. | Ganti menjadi `import type { SubscriptionStatus } from '@/features/10-management/hooks/useOptimizedSubscription'`. |
| **src/mobile/pages/subscription/OverviewTabPage.tsx:69-70** | **Analytics error tidak ditangani:** `useSubscriptionAnalytics()` mengembalikan `error` tetapi OverviewTabPage tidak memakainya. Jika query analytics gagal, user hanya melihat loading lalu chart/metrics kosong tanpa pesan error atau tombol retry. | Tampilkan state error untuk analytics (card error + retry) atau minimal fallback teks "Data analitik tidak tersedia" dan gunakan `error` / `isError` dari hook. |

---

### Medium priority

| File:Line | Penjelasan | Saran perbaikan |
|-----------|------------|-----------------|
| **src/features/10-overview/section/CurrentSubscription.tsx:15-21** | **formatDate tidak aman untuk invalid date:** `formatDate(dateString)` memanggil `new Date(dateString).toLocaleDateString(...)`. Jika `dateString` kosong atau invalid, hasil bisa "Invalid Date". Pemanggilan di line 89 di-guard dengan `expiryDate && formatDate(expiryDate)` sehingga undefined aman, tetapi string kosong `''` tetap masuk ke formatDate. | Di dalam formatDate: jika `!dateString` atau `!Number.isFinite(new Date(dateString).getTime())` return `'-'` atau teks fallback. |
| **src/features/10-overview/section/EmployeeGrowthChart.tsx:32** | **AreaChart dengan data kosong:** Jika `data === []` (tidak loading), Recharts AreaChart tetap di-render. Bisa tampil chart kosong tanpa pesan. Untuk UX lebih baik tampilkan state empty eksplisit. | Jika `!data?.length` dan `!isLoading`, render teks "Tidak ada data pertumbuhan karyawan" (atau i18n) alih-alih chart kosong. |
| **src/features/10-overview/hooks/useSubscriptionAnalytics.ts:50-52** | **Query analytics tanpa retry/fallback:** `useQuery` tidak set `retry`; default React Query akan retry. Tetapi jika gagal terus, UI hanya mengandalkan `isLoading`/`error` yang tidak ditampilkan di Overview. | Tambah penanganan error di halaman (lihat High) dan opsional: `retry: 1` atau `retry: false` agar tidak lama loading saat API bermasalah. |
| **src/mobile/pages/subscription/OverviewTabPage.tsx:35-42** | **Timer 10s retry: kemungkinan stale closure:** useEffect set timeout 10s untuk `refreshSubscriptionStatus()`. Jika dalam 10s user navigasi away atau org berubah, callback tetap memanggil refresh. Ref/cleanup sudah ada; pastikan dependency `refreshSubscriptionStatus` stabil (biasanya dari useQuery) agar tidak banyak timer terdaftar. | Pastikan cleanup selalu clearTimeout; dan/atau di dalam callback cek kondisi terkini (mis. organizationId) sebelum memanggil refresh. |
| **src/features/10-overview/section/UsageMetricsCards.tsx:19** | **Skeleton list key tidak stabil:** `key={index}` untuk placeholder skeleton. Lebih aman key unik per komponen agar tidak konflik dengan list lain. | Ganti ke `key={\`usage-metrics-skeleton-${index}\`}`. |

---

### Low priority

| File:Line | Penjelasan | Saran perbaikan |
|-----------|------------|-----------------|
| **src/mobile/pages/subscription/OverviewTabPage.tsx:46-74** | **renderContent sebagai fungsi:** Pola `const renderContent = () => { ... };` dan `{renderContent()}` membuat konten di-recreate tiap render. Lebih ringan pakai variabel (if/else isi `content`) atau useMemo. | Refactor ke satu variabel `content` (atau useMemo) lalu render `{content}`. |
| **src/features/10-overview/section/CurrentSubscription.tsx** | **Teks hardcoded (en):** "Current Subscription", "Trial", "Employee Usage", "Subscription", "Billing", dll. Tidak pakai i18n; bahasa tidak ikut pengaturan. | Gunakan `useAppTranslation` dan key `subscription.overview.*` di translations; ganti string dengan `t(...)`. |
| **src/features/10-overview/section/EmployeeGrowthChart.tsx** | **Teks hardcoded:** "Employee Growth", "Employee registration over the last 6 months". | Sama: i18n dengan key subscription.overview.*. |
| **src/features/10-overview/section/UsageMetricsCards.tsx** | **Teks hardcoded:** "Employee Utilization", "Plan Efficiency", "Growth Rate". | Sama: i18n. |
| **src/features/10-overview/section/RecentActivity.tsx:4** | **Import path salah (sama seperti CurrentSubscription):** `import type { SubscriptionStatus } from '@/hooks/useOptimizedSubscription'`. File tidak ada di `@/hooks`. | Ganti ke `@/features/10-management/hooks/useOptimizedSubscription`. |
| **src/mobile/pages/subscription/OverviewTabPage.tsx:52-66** | **Error dan konten tampil bersamaan:** Saat `statusError` true, error card ditampilkan dan di bawahnya tetap ada `subscriptionStatus && CurrentSubscription`. Bisa disengaja (tampilkan error + data terakhir); jika ingin “hanya error” maka sembunyikan CurrentSubscription saat statusError. | Putuskan UX: hanya error, atau error + data stale; sesuaikan conditional render. |

---

## Ringkasan prioritas

- **High:** 3 (division by zero, import path salah, analytics error tidak ada UI).
- **Medium:** 5 (formatDate invalid, empty chart, retry/analytics, timer cleanup, skeleton key).
- **Low:** 6 (renderContent pattern, i18n, import RecentActivity, error vs content UX).

---

## Rekomendasi performa / loading

- **Cache analytics:** `useSubscriptionAnalytics` sudah pakai `staleTime: 5 * 60 * 1000`, `gcTime: 30 * 60 * 1000`, `refetchOnMount: false`, `refetchOnWindowFocus: false` → baik untuk mengurangi request.
- **Subscription status:** `useOptimizedSubscription` sudah pakai staleTime/gcTime dan refetch dibatasi → satu sumber cache.
- **Halaman lebih ringan:** Perbaikan High (terutama guard growth_rate dan error analytics) mencegah tampilan rusak dan mengurangi kebingungan; tambah error state analytics agar tidak “loading selamanya” saat API gagal.

Setelah perbaikan High dan Medium, halaman overview lebih stabil, aman terhadap data invalid, dan punya fallback yang jelas saat API gagal.
