import { format } from 'date-fns';
import { Calendar, CheckCircle2, Clock, AlertCircle, FileEdit } from 'lucide-react';
import { ContentPlan } from '@/features/6-1-dashboard/types/social-media';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { ContentBalanceTab } from '@/features/6-1-dashboard/container/RightSection/ContentBalanceTab';
import { ContentPillarTracker } from '@/features/6-1-dashboard/container/RightSection/ContentPillarTracker';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface MonthlyStats {
  total: number;
  red: number;
  orange: number;
  yellow: number;
  green: number;
  greenWithLate: number;
}

// Using ContentPlan from dashboard types

interface ContentCalendarOverviewProps {
  monthlyStats: MonthlyStats;
  plansByDate: { [key: string]: ContentPlan[] };
  contentPlans: ContentPlan[];
  currentDate: Date;
  serviceFilter?: string;
}

export const ContentCalendarOverview = ({
  monthlyStats,
  plansByDate,
  contentPlans,
  currentDate,
  serviceFilter,
}: ContentCalendarOverviewProps) => {
  const { t } = useAppTranslation();
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
    <div className="bg-white border rounded-lg flex-1 min-h-0 flex flex-col overflow-hidden">
      <Tabs defaultValue="overview" className="w-full h-full flex flex-col overflow-hidden min-h-0">
        {/* Tabs Header - Fixed */}
        <div className="px-4 py-2 border-b flex-shrink-0">
          <TabsList className="grid w-full grid-cols-3 h-8 mb-2">
            <TabsTrigger value="overview" className="text-xs py-1">Overview</TabsTrigger>
            <TabsTrigger value="funnel" className="text-xs py-1">Funnel</TabsTrigger>
            <TabsTrigger value="content-balance" className="text-xs py-1">Content Balance</TabsTrigger>
          </TabsList>
          <p className="text-xs text-gray-500">{monthName}</p>
        </div>

        {/* Overview Tab Content — scroll-chaining: sama seperti Funnel/Content Balance, satu scroll per panel */}
        <TabsContent value="overview" className="flex-1 p-4 space-y-4 m-0 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain">
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

          <div className="flex items-center justify-between p-2 bg-red-50 rounded">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs text-gray-600">{t('contentCalendar.legend.notApproved')}</span>
            </div>
            <span className="text-sm font-semibold text-red-600">{monthlyStats.red}</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-gray-600">{t('contentCalendar.legend.contentPlanApproved')}</span>
            </div>
            <span className="text-sm font-semibold text-orange-600">{monthlyStats.orange}</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-amber-50 rounded">
            <div className="flex items-center gap-2">
              <FileEdit className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-gray-600">{t('contentCalendar.legend.productionApproved')}</span>
            </div>
            <span className="text-sm font-semibold text-amber-600">{monthlyStats.yellow}</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-green-50 rounded">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs text-gray-600">{t('contentCalendar.legend.completed')}</span>
            </div>
            <span className="text-sm font-semibold text-green-600">{monthlyStats.green}</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-green-100 rounded border border-green-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-700" />
              <span className="text-xs text-gray-700 font-medium">{t('contentCalendar.legend.completedLate')}</span>
            </div>
            <span className="text-sm font-semibold text-green-700">{monthlyStats.greenWithLate}</span>
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
        </TabsContent>

        {/* Funnel Tab Content — scroll di TabsContent (satu scroll per panel, rule 3.1) */}
        <TabsContent value="funnel" className="flex-1 p-0 m-0 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain">
          <ContentPillarTracker selectedMonth={currentDate} serviceFilter={serviceFilter} />
        </TabsContent>

        {/* Content Balance Tab Content — scroll di TabsContent (satu scroll per panel, rule 3.1) */}
        <TabsContent value="content-balance" className="flex-1 p-0 m-0 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain">
          <ContentBalanceTab selectedMonth={currentDate} serviceFilter={serviceFilter} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

