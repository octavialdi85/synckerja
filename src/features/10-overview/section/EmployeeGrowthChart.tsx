import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface EmployeeGrowthChartProps {
  data: any[];
  isLoading?: boolean;
}

export const EmployeeGrowthChart = memo(({ data, isLoading }: EmployeeGrowthChartProps) => {
  const { t } = useAppTranslation();
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded animate-pulse w-24" />
          <div className="h-3 bg-slate-200 rounded animate-pulse w-32" />
        </div>
        <div className="h-44 bg-slate-100 rounded animate-pulse mt-3" />
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-base font-semibold">
          <TrendingUp className="h-4 w-4" />
          {t('subscription.overview.employeeGrowth')}
        </div>
        <p className="text-sm text-muted-foreground mt-3">{t('subscription.overview.noEmployeeGrowthData')}</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-base font-semibold">
        <TrendingUp className="h-4 w-4" />
        {t('subscription.overview.employeeGrowth')}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{t('subscription.overview.employeeGrowthSubtitle')}</p>
      <div className="h-44 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} width={32} />
            <Tooltip />
            <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});

EmployeeGrowthChart.displayName = 'EmployeeGrowthChart';

