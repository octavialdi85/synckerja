import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
// import '@/components/1_halaman/1_home/typography.css'; // File not found

interface ReprimandManagementMetricsCardsProps {
  reprimands: any[];
  employees: any[];
}

function ReprimandManagementMetricsCards({ reprimands, employees }: ReprimandManagementMetricsCardsProps) {
  // Calculate metrics
  const totalReprimands = reprimands.length;
  
  const activeReprimands = reprimands.filter(r => r.status === 'active').length;
  
  const resolvedReprimands = reprimands.filter(r => r.status === 'resolved').length;
  
  const criticalSeverity = reprimands.filter(r => r.severity_level === 'critical' || r.severity_level === 'high').length;

  const statsCards = [
    {
      title: 'Total Reprimands',
      value: totalReprimands.toString(),
      subtitle: 'All records',
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      title: 'Active Reprimands',
      value: activeReprimands.toString(),
      subtitle: 'Ongoing cases',
      icon: CheckCircle,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Resolved',
      value: resolvedReprimands.toString(),
      subtitle: 'Closed cases',
      icon: CheckCircle,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Critical/High',
      value: criticalSeverity.toString(),
      subtitle: 'High priority',
      icon: XCircle,
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
}

export default ReprimandManagementMetricsCards;

