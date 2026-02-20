# Strict Subscription & Trial Expiry Enforcement

## Overview
Aplikasi ini menerapkan penguncian yang ketat berdasarkan tanggal akhir trial (`trial_end_date`) dan subscription (`subscription_end_date`) dari tabel `organization_subscriptions`. Penguncian berlaku untuk **semua akses** baik di desktop maupun mobile.

## Prinsip Implementasi

### 1. Date-Based Enforcement (Prioritas Utama)
- **Sumber Data**: Tabel `organization_subscriptions`
- **Kolom yang Diperiksa**:
  - `trial_end_date` - untuk subscription trial
  - `subscription_end_date` - untuk subscription aktif
- **Logika Prioritas**: `subscription_end_date` memiliki prioritas lebih tinggi daripada `trial_end_date`

### 2. Multi-Layer Protection
Aplikasi memiliki 3 lapisan proteksi:
1. **SubscriptionExpiryGuard** (Level 1) - Melindungi semua route
2. **HomeAccessGuard** (Level 2) - Pengecekan tambahan untuk home route
3. **useSubscriptionExpiry** Hook - Centralized expiry checking

## Implementasi Detail

### Hook: useSubscriptionExpiry
**Lokasi**: `src/hooks/useSubscriptionExpiry.ts`

**Fitur**:
- ✅ Pengecekan berdasarkan `trial_end_date` dan `subscription_end_date`
- ✅ Normalisasi UTC untuk perbandingan tanggal yang akurat
- ✅ Refetch interval: **1 menit** (untuk deteksi yang cepat)
- ✅ Stale time: **30 detik** (untuk akurasi maksimal)
- ✅ Realtime subscription via `useSubscriptionExpiryRealtime`

**Logika Pengecekan**:
```typescript
// 1. Jika subscription_end_date ada, check subscription expiry terlebih dahulu
// 2. Jika subscription_end_date tidak ada atau sudah expired, check trial_end_date
// 3. Subscription_end_date memiliki prioritas lebih tinggi
// 4. Semua tanggal dinormalisasi ke UTC untuk perbandingan yang akurat
```

### Component: SubscriptionExpiryGuard
**Lokasi**: `src/components/SubscriptionExpiryGuard.tsx`

**Fungsi**:
- Melindungi **semua route** di aplikasi (desktop dan mobile)
- Mengunci akses jika `isExpired = true`
- Mengizinkan route renewal meskipun expired:
  - `/login`
  - `/create-plan`
  - `/subscription/plans`
  - `/subscription/overview`
  - `/subscription/management`
  - `/register`
  - `/verify-email`
  - `/email-verified`

**Integration**: 
- Di-wrap di `App.tsx` (line 130) untuk melindungi semua route

### Component: HomeAccessGuard
**Lokasi**: `src/components/HomeAccessGuard.tsx`

**Fungsi**:
- Layer tambahan untuk proteksi home route (`/` dan `/dashboard`)
- Memeriksa expiry status sebelum melakukan pengecekan status subscription
- Mengimplementasikan **STRICT EXPIRY CHECK** sebagai layer pertama

**Logika**:
1. Check expiry status (date-based) ← **PRIORITAS PERTAMA**
2. Check `has_active_subscription` dari table `organizations`
3. Check `status` dari table `organization_subscriptions` (fallback)

## Realtime Updates

### Hook: useSubscriptionExpiryRealtime
**Lokasi**: `src/hooks/useSubscriptionExpiryRealtime.ts`

**Fungsi**:
- Subscribe ke perubahan realtime pada table `organization_subscriptions`
- Invalidasi cache secara otomatis saat data subscription berubah
- Memastikan aplikasi langsung mendeteksi perubahan subscription (renewal/expiry)

**Event Handling**:
- `INSERT` - Subscription baru dibuat
- `UPDATE` - Subscription diperbarui (renewal, cancellation, dll)
- `DELETE` - Subscription dihapus

## Route Protection Strategy

### Protected Routes (Locked When Expired)
**Semua route kecuali renewal routes** akan terkunci jika subscription/trial expired:
- Home routes (`/`, `/dashboard`)
- Employee routes (`/employees/*`)
- Mobile routes (`/profile`, `/schedule`, `/client-visit`, `/reports`)
- Management routes
- Dan semua route aplikasi lainnya

