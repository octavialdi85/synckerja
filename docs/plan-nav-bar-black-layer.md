# Rencana: Lapisan Hitam Hanya di Area Navigation Bar Sistem Android

## Konteks

- **Yang diubah:** Hanya **navigation bar sistem Android** (area gesture / tombol Back–Home–Recent di paling bawah layar). Bukan tab navigasi dalam app (Home, Schedule, Client Visit, dll.).
- **Target:** Background area sistem Android di bawah itu terlihat **hitam** di semua halaman.
- **Cara:** **Tetap transparan** di sisi sistem (`setNavigationBarColor(Color.TRANSPARENT)` tidak diubah), tapi **lapisan hitam hanya di area navigasi device** digambar oleh app (satu elemen fixed di bawah dengan tinggi = tinggi area navigasi, background hitam).

## Alasan pendekatan

- Jika navigation bar di-set ke warna hitam di native (`setNavigationBarColor(Color.BLACK)`), transparansi hilang dan seluruh bar jadi solid hitam; itu tetap opsi, tapi Anda minta “tetap transparan + lapisan hitam”.
- Maka dipilih: **sistem tetap transparan**, app menambah **satu div fixed** di bawah dengan:
  - `position: fixed; bottom: 0; left: 0; right: 0`
  - `height` = tinggi area navigasi = safe area bottom (dari plugin / CSS variable)
  - `background: black`
  - `z-index` di bawah footer app (mis. 40; footer tab pakai z-50) agar tab navigasi app tetap di atas dan hanya area di bawahnya yang hitam.

Hasil: area yang “tembus” di belakang navigation bar sistem adalah lapisan hitam dari app, sehingga hanya area navigasi device yang terlihat hitam; tab app dan konten lain tidak berubah.

## Pemetaan teknis

- **Tinggi lapisan hitam** = nilai yang sama dengan safe area bottom (navigation bar height): pakai `--safe-area-inset-bottom` yang sudah di-set di [NativeSafeAreaWrapper](src/mobile/components/NativeSafeAreaWrapper.tsx) / [SafeAreaInsetsContext](src/mobile/contexts/SafeAreaInsetsContext.tsx).
- **Lokasi render:** Satu tempat, hanya saat native (Capacitor), agar berlaku **semua halaman** tanpa ubah tiap halaman. Tempat yang tepat: di dalam wrapper yang sudah punya akses ke safe area dan hanya jalan di native, yaitu **NativeSafeAreaWrapper** (atau komponen dalam yang punya akses ke `bottom` inset).
- **Struktur saat ini:**  
  `NativeSafeAreaWrapper` → (native only) → `SafeAreaInsetsProvider` → `NativeSafeAreaWrapperInner` → satu `div` dengan `paddingTop`/`paddingBottom` dan CSS variables → `{children}`.
- **Perubahan:** Di `NativeSafeAreaWrapperInner`, render lapisan hitam sebagai **sibling** dari div yang ada (bukan ganti padding):
  - Tetap: satu `div` dengan padding dan `--safe-area-inset-top` / `--safe-area-inset-bottom` seperti sekarang, berisi `{children}`.
  - Tambah: satu elemen (mis. `div`) untuk “navigation bar black layer”:
    - `position: fixed; bottom: 0; left: 0; right: 0`
    - `height: ${bottom}px` (dari `useSafeAreaInsets().bottom`)
    - `backgroundColor: '#000'` (atau class `bg-black`)
    - `zIndex: 40` (di bawah footer app yang z-50)
    - `aria-hidden="true"` (dekoratif)
    - Hanya render jika `bottom > 0` agar di web/desktop (inset 0) tidak ada strip kosong.

## Langkah implementasi

### 1. Edit NativeSafeAreaWrapperInner

- **File:** [src/mobile/components/NativeSafeAreaWrapper.tsx](src/mobile/components/NativeSafeAreaWrapper.tsx)
- **Perubahan:**
  - Di `NativeSafeAreaWrapperInner`, dapatkan `bottom` dari `useSafeAreaInsets()` (sudah ada).
  - Return fragment atau wrapper yang berisi:
    1. **Div utama seperti sekarang:** padding, CSS variables, `{children}`.
    2. **Lapisan hitam (hanya native, bottom > 0):**  
       Satu `div` dengan:
       - `position: 'fixed'`, `bottom: 0`, `left: 0`, `right: 0`
       - `height: bottom` (px)
       - `backgroundColor: '#000'` (atau Tailwind `bg-black`)
       - `zIndex: 40`
       - `aria-hidden: true`
  - Pastikan tidak ada elemen lain yang menutupi lapisan ini di area yang sama dengan z-index antara 40–49; footer app tetap 50 sehingga tetap di atas.

### 2. Verifikasi

- **Web:** Tidak render lapisan (karena NativeSafeAreaWrapper hanya menambah ini di native) atau `bottom === 0` sehingga strip tidak tampak.
- **Android:** Build & jalankan di device/emulator; pastikan:
  - Hanya area di bawah tab navigasi app (area gesture/navigasi sistem) yang hitam.
  - Tab navigasi app (Home, Schedule, dll.) tidak berubah dan tetap di atas.
  - Berlaku di semua halaman (karena satu komponen global).

## Ringkasan file

| Aksi | File |
|------|------|
| Edit | [src/mobile/components/NativeSafeAreaWrapper.tsx](src/mobile/components/NativeSafeAreaWrapper.tsx) — tambah satu div fixed hitam dengan tinggi `bottom`, z-index 40, hanya bila `bottom > 0`. |

Tidak ada perubahan di **MainActivity** (navigation bar tetap transparan); tidak ada perubahan di tiap halaman atau footer navigasi app.
