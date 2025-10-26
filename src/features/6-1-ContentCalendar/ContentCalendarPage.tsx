import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { useSocialMediaData, useSocialMediaMutations } from '@/features/6-1-dashboard/hook/useOptimizedSocialMediaState';
import { ContentPlan } from '@/features/6-1-dashboard/types/social-media';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { HeaderAndTab } from './container/HeaderAndTab';
import { CalendarHeader } from './container/CalendarHeader';
import { CalendarStats } from './container/CalendarStats';
import { CalendarGrid } from './container/CalendarGrid';
import { CalendarGridFooter } from './container/CalendarGridFooter';
import { MonthlyStatsCards } from './container/MonthlyStatsCards';
import { DayDetailsDialog } from './container/DayDetailsDialog';
import { ContentCalendarOverview } from './container/ContentCalendarOverview';
import { AddContentDialog } from './modal/AddContentDialog';
import { RealtimeSocialMediaProvider } from '@/features/6-1-dashboard/hook/RealtimeSocialMediaProvider';
import OptimizedErrorBoundary from '@/features/6-1-dashboard/OptimizedErrorBoundary';
import { PICFilterProvider } from '@/features/6-1-dashboard/PICFilterContext';

const ContentCalendarContent: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [showAddContentDialog, setShowAddContentDialog] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('content-calendar');
  
  const { contentPlans, organizationId } = useSocialMediaData();
  const { addContentPlan } = useSocialMediaMutations();

  // Calendar calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Calculate calendar grid (including previous/next month days for complete weeks)
  const startDay = monthStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysFromPrevMonth = startDay === 0 ? 0 : startDay; // Adjust for Monday start
  const totalCells = Math.ceil((daysInMonth.length + daysFromPrevMonth) / 7) * 7;
  
  const calendarDays = [];
  
  // Add days from previous month
  const prevMonth = subMonths(currentDate, 1);
  const prevMonthEnd = endOfMonth(prevMonth);
  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    const day = new Date(prevMonthEnd);
    day.setDate(prevMonthEnd.getDate() - i);
    calendarDays.push({ date: day, isCurrentMonth: false });
  }
  
  // Add days from current month
  daysInMonth.forEach(day => {
    calendarDays.push({ date: day, isCurrentMonth: true });
  });
  
  // Add days from next month to complete the grid
  const nextMonth = addMonths(currentDate, 1);
  const remainingCells = totalCells - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    const day = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), i);
    calendarDays.push({ date: day, isCurrentMonth: false });
  }

  // Process content plans for the calendar
  const plansByDate = useMemo(() => {
    const plans: { [key: string]: ContentPlan[] } = {};
    
    contentPlans.forEach(plan => {
      if (plan.post_date) {
        const dateKey = format(new Date(plan.post_date), 'yyyy-MM-dd');
        if (!plans[dateKey]) plans[dateKey] = [];
        plans[dateKey].push(plan);
      }
    });
    
    return plans;
  }, [contentPlans]);

  // Calculate day status and color
  const getDayInfo = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const plansForDay = plansByDate[dateKey] || [];
    
    if (plansForDay.length === 0) return { color: '', count: 0, status: 'empty', plans: [] };
    
    const hasOverdue = plansForDay.some(plan => {
      const postDate = new Date(plan.post_date);
      return postDate <= new Date() && !plan.approved && !plan.done;
    });
    
    const hasCompleted = plansForDay.some(plan => plan.approved || plan.done);
    const hasRevision = plansForDay.some(plan => 
      plan.status === 'Request Revisi' || plan.production_status === 'Request Revisi'
    );
    
    if (hasOverdue) return { color: 'bg-red-100 border-red-300 text-red-800', count: plansForDay.length, status: 'overdue', plans: plansForDay };
    if (hasRevision) return { color: 'bg-yellow-100 border-yellow-300 text-yellow-800', count: plansForDay.length, status: 'revision', plans: plansForDay };
    if (hasCompleted) return { color: 'bg-green-100 border-green-300 text-green-800', count: plansForDay.length, status: 'completed', plans: plansForDay };
    return { color: 'bg-blue-100 border-blue-300 text-blue-800', count: plansForDay.length, status: 'planned', plans: plansForDay };
  };

  // Calculate statistics for current month
  const monthlyStats = useMemo(() => {
    const currentMonthPlans = contentPlans.filter(plan => {
      if (!plan.post_date) return false;
      const postDate = new Date(plan.post_date);
      return postDate.getMonth() === currentDate.getMonth() && 
             postDate.getFullYear() === currentDate.getFullYear();
    });

    const today = new Date();
    const overdue = currentMonthPlans.filter(plan => {
      const postDate = new Date(plan.post_date);
      return postDate <= today && !plan.approved && !plan.done;
    }).length;
    
    const completed = currentMonthPlans.filter(plan => plan.approved || plan.done).length;
    const revision = currentMonthPlans.filter(plan => 
      plan.status === 'Request Revisi' || plan.production_status === 'Request Revisi'
    ).length;
    const planned = currentMonthPlans.filter(plan => 
      !plan.approved && !plan.done && 
      plan.status !== 'Request Revisi' && 
      plan.production_status !== 'Request Revisi'
    ).length;

    return { overdue, completed, revision, planned, total: currentMonthPlans.length };
  }, [contentPlans, currentDate]);

  // Handle day click
  const handleDayClick = (date: Date, dayInfo: any) => {
    setSelectedDate(date);
    setShowDayDialog(true);
  };

  // Handle adding new content
  const handleAddContent = async (date: Date) => {
    setSelectedDate(date);
    setShowDayDialog(false);
    setShowAddContentDialog(true);
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleTabChange = (newTab: string) => {
    setActiveMainTab(newTab);
    navigate(`/digital-marketing/social-media/${newTab}`);
  };

  // Calculate footer data
  const calendarFooterData = useMemo(() => {
    const currentMonthDays = daysInMonth.length;
    const daysWithContent = daysInMonth.filter(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return plansByDate[dateKey] && plansByDate[dateKey].length > 0;
    }).length;
    const totalPostsInMonth = contentPlans.filter(plan => {
      if (!plan.post_date) return false;
      const postDate = new Date(plan.post_date);
      return postDate.getMonth() === currentDate.getMonth() && 
             postDate.getFullYear() === currentDate.getFullYear();
    }).length;

    return {
      totalDays: currentMonthDays,
      activeDays: daysWithContent,
      totalPosts: totalPostsInMonth
    };
  }, [daysInMonth, plansByDate, contentPlans, currentDate]);

  return (
    <StandardLayout>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <main className="flex-1 px-4 pt-16 pb-4 min-h-0">
              <div className="h-full flex flex-col overflow-hidden">
                {/* Header and Tabs */}
                <div className="flex-shrink-0 mb-1">
                  <HeaderAndTab 
                    activeMainTab={activeMainTab}
                    handleTabChange={handleTabChange}
                  />
                </div>
                
                {/* Main Content Area - Grid Layout */}
                <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                  {/* Left Column - Calendar View - 9 columns */}
                  <div className="col-span-9 flex flex-col min-h-0">
                    {/* Calendar Controls Section */}
                    <div className="flex-shrink-0 mb-1">
                      <div className="bg-white border rounded-md p-2">
                        <CalendarHeader
                          currentDate={currentDate}
                          onPrevMonth={handlePrevMonth}
                          onNextMonth={handleNextMonth}
                        />
                      </div>
                    </div>
                    
                    {/* Calendar Metrics Section */}
                    <div className="flex-shrink-0 mb-1">
                      <CalendarStats monthlyStats={monthlyStats} />
                    </div>
                    
                    {/* Calendar Section */}
                    <div className="flex-1 min-h-0">
                      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col max-h-[calc(100vh-385px)]">
                        {/* Calendar Grid with Scroll */}
                        <div className="flex-1 overflow-y-auto seamless-scroll min-h-0 p-4">
                          <CalendarGrid
                            calendarDays={calendarDays}
                            getDayInfo={getDayInfo}
                            onDayClick={handleDayClick}
                          />
                        </div>

                        {/* Calendar Footer */}
                        <CalendarGridFooter 
                          totalDays={calendarFooterData.totalDays}
                          activeDays={calendarFooterData.activeDays}
                          totalPosts={calendarFooterData.totalPosts}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column - Overview Sidebar - 3 columns */}
                  <div className="col-span-3 h-full">
                    <ContentCalendarOverview 
                      monthlyStats={monthlyStats}
                      plansByDate={plansByDate}
                      contentPlans={contentPlans}
                      currentDate={currentDate}
                    />
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Day Details Dialog */}
      <DayDetailsDialog
        open={showDayDialog}
        onOpenChange={setShowDayDialog}
        selectedDate={selectedDate}
        plansByDate={plansByDate}
        onAddContent={handleAddContent}
      />

      {/* Add Content Dialog */}
      <AddContentDialog
        open={showAddContentDialog}
        onOpenChange={setShowAddContentDialog}
        selectedDate={selectedDate}
      />
    </StandardLayout>
  );
};

// Main export with providers (matching SocialMediaDashboardPage pattern)
const ContentCalendarPage = () => {
  return (
    <OptimizedErrorBoundary>
      <RealtimeSocialMediaProvider>
        <PICFilterProvider>
          <ContentCalendarContent />
        </PICFilterProvider>
      </RealtimeSocialMediaProvider>
    </OptimizedErrorBoundary>
  );
};

export default ContentCalendarPage;