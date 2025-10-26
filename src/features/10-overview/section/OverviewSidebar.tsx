import { memo } from 'react';
import { Clock, Users, Calendar, TrendingUp } from 'lucide-react';

interface OverviewSidebarProps {
  subscriptionStatus: any;
}

export const OverviewSidebar = memo(({ subscriptionStatus }: OverviewSidebarProps) => {
  const stats = [
    {
      icon: Users,
      label: 'Active Employees',
      value: subscriptionStatus?.employee_count || 0,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: TrendingUp,
      label: 'Member Limit',
      value: subscriptionStatus?.member_limit || 0,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: Calendar,
      label: 'Plan Name',
      value: subscriptionStatus?.plan_name || 'No Plan',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: Clock,
      label: 'Status',
      value: subscriptionStatus?.status || 'Unknown',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="space-y-3">
      {stats.map((stat, index) => (
        <div 
          key={index}
          className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">{stat.label}</p>
              <p className={`text-sm font-semibold ${stat.color} truncate`}>
                {stat.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

OverviewSidebar.displayName = 'OverviewSidebar';

