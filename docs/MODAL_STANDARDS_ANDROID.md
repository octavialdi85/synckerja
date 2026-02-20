# Modal Fullscreen Android — Standar (Referensi)

Dokumen ini ringkasan referensi. **Sumber utama dan acuan lengkap:** `.cursor/rules/modal-android-fullscreen.mdc` (di root repo).

## Ringkasan

- **Scope:** Modal fullscreen di Android yang memakai `modal-above-safe-area` dan `fullscreenAnimation={isMobile}`. Safe area hanya untuk fullscreen.
- **Header:** Padding `px-4 pt-4 pb-3`, selalu class `safe-area-top`, style gradient + border-b, `text-lg font-semibold`, align kiri.
- **Footer:** Padding `px-4 pt-3 pb-3`, style `border-t bg-muted/30`. Wajib `safe-area-padding-bottom` saat `isMobile` agar tombol tidak tertutup pita navigasi Android.
- **Layering:** Container pakai `modal-above-safe-area`; z-index ikuti `src/features/ui/dialog.tsx`.
- **Animasi:** `fullscreenAnimation={isMobile}`; overlay fade 80%.
- **Overlay:** Hitam 80% (`bg-black/80`). Tap overlay menutup modal jika dismissible.
- **Dismiss:** Semua modal fullscreen dismissible dengan tombol back Android; `onOpenChange` tidak memblokir close.
- **Tombol:** Primary biru (`--primary`), disabled abu-abu (`disabled:bg-muted disabled:text-muted-foreground`).
- **Safe area:** Variabel native dipakai bersama `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` (lihat `src/index.css`).
- **Aksesibilitas:** Focus trap (Radix); DialogTitle deskriptif; overlay `aria-label="Dialog backdrop"`.
- **Keyboard:** Rekomendasi `scrollIntoView` pada focus input; opsional `visualViewport` untuk form panjang.

## Checklist modal fullscreen baru

- [ ] Header: `safe-area-top`, padding konsisten, style standar.
- [ ] Footer: `safe-area-padding-bottom` saat `isMobile`.
- [ ] `modal-above-safe-area` + `fullscreenAnimation={isMobile}`.
- [ ] Overlay 80%, primary biru, disabled abu-abu, dismissible dengan back.
