# Payroll Dashboard

## Deskripsi
Komponen untuk menampilkan dan mengelola payroll di halaman `/payroll`.

## Struktur Direktori
```
2-7-payroll/
├── pages/
│   ├── PayrollCalculationsPageWrapper.tsx
│   ├── PayrollPeriodsPageWrapper.tsx
│   └── PayrollRunsPageWrapper.tsx
├── components/
│   ├── dashboard/
│   │   ├── PayrollDashboard.tsx
│   │   └── PayrollMetricsCards.tsx
│   ├── filters/
│   │   └── PayrollFilters.tsx
│   ├── overview/
│   │   ├── PayrollPeriodsOverview.tsx
│   │   └── PayrollRunsOverview.tsx
│   ├── sidebar/
│   │   └── PayrollSidebar.tsx
│   └── corrections/
│       └── CorrectedEmployeeCalculation.tsx
├── calculations/
│   ├── PayrollCalculationsTable.tsx
│   ├── PayrollCalculator.tsx
│   └── PayrollBreakdown.tsx
├── modals/
│   ├── CreatePayrollRunDialog.tsx
│   └── CreatePeriodDialog.tsx
├── views/
│   └── EmployeeDetailView.tsx
├── hooks/
│   ├── usePayrollCalculations.ts
│   └── index.ts
├── index.ts
└── README.md
```

## Komponen

### PayrollDashboard (Main Component)
Main dashboard component untuk payroll management.

**Layout:**
- Metrics cards
- Filters
- Payroll runs table
- Sidebar overview

### PayrollMetricsCards
Metrics summary cards:
- 💰 Total Payroll Amount
- 👥 Employees Processed
- ⏰ Pending Approvals
- 📊 Average Salary

### PayrollFilters
Filter controls:
- Search employee
- Filter by department
- Filter by period
- Filter by status
- Date range picker

### PayrollSidebar
Sidebar overview dengan:
- Current period info
- Recent payroll runs
- Pending actions
- Quick stats

### PayrollCalculations
Salary calculations component dengan:
- Base salary
- Allowances
- Deductions
- Tax calculations
- Net salary

### PayrollCalculationsTable
Table untuk display salary calculations per employee.

**Columns:**
- Employee
- Base Salary
- Allowances
- Deductions
- Tax
- Net Salary
- Status
- Actions

### PayrollCalculator
Calculator tool untuk calculate salary:
- Input base salary
- Add allowances
- Add deductions
- Calculate tax
- Show net salary

### PayrollBreakdown
Detailed breakdown untuk employee salary:
- Base salary components
- Allowances breakdown
- Deductions breakdown
- Tax breakdown
- Net salary calculation

### PayrollReports
Report generation component:
- Monthly payroll report
- Department summary
- Tax report
- Employee payslips
- Export to PDF/Excel

### PayrollRuns
Payroll runs management:
- Create new run
- Process payroll
- Approve/reject
- View history

### PayrollRunsOverview
Overview dari payroll runs:
- Current run status
- Recent runs
- Pending approvals
- Statistics

### PayrollPeriods
Period management:
- Create period
- Edit period
- Close period
- View history

### PayrollPeriodsOverview
Overview dari payroll periods:
- Current period
- Upcoming periods
- Closed periods

### CreatePayrollRunDialog
Dialog untuk create new payroll run:
- Select period
- Select employees
- Set parameters
- Confirm & create

### CreatePeriodDialog
Dialog untuk create payroll period:
- Period name
- Start date
- End date
- Payment date

### EmployeeDetailView
Detailed view untuk employee payroll:
- Employee info
- Salary history
- Current calculations
- Payment history

### CorrectedEmployeeCalculation
Component untuk salary calculation corrections:
- View original calculation
- Make corrections
- Add notes
- Approve corrections

## Integrasi
Digunakan di:
- `src/App.tsx` - Payroll routes
- `src/components/1_halaman/2-7-payroll/pages/PayrollCalculationsPageWrapper.tsx`
- `src/components/1_halaman/2-7-payroll/pages/PayrollPeriodsPageWrapper.tsx`
- `src/components/1_halaman/2-7-payroll/pages/PayrollRunsPageWrapper.tsx`

## Usage

### Import Main Component
```tsx
import { PayrollDashboard } from '@/components/1_halaman/2-7-payroll';

<PayrollDashboard />
```

### Import Individual Components
```tsx
import { 
  PayrollMetricsCards,
  PayrollCalculator
} from '@/components/1_halaman/2-7-payroll';
```

## Features
- ✅ Payroll dashboard
- ✅ Salary calculations
- ✅ Payroll runs management
- ✅ Period management
- ✅ Tax calculations
- ✅ Allowances & deductions
- ✅ Approval workflow

## Salary Components
- Base Salary
- Fixed Allowances (transport, meal, etc)
- Variable Allowances (overtime, bonus, incentive)
- Deductions (BPJS, tax, loans)
- Tax (PPh 21)
- Net Salary

## Payroll Status
- `draft` - Draft
- `pending` - Pending approval
- `approved` - Approved
- `processed` - Processed
- `paid` - Paid
- `rejected` - Rejected

## Dependencies
- UI components dari shadcn/ui
- Supabase client - Database operations
- PDF generation library
- Excel export library
- Tax calculation utilities

## Data Sources
- `payroll_runs` table - Payroll run data
- `payroll_periods` table - Period data
- `payroll_calculations` table - Calculation data
- `employees` table - Employee information
- `salary_components` table - Salary structure

## Payroll Eligibility and Run Guard

### Deprecation Notice
- Legacy column `employees.status` is deprecated and should not be used in new code paths.
- Use `employee_status_id` + `employee_statuses.name` as canonical status source.

### Canonical Status Source
- Status untuk payroll dibaca dengan urutan:
  1. `employee_statuses.name` (via `employee_status_id`)
  2. `employees.status`
- Jika keduanya kosong, status dianggap `unknown` (tidak otomatis `active` untuk payroll).

### Eligibility Rule
- Employee yang boleh diproses payroll:
  - `active`
  - `probation`
- Employee berikut dikecualikan:
  - `terminated`, `inactive`, `resigned`, `pending removal`, dan status unknown.

### Preflight Validation Before Run
- Sebelum tombol process menjalankan `process_payroll_run`, sistem cek semua employee eligible.
- Untuk setiap employee eligible, field berikut wajib ada:
  - `employee_payroll_info` record tersedia
  - `basic_salary > 0`
  - `ptkp_status` terisi
  - `tax_configuration_id` terisi

### Blocking Behavior
- Jika ada data yang belum lengkap:
  - proses payroll **dibatalkan** (RPC tidak dipanggil),
  - UI menampilkan warning ringkas + detail employee dan field yang missing,
  - operator wajib melengkapi data dulu sebelum run payroll.



