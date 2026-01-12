import { Expense } from '@/features/4_2_dashboard/hooks/useExpenses';
import { formatToRupiah } from '@/utils/formatCurrency';
import { Badge } from '@/features/ui/badge';
import { Calendar, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface ReminderBillsOverviewProps {
  bills?: Expense[];
}

export const ReminderBillsOverview = ({ bills: providedBills }: ReminderBillsOverviewProps) => {
  // Use provided bills or use empty array (will be handled by parent)
  const bills = providedBills || [];

  // Calculate metrics
  const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const overdueCount = bills.filter(bill => {
    if (!bill.next_payment_date) return false;
    const nextDate = new Date(bill.next_payment_date);
    const today = new Date();
    return nextDate < today;
  }).length;
  const dueThisWeekCount = bills.filter(bill => {
    if (!bill.next_payment_date) return false;
    const nextDate = new Date(bill.next_payment_date);
    const today = new Date();
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  }).length;
  const paidCount = bills.filter(bill => bill.status === 'paid').length;
  
  // Get this month bills
  const thisMonth = new Date();
  const thisMonthBills = bills.filter(bill => {
    if (!bill.next_payment_date) return false;
    const billDate = new Date(bill.next_payment_date);
    return billDate.getMonth() === thisMonth.getMonth() && 
           billDate.getFullYear() === thisMonth.getFullYear();
  });
  const thisMonthTotal = thisMonthBills.reduce((sum, bill) => sum + bill.amount, 0);

  // Get recent bills (last 5)
  const recentBills = bills
    .filter(bill => bill.next_payment_date)
    .sort((a, b) => new Date(a.next_payment_date!).getTime() - new Date(b.next_payment_date!).getTime())
    .slice(0, 5);

  const getDaysUntilDue = (dateString: string) => {
    const dueDate = new Date(dateString);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `${diffDays} days`;
  };

  const getStatusIcon = (bill: Expense) => {
    if (bill.next_payment_date) {
      const nextDate = new Date(bill.next_payment_date);
      const today = new Date();
      if (nextDate < today) {
        return <AlertTriangle className="h-3.5 w-3.5 text-red-600" />;
      }
    }
    if (bill.status === 'paid') {
      return <Calendar className="h-3.5 w-3.5 text-green-600" />;
    }
    return <Clock className="h-3.5 w-3.5 text-amber-600" />;
  };

  const getStatusColor = (bill: Expense) => {
    if (bill.next_payment_date) {
      const nextDate = new Date(bill.next_payment_date);
      const today = new Date();
      if (nextDate < today) {
        return 'bg-red-100 text-red-800';
      }
    }
    if (bill.status === 'paid') {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-amber-100 text-amber-800';
  };

  const getStatusText = (bill: Expense) => {
    if (bill.next_payment_date) {
      const nextDate = new Date(bill.next_payment_date);
      const today = new Date();
      if (nextDate < today) {
        return 'Overdue';
      }
    }
    if (bill.status === 'paid') {
      return 'Paid';
    }
    return 'Pending';
  };

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-900">Total Amount</span>
            </div>
          </div>
          <div className="text-lg font-bold text-blue-900">{formatToRupiah(totalAmount)}</div>
          <div className="text-xs text-blue-600 mt-1">{bills.length} bills</div>
        </div>

        <div className="p-3 bg-amber-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-900">Due This Week</span>
            </div>
          </div>
          <div className="text-lg font-bold text-amber-900">{dueThisWeekCount}</div>
          <div className="text-xs text-amber-600 mt-1">Awaiting payment</div>
        </div>

        <div className="p-3 bg-red-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-red-900">Overdue</span>
            </div>
          </div>
          <div className="text-lg font-bold text-red-900">{overdueCount}</div>
          <div className="text-xs text-red-600 mt-1">Requires attention</div>
        </div>
      </div>

      {/* This Month */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-xs font-medium text-gray-700 mb-2">This Month</div>
        <div className="text-sm font-semibold text-gray-900">{formatToRupiah(thisMonthTotal)}</div>
        <div className="text-xs text-gray-500 mt-1">{thisMonthBills.length} bills</div>
      </div>

      {/* Recent Bills */}
      <div>
        <div className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Recent Bills</div>
        <div className="space-y-2">
          {recentBills.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No upcoming bills</p>
          ) : (
            recentBills.map((bill) => (
              <div key={bill.id} className="flex items-start gap-3 p-2 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="p-1 rounded bg-gray-50 flex-shrink-0">
                  {getStatusIcon(bill)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {bill.expense_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {bill.category}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-xs px-1.5 py-0.5 ${getStatusColor(bill)}`}>
                      {getStatusText(bill)}
                    </Badge>
                    {bill.next_payment_date && (
                      <span className="text-xs text-gray-400">
                        {format(new Date(bill.next_payment_date), 'MMM dd')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold text-gray-900">
                    {formatToRupiah(bill.amount)}
                  </p>
                  {bill.next_payment_date && (
                    <p className="text-xs text-gray-500">
                      {getDaysUntilDue(bill.next_payment_date)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
