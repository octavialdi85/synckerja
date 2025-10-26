# Reprimand View Dropdown - Updated Design

## Overview
Dropdown untuk melihat detail pelanggaran karyawan telah diupdate mengikuti pola desain yang sama dengan halaman home tab company objective.

## Perubahan Desain

### 1. Header Section (CollapsibleTrigger)
- **Background**: `bg-gray-50` dengan hover `hover:bg-gray-100`
- **Layout**: Menggunakan pola yang sama dengan IndividualObjectivesView
- **Icon**: ChevronRight/ChevronDown untuk indikator expand/collapse
- **Avatar**: Circle merah dengan icon AlertTriangle
- **Info**: Nama karyawan dan subtitle "Employee Violations"
- **Badge**: Jumlah pelanggaran dengan styling merah
- **Status Badge**: Active/Resolved dengan warna dinamis

### 2. Content Section (CollapsibleContent)
- **Background**: `bg-white` dengan border lengkap
- **Layout**: Mengelompokkan pelanggaran berdasarkan status
- **Sections**:
  - **Active Violations**: Background merah dengan border merah
  - **Resolved Violations**: Background hijau dengan border hijau  
  - **Other Status**: Background kuning dengan border kuning

### 3. Violation Cards
- **Styling**: Setiap kartu memiliki background dan border sesuai status
- **Header**: Nomor urut, severity badge, dan tanggal
- **Content**: Jenis pelanggaran, deskripsi, kategori, dan jumlah pelanggaran sebelumnya
- **Layout**: Compact dan informatif

## Fitur Utama

### Visual Hierarchy
- Status-based grouping dengan warna yang konsisten
- Clear visual indicators untuk severity dan status
- Consistent spacing dan typography

### User Experience
- Smooth expand/collapse animation
- Hover effects pada trigger
- Clear visual feedback untuk interaksi

### Responsive Design
- Adapts to container width
- Consistent dengan desain sistem OKR
- Mobile-friendly layout

## Pola Desain yang Diikuti

### 1. IndividualObjectivesView Pattern
- CollapsibleTrigger dengan background gray-50
- ChevronRight/ChevronDown indicator
- Avatar circle dengan icon
- Badge untuk jumlah items
- Status indicator di sebelah kanan

### 2. Content Organization
- Grouped by status (Active, Resolved, Other)
- Each group has its own section header
- Consistent card styling within groups
- Color-coded backgrounds and borders

### 3. Information Density
- Compact display of essential information
- Clear typography hierarchy
- Appropriate use of badges and indicators
- Consistent spacing throughout

## Implementation Details

### State Management
- `isOpen` state untuk control expand/collapse
- Filtering reprimands by status untuk grouping

### Styling Classes
- Tailwind CSS untuk consistent styling
- Color schemes berdasarkan status
- Responsive design patterns

### Accessibility
- Proper ARIA attributes melalui Collapsible component
- Keyboard navigation support
- Clear visual indicators

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
- Lucide React icons (ChevronDown, ChevronRight, AlertTriangle, etc.)
- Shadcn/ui components (Collapsible, Badge)
- Tailwind CSS untuk styling
