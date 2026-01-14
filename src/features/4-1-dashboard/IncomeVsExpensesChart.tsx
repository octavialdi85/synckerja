
import { useMemo } from 'react';
import { Card, CardContent } from '@/features/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useIncomeMetrics } from './hooks';
import { useExpenseMetrics } from '@/features/4_2_dashboard/hooks/useExpenseMetrics';
import { formatToRupiah } from '@/utils/formatCurrency';

export const IncomeVsExpensesChart = () => {
  const { data: incomeMetrics, isLoading: incomeLoading } = useIncomeMetrics();
  const { data: expenseMetrics, isLoading: expenseLoading } = useExpenseMetrics();

  const chartData = useMemo(() => {
    if (!incomeMetrics || !expenseMetrics) return [];

    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
    const previousMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleDateString('en-US', { month: 'short' });

    return [
      {
        month: previousMonth,
        income: incomeMetrics.previousMonthTotal || 0,
        expenses: expenseMetrics.previousMonthTotal || 0,
      },
      {
        month: currentMonth,
        income: incomeMetrics.currentMonthTotal || 0,
        expenses: expenseMetrics.currentMonthTotal || 0,
      }
    ];
  }, [incomeMetrics, expenseMetrics]);

  const isLoading = incomeLoading || expenseLoading;

  if (isLoading) {
    return (
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Income vs. Expenses</h3>
          <div className="h-80 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-24 mb-2 mx-auto"></div>
                <div className="h-3 bg-gray-200 rounded w-32 mx-auto"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = chartData.some(item => item.income > 0 || item.expenses > 0);

  if (!hasData) {
    return (
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">Income vs. Expenses</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Expenses</span>
              </div>
            </div>
          </div>
          <div className="h-80 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-gray-500 text-sm font-medium">No financial data available</p>
              <p className="text-gray-400 text-xs mt-1">Add income and expense transactions to see comparison</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Income vs. Expenses</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Income</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Expenses</span>
            </div>
          </div>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatToRupiah(Number(value)),
                  name === 'income' ? 'Income' : 'Expenses'
                ]}
                labelStyle={{ color: '#374151' }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar 
                dataKey="income" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
                name="income"
              />
              <Bar 
                dataKey="expenses" 
                fill="#ef4444" 
                radius={[4, 4, 0, 0]}
                name="expenses"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
