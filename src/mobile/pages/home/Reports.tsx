import { NavigationFooter } from "@/mobile/components/NavigationFooter";
import { DesktopWarning } from "@/mobile/components/DesktopWarning";
import { AppSidebar } from "@/mobile/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/mobile/components/ui/sidebar";
import { ReportsSkeleton } from "./ReportsSkeleton";
import { useAttendanceHistory } from "@/mobile/hooks/useAttendanceHistory";
import { useAttendanceStats } from "@/mobile/hooks/useAttendanceStats";
import { useAttendanceCalculations } from "@/mobile/hooks/useAttendanceCalculations";
import { useVisualViewport } from "@/mobile/hooks/useVisualViewport";
import { useStatusBarStyle } from "@/mobile/hooks/useStatusBarStyle";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";
import { AttendanceHistoryTable } from "@/mobile/components/AttendanceHistoryTable";
import { MonthlyStatsCards } from "@/mobile/components/MonthlyStatsCards";
import { DetailedStatsCard } from "@/mobile/components/DetailedStatsCard";
import { WorkTimeAnalysisCard } from "@/mobile/components/WorkTimeAnalysisCard";
import { AttendanceChart } from "@/mobile/components/AttendanceChart";
import { RealtimeStatusIndicator } from "@/mobile/components/RealtimeStatusIndicator";
import { CustomDatePicker } from "@/mobile/components/CustomDatePicker";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, isWithinInterval, format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/mobile/components/ui/select";
import { useState, useMemo } from "react";

const Reports = () => {
  useStatusBarStyle("light");
  const { t, language } = useAppTranslation();
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
    attendanceHistory: filteredAttendanceHistory,
    language
  });

  const { height: viewportHeight, offsetTop: viewportOffsetTop } = useVisualViewport();

  return (
    <DesktopWarning>
      <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        {/* Layout per .cursor/rules/mobile-tools-layout-android.mdc */}
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
              <SidebarTrigger className="md:hidden" />
              <div>
                <h1 className="text-base font-semibold text-foreground">{t("reports.pageTitle", "Reports")}</h1>
                <p className="text-xs text-muted-foreground">{t("reports.pageSubtitle", "Statistik kehadiran dan laporan")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RealtimeStatusIndicator
                isConnected={realtimeConnected}
                className="text-xs md:hidden"
              />
              <div className="hidden md:block">
                <RealtimeStatusIndicator isConnected={realtimeConnected} />
              </div>
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll min-h-0 flex flex-col">
              {(loading || statsLoading) ? (
                <div className="mx-auto w-full max-w-md px-2 pt-2 content-padding-above-nav-default">
                  <ReportsSkeleton />
                </div>
              ) : (
                <div className="mx-auto w-full max-w-md px-2 pt-2 content-padding-above-nav-default space-y-1">
                  <div>
                    <MonthlyStatsCards
                      totalWorkingDays={attendanceStats?.total_working_days || 0}
                      attendancePercentage={attendanceStats?.attendance_percentage || 0}
                      statsLoading={statsLoading}
                    />
                  </div>

                  <div>
                    <DetailedStatsCard
                      presentDays={attendanceStats?.present_days || 0}
                      lateDays={attendanceStats?.late_days || 0}
                      absentDays={attendanceStats?.absent_days || 0}
                      totalOvertime={filteredStats.totalOvertime}
                      statsLoading={statsLoading}
                      headerAction={
                        <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="today">{t("reports.dateFilter.today", "Hari Ini")}</SelectItem>
                            <SelectItem value="yesterday">{t("reports.dateFilter.yesterday", "Kemarin")}</SelectItem>
                            <SelectItem value="this_week">{t("reports.dateFilter.thisWeek", "Minggu Ini")}</SelectItem>
                            <SelectItem value="this_month">{t("reports.dateFilter.thisMonth", "Bulan Ini")}</SelectItem>
                            <SelectItem value="last_month">{t("reports.dateFilter.lastMonth", "Bulan Lalu")}</SelectItem>
                            <SelectItem value="custom">{t("reports.dateFilter.custom", "Kustom")}</SelectItem>
                          </SelectContent>
                        </Select>
                      }
                    />
                  </div>

                  <div>
                    <AttendanceHistoryTable
                      attendanceHistory={filteredAttendanceHistory}
                      loading={loading}
                      error={error}
                    />
                  </div>

                  <div>
                    <WorkTimeAnalysisCard
                      avgCheckIn={filteredStats.avgCheckIn}
                      avgCheckOut={filteredStats.avgCheckOut}
                      workingHours={filteredStats.workingHours}
                      workingMinutesRemainder={filteredStats.workingMinutesRemainder}
                    />
                  </div>

                  <div>
                    <AttendanceChart chartData={chartData} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Spacer so content doesn't scroll under the fixed footer */}
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
