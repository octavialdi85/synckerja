
import { Ticket, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useCustomerServiceTickets } from '@/features/share/hooks/useCustomerServiceTickets';

export const CustomerServiceMetricsCards = () => {
  const { tickets = [], isLoading } = useCustomerServiceTickets();

  if (isLoading) {
    return (
      <>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-md border border-gray-200/50 p-2.5 shadow-sm animate-pulse">
            <div className="flex items-center justify-between mb-1">
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded mb-1"></div>
                <div className="h-5 bg-gray-200 rounded mb-1"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded-md"></div>
            </div>
          </div>
        ))}
      </>
    );
  }

  const metrics = {
    total: { count: tickets.length, label: 'Total Tickets' },
    open: { count: tickets.filter(t => t.status === 'open').length, label: 'Open Tickets' },
    resolved: { count: tickets.filter(t => t.status === 'resolved').length, label: 'Resolved' },
    urgent: { count: tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length, label: 'Urgent' }
  };

  const metricsData = [
    {
      title: 'Total Tickets',
      value: metrics.total.count,
      icon: Ticket,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      accent: 'bg-blue-500'
    },
    {
      title: 'Open Tickets',
      value: metrics.open.count,
      icon: Clock,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      accent: 'bg-amber-500'
    },
    {
      title: 'Resolved',
      value: metrics.resolved.count,
      icon: CheckCircle,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
      accent: 'bg-green-500'
    },
    {
      title: 'Urgent',
      value: metrics.urgent.count,
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50',
      accent: 'bg-red-500'
    }
  ];

  return (
    <>
      {metricsData.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div key={index} className="bg-white rounded-md border border-gray-200/50 p-2.5 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-500 mb-0.5">{metric.title}</div>
                <div className="text-xl font-bold text-gray-900">{metric.value}</div>
                <div className="text-xs text-gray-500">
                  Tickets
                </div>
              </div>
              <div className={`p-1.5 rounded-md ${metric.iconBg} ml-2`}>
                <Icon className={`h-3.5 w-3.5 ${metric.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
