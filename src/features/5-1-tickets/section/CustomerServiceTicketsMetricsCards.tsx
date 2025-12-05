import React from 'react';
import { Ticket, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useCustomerServiceTickets } from '@/features/share/hooks/useCustomerServiceTickets';

export const CustomerServiceTicketsMetricsCards = () => {
  const { tickets = [], isLoading } = useCustomerServiceTickets();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-md border border-gray-200/50 p-4 shadow-sm animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded mb-1"></div>
                <div className="h-5 bg-gray-200 rounded mb-1"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded-md"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const stats = {
    total: tickets.length,
    new: tickets.filter(t => t.status === 'New' || t.status === 'new').length,
    inProgress: tickets.filter(t => t.status === 'In Progress' || t.status === 'in-progress' || t.status === 'In Progress').length,
    resolved: tickets.filter(t => t.status === 'Resolved' || t.status === 'resolved' || t.status === 'Closed' || t.status === 'closed').length,
  };

  const statsCards = [
    {
      title: 'Total Tickets',
      value: stats.total.toString(),
      subtitle: 'All tickets',
      icon: Ticket,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'New',
      value: stats.new.toString(),
      subtitle: 'Pending review',
      icon: AlertCircle,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    {
      title: 'In Progress',
      value: stats.inProgress.toString(),
      subtitle: 'Being worked on',
      icon: Clock,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Resolved',
      value: stats.resolved.toString(),
      subtitle: 'Completed',
      icon: CheckCircle2,
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



