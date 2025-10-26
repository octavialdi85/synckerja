import React from 'react';
import { Card, CardContent } from '@/features/ui/card';

interface MonthlyStatsCardsProps {
  monthlyStats: {
    completed: number;
    planned: number;
    revision: number;
    overdue: number;
  };
}

export const MonthlyStatsCards: React.FC<MonthlyStatsCardsProps> = ({ monthlyStats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{monthlyStats.completed}</div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{monthlyStats.planned}</div>
          <div className="text-xs text-muted-foreground">Planned</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{monthlyStats.revision}</div>
          <div className="text-xs text-muted-foreground">Revision</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{monthlyStats.overdue}</div>
          <div className="text-xs text-muted-foreground">Overdue</div>
        </CardContent>
      </Card>
    </div>
  );
};
