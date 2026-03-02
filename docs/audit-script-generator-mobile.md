# Audit Bug: Script Generator (/digital-marketing/social-media/script-generator)

**Scope:** Halaman script-generator (desktop & mobile Android). Fokus: potential bugs, error handling, fetch redundant, loading, console errors, logic errors.

---

## HIGH PRIORITY

### 1. Fetch berulang / redundant – master data 3x load
**File:Line:**  
- `ScriptGeneratorPage.tsx` (wrap dengan `RealtimeSocialMediaProvider` → `SocialMediaProvider`)  
- `SocialMediaContext.tsx` → `useOptimizedSocialMediaData.ts` (contentPlans + masterData)  
- `ScriptGeneratorForm.tsx:361-404` (loadMasterData: content_types, services, sub_services, content_pillars)  
- `SaveToPlanModal.tsx:92-117` (loadMasterData: same 4 tables + employees)

**Penjelasan:**  
Saat buka script-generator, `useOptimizedSocialMediaData` tetap jalan (content plans + master data). Form sendiri fetch master data yang sama. Saat buka "Save to Plan", modal fetch lagi master data yang sama. Master data (content_types, services, sub_services, content_pillars) di-fetch sampai 3x untuk satu flow.

**Dampak:** Loading lebih berat, request berlebihan, halaman terasa lebih lambat (terutama mobile).

**Saran:**  
- Pakai satu sumber master data: React Query dengan queryKey shared (mis. dari `getMasterDataQueryOptions`) dan pakai di Form + SaveToPlanModal (useQuery dengan key yang sama), ATAU  
- Hapus `RealtimeSocialMediaProvider` / `SocialMediaProvider` dari script-generator bila halaman ini tidak butuh content plans & realtime; lalu Form + Modal tetap pakai satu shared hook/query untuk master data.

---

### 2. Script-generator page memuat data dashboard (content plans + realtime)
**File:Line:**  
- `ScriptGeneratorPage.tsx:326-332`  
- `SocialMediaContext.tsx:59-69` → `useOptimizedSocialMediaData`  
- `RealtimeSocialMediaSubscriber.tsx` → `useRealtimeSocialMedia.ts`

**Penjelasan:**  
Halaman script-generator di-wrap `RealtimeSocialMediaProvider` → `SocialMediaProvider` → `useOptimizedSocialMediaData()` + `useRealtimeSocialMedia()`. Jadi setiap buka script-generator ikut fetch content plans + master data + subscribe realtime `social_media_plans`. Halaman ini tidak pakai daftar content plans; hanya butuh AI config + form master data + "Save to Plan".

**Dampak:** Request dan subscription tidak perlu, page load lebih berat, terutama di mobile.

**Saran:**  
- Opsi A: Jangan wrap script-generator dengan `RealtimeSocialMediaProvider`; buat route khusus yang hanya pakai provider untuk dashboard/calendar.  
- Opsi B: Buat lazy provider yang hanya mount `useOptimizedSocialMediaData` / realtime ketika benar-benar dipakai (mis. saat modal "Save to Plan" terbuka), supaya initial load script-generator tidak trigger fetch dashboard.

---

### 3. useScriptAIConfig: refetch setiap mount (staleTime: 0, refetchOnMount: 'always')
**File:Line:** `hooks/useScriptAIConfig.ts:29-31`

**Penjelasan:**  
`staleTime: 0` dan `refetchOnMount: 'always'` membuat config AI di-fetch ulang setiap kali komponen yang pakai hook ini mount (termasuk setiap navigasi ke script-generator). Config jarang berubah.

**Dampak:** Request berulang ke Supabase, loading tidak perlu.

**Saran:**  
Set `staleTime: 5 * 60 * 1000` (5 menit) dan `refetchOnMount: true` (default) atau `false`; atau hapus `refetchOnMount: 'always'` agar cache dipakai selama belum stale.

---

### 4. ScriptGeneratorForm: error Supabase tidak di-handle di loadMasterData
**File:Line:** `ScriptGeneratorForm.tsx:365-399`

**Penjelasan:**  
`loadMasterData` memakai `Promise.all` untuk 4 query Supabase. Setelah await, hanya `contentTypesResult.data` dll yang dipakai; `contentTypesResult.error`, `servicesResult.error` tidak dicek. Jika salah satu request gagal, error di-swallow dan state bisa tetap kosong tanpa umpan ke user.

**Dampak:** User tidak dapat feedback saat master data gagal load; form kosong tanpa pesan error.

**Saran:**  
Cek `*.error` tiap result; jika ada error, set state error (mis. `setMasterError`) dan tampilkan toast atau inline message; optional: retry button.

---

### 5. SaveToPlanModal: loadMasterData error hanya console.error, tidak ada UI feedback
**File:Line:** `SaveToPlanModal.tsx:92-117` (catch block line 115-116)

