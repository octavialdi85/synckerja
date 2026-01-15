# Interviewees Management

## Deskripsi
Komponen untuk menampilkan dan mengelola interview candidates/interviewees di halaman Recruitment (/recruitment/interviewees).

## Struktur Direktori
```
2_2_Interviewees/
├── IntervieweeTab.tsx                  # Main tab component (ACTIVE)
├── IntervieweesPage.tsx                # Full page component (with sidebar)
├── IntervieweesFilters.tsx             # Filter controls
├── IntervieweesMetricsCards.tsx        # Metrics summary cards
├── IntervieweesTable.tsx               # Table component
├── IntervieweesOverview.tsx            # Overview sidebar
├── IntervieweeActionsDropdown.tsx      # Actions dropdown menu
├── DebugInterviewees.tsx               # Debug component
├── InterviewWhatsAppButton.tsx         # WhatsApp integration
├── CandidateToEmployeeConfirmModal.tsx # Convert to employee modal
├── index.ts                            # Export file
└── README.md                           # Dokumentasi
```

## Komponen

### IntervieweeTab (ACTIVE - Currently Used)
Main component yang currently digunakan di `/recruitment/interviewees` tab.

**Features:**
- 🔍 Search by name/email/phone
- 🎯 Filter by interview status
- 📅 Filter by interview date
- 👁️ View candidate profile
- 📋 Actions dropdown
- ✉️ WhatsApp integration
- 👤 Convert to employee
- ⭐ Rating display
- 📊 Interview notes
- 📈 Performance metrics

**Interface:**
```typescript
interface InterviewCandidate {
  id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  birth_date?: string;
  gender?: string;
  nik?: string;
  status: string;
  created_at: string;
  interview_date?: string;
  interview_time?: string;
  interview_location?: string;
  interviewer_name?: string;
  interviewer_email?: string;
  interview_status: string;
  interview_notes?: string;
  job_openings?: {
    job_title: string;
  };
  candidate_profile_id?: string;
  recruitment_token: string;
  candidate_profiles?: {
    profile_completed: boolean;
    recruitment_token: string;
    full_name: string;
    photo_url?: string;
  };
  average_score?: number;
  total_reviews?: number;
}
```

### IntervieweesPage
Full page component dengan 2-column layout (content + sidebar).

**Layout:**
- Left: Filters, Metrics, Table
- Right: Interview Schedule Overview

### IntervieweesFilters
Filter controls component:
- Search input
- Interview status dropdown
- Date filter

### IntervieweesMetricsCards
4 Metrics cards:
- Total Interviewees
- Scheduled Interviews
- Completed Interviews
- Average Rating

### IntervieweesTable
Table component untuk display interview data.

### IntervieweesOverview
Sidebar overview dengan:
- Upcoming interviews schedule
- Completed interviews list
- Interview statistics

### IntervieweeActionsDropdown
Dropdown menu dengan actions:
- View Profile
- Schedule Interview
- Add Notes
- Send WhatsApp
- Convert to Employee
- Mark as Completed
- Reject

### DebugInterviewees
Debug component untuk troubleshooting:
- Check candidate_profiles
- Check job_applications
- Check matching data
- Verify data consistency

### InterviewWhatsAppButton
WhatsApp integration button untuk:
- Send interview invite
- Send reminder
- Custom message

### CandidateToEmployeeConfirmModal
Modal untuk convert candidate to employee:
- Confirm candidate details
- Select department
- Set start date
- Create employee record

## Interview Status Flow

```
applied → screening → scheduled → interviewed → offered → hired
   ↓
rejected (any stage)
```

**Status Options:**
- `pending` - Menunggu screening
- `screening` - Sedang direview
- `scheduled` - Interview terjadwal
- `interviewed` - Sudah interview
- `offered` - Dapat job offer
- `hired` - Diterima kerja
- `rejected` - Ditolak

## Integrasi
Digunakan di:
- `src/pages/Recruitment.tsx` - Tab "interviewees"

## Usage

### Import Main Component
```tsx
import { IntervieweeTab, DebugInterviewees } from '@/components/1_halaman/2_2_Interviewees';

// In Recruitment.tsx
<TabsContent value="interviewees">
  <DebugInterviewees />
  <IntervieweeTab />
</TabsContent>
```

### Import Other Components
```tsx
import { 
  IntervieweesPage,
  InterviewWhatsAppButton,
  CandidateToEmployeeConfirmModal 
} from '@/components/1_halaman/2_2_Interviewees';
```

## Features
- ✅ Interviewees list with search & filters
- ✅ Interview scheduling
- ✅ Status management
- ✅ WhatsApp integration
- ✅ Rating system
- ✅ Convert to employee
- ✅ Interview notes
- ✅ Actions dropdown
- ✅ Schedule overview
- ✅ Performance tracking
- ✅ Debug tools

## Data Sources
- `candidate_profiles` table - Candidate information
- `job_applications` table - Application data
- `candidate_reviews` table - Rating & reviews
- `job_openings` table - Job information

## Dependencies
- Supabase client - Database operations
- WhatsApp Business API - Messaging
- UI components dari shadcn/ui
- React Router - Navigation
- React Query (recommended for future optimization)

## Actions Available
1. **View Profile** - Navigate to candidate detail page
2. **Schedule Interview** - Set interview date/time/location
3. **Add Notes** - Add interview notes
4. **Send WhatsApp** - Send message via WhatsApp
5. **Convert to Employee** - Create employee record
6. **Update Status** - Change interview status
7. **Reject** - Reject candidate
8. **Delete** - Remove candidate (with confirmation)

## Future Enhancements
- [ ] Add custom hooks for data fetching
- [ ] Implement React Query for caching
- [ ] Add interview feedback forms
- [ ] Implement email notifications
- [ ] Add calendar integration
- [ ] Export interview reports
- [ ] Bulk actions support



