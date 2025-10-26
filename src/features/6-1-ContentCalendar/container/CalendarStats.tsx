import React from 'react';
import { Calendar, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface CalendarStatsProps {
  monthlyStats: {
    total: number;
    completed: number;
    overdue: number;
    planned: number;
    revision: number;
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
      title: 'Planned',
      value: monthlyStats.planned.toString(),
      subtitle: 'Pending content',
      icon: Clock,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
      title: 'Revision',
      value: monthlyStats.revision.toString(),
      subtitle: 'Needs revision',
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    {
      title: 'Completed',
      value: monthlyStats.completed.toString(),
      subtitle: 'Finished content',
      icon: CheckCircle,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
      {statsCards.map((stat, index) => (
        <div key={index} className={`${stat.bgColor} ${stat.borderColor} border rounded-md p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">{stat.title}</h3>
            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-600">{stat.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
