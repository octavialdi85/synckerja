import { TrendingUp, AlertTriangle, Star, Calendar, Target, Users } from 'lucide-react';

interface KOLContentPostOverviewProps {
  contentPosts: any[];
}

export const KOLContentPostOverview = ({ contentPosts: passedContentPosts }: KOLContentPostOverviewProps) => {
  // Use passed props only
  const contentPosts = Array.isArray(passedContentPosts) ? passedContentPosts : [];

  // Calculate insights for managers
  const totalPosts = contentPosts.length;
  const postedContent = contentPosts.filter(post => post.status === 'posted');
  const topPerformers = postedContent
    .sort((a, b) => (b.performance?.engagement_rate || 0) - (a.performance?.engagement_rate || 0))
    .slice(0, 3);
  
  const avgEngagement = postedContent.length > 0 
    ? postedContent.reduce((sum, post) => sum + (post.performance?.engagement_rate || 0), 0) / postedContent.length 
    : 0;

  const lowPerformingPosts = postedContent.filter(post => (post.performance?.engagement_rate || 0) < 2);
  const draftPosts = contentPosts.filter(post => post.status === 'draft');

  // Calculate alerts
  const alerts = [
    ...(draftPosts.length > 5 ? [{ type: 'warning' as const, message: 'Many drafts pending', count: draftPosts.length }] : []),
    ...(lowPerformingPosts.length > 0 ? [{ type: 'warning' as const, message: 'Low engagement posts', count: lowPerformingPosts.length }] : []),
    ...(avgEngagement < 3 && postedContent.length > 0 ? [{ type: 'warning' as const, message: 'Overall engagement low', count: avgEngagement.toFixed(1) }] : [])
  ];

  // Generate recent activities
  const recentActivities = [
    { type: 'campaign', message: `${postedContent.length} posted content`, time: '1 hour ago' },
    { type: 'performance', message: `${topPerformers.length} top performing posts`, time: '3 hours ago' },
    ...(draftPosts.length > 0 ? [{ type: 'alert', message: `${draftPosts.length} drafts pending review`, time: '5 hours ago' }] : []),
    { type: 'update', message: 'Content metrics updated', time: '1 day ago' }
  ];

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-800">Total Posts</p>
              <p className="text-lg font-bold text-blue-900">
                {totalPosts}
              </p>
            </div>
            <Target className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-800">Avg Engagement</p>
              <p className="text-lg font-bold text-green-900">
                {avgEngagement.toFixed(1)}%
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
              <div key={index} className="p-2 rounded-lg border bg-amber-50 border-amber-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-amber-900 truncate">
                      {alert.message}
                    </p>
                  </div>
                  <div className="ml-2 px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-800">
                    {alert.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Performers */}
      <div>
        <h4 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Star className="h-3 w-3" />
          Top Performers
        </h4>
        
        <div className="space-y-2">
          {topPerformers.slice(0, 3).map((post) => (
            <div key={post.id} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {post.kol_profile?.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {post.platform} • {post.content_type}
                  </p>
                </div>
                <div className="text-right ml-2">
                  <div className="text-xs font-medium text-gray-900">
                    {post.performance?.engagement_rate?.toFixed(1) || 0}%
                  </div>
                </div>
              </div>
            </div>
          ))}
          {topPerformers.length === 0 && (
            <div className="p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 text-center">No posted content yet</p>
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
                   <Star className="h-3 w-3 text-purple-600" />}
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
              <p className="text-xs text-slate-600">Posted Content</p>
              <p className="text-sm font-bold text-slate-900">{postedContent.length}/{totalPosts}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Active KOLs</p>
              <p className="text-sm font-bold text-slate-900">
                {[...new Set(contentPosts.map(post => post.kol_profile_id))].length}
              </p>
            </div>
          </div>
          
          <div className="mt-2 pt-2 border-t border-blue-200">
            <p className="text-xs text-slate-600">
              <span className="text-green-600 font-medium">
                {postedContent.length} posted content
              </span> this month
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
