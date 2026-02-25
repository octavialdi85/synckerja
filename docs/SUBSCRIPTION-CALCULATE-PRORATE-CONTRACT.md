# Kontrak RPC calculate_prorate_upgrade dan Edge Function calculate-prorate

## RPC `calculate_prorate_upgrade`

- **Lokasi:** `supabase/migrations/20260225000000_calculate_prorate_upgrade_rpc.sql`
- **Signature:** `(p_org_id uuid, p_new_member_count integer, p_target_plan_id uuid DEFAULT NULL)`
- **Return:** **Satu objek JSONB** (bukan array). Jangan ubah ke `RETURNS SETOF jsonb` agar edge function dan frontend tidak perlu mengurai array.

### Bentuk return sukses (sesuai ProRateCalculation)

```json
{
  "success": true,
  "current_plan": {
    "id": "uuid",
    "name": "string",
    "member_count": number,
    "base_price_per_member": number,
    "billing_cycle": "monthly" | "yearly",
    "end_date": "ISO date string"
  },
  "target_plan": {
    "id": "uuid",
    "name": "string",
    "base_price_per_member": number
  },
  "calculation": {
    "new_member_count": number,
    "member_difference": number,
    "remaining_days": number,
    "total_days": number,
    "prorate_percentage": number,
    "prorate_amount": number,
    "plan_change_charge": number,
    "member_change_charge": number,
    "is_upgrade": boolean,
    "is_plan_change": boolean,
    "charge_now": boolean,
    "change_type": "upgrade" | "downgrade" | "member_increase",
    "scheduled_date": "ISO datetime string",
    "current_daily_rate": number,
    "target_daily_rate": number,
    "current_plan_credit": number
  }
}
```

### Bentuk return error (validasi)

```json
{ "error": "Pesan error" }
```

Edge function harus mengembalikan ini dengan status 400.

## Edge function `calculate-prorate`

- Menerima body: `{ new_member_count, target_plan_id? }`.
- Mengambil `org_id` dari `profiles.active_organization_id` (user yang login).
- Memanggil `supabase.rpc('calculate_prorate_upgrade', { org_id, new_member_count, target_plan_id: target_plan_id || null })`.
- **Return:** Kirim **langsung** hasil RPC ke client (`JSON.stringify(calculation)`). Jangan bungkus lagi.
- **Jika nanti RPC diubah jadi RETURNS SETOF jsonb:** Di edge function, normalisasi ke satu objek sebelum kirim, contoh:
  `const result = Array.isArray(calculation) && calculation.length > 0 ? calculation[0] : calculation;`
  lalu `return new Response(JSON.stringify(result), ...)`.

## Frontend

- **Hook:** `useProRateCalculation` → `supabase.functions.invoke('calculate-prorate', { body: request })`.
- **Type:** `ProRateCalculation` di `src/features/10-Plans/hooks/useProRateCalculation.ts`.
- **Error:** Jika `data?.error` ada, lempar `new Error(data.error)`.
