import { AlertTriangle, BarChart3, Clock, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { UnifiedAvatar } from '@/features/share/UnifiedAvatar';
import { ReprimandSidebarFooter } from './ReprimandSidebarFooter';

interface ReprimandManagementOverviewProps {
  reprimands: any[];
  employees: any[];
}

function ReprimandManagementOverview({ reprimands, employees }: ReprimandManagementOverviewProps) {
  // Calculate statistics
  const activityStats = {
    total: reprimands.length,
    active: reprimands.filter(r => r.status === 'active').length,
    thisMonth: reprimands.filter(r => {
      const reprimandDate = new Date(r.created_at);
      const now = new Date();
      return reprimandDate.getMonth() === now.getMonth() && 
             reprimandDate.getFullYear() === now.getFullYear();
    }).length,
  };

  // Get severity distribution
  const severityStats = reprimands.reduce((acc, r) => {
    const severity = r.severity_level || 'unknown';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get recent activities (last 20, sorted by created_at)
  const recentActivities = reprimands
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  const getActionIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'appealed':
        return <RotateCcw className="w-4 h-4 text-orange-500" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionText = (status: string) => {
    switch (status) {
      case 'active':
        return 'issued';
      case 'resolved':
        return 'resolved';
      case 'appealed':
        return 'appealed';
      case 'cancelled':
        return 'cancelled';
      default:
        return status;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const activityDate = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return activityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatReprimandType = (type: string) => {
    return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  return (
    <div className="bg-white border rounded-lg h-full flex flex-col max-h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="px-4 py-2 border-b flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">Reprimand Overview</h3>
        <p className="text-xs text-gray-500 mt-1">Disciplinary action statistics and insights</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto seamless-scroll p-4 space-y-4">

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-3">
          <div className="p-3 bg-red-50 rounded-lg">
          <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-800">Total Reprimands</p>
                <p className="text-lg font-bold text-red-900">{activityStats.total}</p>
              </div>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </div>
          
          <div className="p-3 bg-orange-50 rounded-lg">
          <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-800">Active Warnings</p>
                <p className="text-lg font-bold text-orange-900">{activityStats.active}</p>
              </div>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-800">This Month</p>
                <p className="text-lg font-bold text-blue-900">{activityStats.thisMonth}</p>
              </div>
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
        </div>
      </div>

      {/* Severity Distribution */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <BarChart3 className="h-3 w-3" />
            Severity Distribution
          </h4>
          <div className="space-y-2">
          {['critical', 'high', 'medium', 'low'].map((severity) => {
            const count = severityStats[severity] || 0;
            const colors = {
              critical: 'bg-red-500',
              high: 'bg-orange-500',
              medium: 'bg-yellow-500',
              low: 'bg-green-500',
            };
            
            return (
                <div key={severity} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 ${colors[severity as keyof typeof colors]} rounded-full`}></div>
                      <span className="text-xs font-medium text-gray-900 capitalize">{severity}</span>
                    </div>
                    <span className="text-xs text-gray-500">{count}</span>
                  </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Recent Activity
          </h4>
          <div className="space-y-2">
          {recentActivities.length > 0 ? (
              recentActivities.slice(0, 3).map((activity) => {
                const employee = employees.find(e => e.id === activity.employee_id);
                
                return (
                  <div key={activity.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-900">
                              {employee?.full_name || 'Unknown Employee'}
                            </p>
                        <p className="text-xs text-gray-500">
                          {formatReprimandType(activity.reprimand_type)} • {activity.severity_level}
                            </p>
                          </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                            {formatDate(activity.created_at)}
                        </p>
                        <div className={`w-2 h-2 rounded-full mt-1 ${
                          activity.status === 'active' ? 'bg-red-500' :
                          activity.status === 'resolved' ? 'bg-green-500' :
                          'bg-yellow-500'
                        }`}></div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4">
                <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No recent activity</p>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Footer */}
      <ReprimandSidebarFooter 
        totalReprimands={activityStats.total}
        activeReprimands={activityStats.active}
        thisMonthReprimands={activityStats.thisMonth}
      />
    </div>
  );
}

export default ReprimandManagementOverview;
