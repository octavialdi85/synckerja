import React from 'react';
import { Calendar, AlertCircle, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface CalendarStatsProps {
  monthlyStats: {
    total: number;
    red: number;
    orange: number;
    yellow: number;
    green: number;
    greenWithLate: number;
  };
}

export const CalendarStats: React.FC<CalendarStatsProps> = ({ monthlyStats }) => {
  const statsCards = [
    {
      title: 'Total Content',
      value: monthlyStats.total.toString(),
      subtitle: 'All content this month',
      icon: Calendar,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Not Approved',
      value: monthlyStats.red.toString(),
      subtitle: 'Not approved yet',
      icon: AlertCircle,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      title: 'Approved (No Production)',
      value: monthlyStats.orange.toString(),
      subtitle: 'Approved, no production',
      icon: Clock,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      title: 'Production Approved',
      value: monthlyStats.yellow.toString(),
      subtitle: 'Production approved',
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
      title: 'Completed',
      value: monthlyStats.green.toString(),
      subtitle: 'Completed on time',
      icon: CheckCircle,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Completed (Late)',
      value: monthlyStats.greenWithLate.toString(),
      subtitle: 'Completed but late',
      icon: CheckCircle,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-300'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-1.5">
      {statsCards.map((stat, index) => (
        <div key={index} className={`${stat.bgColor} ${stat.borderColor} border rounded-md p-4 flex flex-col`}>
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h3 className="text-sm font-medium text-gray-900">{stat.title}</h3>
            <stat.icon className={`w-5 h-5 ${stat.iconColor} flex-shrink-0`} />
          </div>
          
          <div className="flex flex-col flex-1 justify-end">
            <div className="text-2xl font-bold text-gray-900 text-left">{stat.value}</div>
            <div className="text-xs text-gray-600 text-left mt-1">{stat.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
