import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { PerformanceDashboard } from '@/components/FILTER-FILE1/optimized/PerformanceDashboard';

const PerformanceSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Performance Monitor</h2>
        <p className="text-muted-foreground">
          Monitor application performance and diagnostics
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>View detailed performance analytics</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <PerformanceDashboard />
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceSettings;
