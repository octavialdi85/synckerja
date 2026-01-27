import { useKOLConversions } from '@/hooks/organized/utils';
import { Target, TrendingUp, DollarSign, Activity } from 'lucide-react';

export const ConversionMetricsCard = () => {
  const { data: conversions = [], isLoading } = useKOLConversions();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-slate-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalConversions = conversions.length;
  const totalValue = conversions.reduce((sum, conv) => sum + (conv.conversion_value || 0), 0);
  const uniqueTypes = new Set(conversions.map(conv => conv.conversion_type)).size;
  const avgValue = totalConversions > 0 ? totalValue / totalConversions : 0;

  // Get conversions from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentConversions = conversions.filter(conv => 
    new Date(conv.conversion_date) >= thirtyDaysAgo
  );

  const recentTotal = recentConversions.length;
  const recentValue = recentConversions.reduce((sum, conv) => sum + (conv.conversion_value || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Conversion Metrics</h3>
        <Target className="h-5 w-5 text-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Total Conversions */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-500" />
            <span className="text-sm text-slate-600">Total Conversions</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatNumber(totalConversions)}</div>
          <div className="text-xs text-slate-500">
            {recentTotal} in last 30 days
          </div>
        </div>

        {/* Total Value */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="text-sm text-slate-600">Total Value</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalValue)}</div>
          <div className="text-xs text-slate-500">
            {formatCurrency(recentValue)} in last 30 days
          </div>
        </div>

        {/* Average Value */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-slate-600">Avg. Value</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(avgValue)}</div>
          <div className="text-xs text-slate-500">per conversion</div>
        </div>

        {/* Conversion Types */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-slate-600">Types</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{uniqueTypes}</div>
          <div className="text-xs text-slate-500">conversion types</div>
        </div>
      </div>

      {/* Top Conversion Types */}
      {conversions.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <h4 className="text-sm font-medium text-slate-700 mb-2">Top Conversion Types</h4>
          <div className="space-y-1">
            {Object.entries(
              conversions.reduce((acc, conv) => {
                acc[conv.conversion_type] = (acc[conv.conversion_type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            )
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 capitalize">{type}</span>
                  <span className="font-medium text-slate-900">{count}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
};
