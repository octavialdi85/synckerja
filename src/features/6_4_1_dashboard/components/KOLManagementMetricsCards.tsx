import React from 'react';
import { Users, TrendingUp, Target, DollarSign } from 'lucide-react';

interface KOLMetrics {
  totalKOLs: number;
  activeKOLs: number;
  totalFollowers: number;
  totalCampaigns: number;
  activeCampaigns: number;
  avgEngagement: number;
}

interface KOLManagementMetricsCardsProps {
  metrics: KOLMetrics | null;
  isLoading?: boolean;
}

export const KOLManagementMetricsCards = ({ 
  metrics,
  isLoading
}: KOLManagementMetricsCardsProps) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Total KOLs',
      value: metrics.totalKOLs.toString(),
      subtitle: 'All KOLs',
      icon: Users,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Active KOLs',
      value: metrics.activeKOLs.toString(),
      subtitle: 'Currently active',
      icon: TrendingUp,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Total Followers',
      value: formatNumber(metrics.totalFollowers),
      subtitle: 'Combined reach',
      icon: Target,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Active Campaigns',
      value: metrics.activeCampaigns.toString(),
      subtitle: `${metrics.totalCampaigns} total`,
      icon: DollarSign,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
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