**Penjelasan:**  
Saat load master data gagal, hanya `console.error`; tidak ada toast, tidak ada state error, dropdown tetap kosong.

**Dampak:** User tidak tahu kenapa dropdown kosong atau "Create new plan" tidak bisa dipakai.

**Saran:**  
Set state error (mis. `masterError`) dan tampilkan pesan di modal + optional toast; disable submit "Create new" bila master belum berhasil load.

---

### 6. useSaveToPlan: newPlanData non-null assertion tanpa guard runtime
**File:Line:** `hooks/useSaveToPlan.ts:95-105, 97-105`

**Penjelasan:**  
`if (planId === 'new' && !isNewPlanDataComplete(newPlanData))` sudah ada, tapi di dalam blok `if (planId === 'new')` dipakai `newPlanData!` (non-null assertion). Jika ada bug pemanggilan dengan `planId === 'new'` tapi `newPlanData` undefined, akan runtime error.

**Dampak:** Potensi crash saat "Save to Plan" dengan create new plan jika pemanggil salah.

**Saran:**  
Di dalam blok `planId === 'new'` tambah guard: `if (!newPlanData) { toast.error(...); return false; }` lalu pakai `newPlanData` tanpa `!`.

---

## MEDIUM PRIORITY

### 7. Console.log di production (useScriptAIConfig)
**File:Line:** `hooks/useScriptAIConfig.ts:12, 21-25`

**Penjelasan:**  
`console.log('[ScriptAI] No organizationId...')` dan `console.log('[ScriptAI] Config fetch:', {...})` selalu jalan di production.

**Dampak:** Console berisik, sedikit overhead; kebocoran info (organizationId, config) di console.

**Saran:**  
Hapus atau wrap dengan `if (import.meta.env.DEV)` / logger yang hanya log di development.

---

### 8. ScriptGeneratorForm: useEffect panggil handleInputChange tanpa useCallback
**File:Line:** `ScriptGeneratorForm.tsx:419-456` (useEffect deps: `[formData.content_pillar, formData.style_name, productKnowledgeStyles, contentPillars]`)

**Penjelasan:**  
useEffect memanggil `handleInputChange('style_name', '')` dan `handleInputChange('style_instruksi', '')` dll. `handleInputChange` tidak di-wrap useCallback dan tidak ada di dependency array. Bisa stale closure; ESLint exhaustive-deps akan warning.

**Dampak:** Risiko perilaku tidak konsisten saat pillar/style berubah; code smell.

**Saran:**  
Wrap `handleInputChange` dengan `useCallback` dan masukkan ke dependency array effect, atau panggil setter langsung di effect (e.g. `setFormData(prev => ({ ...prev, style_name: '', ... }))`) agar tidak bergantung pada closure.

---

### 9. AIScriptResult: mergeRevisedPart / mergeTableCellRevision bisa throw; catch hanya di handleRevisiConfirm
**File:Line:** `AIScriptResult.tsx:296-334` (handleRevisiConfirm), `mergeRevisedPart.ts` / `mergeTableCellRevision`

**Penjelasan:**  
`mergeRevisedPart`, `mergeTableCellRevision`, `mergeTableRowRevision` bisa throw atau return value yang menyebabkan replace gagal. Di catch hanya komentar "Error handled above"; tidak ada log atau toast tambahan jika error lain (mis. dari merge utils) terlempar.

**Dampak:** Error dari merge/utils bisa tidak terlihat oleh user.

**Saran:**  
Di catch, tambah `toast.error(err instanceof Error ? err.message : 'Revisi gagal')` atau log; pastikan state `isRevising` di-finally seperti sekarang.

---

### 10. scriptGeneratorAIService: res.json().catch(() => ({})) bisa sembunyikan parse error
**File:Line:** `services/scriptGeneratorAIService.ts:164`

**Penjelasan:**  
`const data = await res.json().catch(() => ({}));` Jika response body bukan JSON valid, `data` jadi `{}`. Kode berikutnya pakai `data?.error`, `data?.script`; bisa salah menganggap sukses atau pesan error hilang.

**Dampak:** Saat API return non-JSON (mis. 502 HTML), user dapat pesan error generik atau misleading.

**Saran:**  
Tetap catch parse error, tapi set flag atau return `{ success: false, error: 'Invalid response from server' }` dan jangan treat `{}` sebagai sukses.

---

### 11. SaveToPlanModal: loadMasterData dipanggil saat planMode === 'new' dan isOpen; race dengan contentTypes/contentPillars
**File:Line:** `SaveToPlanModal.tsx:154-156, 119-151`

