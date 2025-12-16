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
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [showAddContentDialog, setShowAddContentDialog] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('content-calendar');
  const [selectedService, setSelectedService] = useState<string>('all');
  
  const { contentPlans, organizationId, services } = useSocialMediaData();
  const { addContentPlan, refreshMasterData } = useSocialMediaMutations();

  // Filter content plans by selected service
  const filteredContentPlans = useMemo(() => {
    if (selectedService === 'all') {
      return contentPlans;
    }
    return contentPlans.filter(plan => plan.service_id === selectedService);
  }, [contentPlans, selectedService]);

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

  // Process content plans for the calendar (using filtered content plans)
  const plansByDate = useMemo(() => {
    const plans: { [key: string]: ContentPlan[] } = {};
    
    filteredContentPlans.forEach(plan => {
      if (plan.post_date) {
        const dateKey = format(new Date(plan.post_date), 'yyyy-MM-dd');
        if (!plans[dateKey]) plans[dateKey] = [];
        plans[dateKey].push(plan);
      }
    });
    
    return plans;
  }, [filteredContentPlans]);

  // Calculate day status and color based on approved, production_approved, done, and on_time_status
  const getDayInfo = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const plansForDay = plansByDate[dateKey] || [];
    
    if (plansForDay.length === 0) return { color: '', count: 0, status: 'empty', plans: [], lateText: null };
    
    // Note: We no longer apply color to the day card itself, only to individual plan cards
    
    // Determine color based on plan status
    // Priority: Check each plan and determine the most critical status
    let hasRed = false;      // approved = FALSE + production_approved = false + done = false
    let hasOrange = false;   // approved = TRUE + production_approved = false + done = false
    let hasYellow = false;   // approved = TRUE + production_approved = TRUE + done = false
    let hasGreen = false;    // approved = TRUE + production_approved = TRUE + done = True
    let hasGreenWithLate = false; // approved = TRUE + production_approved = TRUE + done = True + on_time_status != "Ontime" and != NULL/Empty
    let lateText: string | null = null;
    
    plansForDay.forEach(plan => {
      const approved = plan.approved === true;
      const productionApproved = plan.production_approved === true;
      const done = plan.done === true;
      const onTimeStatus = plan.on_time_status;
      
      // Check if on_time_status is not "Ontime" and not NULL/Empty
      const hasLateStatus = onTimeStatus && 
                           onTimeStatus.trim() !== '' && 
                           onTimeStatus !== 'Ontime' &&
                           onTimeStatus.toLowerCase().includes('late');
      
      if (!approved && !productionApproved && !done) {
        hasRed = true;
      } else if (approved && !productionApproved && !done) {
        hasOrange = true;
      } else if (approved && productionApproved && !done) {
        hasYellow = true;
      } else if (approved && productionApproved && done) {
        hasGreen = true;
        if (hasLateStatus) {
          hasGreenWithLate = true;
          // Store the late text (e.g., "Late 1 Day", "Late 2 Days")
          lateText = onTimeStatus;
        }
      }
    });
    
    // Return status based on priority (most critical first)
    // Note: color is no longer used for day card background, only for reference
    if (hasRed) {
      return { 
        color: '', 
        count: plansForDay.length, 
        status: 'red', 
        plans: plansForDay,
        lateText: null
      };
    }
    if (hasOrange) {
      return { 
        color: '', 
        count: plansForDay.length, 
        status: 'orange', 
        plans: plansForDay,
        lateText: null
      };
    }
    if (hasYellow) {
      return { 
        color: '', 
        count: plansForDay.length, 
        status: 'yellow', 
        plans: plansForDay,
        lateText: null
      };
    }
    if (hasGreenWithLate) {
      return { 
        color: '', 
        count: plansForDay.length, 
        status: 'green-late', 
        plans: plansForDay,
        lateText: lateText
      };
    }
    if (hasGreen) {
      return { 
        color: '', 
        count: plansForDay.length, 
        status: 'green', 
        plans: plansForDay,
        lateText: null
      };
    }
    
    // Default fallback
    return { 
      color: '', 
      count: plansForDay.length, 
      status: 'planned', 
      plans: plansForDay,
      lateText: null
    };
  };

  // Calculate statistics for current month based on approved, production_approved, done, and on_time_status
  const monthlyStats = useMemo(() => {
    const currentMonthPlans = filteredContentPlans.filter(plan => {
      if (!plan.post_date) return false;
      const postDate = new Date(plan.post_date);
      return postDate.getMonth() === currentDate.getMonth() && 
             postDate.getFullYear() === currentDate.getFullYear();
    });

    // Count plans by status based on approved, production_approved, done, and on_time_status
    let redCount = 0;      // approved = FALSE + production_approved = false + done = false
    let orangeCount = 0;   // approved = TRUE + production_approved = false + done = false
    let yellowCount = 0;   // approved = TRUE + production_approved = TRUE + done = false
    let greenCount = 0;    // approved = TRUE + production_approved = TRUE + done = True
    let greenWithLateCount = 0; // approved = TRUE + production_approved = TRUE + done = True + on_time_status != "Ontime" and != NULL/Empty

    currentMonthPlans.forEach(plan => {
      const approved = plan.approved === true;
      const productionApproved = plan.production_approved === true;
      const done = plan.done === true;
      const onTimeStatus = plan.on_time_status;
      
      // Check if on_time_status is not "Ontime" and not NULL/Empty
      const hasLateStatus = onTimeStatus && 
                           onTimeStatus.trim() !== '' && 
                           onTimeStatus !== 'Ontime' &&
                           onTimeStatus.toLowerCase().includes('late');
      
      if (!approved && !productionApproved && !done) {
        redCount++;
      } else if (approved && !productionApproved && !done) {
        orangeCount++;
      } else if (approved && productionApproved && !done) {
        yellowCount++;
      } else if (approved && productionApproved && done) {
        if (hasLateStatus) {
          greenWithLateCount++;
        } else {
          greenCount++;
        }
      }
    });

    return { 
      red: redCount,
      orange: orangeCount,
      yellow: yellowCount,
      green: greenCount,
      greenWithLate: greenWithLateCount,
      total: currentMonthPlans.length 
    };
  }, [filteredContentPlans, currentDate]);

  // Handle day click
  const handleDayClick = (date: Date, dayInfo: any) => {
    setSelectedDate(date);
    setSelectedPlan(null); // Reset selected plan when clicking on day
    setShowDayDialog(true);
  };

  // Handle plan card click (when there are multiple plans in a day)
  const handlePlanClick = (date: Date, plan: any) => {
    setSelectedDate(date);
    setSelectedPlan(plan); // Set the specific plan that was clicked
    setShowDayDialog(true);
  };

  // Handle adding new content
  const handleAddContent = async (date: Date) => {
    setSelectedDate(date);
    setEditingPlan(null); // Reset editing plan for create mode
    setShowDayDialog(false);
    setShowAddContentDialog(true);
  };

  // Handle editing content
  const handleEditContent = (plan: any) => {
    setEditingPlan(plan);
    // Set selected date from plan's post_date
    if (plan.post_date) {
      setSelectedDate(new Date(plan.post_date));
    }
    setShowDayDialog(false);
    setShowAddContentDialog(true);
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleTabChange = (newTab: string) => {
    setActiveMainTab(newTab);
    navigate(`/digital-marketing/social-media/${newTab}`);
  };

  const handleMasterDataChange = async () => {
    try {
      await refreshMasterData();
    } catch (error) {
      console.error('Error refreshing master data:', error);
    }
  };

  // Calculate footer data
  const calendarFooterData = useMemo(() => {
    const currentMonthDays = daysInMonth.length;
    const daysWithContent = daysInMonth.filter(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return plansByDate[dateKey] && plansByDate[dateKey].length > 0;
    }).length;
    const totalPostsInMonth = filteredContentPlans.filter(plan => {
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
  }, [daysInMonth, plansByDate, filteredContentPlans, currentDate]);

  return (
    <StandardLayout>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
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
                          services={Array.isArray(services) ? services : []}
                          selectedService={selectedService}
                          onServiceChange={setSelectedService}
                        />
                      </div>
                    </div>
                    
                    {/* Calendar Metrics Section */}
                    <div className="flex-shrink-0 mb-1">
                      <CalendarStats monthlyStats={monthlyStats} />
                    </div>
                    
                    {/* Calendar Section */}
                    <div className="flex-1 min-h-0">
                      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
                        {/* Calendar Grid with Scroll */}
                        <div className="flex-1 overflow-y-auto seamless-scroll min-h-0 p-4">
                          <CalendarGrid
                            calendarDays={calendarDays}
                            getDayInfo={getDayInfo}
                            onDayClick={handleDayClick}
                            onPlanClick={handlePlanClick}
                          />
                        </div>

                        {/* Calendar Footer - Sticky at bottom */}
                        <div className="sticky bottom-0 left-0 right-0 flex-shrink-0 bg-white z-10 border-t border-gray-200">
                          <CalendarGridFooter 
                            totalDays={calendarFooterData.totalDays}
                            activeDays={calendarFooterData.activeDays}
                            totalPosts={calendarFooterData.totalPosts}
                            onContentTypeDataChange={handleMasterDataChange}
                            onServiceDataChange={handleMasterDataChange}
                            onContentPillarDataChange={handleMasterDataChange}
                            onSocialMediaNameDataChange={() => {}}
                            services={Array.isArray(services) ? services : []}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column - Overview Sidebar - 3 columns */}
                  <div className="col-span-3 h-full">
                    <ContentCalendarOverview 
                      monthlyStats={monthlyStats}
                      plansByDate={plansByDate}
                      contentPlans={filteredContentPlans}
                      currentDate={currentDate}
                      serviceFilter={selectedService}
                    />
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Day Details Dialog */}
      <DayDetailsDialog
        open={showDayDialog}
        onOpenChange={(open) => {
          setShowDayDialog(open);
          if (!open) {
            // Reset selected plan when dialog closes
            setSelectedPlan(null);
          }
        }}
        selectedDate={selectedDate}
        plansByDate={plansByDate}
        onAddContent={handleAddContent}
        onEditContent={handleEditContent}
        selectedPlan={selectedPlan}
      />

      {/* Add/Edit Content Dialog */}
      <AddContentDialog
        open={showAddContentDialog}
        onOpenChange={(open) => {
          setShowAddContentDialog(open);
          if (!open) {
            // Reset editing plan when dialog closes
            setEditingPlan(null);
          }
        }}
        selectedDate={selectedDate}
        editingPlan={editingPlan}
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