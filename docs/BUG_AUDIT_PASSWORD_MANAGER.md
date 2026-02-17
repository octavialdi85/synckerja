# Bug Audit: Halaman /password-manager (Password Manager)

Audit menyeluruh untuk fitur password manager (folder: `src/features/8-PaswordManager/`, route: `/password-manager`).

---

## High Priority

### 1. Loading tidak pernah false saat user/org belum tersedia
- **File:Line:** [src/features/8-PaswordManager/hooks/usePasswords.ts](src/features/8-PaswordManager/hooks/usePasswords.ts) — state `loading` dan useEffect yang memanggil `fetchPasswords`
- **Penjelasan:** State `loading` diinisialisasi `true`. `setLoading(false)` hanya dipanggil di blok `finally` di dalam `fetchPasswords`. Tetapi `fetchPasswords` memanggil `if (!user || !organizationId) return;` di awal tanpa memanggil `setLoading(false)`. Jadi jika `user` atau `organizationId` belum ada (mis. auth/org masih loading), effect yang bergantung pada `[user, organizationId]` tidak memanggil `fetchPasswords`, dan loading tetap `true` selamanya. Halaman akan menampilkan "Loading passwords..." tanpa henti.
- **Prioritas:** High
- **Saran:** Set `loading` ke `false` ketika `user` atau `organizationId` belum siap: di effect yang sama, tambah `else { setLoading(false); }` setelah kondisi `if (user && organizationId)`, atau panggil `setLoading(false)` di awal effect sebelum return ketika `!user || !organizationId`.

### 2. Dialog menutup sebelum save selesai (UX / logic)
- **File:Line:** [src/features/8-PaswordManager/section/AddPasswordDialog.tsx](src/features/8-PaswordManager/section/AddPasswordDialog.tsx) — `handleSubmit` (sekitar baris 87–91)
- **Penjelasan:** `handleSubmit` memanggil `onSave(formData)` lalu langsung `onOpenChange(false)`. Tipe `onSave` adalah `(data: PasswordFormData) => void`, padahal parent mengirim async `handleSavePassword` yang melakukan `await addPassword(data)` / `await updatePassword(...)`. Dialog tidak menunggu promise; dialog tutup segera setelah klik Save. Jika save gagal (toast dari hook), dialog sudah tertutup dan user tidak bisa mengoreksi lalu retry tanpa membuka lagi.
- **Prioritas:** High
- **Saran:** Ubah tipe `onSave` menjadi `(data: PasswordFormData) => void | Promise<void>`. Di `handleSubmit`, jika return value `onSave` adalah promise, gunakan `await onSave(formData)` lalu panggil `onOpenChange(false)` hanya setelah berhasil (dan di parent pastikan `handleSavePassword` return promise yang resolve setelah sukses, reject jika gagal). Atau: jangan panggil `onOpenChange(false)` di dalam dialog; biarkan parent memanggil `setDialogOpen(false)` hanya setelah await sukses (lalu pastikan parent memang menutup dialog hanya setelah sukses).

### 3. Set state setelah unmount (memory leak / warning)
- **File:Line:** [src/features/8-PaswordManager/hooks/usePasswords.ts](src/features/8-PaswordManager/hooks/usePasswords.ts) — `fetchCategories`, `fetchPasswords`, dan useEffect yang memanggil mereka
- **Penjelasan:** `fetchCategories()` dipanggil di effect dengan deps `[]`; `fetchPasswords()` dipanggil saat `user && organizationId`. Keduanya async dan memanggil `setCategories`, `setPasswords`, `setLoading` tanpa cek apakah komponen masih mounted. Navigasi cepat dari halaman bisa memicu setState setelah unmount. Effect ketiga (update category counts) juga memanggil `setCategories` tanpa guard.
- **Prioritas:** High
- **Saran:** Gunakan `isActiveRef` (useRef): di effect yang memanggil fetch, set `true` di awal dan `false` di cleanup. Di dalam `fetchCategories` dan `fetchPasswords` (dan di finally untuk loading), sebelum setiap `setPasswords` / `setCategories` / `setLoading`, cek `if (!isActiveRef.current) return;`. Di effect category counts, sebelum `setCategories` juga cek ref.

