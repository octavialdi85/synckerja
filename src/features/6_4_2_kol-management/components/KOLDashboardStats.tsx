
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, DollarSign, Eye, Target, BarChart3 } from 'lucide-react';
import { useKOLProfiles } from '@/hooks/useKOLProfiles';

const KOLDashboardStats = () => {
  const { profiles, metrics, loading } = useKOLProfiles();

  const stats = [
    {
      title: 'Total KOLs',
      value: metrics.totalKOLs.toString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      subtitle: `${profiles.filter(p => p.status === 'active').length} active`,
    },
    {
      title: 'Total Followers',
      value: metrics.totalFollowers.toLocaleString(),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      subtitle: 'Combined reach',
    },
    {
      title: 'Avg Engagement',
      value: `${metrics.avgEngagement.toFixed(2)}%`,
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      subtitle: 'Engagement rate',
    },
    {
      title: 'Total ROI',
      value: `$${metrics.totalConversions.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      subtitle: 'Conversion value',
    },
    {
      title: 'Content Posts',
      value: profiles.reduce((sum, p) => sum + (p.total_posts || 0), 0).toString(),
      icon: BarChart3,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      subtitle: 'Total published',
    },
    {
      title: 'Avg Reach',
      value: Math.round(metrics.totalReach / Math.max(metrics.totalKOLs, 1)).toLocaleString(),
      icon: Eye,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      subtitle: 'Per KOL',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-12 mb-2"></div>
              <div className="h-2 bg-gray-200 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="relative overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default KOLDashboardStats;
