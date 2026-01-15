# Dashboard Recruitment

## Deskripsi
Komponen untuk menampilkan dashboard overview di halaman Recruitment (/recruitment/dashboard).

## Struktur Direktori
```
2-2_dashboard/
├── DashboardOverview.tsx   # Komponen utama dashboard dengan metrics dan top performing jobs
├── index.ts                # Export file
└── README.md              # Dokumentasi
```

## Komponen

### DashboardOverview
Menampilkan overview dashboard recruitment dengan:
- Metrics cards (Active Positions, Draft Positions, Total Applications, Total Clicks)
- Top performing jobs berdasarkan jumlah clicks

**Props:**
- `jobOpenings`: Array of JobOpening data

**Dependencies:**
- `@/hooks/crudMaster/jobOpeningTypes` - JobOpening interface

## Integrasi
Digunakan di:
- `src/pages/Recruitment.tsx` - Tab dashboard

## Usage
```tsx
import { DashboardOverview } from '@/components/1_halaman/2-2_dashboard';

<DashboardOverview jobOpenings={jobOpenings} />
```