---

## Medium Priority

### 4. Clipboard API tidak di-handle (unhandled promise)
- **File:Line:**  
  - [src/features/8-PaswordManager/section/PasswordCard.tsx](src/features/8-PaswordManager/section/PasswordCard.tsx) — `copyToClipboard` (sekitar baris 36–40)  
  - [src/features/8-PaswordManager/section/PasswordGenerator.tsx](src/features/8-PaswordManager/section/PasswordGenerator.tsx) — `copyToClipboard` (sekitar baris 45–51)
- **Penjelasan:** `navigator.clipboard.writeText(text)` mengembalikan promise. Jika user menolak permission atau clipboard tidak tersedia, promise reject dan tidak ada catch. Unhandled rejection dan UI tidak memberi feedback (mis. toast "Failed to copy").
- **Prioritas:** Medium
- **Saran:** Tambah `.catch(() => {})` minimal, atau lebih baik: tangkap error dan tampilkan toast "Failed to copy to clipboard" (gunakan toast dari context/hook jika ada).

### 5. useEffect dependency tidak lengkap (stale closure / kategori)
- **File:Line:** [src/features/8-PaswordManager/hooks/usePasswords.ts](src/features/8-PaswordManager/hooks/usePasswords.ts) — effect ketiga (update category counts), deps `[passwords]` (sekitar baris 230–238)
- **Penjelasan:** Effect memakai `categories` di dalam body (`categories.map(...)`) tetapi dependency array hanya `[passwords]`. Jika `categories` berubah (mis. dari fetchCategories yang selesai setelah passwords), effect tidak dijalankan ulang dan bisa memakai nilai `categories` yang lama.
- **Prioritas:** Medium
- **Saran:** Tambahkan `categories` ke dependency array. Untuk menghindari loop (effect setCategories → categories berubah → effect jalan lagi), bisa gunakan pembanding: hanya panggil `setCategories` jika hasil hitung count benar-benar berubah (bandingkan per-id), atau pastikan referensi array/object hanya berubah bila data berubah.

### 6. PasswordGenerator — useEffect memanggil generatePassword tanpa dependency lengkap
- **File:Line:** [src/features/8-PaswordManager/section/PasswordGenerator.tsx](src/features/8-PaswordManager/section/PasswordGenerator.tsx) — useEffect (sekitar baris 53–55)
- **Penjelasan:** Effect memanggil `generatePassword()` dengan deps `[length, includeUppercase, includeLowercase, includeNumbers, includeSymbols]`. Fungsi `generatePassword` tidak ada di deps; ESLint exhaustive-deps akan warning. Perilaku saat ini benar (regenerate saat opsi berubah), tetapi dependency array secara formal tidak lengkap.
- **Prioritas:** Medium (code smell)
- **Saran:** Wrap `generatePassword` dengan `useCallback` yang depend pada `length, includeUppercase, ...` lalu masukkan ke deps effect, atau biarkan deps seperti sekarang dan tambah eslint-disable-next-line dengan komentar.

### 7. fetchCategories tidak filter by organization
- **File:Line:** [src/features/8-PaswordManager/hooks/usePasswords.ts](src/features/8-PaswordManager/hooks/usePasswords.ts) — `fetchCategories` (sekitar baris 16–40)
- **Penjelasan:** Query ke `password_categories` hanya `.select('*').order('name')` tanpa filter `organization_id`. Jika di DB tabel ini per-organization, daftar kategori bisa salah (semua org) atau tidak konsisten dengan data passwords yang sudah di-filter by `organization_id`.
- **Prioritas:** Medium (asumsi: skema DB kategori per-organization)
- **Saran:** Cek skema `password_categories`. Jika ada `organization_id`, tambahkan `.eq('organization_id', organizationId)` dan panggil fetch categories setelah `organizationId` tersedia (sama seperti fetchPasswords), atau panggil di effect yang sama dengan fetchPasswords.

---

## Low Priority

