import { memo } from 'react';
import { Card, CardContent } from '@/features/ui/card';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface UsageMetrics {
  employee_utilization_percentage: number;
  plan_efficiency_score: number;
  growth_rate: number;
}

interface UsageMetricsCardsProps {
  metrics: UsageMetrics | null;
  isLoading?: boolean;
}

export const UsageMetricsCards = memo(({ metrics, isLoading }: UsageMetricsCardsProps) => {
  const { t } = useAppTranslation();
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={`usage-metrics-skeleton-${index}`}>
            <CardContent className="p-3">
              <div className="text-center space-y-1.5">
                <div className="h-8 bg-slate-200 rounded animate-pulse w-14 mx-auto"></div>
                <div className="h-3 bg-slate-200 rounded animate-pulse w-20 mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
      <Card>
        <CardContent className="p-2.5">
          <div className="text-center">
            <div className="text-2xl font-semibold text-blue-600">
              {Math.round(metrics.employee_utilization_percentage)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('subscription.overview.employeeUtilization')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-2.5">
          <div className="text-center">
            <div className="text-2xl font-semibold text-green-600">
              {Math.round(metrics.plan_efficiency_score)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('subscription.overview.planEfficiency')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-2.5">
          <div className="text-center">
            <div className="text-2xl font-semibold text-purple-600">
              {Math.round(metrics.growth_rate)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('subscription.overview.growthRate')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

UsageMetricsCards.displayName = 'UsageMetricsCards';

