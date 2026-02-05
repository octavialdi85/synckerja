# Memperpanjang Session Login (Supabase)

Durasi session login diatur di **Supabase Dashboard**, bukan di kode.

## Di Supabase Dashboard

1. Buka **Supabase Dashboard** → project Anda → **Authentication** → **Settings** (atau **Auth** → **Sessions**).
2. Sesuaikan:
   - **JWT expiry** – lama access token (default sering 3600 detik = 1 jam). Bisa dinaikkan (mis. 86400 = 24 jam) agar token lebih lama valid.
   - **Time-box user sessions** (jika ada, biasanya Pro) – batas waktu total session.
   - **Inactivity timeout** (jika ada) – session dianggap selesai setelah tidak ada aktivitas selama X waktu.

Setelah diubah, session yang **baru** akan memakai pengaturan baru. User yang sudah login mungkin perlu login ulang sekali.

## Di Aplikasi (sudah diatur)

- **Refresh token**: ada 1 retry jika server mengembalikan 503/error sementara, jadi session tidak langsung “expired” karena gangguan singkat.
- **Grace period setelah login**: 60 detik. Dalam 60 detik setelah login berhasil, error auth (termasuk 503) tidak langsung mengarahkan ke halaman login.
- **Timeout refresh token**: 12 detik per percobaan.

Perubahan di atas mengurangi kemungkinan “session expired” karena server lambat atau error sementara.
