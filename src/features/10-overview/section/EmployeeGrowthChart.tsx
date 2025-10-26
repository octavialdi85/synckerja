import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface EmployeeGrowthChartProps {
  data: any[];
  isLoading?: boolean;
}

export const EmployeeGrowthChart = memo(({ data, isLoading }: EmployeeGrowthChartProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 bg-slate-200 rounded animate-pulse w-32"></div>
          <div className="h-4 bg-slate-200 rounded animate-pulse w-48"></div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-slate-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Employee Growth
        </CardTitle>
        <CardDescription>Employee registration over the last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

EmployeeGrowthChart.displayName = 'EmployeeGrowthChart';