**Penjelasan:**  
useEffect untuk `newPlanForm` (title, pic_id, ...) depend on `contentTypes`, `contentPillars`. Saat modal baru buka, `loadMasterData` async; `contentTypes` mungkin masih `[]`. Maka `parseAIScriptMetadata(script, contentTypes.map(...))` pakai array kosong; auto-fill content type/pillar dari script bisa tidak jalan.

**Dampak:** Auto-fill dari script kadang tidak muncul sampai master data selesai load (atau tidak pernah jika dependency tidak trigger re-run).

**Saran:**  
Jalankan set state untuk newPlanForm (dari script metadata) setelah master data selesai load, atau dalam callback setelah loadMasterData resolve, bukan hanya di useEffect yang depend on contentTypes/contentPillars (yang bisa masih kosong saat pertama buka).

---

### 12. ContentCalendarPlanPicker: useQuery enabled saat open; tidak ada error state di UI
**File:Line:** `ContentCalendarPlanPicker.tsx:53-68`

**Penjelasan:**  
Query `enabled: !!organizationId && !!selectedDate && open`. Jika `error` dari useQuery, tidak ada tampilan error di UI; hanya loading dan empty state.

**Dampak:** Jika fetch plans gagal, user hanya lihat "No plans for this date" tanpa tahu apakah error.

**Saran:**  
Gunakan `isError` dan `error` dari useQuery; tampilkan pesan error dan optional retry.

---

## LOW PRIORITY

### 13. ScriptGeneratorPage: artificial delay 300ms di handleGenerate
**File:Line:** `ScriptGeneratorPage.tsx:123`

**Penjelasan:**  
`await new Promise(resolve => setTimeout(resolve, 300));` sebelum `generateScript(data)`. Tidak ada kebutuhan fungsional yang jelas.

**Dampak:** Selalu menambah 300ms latency saat "Generate Script".

**Saran:**  
Hapus delay kecuali ada alasan UX (mis. skeleton); untuk percepatan hapus saja.

---

### 14. RevisiModal: onConfirm tidak re-throw setelah catch
**File:Line:** `RevisiModal.tsx:43-49`

**Penjelasan:**  
`try { await onConfirm(trimmed); onClose(); } catch { }`. Error di-swallow; parent (AIScriptResult) sudah handle toast, tapi pemanggil lain tidak bisa tahu bahwa operasi gagal.

**Dampak:** Minor; behavior saat ini sudah cukup karena parent yang handle error.

**Saran:**  
Optional: `catch (e) { throw e; }` atau pass error ke parent lewat callback agar konsisten untuk semua pemakai RevisiModal.

---

### 15. parseScriptSections / parseAIScriptOutput: script null/undefined
**File:Line:** `parseScriptSections.ts:169`, `parseAIScriptOutput.ts:31-33`

**Penjelasan:**  
`parseScriptSections` pakai `script?.trim() || ''`; `parseAIScriptOutput` cek `if (!script || !script.trim())`. Sudah aman; tidak ada bug. Hanya dicatat bahwa pemanggil harus pass string (AIScriptResult/SaveToPlan sudah pass script dari state).

**Dampak:** Tidak ada.

**Saran:** Tidak ada.

---

### 16. Draft save effect jalan setiap perubahan state (generatedPrompt, aiGeneratedScript, …)
**File:Line:** `ScriptGeneratorPage.tsx:94-105`

**Penjelasan:**  
Setiap kali salah satu state draft berubah, effect tulis ke sessionStorage. Untuk perubahan kecil (e.g. ketik di manual edit) bisa sering sekali write. Tidak salah, tapi bisa di-throttle/debounce bila ingin kurangi I/O di mobile.

**Dampak:** Minor; sessionStorage write biasanya cepat.

**Saran:** Optional: debounce 500–1000 ms sebelum memanggil `saveDraft` untuk mengurangi write berulang saat user mengetik.

---

## RINGKASAN

| Prioritas | Jumlah | Fokus |
|-----------|--------|--------|
| High     | 6      | Redundant fetch, error handling, refetch berlebihan, guard runtime |
| Medium   | 6      | Console log, useCallback/effect deps, error UI, parse response, race condition, error state picker |
| Low      | 4      | Delay 300ms, catch rethrow, draft debounce |

**Rekomendasi utama untuk halaman lebih ringan dan load lebih cepat:**  
- Hilangkan atau tunda fetch dashboard (content plans + realtime) di script-generator (bug #1, #2).  
- Gunakan satu sumber master data untuk Form + SaveToPlanModal (bug #1).  
- Set `staleTime` useScriptAIConfig dan hindari refetch setiap mount (bug #3).  
- Tambah error handling dan feedback UI untuk load master data di Form dan Modal (bug #4, #5, #12).

Setelah perbaikan di atas, aplikasi akan lebih ringan, loading lebih cepat, dan tidak ada fetch berulang/redundant untuk flow script-generator.
