import { Expense } from '@/features/4_2_dashboard/hooks/useExpenses';
import { isRecurringBillPayNowEligible } from '@/features/4_2_reminder-bills/utils/reminderBillsUtils';
import { formatToRupiah } from '@/utils/formatCurrency';
import { Badge } from '@/features/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { Building, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ActionsDropdown } from '@/features/4_2_dashboard/ActionsDropdown';

interface ReminderBillsTableProps {
  bills: Expense[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onViewDetails: (bill: Expense) => void;
  onEdit: (bill: Expense) => void;
  onDelete: (bill: Expense) => void;
  onPayNow?: (bill: Expense) => void;
}

export const ReminderBillsTable = ({
  bills,
  isLoading = false,
  onRefresh: _onRefresh,
  onViewDetails,
  onEdit,
  onDelete,
  onPayNow,
}: ReminderBillsTableProps) => {
  const getStatusBadge = (bill: Expense) => {
    // Check if overdue
    if (bill.next_payment_date) {
      const nextDate = new Date(bill.next_payment_date);
      const today = new Date();
      if (nextDate < today) {
        return (
          <Badge className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
            Overdue
          </Badge>
        );
      }
    }

    // Check status
    switch (bill.status?.toLowerCase()) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
            Paid
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full">
            Pending
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
            Active
          </Badge>
        );
    }
  };

  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      case 'annually': return 'Annually';
      case 'weekly': return 'Weekly';
      case 'daily': return 'Daily';
      default: return 'Monthly';
    }
  };

  const getDaysUntilDue = (dateString: string) => {
    const dueDate = new Date(dateString);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `${diffDays} days`;
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">Reminder Bills</h2>
      </div>

      {/* Table Content - satu scroll container per panel, scroll chaining */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="h-8 px-3 text-xs font-medium">Bill Name</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium">Category</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium">Amount</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium">Frequency</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium">Next Due Date</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium">Status</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium">Department</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-16 text-center">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-1">No recurring bills found</p>
                  <p className="text-xs text-gray-400">Create your first recurring bill to get started</p>
                </TableCell>
              </TableRow>
            ) : (
              bills.map((bill) => (
                <TableRow key={bill.id} className="hover:bg-gray-50">
                  <TableCell className="px-3 py-2 text-xs">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-md bg-blue-50 flex-shrink-0">
                        <DollarSign className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">
                          {bill.expense_name}
                        </div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                          {bill.expense_type}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-gray-100">
                        <DollarSign className="h-3 w-3 text-gray-600" />
                      </div>
                      <span>{bill.category}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    <div className="font-bold text-gray-900">{formatToRupiah(bill.amount)}</div>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    <Badge variant="outline" className="text-xs">
                      {getFrequencyText(bill.recurring_frequency || 'monthly')}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-gray-100">
                        <Calendar className="h-3 w-3 text-gray-600" />
                      </div>
                      <div>
                        {bill.next_payment_date ? (
                          <>
                            <div className="font-medium text-gray-900">
                              {format(new Date(bill.next_payment_date), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {getDaysUntilDue(bill.next_payment_date)}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400">Not scheduled</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    {getStatusBadge(bill)}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-gray-100">
                        <Building className="h-3 w-3 text-gray-600" />
                      </div>
                      <span>{bill.department || 'Not specified'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    <ActionsDropdown
                      onViewDetails={() => onViewDetails(bill)}
                      onEdit={() => onEdit(bill)}
                      onDelete={() => onDelete(bill)}
                      showPayNow={isRecurringBillPayNowEligible(bill) && !!onPayNow}
                      onPayNow={onPayNow ? () => onPayNow(bill) : undefined}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
