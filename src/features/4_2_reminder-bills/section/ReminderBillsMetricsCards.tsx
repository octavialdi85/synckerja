import { useExpenses } from '@/features/4_2_dashboard/hooks/useExpenses';
import { formatToRupiah } from '@/utils/formatCurrency';
import { Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export const ReminderBillsMetricsCards = () => {
  const { expenses = [] } = useExpenses();

  // Filter expenses that are recurring for reminder bills
  const recurringExpenses = expenses.filter(expense => expense.is_recurring);
  
  const metrics = {
    total: {
      count: recurringExpenses.length,
      amount: recurringExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      accentColor: 'bg-blue-500',
      label: 'Total Recurring Bills'
    },
    dueThisWeek: {
      count: recurringExpenses.filter(expense => {
        if (!expense.next_payment_date) return false;
        const nextDate = new Date(expense.next_payment_date);
        const today = new Date();
        const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 7 && diffDays >= 0;
      }).length,
      amount: recurringExpenses
        .filter(expense => {
          if (!expense.next_payment_date) return false;
          const nextDate = new Date(expense.next_payment_date);
          const today = new Date();
          const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays <= 7 && diffDays >= 0;
        })
        .reduce((sum, expense) => sum + expense.amount, 0),
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      accentColor: 'bg-amber-500',
      label: 'Due This Week'
    },
    overdue: {
      count: recurringExpenses.filter(expense => {
        if (!expense.next_payment_date) return false;
        const nextDate = new Date(expense.next_payment_date);
        const today = new Date();
        return nextDate < today;
      }).length,
      amount: recurringExpenses
        .filter(expense => {
          if (!expense.next_payment_date) return false;
          const nextDate = new Date(expense.next_payment_date);
          const today = new Date();
          return nextDate < today;
        })
        .reduce((sum, expense) => sum + expense.amount, 0),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      accentColor: 'bg-red-500',
      label: 'Overdue'
    },
    completed: {
      count: recurringExpenses.filter(expense => expense.status === 'paid').length,
      amount: recurringExpenses
        .filter(expense => expense.status === 'paid')
        .reduce((sum, expense) => sum + expense.amount, 0),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      accentColor: 'bg-green-500',
      label: 'Completed'
    }
  };

  const cards = ['total', 'dueThisWeek', 'overdue', 'completed'] as const;

  return (
    <>
      {cards.map((key) => {
        const metric = metrics[key];
        const Icon = metric.icon;
        
        return (
          <div key={key} className="bg-white rounded-md border border-gray-200 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-500 mb-1">{metric.label}</div>
                <div className="text-lg font-bold text-gray-900">{metric.count}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {formatToRupiah(metric.amount)}
                </div>
              </div>
              <div className={`p-2 rounded-md ${metric.bgColor}`}>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