### 8. PasswordListFooter menampilkan category ID, bukan nama
- **File:Line:** [src/features/8-PaswordManager/section/PasswordListFooter.tsx](src/features/8-PaswordManager/section/PasswordListFooter.tsx) — `categoryText` (sekitar baris 12–14)
- **Penjelasan:** Saat `selectedCategory !== 'all'`, teks memakai `selectedCategory` langsung: "Showing X of Y passwords in {selectedCategory}". Nilai `selectedCategory` adalah category id (UUID atau string id), bukan nama kategori. User melihat id, bukan label yang ramah.
- **Prioritas:** Low
- **Saran:** Terima prop tambahan (mis. `categories: Array<{id, name}>` atau `selectedCategoryName: string`) dan tampilkan nama kategori, atau resolve id ke nama di parent dan pass nama ke footer.

### 9. AddPasswordDialog — controlled input value untuk url/notes
- **File:Line:** [src/features/8-PaswordManager/section/AddPasswordDialog.tsx](src/features/8-PaswordManager/section/AddPasswordDialog.tsx) — `value={formData.url}`, `value={formData.notes}` (sekitar baris 237, 246)
- **Penjelasan:** Tipe `PasswordFormData` memakai `url?: string` dan `notes?: string`. Nilai bisa `undefined`. Untuk input controlled, `value` harus string (atau number untuk input number). React menerima `value={undefined}` sebagai uncontrolled, sehingga bisa menimbulkan perilaku tidak konsisten.
- **Prioritas:** Low
- **Saran:** Gunakan `value={formData.url ?? ''}` dan `value={formData.notes ?? ''}` agar selalu string.

### 10. useCurrentUser — cache module-level bisa stale
- **File:Line:** [src/features/8-PaswordManager/hooks/useCurrentUser.ts](src/features/8-PaswordManager/hooks/useCurrentUser.ts) — `cachedUser`, `userPromise` (baris 7–8, 31–35)
- **Penjelasan:** Variabel modul `cachedUser` dan `userPromise` dipakai untuk cache. Pada logout, `onAuthStateChange` set `cachedUser = newUser` (null). Pada login lagi, `getUser()` akan dijalankan. Jika ada race (mis. dua komponen mount bersamaan), bisa saja promise lama masih dipakai. Secara umum cache konsisten dengan onAuthStateChange, tetapi edge case tetap mungkin.
- **Prioritas:** Low
- **Saran:** Verifikasi perilaku login/logout/switch user. Jika aman, biarkan; jika ada bug, pertimbangkan invalidasi cache yang eksplisit atau hanya andalkan `onAuthStateChange` tanpa cache modul.

### 11. Konfirmasi delete pakai `window.confirm`
- **File:Line:** [src/features/8-PaswordManager/PasswordManagerPage.tsx](src/features/8-PaswordManager/PasswordManagerPage.tsx) — `handleDeletePassword` (sekitar baris 104–108)
- **Penjelasan:** Menggunakan `confirm('Are you sure...')`. Berfungsi, tetapi tidak konsisten dengan UI aplikasi (biasanya pakai AlertDialog/Modal). Juga teks hardcoded dalam bahasa Inggris.
- **Prioritas:** Low
- **Saran:** Ganti dengan AlertDialog/Modal yang sama dengan bagian lain aplikasi dan gunakan i18n jika halaman lain mendukung terjemahan.

### 12. Typo nama folder
- **File:Line:** N/A (nama folder)
- **Penjelasan:** Folder feature bernama `8-PaswordManager` (huruf "s" hilang: "Pasword" bukan "Password"). Konsistensi dan kejelasan kode.
- **Prioritas:** Low
- **Saran:** Rename folder ke `8-PasswordManager` dan update semua import/path (App.tsx, route, sidebar, dll.). Bisa dilakukan dalam refactor terpisah agar tidak mengganggu git history.

---

## Ringkasan

| Prioritas | Jumlah |
|-----------|--------|
| High      | 3      |
| Medium    | 4      |
| Low       | 5      |

**Rekomendasi urutan perbaikan:** 1 (loading) → 2 (dialog close) → 3 (unmount guard), lalu 4 (clipboard), 5 (effect deps), 7 (categories org). Item Low bisa dijadwalkan belakangan atau digabung dengan refactor (mis. i18n, konsistensi UI).
