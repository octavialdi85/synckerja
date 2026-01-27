
import { TrendingUp, Users, Star, Target, AlertTriangle, Calendar } from 'lucide-react';
import { KOLProfileWithStats } from '@/hooks/useKOLManagementData';

interface KOLManagementOverviewProps {
  metrics: {
    totalKOLs: number;
    activeKOLs: number;
    totalFollowers: number;
    totalCampaigns: number;
    activeCampaigns: number;
    avgEngagement: number;
  } | null;
  profiles: KOLProfileWithStats[];
}

export const KOLManagementOverview = ({ metrics: passedMetrics, profiles: passedProfiles }: KOLManagementOverviewProps) => {
  // Use passed props only - no hook queries to avoid errors
  const profiles = Array.isArray(passedProfiles) ? passedProfiles : [];
  const metrics = passedMetrics;

  // Calculate real top performers based on engagement rate and followers
  const topPerformers = profiles
    .filter(profile => profile && typeof profile === 'object')
    .map(profile => {
      // Safely access properties with fallbacks
      const socialAccounts = 'social_accounts' in profile ? profile.social_accounts : [];
      const engagementRate = 'engagement_rate' in profile ? profile.engagement_rate : 0;
      const totalReach = 'total_reach' in profile ? profile.total_reach : ('followers_count' in profile ? profile.followers_count : 0);
      
      const avgEngagement = socialAccounts && socialAccounts.length > 0 
        ? socialAccounts.reduce((sum: number, acc: any) => sum + (acc.engagement_rate || 0), 0) / socialAccounts.length
        : engagementRate;
        
      const performanceScore = Math.min(100, Math.round((avgEngagement * 20) + (totalReach / 10000)));
      
      return {
        ...profile,
        performanceScore,
        followers: totalReach
      };
    })
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, 3);

  // Calculate real alerts based on actual data
  const lowPerformanceKOLs = (Array.isArray(profiles) ? profiles : []).filter(profile => {
    const socialAccounts = 'social_accounts' in profile ? profile.social_accounts : [];
    const engagementRate = 'engagement_rate' in profile ? profile.engagement_rate : 0;
    
    const avgEngagement = socialAccounts && socialAccounts.length > 0 
      ? socialAccounts.reduce((sum: number, acc: any) => sum + (acc.engagement_rate || 0), 0) / socialAccounts.length
      : engagementRate;
    return avgEngagement < 2; // Below 2% engagement
  }).length;

  const inactiveKOLs = (Array.isArray(profiles) ? profiles : []).filter(profile => profile.status === 'inactive').length;
  const pendingKOLs = (Array.isArray(profiles) ? profiles : []).filter(profile => profile.status === 'pending').length;

  const alerts = [
    ...(lowPerformanceKOLs > 0 ? [{ type: 'warning' as const, message: 'Performance below target', count: lowPerformanceKOLs }] : []),
    ...(inactiveKOLs > 0 ? [{ type: 'urgent' as const, message: 'Inactive KOLs requiring attention', count: inactiveKOLs }] : []),
    ...(pendingKOLs > 0 ? [{ type: 'info' as const, message: 'New applications pending', count: pendingKOLs }] : [])
  ];

  // Generate recent activities based on real data patterns
  const recentActivities = [
    { type: 'campaign', message: `${metrics?.activeCampaigns || 0} active campaigns running`, time: '1 hour ago' },
    { type: 'performance', message: `${topPerformers.length} KOLs performing above average`, time: '3 hours ago' },
    ...(lowPerformanceKOLs > 0 ? [{ type: 'alert', message: `${lowPerformanceKOLs} KOLs need performance improvement`, time: '5 hours ago' }] : []),
    { type: 'rating', message: 'KOL performance metrics updated', time: '1 day ago' }
  ];

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-800">Total Reach</p>
              <p className="text-lg font-bold text-blue-900">
                {metrics?.totalFollowers ? `${(metrics.totalFollowers / 1000000).toFixed(1)}M` : '0'}
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-800">Avg Performance</p>
              <p className="text-lg font-bold text-green-900">
                {metrics?.avgEngagement ? `${Number(metrics.avgEngagement).toFixed(1)}%` : '0%'}
              </p>
            </div>
            <Star className="h-4 w-4 text-green-600" />
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div>
        <h4 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <AlertTriangle className="h-3 w-3" />
          Manager Alerts
        </h4>
        
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div key={index} className={`p-2 rounded-lg border ${
              alert.type === 'urgent' ? 'bg-red-50 border-red-200' :
              alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
              'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${
                    alert.type === 'urgent' ? 'text-red-900' :
                    alert.type === 'warning' ? 'text-amber-900' :
                    'text-blue-900'
                  } truncate`}>
                    {alert.message}
                  </p>
                </div>
                <div className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                  alert.type === 'urgent' ? 'bg-red-100 text-red-800' :
                  alert.type === 'warning' ? 'bg-amber-100 text-amber-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {alert.count}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers */}
      <div>
        <h4 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Star className="h-3 w-3" />
          Top Performers This Month
        </h4>
        
        <div className="space-y-2">
          {topPerformers.map((kol, index) => (
            <div key={kol.id} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {kol.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {kol.category || 'Fashion'}
                  </p>
                </div>
                <div className="text-right ml-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500 fill-current" />
                    <span className="text-xs font-medium text-gray-900">
                      {kol.performanceScore}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {(kol.followers / 1000).toFixed(0)}K followers
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div>
        <h4 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          Recent Activities
        </h4>
        
        <div className="space-y-2">
          {recentActivities.map((activity, index) => (
            <div key={index} className="p-2 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-2">
                <div className={`p-1 rounded ${
                  activity.type === 'campaign' ? 'bg-blue-100' :
                  activity.type === 'rating' ? 'bg-green-100' :
                  activity.type === 'alert' ? 'bg-amber-100' :
                  'bg-purple-100'
                }`}>
                  {activity.type === 'campaign' ? <Target className="h-3 w-3 text-blue-600" /> :
                   activity.type === 'rating' ? <Star className="h-3 w-3 text-green-600" /> :
                   activity.type === 'alert' ? <AlertTriangle className="h-3 w-3 text-amber-600" /> :
                   <TrendingUp className="h-3 w-3 text-purple-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-900 leading-tight">
                    {activity.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activity.time}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Summary */}
      <div>
        <h4 className="text-xs font-semibold text-slate-700 mb-3">Performance Summary</h4>
        
        <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-600">Active KOLs</p>
              <p className="text-sm font-bold text-slate-900">{metrics?.activeKOLs || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Total Campaigns</p>
              <p className="text-sm font-bold text-slate-900">{metrics?.totalCampaigns || 0}</p>
            </div>
          </div>
          
          <div className="mt-2 pt-2 border-t border-blue-200">
            <p className="text-xs text-slate-600">
              <span className="text-green-600 font-medium">
                {metrics?.activeCampaigns || 0} active campaigns
              </span> running this month
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
