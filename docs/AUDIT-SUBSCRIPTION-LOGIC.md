# Audit: Logika Subscription — /subscription/overview & /subscription/plans

**Tanggal audit:** 2025-02-25  
**Scope:** Halaman `/subscription/overview`, `/subscription/plans`, komponen terkait, edge functions, dan tampilan Payment History (invoice, next billing, status, transaction id, dll).

---

## 1. Ringkasan Eksekutif

| Aspek | Status | Catatan |
|-------|--------|--------|
| Perhitungan subscription (harga, member) | OK | getMonthlyPriceForMembers, getYearlyPriceForMembers, calculatePlanPrice konsisten |
| Prorate | Perhatian | Frontend memanggil edge function calculate-prorate yang tidak ada di repo; mungkin RPC calculate_prorate_upgrade dipakai di backend |
| Plan vs member count dan validasi member | OK | canChangePlan + useEmployeeCount (hanya status = active) |
| Billing cycle | OK | Monthly +1 bulan, yearly +1 tahun; edge case akhir bulan (lihat bawah) |
| Status pembayaran | OK | settlement/capture -> success; UI menampilkan settlement/success/paid |
| Payment type | OK | Awal midtrans, lalu di-update dari webhook/API ke channel riil |
| Transaction ID | OK | Diisi dari webhook / check-midtrans-payment-status |
| Invoice Issued | Diperbaiki | Sebelumnya pakai tanggal hari ini; sekarang pakai tanggal pembayaran (payment.created_at) |
| Next Billing Date | OK | Pakai subscription_end_date bila ada, fallback created_at + interval |
| Prorate detail (tampilan) | OK | Data dari useProRateCalculation / modal |
| Subscription start/end date | OK | Di-set di process-midtrans-payment dan check-midtrans-payment-status |

---

## 2. Perhitungan Subscription

- subscriptionUtils: getMonthlyPriceForMembers = base * count; getYearlyPriceForMembers = base * count * 12 * (1 - discount/100). OK.
- HRISSubscriptionPlansTab calculatePlanPrice: yearly pakai annual_discount_percentage, konsisten dengan getYearlyPriceForMembers. OK.

---

## 3. Prorate

- useProRateCalculation memanggil Edge Function calculate-prorate. Edge function memanggil RPC **calculate_prorate_upgrade** (repo: `supabase/migrations/20260225000000_calculate_prorate_upgrade_rpc.sql`). RPC mengembalikan **satu objek JSONB** (bukan array) dengan bentuk: `{ success, current_plan, target_plan, calculation }` atau `{ error }`. Pastikan edge function mengembalikan response RPC langsung ke client; jika suatu saat RPC diubah menjadi SETOF, edge function harus mengambil elemen pertama sebelum mengirim.
- Prorate amount dipakai benar di handleConfirmUpgrade/handleChooseImmediate; create-midtrans-payment menyimpan proRateDetails ke prorate_details. OK.

---

## 4. Plan vs Member Count dan Validasi Member

- useEmployeeCount: hanya employees dengan status = active. OK.
- canChangePlan: downgrade hanya jika currentEmployeeCount <= newMemberCount; plan lain juga currentEmployeeCount <= newMemberCount. OK.
- get_subscription_status (RPC) mengembalikan member_limit, employee_count; dipetakan ke member_count, current_employees. OK.

---

## 5. Billing Cycle

- addBillingInterval: yearly setFullYear+1, monthly setMonth+1. OK.
- Edge case: 31 Jan + 1 bulan = 3 Mar di JS. Opsional: pakai date-fns addMonths untuk "tanggal sama bulan berikutnya".
- Renewal: start = subscription_end_date lama, end = start + interval. Baru: start = now, end = now + interval. OK.

---

## 6. Status Pembayaran

- process-midtrans-payment dan check-midtrans-payment-status: settlement/capture -> status success di DB. UI getStatusBadgeVariant mengakui settlement, success, paid. OK.

---

## 7. Payment Type dan Transaction ID

- Payment type: insert midtrans, update dari webhook/API. Tampilan payment_type || midtrans. OK.
- Transaction ID: di-update dari notifikasi/API; check-midtrans pakai transaction_id || payment.transaction_id. OK.

---

## 8. Invoice Issued dan Next Billing Date (Receipt PDF)

- Invoice Issued: SEBELUMNYA new Date() (hari ini). SUDAH DIPERBAIKI: pakai payment.created_at (format dd MMMM yyyy). File: PaymentHistory.tsx variabel invoiceIssuedDate.
- Next Billing Date: subscriptionData?.subscription_end_date, fallback payment.created_at + 1 bulan/tahun. OK.
- Subscription start/end di receipt: dari organization_subscriptions where last_payment_id = payment.id. Untuk payment lama, last_payment_id bisa sudah berubah jadi subscriptionData null; fallback created_at dan created_at+interval. Opsional: simpan subscription_start_date/subscription_end_date di tabel payments saat aktivasi.

---

## 9. Subscription Start/End Date

- process-midtrans-payment dan check-midtrans-payment-status set subscription_start_date dan subscription_end_date benar (renewal = end lama + interval; baru = now + interval). Overview/CurrentPlanSection pakai get_subscription_status. OK.

---

## 10. Rekomendasi

1. Prorate: pastikan edge function calculate-prorate di-deploy atau pindah ke RPC calculate_prorate_upgrade.
2. Invoice Issued: sudah diperbaiki ke tanggal pembayaran.
3. Billing monthly akhir bulan: opsional perbaiki addBillingInterval (mis. date-fns addMonths).
4. Receipt historis: opsional simpan subscription_start_date/subscription_end_date di payments.

---

## 11. File yang Diubah

- src/features/10-management/components/sections/PaymentHistory.tsx: Invoice Issued di PDF receipt memakai tanggal pembayaran (payment.created_at), bukan tanggal hari ini.
