import { format } from 'date-fns';
import { Calendar, CheckCircle2, Clock, AlertCircle, FileEdit } from 'lucide-react';
import { ContentPlan } from '@/features/6-1-dashboard/types/social-media';

interface MonthlyStats {
  overdue: number;
  completed: number;
  revision: number;
  planned: number;
  total: number;
}

// Using ContentPlan from dashboard types

interface ContentCalendarOverviewProps {
  monthlyStats: MonthlyStats;
  plansByDate: { [key: string]: ContentPlan[] };
  contentPlans: ContentPlan[];
  currentDate: Date;
}

export const ContentCalendarOverview = ({
  monthlyStats,
  plansByDate,
  contentPlans,
  currentDate,
}: ContentCalendarOverviewProps) => {
  const monthName = format(currentDate, 'MMMM yyyy');

  // Calculate upcoming posts (next 7 days)
  const today = new Date();
  const upcomingPosts = Object.entries(plansByDate)
    .filter(([dateKey]) => {
      const date = new Date(dateKey);
      const daysFromNow = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysFromNow >= 0 && daysFromNow <= 7;
    })
    .flatMap(([_, plans]) => plans)
    .slice(0, 5);

  return (
    <div className="bg-white border rounded-lg h-full flex flex-col max-h-[calc(100vh-180px)]">
      {/* Sidebar Header */}
      <div className="px-4 py-2 border-b flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">Overview</h3>
        <p className="text-xs text-gray-500 mt-1">{monthName}</p>
      </div>

      {/* Scrollable Sidebar Content */}
      <div className="flex-1 overflow-y-auto seamless-scroll p-4 space-y-4">
        {/* Monthly Statistics */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-700 mb-3">Monthly Statistics</h4>
          
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-600">Total Posts</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{monthlyStats.total}</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-green-50 rounded">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs text-gray-600">Completed</span>
            </div>
            <span className="text-sm font-semibold text-green-600">{monthlyStats.completed}</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-gray-600">Planned</span>
            </div>
            <span className="text-sm font-semibold text-blue-600">{monthlyStats.planned}</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
            <div className="flex items-center gap-2">
              <FileEdit className="h-4 w-4 text-yellow-600" />
              <span className="text-xs text-gray-600">Revision</span>
            </div>
            <span className="text-sm font-semibold text-yellow-600">{monthlyStats.revision}</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-red-50 rounded">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs text-gray-600">Overdue</span>
            </div>
            <span className="text-sm font-semibold text-red-600">{monthlyStats.overdue}</span>
          </div>
        </div>

        {/* Upcoming Posts */}
        {upcomingPosts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 mb-3">Upcoming Posts (Next 7 Days)</h4>
            {upcomingPosts.map((post, index) => (
              <div key={post.id || index} className="p-2 bg-gray-50 rounded space-y-1">
                <div className="text-xs font-medium text-gray-900 truncate">
                  {post.title || 'Untitled Post'}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(post.post_date), 'MMM dd, yyyy')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div>
            Total Plans: <span className="font-medium">{contentPlans.length}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Status: <span className="font-medium text-green-600">Active</span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

