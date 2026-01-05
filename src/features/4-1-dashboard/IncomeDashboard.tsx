
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Calendar, TrendingUp, DollarSign, Target, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useIncomeMetrics, useIncomeTransactions, useMonthlyIncomeData } from './hooks';
import { formatToRupiah } from '@/utils/formatCurrency';
import { IncomeVsExpensesChart } from './IncomeVsExpensesChart';
import { HeaderAndTab } from './HeaderAndTab';

export function IncomeDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const { data: metrics, isLoading: metricsLoading } = useIncomeMetrics();
  const { incomeTransactions, isLoading: transactionsLoading } = useIncomeTransactions();
  const { data: monthlyData = [], isLoading: monthlyLoading } = useMonthlyIncomeData(selectedYear);

  // Calculate additional metrics from transactions
  const calculateMetrics = () => {
    if (!incomeTransactions.length) return { highest: 0, latest: 0 };
    
    const amounts = incomeTransactions.map(t => t.amount);
    const highest = Math.max(...amounts);
    const latest = incomeTransactions[0]?.amount || 0;
    
    return { highest, latest };
  };

  const { highest, latest } = calculateMetrics();

  if (metricsLoading || transactionsLoading || monthlyLoading) {
    return (
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-h-0 min-w-0 px-4 pb-4">
          <div className="h-full flex flex-col overflow-hidden">
            {/* Header and Tabs */}
            <div className="flex-shrink-0 mb-1">
              <HeaderAndTab 
                activeTab={activeTab} 
                onTabChange={handleTabChange} 
              />
            </div>
            
            <div className="flex-1 min-h-0 seamless-scroll max-h-[calc(100vh-120px)]">
              <div className="p-4 bg-gradient-to-br from-gray-50 to-white">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-4 w-48"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="bg-white p-4 rounded-lg h-24"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 flex flex-col min-h-0 min-w-0 px-4 pb-4">
        <div className="h-full flex flex-col overflow-hidden">
          {/* Header and Tabs */}
          <div className="flex-shrink-0 mb-1">
            <HeaderAndTab 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
            />
          </div>
          
          <div className="flex-1 min-h-0 seamless-scroll max-h-[calc(100vh-120px)]">
            <div className="p-2 bg-gradient-to-br from-gray-50 to-white">
              {/* Compact Header Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                <h2 className="text-lg font-bold text-gray-800">Income Analytics</h2>
                <div className="flex gap-2">
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-36 h-9 bg-white border-gray-200 shadow-sm">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 shadow-lg z-50">
                      <SelectItem value="This Month">This Month</SelectItem>
                      <SelectItem value="Last Month">Last Month</SelectItem>
                      <SelectItem value="Last 3 Months">Last 3 Months</SelectItem>
                      <SelectItem value="Last 6 Months">Last 6 Months</SelectItem>
                      <SelectItem value="This Year">This Year</SelectItem>
                      <SelectItem value="Last Year">Last Year</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-32 h-9 bg-white border-gray-200 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 shadow-lg z-50">
                      <SelectItem value="All Types">All Types</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Service">Service</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Compact Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
                {/* Total Income Card */}
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Total Income</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatToRupiah(metrics?.currentMonthTotal || 0)}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Period Change Card */}
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Growth</span>
                </div>
                <div className={`text-2xl font-bold mb-1 ${(metrics?.growthPercentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(metrics?.growthPercentage || 0) >= 0 ? '+' : ''}{(metrics?.growthPercentage || 0).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  vs Previous: {formatToRupiah(metrics?.previousMonthTotal || 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Highest Income Card */}
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Target className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Highest</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatToRupiah(highest)}
                </div>
                <div className="text-xs text-gray-500">
                  {highest > 0 ? 'This period' : 'No data'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Latest Income Card */}
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Clock className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Latest</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatToRupiah(latest)}
                </div>
                <div className="text-xs text-gray-500">
                  {latest > 0 ? 'Most recent' : 'No data'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
              </div>

              {/* Compact Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-2">
                {/* Income Types Chart */}
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-3">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Income Distribution</h3>
            <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-3xl mb-2">📊</div>
                <p className="text-gray-500 text-sm font-medium">
                  {incomeTransactions.length > 0 ? 'Chart visualization coming soon' : 'No income data available'}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {incomeTransactions.length === 0 ? 'Start adding income records' : `${incomeTransactions.length} transactions recorded`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Income Trends Chart */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Trend Pendapatan Bulanan Tahun {selectedYear}</CardTitle>
                <div className="text-xs text-muted-foreground">Satuan: Rupiah | Jan - Des {selectedYear}</div>
              </div>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-20 h-8 text-sm border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart 
                data={monthlyData} 
                margin={{
                  top: 10,
                  right: 5,
                  left: 25,
                  bottom: 0
                }} 
                barCategoryGap="2%"
              >
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9 }} 
                  height={40} 
                  tickFormatter={value => value.split(' ')[0]} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 8 }} 
                  width={35} 
                  tickFormatter={value => `${(value / 1000000).toFixed(0)}M`} 
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2 border rounded shadow-sm text-xs">
                          <p className="font-medium">{label}</p>
                          <p className="text-primary">
                            {formatToRupiah(payload[0].value as number)}
                          </p>
                          <p className="text-muted-foreground">
                            {payload[0].payload.count} transaksi
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--primary))" 
                  radius={[2, 2, 0, 0]} 
                  maxBarSize={60} 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
              </div>

              {/* Real Income vs Expenses Chart */}
              <IncomeVsExpensesChart />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
