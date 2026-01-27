import { TrendingUp, Calendar, Target, DollarSign, AlertTriangle, Clock } from 'lucide-react';

interface CampaignMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudget: number;
  allocatedBudget: number;
  remainingBudget: number;
}

interface KOLCampaignsOverviewProps {
  campaigns: any[];
  metrics?: CampaignMetrics | null;
}

export const KOLCampaignsOverview = ({ campaigns: passedCampaigns, metrics: passedMetrics }: KOLCampaignsOverviewProps) => {
  // Use passed props only
  const campaigns = Array.isArray(passedCampaigns) ? passedCampaigns : [];
  const metrics = passedMetrics;

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const upcomingCampaigns = campaigns.filter(c => c.status === 'draft');
  const completedCampaigns = campaigns.filter(c => c.status === 'completed');

  // Calculate metrics if not provided
  const calculatedMetrics = metrics || {
    totalCampaigns: campaigns.length,
    activeCampaigns: activeCampaigns.length,
    totalBudget: campaigns.reduce((sum, c) => sum + (c.total_budget || 0), 0),
    allocatedBudget: campaigns.reduce((sum, c) => sum + (c.allocated_budget || 0), 0),
    remainingBudget: campaigns.reduce((sum, c) => sum + ((c.total_budget || 0) - (c.allocated_budget || 0)), 0)
  };

  // Calculate alerts based on actual data
  const budgetAlerts = campaigns.filter(c => {
    if (!c.total_budget || !c.allocated_budget) return false;
    const utilization = (c.allocated_budget / c.total_budget) * 100;
    return utilization >= 80 && utilization < 100;
  }).length;

  const overdueCampaigns = campaigns.filter(c => {
    if (!c.end_date) return false;
    const endDate = new Date(c.end_date);
    const today = new Date();
    const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilEnd <= 7 && daysUntilEnd > 0;
  }).length;

  const alerts = [
    ...(budgetAlerts > 0 ? [{ type: 'warning' as const, message: 'Budget Alert', detail: `${budgetAlerts} campaigns approaching budget limit`, count: budgetAlerts }] : []),
    ...(overdueCampaigns > 0 ? [{ type: 'info' as const, message: 'Deadline Reminder', detail: `${overdueCampaigns} campaigns ending this week`, count: overdueCampaigns }] : [])
  ];

  // Generate recent activities based on real data
  const recentActivities = [
    { type: 'campaign', message: `${calculatedMetrics.activeCampaigns} active campaigns running`, time: '1 hour ago' },
    { type: 'performance', message: `${completedCampaigns.length} campaigns completed`, time: '3 hours ago' },
    ...(budgetAlerts > 0 ? [{ type: 'alert', message: `${budgetAlerts} campaigns need budget attention`, time: '5 hours ago' }] : []),
    { type: 'update', message: 'Campaign metrics updated', time: '1 day ago' }
  ];

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `Rp ${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `Rp ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `Rp ${(amount / 1000).toFixed(1)}K`;
    }
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-800">Total Budget</p>
              <p className="text-lg font-bold text-blue-900">
                {formatCurrency(calculatedMetrics.totalBudget)}
              </p>
            </div>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-800">Active Campaigns</p>
              <p className="text-lg font-bold text-green-900">
                {calculatedMetrics.activeCampaigns}
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" />
            Manager Alerts
          </h4>
          
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div key={index} className={`p-2 rounded-lg border ${
                alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${
                      alert.type === 'warning' ? 'text-amber-900' :
                      'text-blue-900'
                    } truncate`}>
                      {alert.message}
                    </p>
                    <p className={`text-xs mt-0.5 ${
                      alert.type === 'warning' ? 'text-amber-700' :
                      'text-blue-700'
                    }`}>
                      {alert.detail}
                    </p>
                  </div>
                  <div className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
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
      )}

      {/* Active Campaigns */}
      <div>
        <h4 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Target className="h-3 w-3" />
          Active Campaigns
        </h4>
        
        <div className="space-y-2">
          {activeCampaigns.slice(0, 3).map((campaign) => (
            <div key={campaign.id} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {campaign.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {campaign.total_budget ? formatCurrency(campaign.total_budget) : 'No budget'}
                  </p>
                </div>
                <div className="text-right ml-2">
                  <div className="text-xs font-medium text-gray-900">
                    {campaign.status || 'active'}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {activeCampaigns.length === 0 && (
            <div className="p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 text-center">No active campaigns</p>
            </div>
          )}
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
                  activity.type === 'update' ? 'bg-green-100' :
                  activity.type === 'alert' ? 'bg-amber-100' :
                  'bg-purple-100'
                }`}>
                  {activity.type === 'campaign' ? <Target className="h-3 w-3 text-blue-600" /> :
                   activity.type === 'update' ? <TrendingUp className="h-3 w-3 text-green-600" /> :
                   activity.type === 'alert' ? <AlertTriangle className="h-3 w-3 text-amber-600" /> :
                   <Clock className="h-3 w-3 text-purple-600" />}
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
              <p className="text-xs text-slate-600">Total Campaigns</p>
              <p className="text-sm font-bold text-slate-900">{calculatedMetrics.totalCampaigns}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Budget Used</p>
              <p className="text-sm font-bold text-slate-900">
                {calculatedMetrics.totalBudget > 0 
                  ? `${((calculatedMetrics.allocatedBudget / calculatedMetrics.totalBudget) * 100).toFixed(1)}%`
                  : '0%'
                }
              </p>
            </div>
          </div>
          
          <div className="mt-2 pt-2 border-t border-blue-200">
            <p className="text-xs text-slate-600">
              <span className="text-green-600 font-medium">
                {calculatedMetrics.activeCampaigns} active campaigns
              </span> running this month
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KOLCampaignsOverview;
