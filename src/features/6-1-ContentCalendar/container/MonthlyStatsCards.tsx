import React from 'react';
import { Card, CardContent } from '@/features/ui/card';

interface MonthlyStatsCardsProps {
  monthlyStats: {
    total: number;
    red: number;
    orange: number;
    yellow: number;
    green: number;
    greenWithLate: number;
  };
}

export const MonthlyStatsCards: React.FC<MonthlyStatsCardsProps> = ({ monthlyStats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{monthlyStats.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{monthlyStats.red}</div>
          <div className="text-xs text-muted-foreground">Not Approved</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{monthlyStats.orange}</div>
          <div className="text-xs text-muted-foreground">Approved (No Production)</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{monthlyStats.yellow}</div>
          <div className="text-xs text-muted-foreground">Production Approved</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{monthlyStats.green}</div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{monthlyStats.greenWithLate}</div>
          <div className="text-xs text-muted-foreground">Completed (Late)</div>
        </CardContent>
      </Card>
    </div>
  );
};
