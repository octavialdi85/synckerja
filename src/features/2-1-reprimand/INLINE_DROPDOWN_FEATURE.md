# Inline Reprimand View Dropdown Feature

## Overview
Fitur ini menambahkan dropdown inline untuk melihat detail pelanggaran karyawan pada halaman `/employees/reprimand`. Dropdown ini dirancang mengikuti pola sistem OKR dengan tampilan yang compact dan informatif.

## Komponen yang Dibuat

### 1. ReprimandViewDropdown.tsx
- **Fungsi**: Menampilkan dropdown inline dengan detail pelanggaran karyawan
- **Fitur**:
  - Tampilan inline seperti sistem OKR
  - Menampilkan jumlah pelanggaran dan status (Active/Resolved)
  - Detail lengkap setiap pelanggaran
  - Animasi expand/collapse
  - Responsive design

### 2. Integrasi dengan Komponen Existing
- **ReprimandDepartmentCard**: Menggunakan ReprimandViewDropdown sebagai pengganti tombol "View"
- **ReprimandManagementTable**: Mengirim data reprimands ke ReprimandDepartmentCard
- **ReprimandManagementMain**: Mengirim filteredReprimands ke ReprimandManagementTable

## Fitur Dropdown

### Header Section
- Icon Target (merah) untuk identifikasi visual
- Nama karyawan
- Badge jumlah pelanggaran
- Badge status (Active/Resolved) dengan warna dinamis

### Content Section
- **Header**: Judul "Violation Details" dengan icon AlertTriangle
- **List Pelanggaran**: 
  - Nomor urut dan severity level
  - Status pelanggaran
  - Tanggal kejadian
  - Jenis pelanggaran
  - Deskripsi pelanggaran (dengan line-clamp)
  - Kategori dan jumlah pelanggaran sebelumnya
  - Detail insiden (waktu, lokasi)
  - Bukti dan saksi
  - Rencana perbaikan
  - Deadline perbaikan dan follow-up
  - Status acknowledgment
  - Flag formal dan impact on performance review
  - Catatan tambahan
  - Link dokumen pendukung
  - Tanggal pembuatan

### Footer Section
- Total pelanggaran
- Tanggal update terakhir

## Styling
- Menggunakan Tailwind CSS
- Warna dinamis berdasarkan severity dan status
- Hover effects dan transitions
- Responsive layout
- Line-clamp untuk text overflow

## Data Flow
1. `ReprimandManagementMain` → `ReprimandManagementTable` → `ReprimandDepartmentCard` → `ReprimandViewDropdown`
2. Data reprimands difilter berdasarkan employee_id
3. Dropdown menampilkan semua pelanggaran untuk karyawan tertentu

## Usage
```tsx
<ReprimandViewDropdown
  employeeId={employee.id}
  employeeName={employee.full_name}
  reprimands={reprimands.filter(r => r.employee_id === employee.id)}
/>
```

## Dependencies
- React hooks (useState)
- Lucide React icons
- Shadcn/ui components (Button, Collapsible, Badge)
- Tailwind CSS
