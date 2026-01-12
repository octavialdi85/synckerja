import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, MoreHorizontal } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrentOrg } from '@/hooks/organized/utils';
import { usePayrollCalculations } from '@/hooks/organized/payroll';
import { formatToRupiah } from '@/utils/formatCurrency';
import { useMemo } from 'react';

interface PayrollExpenseTableProps {
  searchTerm: string;
  periodFilter: string;
  statusFilter: string;
}

export const PayrollExpenseTable = ({ 
  searchTerm, 
  periodFilter, 
  statusFilter 
}: PayrollExpenseTableProps) => {
  const { organizationId } = useCurrentOrg();
  const { calculations, isLoading } = usePayrollCalculations(organizationId);

  // Transform payroll calculations into table format
  const payrollData = useMemo(() => {
    if (!calculations || calculations.length === 0) return [];

    return calculations.map(calc => ({
      id: calc.id,
      employee: calc.employee?.full_name || 'N/A',
      employeeId: calc.employee?.employee_id || '',
      department: calc.employee?.department_name || 'N/A',
      period: calc.payroll_period?.period_name || 'Current Period',
      basicSalary: calc.basic_salary,
      allowances: calc.total_allowances,
      deductions: calc.total_deductions,
      netPay: calc.take_home_pay || calc.net_pay,
      status: calc.payment_status === 'paid' ? 'paid' : 
              calc.payment_status === 'pending' ? 'pending' : 'processing',
      paymentDate: calc.payment_date ? new Date(calc.payment_date).toISOString().split('T')[0] : ''
    }));
  }, [calculations]);

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    let filtered = [...payrollData];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply period filter
    if (periodFilter && periodFilter !== 'all-periods') {
      // In a real app, you'd filter by actual periods
      // For now, we'll keep all data
    }

    // Apply status filter
    if (statusFilter && statusFilter !== 'all-status') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    return filtered;
  }, [payrollData, searchTerm, periodFilter, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-3">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">Payroll Expenses</h3>
        <div className="text-xs text-slate-500">
          {filteredData.length} entries
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200">
              <TableHead className="text-xs font-medium text-slate-600">Employee</TableHead>
              <TableHead className="text-xs font-medium text-slate-600">Department</TableHead>
              <TableHead className="text-xs font-medium text-slate-600">Period</TableHead>
              <TableHead className="text-xs font-medium text-slate-600">Basic Salary</TableHead>
              <TableHead className="text-xs font-medium text-slate-600">Allowances</TableHead>
              <TableHead className="text-xs font-medium text-slate-600">Deductions</TableHead>
              <TableHead className="text-xs font-medium text-slate-600">Net Pay</TableHead>
              <TableHead className="text-xs font-medium text-slate-600">Status</TableHead>
              <TableHead className="text-xs font-medium text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row) => (
              <TableRow key={row.id} className="border-slate-100 hover:bg-slate-50/50">
                <TableCell>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{row.employee}</div>
                    <div className="text-xs text-slate-500">{row.employeeId}</div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-slate-600">{row.department}</TableCell>
                <TableCell className="text-sm text-slate-600">{row.period}</TableCell>
                <TableCell className="text-sm font-medium">{formatToRupiah(row.basicSalary)}</TableCell>
                <TableCell className="text-sm text-green-600">{formatToRupiah(row.allowances)}</TableCell>
                <TableCell className="text-sm text-red-600">{formatToRupiah(row.deductions)}</TableCell>
                <TableCell className="text-sm font-semibold text-slate-900">{formatToRupiah(row.netPay)}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(row.status)}>
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};
