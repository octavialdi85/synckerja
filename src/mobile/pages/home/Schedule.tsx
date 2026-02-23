import * as React from "react";
import { NavigationFooter } from "@/mobile/components/NavigationFooter";
import { DesktopWarning } from "@/mobile/components/DesktopWarning";
import { OfficeScheduleCard } from "@/mobile/components/OfficeScheduleCard";
import { MonthlyHolidaysCard } from "@/mobile/components/MonthlyHolidaysCard";
import { AppSidebar } from "@/mobile/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/mobile/components/ui/sidebar";
import { Card } from "@/mobile/components/ui/card";
import { Skeleton } from "@/mobile/components/ui/skeleton";
import { ScheduleSkeleton } from "./ScheduleSkeleton";
import { useWorkSchedule } from "@/mobile/hooks/useWorkSchedule";
import { useAttendanceStats } from "@/mobile/hooks/useAttendanceStats";
import { useVisualViewport } from "@/mobile/hooks/useVisualViewport";
import { useStatusBarStyle } from "@/mobile/hooks/useStatusBarStyle";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";
import { Button } from "@/features/ui/button";
import { Loader2, Calendar, Clock } from "lucide-react";
const Schedule = () => {
  useStatusBarStyle('light');
  const { t } = useAppTranslation();
  const {
    workSchedule,
    scheduleData,
    loading: scheduleLoading,
    error: scheduleError,
    refetch: refetchSchedule
  } = useWorkSchedule();
  const {
    stats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useAttendanceStats();

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
                <h1 className="text-base font-semibold text-foreground">{t("schedule.pageTitle", "Schedule")}</h1>
                <p className="text-xs text-muted-foreground">{t("schedule.pageSubtitle", "Jadwal kerja dan hari libur")}</p>
              </div>
            </div>
            <div></div>
          </header>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll min-h-0 flex flex-col">
              {(scheduleLoading || statsLoading) ? (
                <div className="mx-auto w-full max-w-md px-2 pt-2 content-padding-above-nav-default">
                  <ScheduleSkeleton />
                </div>
              ) : (scheduleError || statsError) ? (
                <div className="mx-auto w-full max-w-md px-2 pt-2 content-padding-above-nav-default">
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-sm text-destructive font-medium mb-1">{t("schedule.error", "Error")}</p>
                    <p className="text-sm text-muted-foreground mb-3">{scheduleError || statsError}</p>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => { refetchSchedule(); refetchStats(); }}
                    >
                      {t("mobileHome.retry", "Coba lagi")}
                    </Button>
                  </div>
                </div>
              ) : (
              <div className="mx-auto w-full max-w-md px-2 pt-2 content-padding-above-nav-default space-y-1">
                {/* Spasi jelas antara section Hari Libur dan footer nav */}
                {/* Schedule Summary Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <Card className="p-3 bg-gradient-card border border-border">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {stats?.present_days ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground">{t("schedule.presentThisMonth", "Hadir Bulan Ini")}</div>
                  </Card>
                  <Card className="p-3 bg-gradient-card border border-border">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {stats?.absent_days ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground">{t("schedule.absentThisMonth", "Tidak Hadir Bulan Ini")}</div>
                  </Card>
                </div>

                {/* Work Schedule Info */}
                {workSchedule ? (
                  <Card className="p-4 bg-gradient-card border border-border">
                    <div className="flex items-center gap-3 mb-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">{t("schedule.workScheduleInfo", "Informasi Jadwal Kerja")}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t("schedule.workHours", "Jam Kerja")}</p>
                        <p className="font-medium text-foreground">
                          {workSchedule.start_time?.slice(0, 5) ?? '08:00'} - {workSchedule.end_time?.slice(0, 5) ?? '17:00'}
                        </p>
                      </div>
                      {workSchedule.break_start_time && workSchedule.break_end_time && (
                        <div>
                          <p className="text-muted-foreground">{t("schedule.breakHours", "Jam Istirahat")}</p>
                          <p className="font-medium text-foreground">
                            {workSchedule.break_start_time?.slice(0, 5)} - {workSchedule.break_end_time?.slice(0, 5)}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">{t("schedule.lateTolerance", "Toleransi Terlambat")}</p>
                        <p className="font-medium text-foreground">{t("schedule.lateToleranceMinutes", "{{minutes}} menit", { minutes: workSchedule.late_tolerance_minutes ?? 0 })}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("schedule.workingDays", "Hari Kerja")}</p>
                        <p className="font-medium text-foreground">{t("schedule.workingDaysPerWeek", "{{count}} hari/minggu", { count: workSchedule.working_days?.length ?? 0 })}</p>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-4 bg-gradient-card border border-border">
                    <div className="flex items-center gap-3 mb-1">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold text-foreground">{t("schedule.workSchedule", "Jadwal Kerja")}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{t("schedule.noActiveSchedule", "Belum ada jadwal aktif. Hubungi admin untuk mengatur jadwal kerja.")}</p>
                  </Card>
                )}

                {/* Office Schedule */}
                <OfficeScheduleCard
                  workSchedule={workSchedule ?? null}
                  scheduleData={scheduleData ?? []}
                  loading={scheduleLoading}
                  error={scheduleError}
                  refetch={refetchSchedule}
                />

                {/* Monthly Holidays */}
                <MonthlyHolidaysCard />
              </div>
              )}
            </div>
          </div>

          {/* Spacer so content doesn't scroll under the fixed footer */}
          <NavigationFooter className="safe-area-bottom-lower" />
        </main>
      </div>
    </SidebarProvider>
    </DesktopWarning>
  );
};

export default Schedule;
