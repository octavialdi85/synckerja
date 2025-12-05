import React from 'react';
import { Calendar, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useClientVisitsMetrics } from '@/hooks/organized/sales';

interface ClientVisitsMetricsCardsProps {
  visits?: any[];
}

export const ClientVisitsMetricsCards = ({ visits: propVisits }: ClientVisitsMetricsCardsProps) => {
  const { metrics, loading } = useClientVisitsMetrics();
  
  // Use prop visits if provided, otherwise use metrics
  const totalVisits = propVisits?.length || metrics.total || 0;
  const scheduledVisits = propVisits?.filter(v => v.status === 'scheduled').length || metrics.scheduled || 0;
  const completedVisits = propVisits?.filter(v => v.status === 'completed').length || metrics.completed || 0;
  const cancelledVisits = propVisits?.filter(v => v.status === 'cancelled').length || metrics.cancelled || 0;

  const statsCards = [
    {
      title: 'Total Visits',
      value: totalVisits.toString(),
      subtitle: 'All visits',
      icon: Calendar,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Scheduled',
      value: scheduledVisits.toString(),
      subtitle: 'Upcoming visits',
      icon: Clock,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      title: 'Completed',
      value: completedVisits.toString(),
      subtitle: 'Finished visits',
      icon: CheckCircle,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Cancelled',
      value: cancelledVisits.toString(),
      subtitle: 'Cancelled visits',
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
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
