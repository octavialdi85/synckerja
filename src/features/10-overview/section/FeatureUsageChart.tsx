import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FeatureUsageChartProps {
  data: any[];
  isLoading?: boolean;
}

export const FeatureUsageChart = memo(({ data, isLoading }: FeatureUsageChartProps) => {
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
          <BarChart3 className="h-5 w-5" />
          Feature Usage
        </CardTitle>
        <CardDescription>Most used features in your organization</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="feature" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="usage" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

FeatureUsageChart.displayName = 'FeatureUsageChart';

