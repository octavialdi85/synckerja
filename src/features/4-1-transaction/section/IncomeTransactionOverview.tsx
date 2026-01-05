import { DollarSign, Calendar, Receipt } from 'lucide-react';
import { useIncomeTransactions } from '@/features/4-1-dashboard/hooks';
import { useIncomeMetrics } from '@/features/4-1-dashboard/hooks';
import { formatToRupiah } from '@/utils/formatCurrency';

interface IncomeTransactionOverviewProps {
  transactions?: any[];
}

export const IncomeTransactionOverview = ({ transactions = [] }: IncomeTransactionOverviewProps) => {
  const { incomeTransactions } = useIncomeTransactions();
  const { data: metrics } = useIncomeMetrics();

  // Use provided transactions or fallback to all transactions
  const displayTransactions = transactions.length > 0 ? transactions : incomeTransactions;

  // Calculate metrics
  const totalAmount = displayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const completedCount = displayTransactions.filter(t => t.status === 'completed').length;
  const pendingCount = displayTransactions.filter(t => t.status === 'pending').length;
  
  // Get unique income types
  const uniqueTypes = [...new Set(displayTransactions.map(t => t.income_types?.name).filter(Boolean))];
  const totalTypes = uniqueTypes.length;

  // Get top income type
  const typeCounts = uniqueTypes.map(type => ({
    name: type,
    count: displayTransactions.filter(t => t.income_types?.name === type).length,
    amount: displayTransactions
      .filter(t => t.income_types?.name === type)
      .reduce((sum, t) => sum + (t.amount || 0), 0)
  }));
  const topType = typeCounts.reduce((max, current) => 
    current.amount > max.amount ? current : max, typeCounts[0] || { name: 'N/A', count: 0, amount: 0 });

  // Get this month transactions
  const thisMonth = new Date();
  const thisMonthTransactions = displayTransactions.filter(t => {
    const transDate = new Date(t.transaction_date);
    return transDate.getMonth() === thisMonth.getMonth() && 
           transDate.getFullYear() === thisMonth.getFullYear();
  });
  const thisMonthTotal = thisMonthTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-800">Total Income</p>
              <p className="text-lg font-bold text-blue-900">{formatToRupiah(totalAmount)}</p>
            </div>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-800">Completed</p>
              <p className="text-lg font-bold text-green-900">{completedCount}</p>
            </div>
            <Receipt className="w-5 h-5 text-green-600" />
          </div>
        </div>

        <div className="p-3 bg-amber-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-800">Pending</p>
              <p className="text-lg font-bold text-amber-900">{pendingCount}</p>
            </div>
            <Calendar className="w-5 h-5 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="space-y-2 pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">This Month:</span>
          <span className="font-semibold text-gray-900">{formatToRupiah(thisMonthTotal)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Income Types:</span>
          <span className="font-semibold text-gray-900">{totalTypes}</span>
        </div>
        {topType.name !== 'N/A' && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Top Type:</span>
            <span className="font-semibold text-gray-900">{topType.name}</span>
          </div>
        )}
        {metrics?.growthPercentage !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Growth:</span>
            <span className={`font-semibold ${metrics.growthPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.growthPercentage >= 0 ? '+' : ''}{metrics.growthPercentage.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

