# Reprimand Management Module

This module provides comprehensive reprimand/disciplinary action management for tracking employee violations and corrective actions.

## Single File Implementation

The module is implemented as a single file (`ReprimandPage.tsx`) for simplicity and maintainability. All components are defined within the same file to avoid confusion and make it easier to manage.

## File Structure

```
src/features/2-1-reprimand/
├── ReprimandPage.tsx              # Main page with all components
├── ReprimandManagementPage.tsx    # Legacy page (kept for compatibility)
├── ModalAddReprimand.tsx          # Legacy modal
├── AddReprimandDialog.tsx         # Legacy dialog
├── ReprimandDepartmentCard.tsx    # Legacy component
├── ReprimandTableFooter.tsx       # Legacy component
├── index.ts                       # Exports
└── README.md                      # This file
```

## Features

- **Reprimand Tracking**: Track employee disciplinary actions
- **Status Management**: Pending, Approved, Rejected statuses
- **Department Filtering**: Filter by employee department
- **Type Classification**: Different types of reprimands
- **Severity Levels**: Low, Medium, High severity classification
- **Search & Filter**: Advanced filtering capabilities
- **Bulk Operations**: Select and delete multiple reprimands
- **Statistics Dashboard**: Overview of reprimand metrics
- **Responsive Design**: Mobile-friendly layout

## Components (All in ReprimandPage.tsx)

### Main Components
- `ReprimandPage`: Main page wrapper with StandardLayout and all functionality

### Internal Components
- `ReprimandHeader`: Page header with add button and statistics
- `ReprimandFilters`: Search and filter controls
- `ReprimandMetricsCards`: Statistics cards display
- `ReprimandTable`: Data table with actions
- `ReprimandOverview`: Sidebar with statistics and recent activity

## Routing

The module is accessible via `/employees/reprimand` route.

## Usage

```tsx
import { ReprimandPage } from '@/features/2-1-reprimand';

// Use in routing
<Route path="/employees/reprimand" element={<ReprimandPage />} />
```

## Data Structure

### Reprimand Interface
```typescript
interface Reprimand {
  id: string;
  employee: {
    name: string;
    department: string;
    position: string;
  };
  type: string;
  reason: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  severity: 'low' | 'medium' | 'high';
  created_at: string;
}
```

### Statistics Interface
```typescript
interface ReprimandStats {
  totalReprimands: number;
  pendingReprimands: number;
  approvedReprimands: number;
  rejectedReprimands: number;
  reprimandsByDepartment: { [key: string]: any };
  reprimandsByType: { [key: string]: number };
  recentReprimands: Reprimand[];
}
```

## Benefits of Single File Approach

1. **Simplicity**: All code in one place, easy to find and modify
2. **No Import Confusion**: No need to manage multiple import paths
3. **Easier Maintenance**: Single file to maintain and update
4. **Better Performance**: No additional bundle splitting
5. **Clear Structure**: All related components in one logical unit

## Future Enhancements

- [ ] Add real data integration hooks
- [ ] Implement add/edit modal functionality
- [ ] Add export functionality
- [ ] Implement notification system
- [ ] Add audit trail tracking
- [ ] Add advanced filtering options

## Dependencies

- React
- Lucide React (icons)
- Tailwind CSS (styling)
- Custom UI components from `@/features/ui`