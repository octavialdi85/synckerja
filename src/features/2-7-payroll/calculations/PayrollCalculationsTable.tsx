import React from 'react';
import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { Eye, Trash2, AlertTriangle, Calculator, RefreshCw, Loader2 } from 'lucide-react';
import { PayrollCalculationsTableFooter } from './PayrollCalculationsTableFooter';

interface PayrollCalculationsTableProps {
  calculations: any[];
  taxAmounts: Record<string, number>;
  isLoading: boolean;
  onEmployeeSelect: (employee: any) => void;
  onRefresh?: () => void;
  onDeleteCalculation?: (calculation: any) => void;
  deletingCalculationId?: string | null;
}

export const PayrollCalculationsTable = ({
  calculations,
  taxAmounts,
  isLoading,
  onEmployeeSelect,
  onRefresh,
  onDeleteCalculation,
  deletingCalculationId
}: PayrollCalculationsTableProps) => {
  const paidCalculations = calculations.filter(
    (calc) => calc.payment_status === 'paid'
  ).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'calculated': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount || 0);
  };

  const formatCurrencyWithWarning = (amount: number, hasWarning: boolean) => {
    const formattedAmount = formatCurrency(amount);
    if (hasWarning && amount === 0) {
      return (
        <div className="flex items-center gap-1" title="No components configured">
          <span>{formattedAmount}</span>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </div>
      );
    }
    return formattedAmount;
  };

  return (
    <div className="h-full min-w-0 flex flex-col">
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-auto seamless-scroll nested-scroll-touch-chain">
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="bg-gray-50 sticky top-0 z-20 shadow-sm">
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[180px] px-3 text-xs font-medium text-gray-700 bg-gray-50 whitespace-nowrap">Employee</TableHead>
              <TableHead className="min-w-[120px] px-3 text-xs font-medium text-gray-700 bg-gray-50 whitespace-nowrap">Department</TableHead>
              <TableHead className="min-w-[140px] px-3 text-xs font-medium text-gray-700 bg-gray-50 whitespace-nowrap">Period</TableHead>
              <TableHead className="min-w-[120px] px-3 text-xs font-medium text-gray-700 bg-gray-50 whitespace-nowrap">Basic Salary</TableHead>
              <TableHead className="min-w-[110px] px-3 text-xs font-medium text-gray-700 bg-gray-50 whitespace-nowrap">Allowances</TableHead>
              <TableHead className="min-w-[110px] px-3 text-xs font-medium text-gray-700 bg-gray-50 whitespace-nowrap">Deductions</TableHead>
              <TableHead className="min-w-[90px] px-3 text-xs font-medium text-gray-700 bg-gray-50 whitespace-nowrap">Tax</TableHead>
              <TableHead className="min-w-[120px] px-3 text-xs font-medium text-gray-700 bg-gray-50 whitespace-nowrap">Gross Pay</TableHead>
              <TableHead className="min-w-[120px] px-3 text-xs font-medium text-gray-700 bg-gray-50 whitespace-nowrap">Net Pay</TableHead>
              <TableHead className="min-w-[100px] px-3 text-xs font-medium text-gray-700 bg-gray-50 whitespace-nowrap">Status</TableHead>
              <TableHead className="min-w-[100px] px-3 text-xs font-medium text-gray-700 bg-gray-50 whitespace-nowrap">Payment</TableHead>
              <TableHead className="min-w-[80px] px-3 text-xs font-medium text-gray-700 bg-gray-50 whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-12 text-gray-500 text-sm">
                  Loading payroll calculations...
                </TableCell>
              </TableRow>
            ) : !calculations || calculations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-gray-500 text-sm">
                  <div className="flex flex-col items-center space-y-2">
                    <Calculator className="h-8 w-8 text-gray-300" />
                    <div>No payroll calculations found</div>
                    {onRefresh && (
                      <Button
                        onClick={onRefresh}
                        variant="outline"
                        className="h-8 px-3 mt-1 text-xs flex items-center gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh Data
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              calculations.map(calc => (
                <TableRow key={calc.id} className="hover:bg-gray-50/50 h-12 transition-colors">
                  <TableCell className="min-w-[180px] px-3">
                    <div>
                      <div
                        className="font-medium text-sm text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => onEmployeeSelect(calc)}
                      >
                        {calc.employee_payroll_info?.employees?.full_name || 'Unknown Employee'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {calc.employee_payroll_info?.employees?.employee_id || 'No ID'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[120px] px-3 text-sm text-gray-600">
                    {calc.employee_payroll_info?.employees?.departments?.name || 'No Department'}
                  </TableCell>
                  <TableCell className="min-w-[140px] px-3">
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        {calc.payroll_runs?.payroll_periods?.period_name || 'Unknown Period'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {calc.payroll_runs?.run_name || 'Unknown Run'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[120px] px-3 text-sm">
                    {formatCurrency(calc.basic_salary || 0)}
                  </TableCell>
                  <TableCell className="min-w-[110px] px-3 text-sm">
                    {formatCurrency(calc.total_allowances || 0)}
                  </TableCell>
                  <TableCell className="min-w-[110px] px-3 text-sm">
                    {formatCurrency(calc.total_deductions || 0)}
                  </TableCell>
                  <TableCell className="min-w-[90px] px-3 text-sm">
                    {formatCurrencyWithWarning((taxAmounts[calc.id] ?? calc.total_tax_deductions) || 0, false)}
                  </TableCell>
                  <TableCell className="min-w-[120px] px-3 text-sm font-medium">
                    {formatCurrency(calc.gross_pay || 0)}
                  </TableCell>
                  <TableCell className="min-w-[120px] px-3 text-sm font-medium">
                    <span className="text-green-600">{formatCurrency(calc.net_pay || 0)}</span>
                  </TableCell>
                  <TableCell className="min-w-[100px] px-3">
                    <Badge className={`${getStatusColor(calc.calculation_status || 'draft')} border`}>
                      {calc.calculation_status || 'draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-[100px] px-3">
                    <Badge className={`${getPaymentStatusColor(calc.payment_status || 'pending')} border`}>
                      {calc.payment_status || 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-[80px] px-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEmployeeSelect(calc)}
                        title="View Payroll Details"
                        className="hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {onDeleteCalculation && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteCalculation(calc)}
                          title="Delete Payroll Calculation"
                          disabled={deletingCalculationId === calc.id}
                          className="hover:bg-red-50 hover:text-red-600 disabled:opacity-80"
                        >
                          {deletingCalculationId === calc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </table>
      </div>

      <PayrollCalculationsTableFooter
        totalCalculations={calculations.length}
        filteredCalculations={calculations.length}
        paidCalculations={paidCalculations}
      />
    </div>
  );
};