### Allowed Routes (Accessible When Expired)
Route berikut tetap dapat diakses meskipun subscription expired:
- `/login` - Untuk login
- `/register` - Untuk registrasi
- `/verify-email` - Untuk verifikasi email
- `/email-verified` - Status verifikasi
- `/create-plan` - Untuk membuat/renew subscription
- `/subscription/plans` - Melihat paket subscription
- `/subscription/overview` - Overview subscription
- `/subscription/management` - Management subscription

## Date Comparison Logic

### UTC Normalization
Semua tanggal dinormalisasi ke UTC untuk memastikan perbandingan yang akurat:
```typescript
// Normalize date to UTC midnight for day-based comparison
const normalizeDate = (dateString: string | null) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));
};
```

### Expiry Detection
```typescript
// Check jika tanggal sekarang > tanggal akhir
if (normalizedNow > subscriptionEndDate) {
  // Subscription expired
  isExpired = true;
}
```

## Desktop vs Mobile

### Shared Implementation
- ✅ Sama-sama menggunakan `SubscriptionExpiryGuard`
- ✅ Sama-sama menggunakan `useSubscriptionExpiry` hook
- ✅ Sama-sama menggunakan `useSubscriptionExpiryRealtime` hook
- ✅ Sama-sama di-wrap di `App.tsx`

### No Separate Mobile Implementation Needed
Tidak perlu implementasi terpisah untuk mobile karena:
- Route structure shared antara desktop dan mobile
- Hooks dan components shared
- Supabase client shared

## Testing

### Manual Testing

1. **Test Trial Expiry**:
```sql
-- Set trial_end_date to past date
UPDATE organization_subscriptions 
SET trial_end_date = '2024-01-01'
WHERE organization_id = '<your_org_id>';
```
- Akses aplikasi (desktop/mobile)
- Harus melihat `SubscriptionExpiredPage`
- Hanya route renewal yang dapat diakses

2. **Test Subscription Expiry**:
```sql
-- Set subscription_end_date to past date
UPDATE organization_subscriptions 
SET subscription_end_date = '2024-01-01'
WHERE organization_id = '<your_org_id>';
```
- Akses aplikasi (desktop/mobile)
- Harus melihat `SubscriptionExpiredPage`
- Hanya route renewal yang dapat diakses

3. **Test Renewal**:
```sql
-- Set subscription_end_date to future date
UPDATE organization_subscriptions 
SET subscription_end_date = '2025-12-31'
WHERE organization_id = '<your_org_id>';
```
- Realtime hook harus detect perubahan
- Aplikasi harus unlock otomatis
- Semua route harus dapat diakses kembali

## Monitoring & Logging

### Development Logs
Di development mode, aplikasi akan log:
- Expiry check results
- Date normalization details
- Expiry status changes
- Realtime subscription events

### Console Warnings
Aplikasi akan menampilkan console warnings ketika:
- Subscription expired dan access denied
- Date-based expiry detection
- Route lock enforcement

## Best Practices

1. **Selalu check tanggal, bukan hanya status**: Date-based check lebih akurat daripada status-based
2. **Gunakan UTC normalization**: Untuk menghindari timezone issues
3. **Implement multi-layer protection**: Tidak hanya rely pada satu guard
4. **Enable realtime updates**: Untuk deteksi perubahan yang cepat
5. **Frequent refetch**: Check setiap 1 menit untuk deteksi yang cepat

## File Structure

```
src/
├── hooks/
│   ├── useSubscriptionExpiry.ts          # Main expiry checking hook
│   └── useSubscriptionExpiryRealtime.ts  # Realtime subscription updates
├── components/
│   ├── SubscriptionExpiryGuard.tsx        # Route-level protection
│   └── HomeAccessGuard.tsx               # Home route protection
├── features/
│   └── 1-login/
│       └── pages/
│           └── SubscriptionExpiredPage.tsx  # Expired page UI
└── App.tsx                                 # Route wrapping
```

## Important Notes

⚠️ **CRITICAL**: 
- Penguncian berdasarkan **TANGGAL**, bukan hanya status
- `subscription_end_date` memiliki prioritas lebih tinggi daripada `trial_end_date`
- Semua pengecekan menggunakan UTC untuk akurasi maksimal
- Realtime updates memastikan deteksi perubahan yang cepat
- Multi-layer protection memastikan tidak ada celah bypass

✅ **VERIFIED**:
- Desktop routes protected ✅
- Mobile routes protected ✅
- Realtime updates working ✅
- Date-based enforcement strict ✅
- UTC normalization accurate ✅

