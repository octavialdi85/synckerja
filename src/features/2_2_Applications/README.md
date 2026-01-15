# Applications Management

## Deskripsi
Komponen untuk menampilkan dan mengelola job applications/kandidat di halaman Recruitment (/recruitment/applications).

## Struktur Direktori
```
2_2_Applications/
├── hooks/                          # Business logic & data management
│   ├── useJobApplications.ts       # Custom hook untuk fetch applications
│   └── index.ts                    # Export all hooks
├── CandidatesTable.tsx             # Main table untuk kandidat (legacy)
├── CandidateQuickViewModal.tsx     # Modal quick view kandidat
├── CandidateActionsDropdown.tsx    # Dropdown actions untuk kandidat
├── ApplicationsPage.tsx            # Full page component (dengan tabs)
├── ApplicationsFilters.tsx         # Filter controls
├── ApplicationsTable.tsx           # Table component (modern)
├── ApplicationsMetricsCards.tsx    # Metrics summary cards
├── ApplicationsOverview.tsx        # Overview sidebar
├── index.ts                        # Export file
└── README.md                       # Dokumentasi
```

## Komponen

### CandidatesTable (Legacy - Currently Used)
Main table component untuk menampilkan list kandidat/applications.
- Digunakan di `/recruitment/applications` tab
- Include search & filter functionality
- Integrated quick view modal
- Status management

**Features:**
- Search by name/email
- Filter by status
- Filter by date
- Quick view modal
- Actions dropdown
- Status update
- CV download

### ApplicationsPage
Full page component dengan navigation tabs (NOT currently used in main app).

### ApplicationsTable
Modern table component (alternative to CandidatesTable).

**Uses:**
- `useJobApplications` hook untuk data fetching
- Status filter integration
- Optimized performance

### CandidateQuickViewModal
Modal untuk quick preview candidate details:
- Personal information
- Skills
- Experience
- Expected salary
- CV preview

### CandidateActionsDropdown
Dropdown menu dengan actions:
- View details
- Update status
- Schedule interview
- Download CV
- Reject

### ApplicationsFilters
Filter controls component.

### ApplicationsMetricsCards
Metrics cards untuk applications overview.

### ApplicationsOverview
Sidebar overview component.

## Hooks

### useJobApplications
Custom hook untuk fetch and manage job applications.

**Props:**
```typescript
interface UseJobApplicationsProps {
  status?: string;    // Filter by status
  jobId?: string;     // Filter by job opening
}
```

**Returns:**
```typescript
{
  data: JobApplication[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

**JobApplication Interface:**
```typescript
interface JobApplication {
  id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string;
  experience_years?: string;
  expected_salary?: string;
  skills?: any;
  status?: string;
  created_at: string;
  recruitment_token?: string;
  interview_status?: string;
  job_opening_id: string;
  recruitment_link_id?: string;
  candidate_profile_id?: string;
  job_openings?: {
    job_title: string;
    organization_id: string;
  };
}
```

## Integrasi
Digunakan di:
- `src/pages/Recruitment.tsx` - Tab "applications"

## Usage

### Import Main Component
```tsx
import { CandidatesTable } from '@/components/1_halaman/2_2_Applications';

// In Recruitment.tsx
<TabsContent value="applications">
  <CandidatesTable />
</TabsContent>
```

### Import Hook
```tsx
import { useJobApplications } from '@/components/1_halaman/2_2_Applications/hooks';

const { data: applications, isLoading } = useJobApplications({
  status: 'pending',
  jobId: 'job-123'
});
```

### Import Types
```tsx
import { JobApplication } from '@/components/1_halaman/2_2_Applications/hooks/useJobApplications';
```

## Features
- ✅ Applications list with search & filters
- ✅ Quick view modal
- ✅ Status management
- ✅ CV download
- ✅ Actions dropdown
- ✅ Date filtering
- ✅ Real-time data fetching
- ✅ Optimized performance with React Query
- ✅ Organization filtering

## Status Options
- `pending` - Menunggu review
- `reviewed` - Sudah direview
- `shortlisted` - Masuk shortlist
- `interviewed` - Sudah interview
- `offered` - Sudah dapat offer
- `hired` - Sudah diterima
- `rejected` - Ditolak

## Dependencies
- `@tanstack/react-query` - Data fetching & caching
- `date-fns` - Date formatting
- Supabase client - Database operations
- UI components dari shadcn/ui



