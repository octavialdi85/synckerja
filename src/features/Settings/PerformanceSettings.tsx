import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { PerformanceDashboard } from '@/components/FILTER-FILE1/optimized/PerformanceDashboard';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

const PerformanceSettings = () => {
  const { t } = useAppTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">
          {t('settings.performance.heading', 'Performance Monitor')}
        </h2>
        <p className="text-muted-foreground">
          {t('settings.performance.subtitle', 'Monitor application performance and diagnostics')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.performance.cardTitle', 'Performance Metrics')}</CardTitle>
          <CardDescription>
            {t('settings.performance.cardDescription', 'View detailed performance analytics')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <PerformanceDashboard />
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceSettings;
