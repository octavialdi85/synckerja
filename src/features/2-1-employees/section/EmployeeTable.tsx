import { memo, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/avatar';
import { Skeleton } from '@/features/ui/skeleton';
import { getPhotoUrl, getInitials } from '../hooks/photoUtils';
import { EmployeeActionsDropdown } from './EmployeeActionsDropdown';
import type { Employee } from '../hooks/useEmployees';
import { useOptimizedPerformanceMonitor } from '../hooks/useOptimizedPerformanceMonitor';
import { EmployeeTableFooter } from './EmployeeTableFooter';

interface EmployeeTableProps {
  employees: Employee[];
  currentUserEmail?: string;
  onRefresh: () => void;
  onViewEmployee: (id: string) => void;
  isLoading?: boolean;
}

// Memoized loading skeleton row
const LoadingRow = memo(() => (
  <TableRow className="h-12">
    <TableCell className="w-64 px-4">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div>
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </TableCell>
    <TableCell className="w-32 px-3">
      <Skeleton className="h-4 w-20" />
    </TableCell>
    <TableCell className="w-40 px-3">
      <Skeleton className="h-4 w-24" />
    </TableCell>
    <TableCell className="w-36 px-3">
      <Skeleton className="h-4 w-28" />
    </TableCell>
    <TableCell className="w-32 px-3">
      <Skeleton className="h-4 w-20" />
    </TableCell>
    <TableCell className="w-36 px-3">
      <Skeleton className="h-6 w-16" />
    </TableCell>
    <TableCell className="w-32 px-3">
      <Skeleton className="h-4 w-20" />
    </TableCell>
    <TableCell className="w-36 px-3">
      <Skeleton className="h-4 w-24" />
    </TableCell>
    <TableCell className="w-20 px-3">
      <Skeleton className="h-8 w-8" />
    </TableCell>
  </TableRow>
));

LoadingRow.displayName = 'LoadingRow';

// Memoized row component for performance
const EmployeeRow = memo(({ 
  employee, 
  currentUserEmail, 
  onRefresh, 
  onViewEmployee 
}: {
  employee: Employee;
  currentUserEmail?: string;
  onRefresh: () => void;
  onViewEmployee: (id: string) => void;
}) => {
  const getStatusColor = useCallback((statusName: string | null) => {
    if (!statusName) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    const status = statusName.toLowerCase();
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'contract':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'permanent':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'probation':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'terminated':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  }, []);

  const handleViewEmployee = useCallback(() => {
    onViewEmployee(employee.id);
  }, [employee.id, onViewEmployee]);

  // Use employee_status_name if available, otherwise fallback to status
  const displayStatus = employee.employee_status_name || employee.status || 'Active';

  return (
    <TableRow className="hover:bg-gray-50/50 h-12 transition-colors">
      <TableCell className="w-64 px-4">
        <div className="flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            {getPhotoUrl(employee.photo_url) && (
              <AvatarImage 
                src={getPhotoUrl(employee.photo_url)!} 
                alt={employee.full_name}
                className="object-cover"
                loading="lazy"
              />
            )}
            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-semibold">
              {getInitials(employee.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 text-sm truncate">{employee.full_name}</div>
            <div className="text-xs text-gray-500 truncate">{employee.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="w-32 px-3">
        <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded">{employee.employee_id}</span>
      </TableCell>
      <TableCell className="w-40 px-3 text-blue-600 text-sm">
        <span className="truncate block" title={employee.department_name || '-'}>
          {employee.department_name || '-'}
        </span>
      </TableCell>
      <TableCell className="w-36 px-3 text-sm">
        <span className="truncate block" title={employee.job_position_name || '-'}>
          {employee.job_position_name || '-'}
        </span>
      </TableCell>
      <TableCell className="w-32 px-3 text-sm">
        <span className="truncate block" title={employee.job_level_name || '-'}>
          {employee.job_level_name || '-'}
        </span>
      </TableCell>
      <TableCell className="w-36 px-3">
        <Badge className={`${getStatusColor(displayStatus)} text-xs px-2 py-1 border`}>
          {displayStatus}
        </Badge>
      </TableCell>
      <TableCell className="w-32 px-3 text-sm">{formatDate(employee.join_date)}</TableCell>
      <TableCell className="w-36 px-3 text-sm">
        <span className="truncate block" title={employee.mobile_phone || '-'}>
          {employee.mobile_phone || '-'}
        </span>
      </TableCell>
      <TableCell className="w-20 px-3">
        <EmployeeActionsDropdown
          employee={employee}
          currentUserEmail={currentUserEmail}
          onRefresh={onRefresh}
          onViewDetails={handleViewEmployee}
        />
      </TableCell>
    </TableRow>
  );
});

EmployeeRow.displayName = 'EmployeeRow';

export const EmployeeTable = memo(({ 
  employees = [], 
  currentUserEmail, 
  onRefresh, 
  onViewEmployee,
  isLoading = false
}: EmployeeTableProps) => {
  useOptimizedPerformanceMonitor('EmployeeTable');
  const navigate = useNavigate();

  const handleAddEmployee = useCallback(() => {
    navigate('/employees/add');
  }, [navigate]);

  // Memoize the table headers to prevent re-renders
  const tableHeaders = useMemo(() => [
    { key: 'name', label: 'Employee Name', width: 'w-64' },
    { key: 'id', label: 'Employee ID', width: 'w-32' },
    { key: 'department', label: 'Department', width: 'w-40' },
    { key: 'position', label: 'Job Position', width: 'w-36' },
    { key: 'level', label: 'Job Level', width: 'w-32' },
    { key: 'status', label: 'Employment Status', width: 'w-36' },
    { key: 'join_date', label: 'Join Date', width: 'w-32' },
    { key: 'phone', label: 'Phone', width: 'w-36' },
    { key: 'actions', label: 'Actions', width: 'w-20' },
  ], []);

  const renderLoadingRows = useMemo(() => (
    Array(5).fill(0).map((_, index) => <LoadingRow key={`loading-${index}`} />)
  ), []);

  const renderEmployeeRows = useMemo(() => (
    employees.map((employee) => (
      <EmployeeRow
        key={employee.id}
        employee={employee}
        currentUserEmail={currentUserEmail}
        onRefresh={onRefresh}
        onViewEmployee={onViewEmployee}
      />
    ))
  ), [employees, currentUserEmail, onRefresh, onViewEmployee]);

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-360px)]">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-gray-900">Employee List</h2>
            <p className="text-xs text-gray-500 mt-1">Manage and view employee information</p>
          </div>
          <Button
            onClick={handleAddEmployee}
            className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto seamless-scroll min-h-0">
        <div className="min-w-max">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 h-10 border-b">
                {tableHeaders.map((header) => (
                  <TableHead key={header.key} className={`text-xs font-medium text-gray-700 ${header.width} px-3`}>
                    {header.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                renderLoadingRows
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500 text-sm">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="text-lg">👥</div>
                      <div>No employees found</div>
                      <div className="text-xs text-gray-400">Try adjusting your filters or search terms</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                renderEmployeeRows
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Table Footer */}
      <EmployeeTableFooter 
        totalEmployees={employees.length}
        activeEmployees={employees.filter(emp => (emp.employee_status_name || emp.status) === 'active').length}
        newHires={employees.filter(emp => {
          if (!emp.join_date) return false;
          const joinDate = new Date(emp.join_date);
          const thisMonth = new Date();
          return joinDate.getMonth() === thisMonth.getMonth() && 
                 joinDate.getFullYear() === thisMonth.getFullYear();
        }).length}
      />
    </div>
  );
});

EmployeeTable.displayName = 'EmployeeTable';
