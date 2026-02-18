
import { NavigationFooter } from "@/mobile/components/NavigationFooter";
import { DesktopWarning } from "@/mobile/components/DesktopWarning";
import { AppSidebar } from "@/mobile/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/mobile/components/ui/sidebar";
import { Skeleton } from "@/mobile/components/ui/skeleton";
import { useAttendanceHistory } from "@/mobile/hooks/useAttendanceHistory";
import { useAttendanceStats } from "@/mobile/hooks/useAttendanceStats";
import { useAttendanceCalculations } from "@/mobile/hooks/useAttendanceCalculations";
import { useVisualViewport } from "@/mobile/hooks/useVisualViewport";
import { useStatusBarStyle } from "@/mobile/hooks/useStatusBarStyle";
import { AttendanceHistoryTable } from "@/mobile/components/AttendanceHistoryTable";
import { MonthlyStatsCards } from "@/mobile/components/MonthlyStatsCards";
import { DetailedStatsCard } from "@/mobile/components/DetailedStatsCard";
import { WorkTimeAnalysisCard } from "@/mobile/components/WorkTimeAnalysisCard";
import { AttendanceChart } from "@/mobile/components/AttendanceChart";
import { RealtimeStatusIndicator } from "@/mobile/components/RealtimeStatusIndicator";
import { CustomDatePicker } from "@/mobile/components/CustomDatePicker";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, isWithinInterval, format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/mobile/components/ui/select";
import { useState, useMemo, useEffect } from "react";

const Reports = () => {
  useStatusBarStyle('light');
  const {
    attendanceHistory,
    loading,
    error,
    realtimeConnected
  } = useAttendanceHistory();
  const {
    stats: attendanceStats,
    loading: statsLoading
  } = useAttendanceStats();
  const [dateFilter, setDateFilter] = useState("this_month");
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{start: Date; end: Date} | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);

  useEffect(() => {
    if (loading || statsLoading) {
      setShowSkeleton(true);
      const id = setTimeout(() => setShowSkeleton(false), 1200);
      return () => clearTimeout(id);
    } else {
      setShowSkeleton(false);
    }
  }, [loading, statsLoading]);

  // Handle date filter change
  const handleDateFilterChange = (value: string) => {
    if (value === "custom") {
      setShowCustomDatePicker(true);
    } else {
      setDateFilter(value);
    }
  };

  // Handle custom date range selection
  const handleCustomDateRange = (startDate: Date, endDate: Date) => {
    setCustomDateRange({ start: startDate, end: endDate });
    setDateFilter("custom");
  };

  // Get date range based on filter selection
  const getDateRange = useMemo(() => {
    const now = new Date();
    switch (dateFilter) {
      case "today":
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
      case "yesterday":
        const yesterday = subDays(now, 1);
        return {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday)
        };
      case "this_week":
        return {
          start: startOfWeek(now, {
            weekStartsOn: 1
          }),
          end: endOfWeek(now, {
            weekStartsOn: 1
          })
        };
      case "this_month":
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case "last_month":
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      case "custom":
        // Use custom date range if available, otherwise default to current month
        if (customDateRange) {
          return {
            start: startOfDay(customDateRange.start),
            end: endOfDay(customDateRange.end)
          };
        }
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
    }
  }, [dateFilter, customDateRange]);

  // Filter attendance data based on selected date range
  const filteredAttendanceHistory = useMemo(() => {
    if (!attendanceHistory || attendanceHistory.length === 0) return [];
    return attendanceHistory.filter(record => {
      const recordDate = new Date(record.attendance_date);
      return isWithinInterval(recordDate, getDateRange);
    });
  }, [attendanceHistory, getDateRange]);

  // Use the custom hook for calculations
  const {
    filteredStats,
    chartData
  } = useAttendanceCalculations({
    attendanceHistory: filteredAttendanceHistory
  });

  // Skeleton Loading Component
  const ReportsSkeleton = () => (
    <div className="space-y-2">
      {/* Monthly Stats Skeleton */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-6 w-8" />
        </div>
        <div className="p-3 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-6 w-12" />
        </div>
      </div>

      {/* Detailed Stats Skeleton */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-3 border-b border-border">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="p-3 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Work Time Analysis Skeleton */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="p-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* History Table Skeleton */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-3 border-b border-border">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="p-3">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-2 items-center">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Skeleton */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="p-2">
          <Skeleton className="w-full h-48" />
        </div>
      </div>
    </div>
  );

  const { height: viewportHeight, offsetTop: viewportOffsetTop } = useVisualViewport();

  return (
    <DesktopWarning>
      <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        {/* Same structure as Home/Schedule/Client Visit/LiveChat: fixed viewport container, header (safe-area-top), scrollable content, footer (safe-area-bottom-lower) */}
        <main
          className="flex flex-col bg-background fixed inset-x-0 z-0"
          style={{
            top: viewportOffsetTop,
            height: viewportHeight > 0 ? viewportHeight : undefined,
            minHeight: viewportHeight > 0 ? undefined : "100dvh",
          }}
        >
          <header className="flex-shrink-0 sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border safe-area-top">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <RealtimeStatusIndicator
                isConnected={realtimeConnected}
                className="text-xs md:hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <RealtimeStatusIndicator isConnected={realtimeConnected} />
              </div>
              <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll min-h-0">
              <div className="p-2 space-y-2">
                {showSkeleton ? (
                  <ReportsSkeleton />
                ) : (
                  <>
                    <MonthlyStatsCards
                      totalWorkingDays={attendanceStats?.total_working_days || 0}
                      attendancePercentage={attendanceStats?.attendance_percentage || 0}
                      statsLoading={statsLoading}
                    />

                    <DetailedStatsCard
                      presentDays={attendanceStats?.present_days || 0}
                      lateDays={attendanceStats?.late_days || 0}
                      absentDays={attendanceStats?.absent_days || 0}
                      totalOvertime={filteredStats.totalOvertime}
                      statsLoading={statsLoading}
                    />

                    <WorkTimeAnalysisCard
                      avgCheckIn={filteredStats.avgCheckIn}
                      avgCheckOut={filteredStats.avgCheckOut}
                      workingHours={filteredStats.workingHours}
                      workingMinutesRemainder={filteredStats.workingMinutesRemainder}
                    />

                    <AttendanceHistoryTable
                      attendanceHistory={filteredAttendanceHistory}
                      loading={loading}
                      error={error}
                    />

                    <AttendanceChart chartData={chartData} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Spacer so content doesn't scroll under the fixed footer */}
          <div className="flex-shrink-0" style={{ height: "80px" }} aria-hidden />
          <NavigationFooter className="safe-area-bottom-lower" />
        </main>

        <CustomDatePicker
          isOpen={showCustomDatePicker}
          onClose={() => setShowCustomDatePicker(false)}
          onDateRangeSelect={handleCustomDateRange}
          initialStartDate={customDateRange?.start}
          initialEndDate={customDateRange?.end}
        />
      </div>
    </SidebarProvider>
    </DesktopWarning>
  );
};

export default Reports;
