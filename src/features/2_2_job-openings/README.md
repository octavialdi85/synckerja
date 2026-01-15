# Job Openings Management

## Deskripsi
Komponen untuk menampilkan dan mengelola job openings di halaman Recruitment (/recruitment/job-openings).

## Struktur Direktori
```
2_2_job-openings/
├── hooks/                              # Business logic & data management
│   ├── jobOpeningTypes.ts              # TypeScript interfaces for job openings
│   ├── jobOpeningUtils.ts              # CRUD operations for job openings
│   ├── useJobOpeningsCrud.ts           # Custom hook for job openings management
│   ├── recruitmentLinkTypes.ts         # TypeScript interfaces for recruitment links
│   ├── recruitmentLinkUtils.ts         # Re-export optimized utils
│   ├── optimizedRecruitmentLinkUtils.ts # CRUD operations for recruitment links
│   ├── recruitmentSkillsTypes.ts       # TypeScript interfaces for skills
│   ├── recruitmentSkillsUtils.ts       # CRUD operations for skills
│   └── index.ts                        # Export all hooks/types/utils
├── NewJobOpeningsPage.tsx              # Main page component
├── JobOpeningsFilters.tsx              # Filter controls (search, status, etc)
├── JobOpeningsMetricsCards.tsx         # Metrics summary cards
├── JobOpeningsMetricsCardsSkeleton.tsx # Loading skeleton for metrics
├── JobOpeningsTable.tsx                # Job openings data table
├── JobOpeningsTableSkeleton.tsx        # Loading skeleton for table
├── JobOpeningsPageSkeleton.tsx         # Full page loading skeleton
├── HRAnalyticsSidebar.tsx              # Analytics sidebar with insights
├── index.ts                            # Export file
└── README.md                           # Dokumentasi
```

## Komponen

### NewJobOpeningsPage
Main page component untuk job openings management dengan layout 2-column (content + sidebar).

**Props:**
- `jobOpenings`: Array of JobOpening data
- `isLoading`: Loading state
- `onAddJob`: Callback untuk add job
- `onEditJob`: Callback untuk edit job
- `onDeleteJob`: Callback untuk delete job
- `onGenerateLink`: Callback untuk generate recruitment link

**Dependencies:**
- JobOpeningsFilters
- JobOpeningsMetricsCards
- JobOpeningsTable
- HRAnalyticsSidebar

### JobOpeningsFilters
Filter controls dengan search, status filter, dan add job button.

### JobOpeningsMetricsCards
Menampilkan 4 metric cards:
- Total Jobs
- Active Jobs
- Total Applications
- Total Clicks

### JobOpeningsTable
Table untuk menampilkan list job openings dengan actions (edit, delete, generate link).

### HRAnalyticsSidebar
Sidebar analytics dengan:
- Performance Overview (conversion rate, avg submissions)
- Top Performing Jobs
- Jobs Needing Attention
- Recent Activity

### Skeleton Components
- `JobOpeningsPageSkeleton`: Full page loading state
- `JobOpeningsMetricsCardsSkeleton`: Metrics loading state
- `JobOpeningsTableSkeleton`: Table loading state

## Integrasi
Digunakan di:
- `src/pages/Recruitment.tsx` - Tab "job-openings"

## Usage

### Import Components
```tsx
import { NewJobOpeningsPage } from '@/components/1_halaman/2_2_job-openings';

<NewJobOpeningsPage 
  jobOpenings={jobOpenings}
  isLoading={isLoading}
  onAddJob={openAddModal}
  onEditJob={openEditModal}
  onDeleteJob={deleteItem}
  onGenerateLink={handleGenerateLink}
/>
```

### Import Hooks & Types
```tsx
import { 
  useJobOpeningsCrud,
  JobOpening,
  JobOpeningFormData,
  RecruitmentLink,
  RecruitmentSkill
} from '@/components/1_halaman/2_2_job-openings';

// Use the hook
const {
  data: jobOpenings,
  isLoading,
  modalOpen,
  editItem,
  openAddModal,
  openEditModal,
  closeModal,
  saveItem,
  deleteItem,
  saving
} = useJobOpeningsCrud();
```

## Features
- ✅ Job openings list with filters
- ✅ Metrics dashboard
- ✅ HR Analytics sidebar
- ✅ CRUD operations (Add, Edit, Delete)
- ✅ Generate recruitment link
- ✅ Loading skeletons
- ✅ Responsive layout

