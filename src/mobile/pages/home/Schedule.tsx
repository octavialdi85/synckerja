import * as React from "react";
import { NavigationFooter } from "@/mobile/components/NavigationFooter";
import { DesktopWarning } from "@/mobile/components/DesktopWarning";
import { OfficeScheduleCard } from "@/mobile/components/OfficeScheduleCard";
import { MonthlyHolidaysCard } from "@/mobile/components/MonthlyHolidaysCard";
import { AppSidebar } from "@/mobile/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/mobile/components/ui/sidebar";
import { Card } from "@/mobile/components/ui/card";
import { Skeleton } from "@/mobile/components/ui/skeleton";
import { useWorkSchedule } from "@/mobile/hooks/useWorkSchedule";
import { useAttendanceStats } from "@/mobile/hooks/useAttendanceStats";
import { Loader2, Calendar, Clock } from "lucide-react";

const Schedule = () => {
  const {
    workSchedule,
    loading: scheduleLoading
  } = useWorkSchedule();
  const {
    stats,
    loading: statsLoading
  } = useAttendanceStats();

  // UX: cap skeleton to avoid long perceived loading
  const [showSkeleton, setShowSkeleton] = React.useState(true);
  React.useEffect(() => {
    if (scheduleLoading || statsLoading) {
      setShowSkeleton(true);
      const id = setTimeout(() => setShowSkeleton(false), 1200);
      return () => clearTimeout(id);
    } else {
      setShowSkeleton(false);
    }
  }, [scheduleLoading, statsLoading]);

  return (
    <DesktopWarning>
      <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <main className="flex-1 bg-background pb-20">
          <div className="flex items-center justify-between p-3 bg-card border-b border-border">
            <SidebarTrigger />
            <div></div>
          </div>

          <div className="p-2 space-y-2">
            {/* Schedule Summary Cards */}
            <div className="grid grid-cols-2 gap-2">
              <Card className="p-3 bg-gradient-card border border-border">
                <div className="text-2xl font-bold text-primary mb-1">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    stats?.present_days || 0
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Hadir Bulan Ini</div>
              </Card>
              <Card className="p-3 bg-gradient-card border border-border">
                <div className="text-2xl font-bold text-primary mb-1">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    stats?.absent_days || 0
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Tidak Hadir Bulan Ini</div>
              </Card>
            </div>

            {/* Work Schedule Info */}
            {showSkeleton ? (
              <Card className="p-4 bg-gradient-card border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-40" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              </Card>
            ) : workSchedule ? (
              <Card className="p-4 bg-gradient-card border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Informasi Jadwal Kerja</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Jam Kerja</p>
                    <p className="font-medium text-foreground">
                      {workSchedule.start_time.slice(0, 5)} - {workSchedule.end_time.slice(0, 5)}
                    </p>
                  </div>
                  {workSchedule.break_start_time && workSchedule.break_end_time && (
                    <div>
                      <p className="text-muted-foreground">Jam Istirahat</p>
                      <p className="font-medium text-foreground">
                        {workSchedule.break_start_time.slice(0, 5)} - {workSchedule.break_end_time.slice(0, 5)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Toleransi Terlambat</p>
                    <p className="font-medium text-foreground">{workSchedule.late_tolerance_minutes} menit</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Hari Kerja</p>
                    <p className="font-medium text-foreground">{workSchedule.working_days.length} hari/minggu</p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-4 bg-gradient-card border border-border">
                <div className="flex items-center gap-3 mb-1">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">Jadwal Kerja</h3>
                </div>
                <p className="text-sm text-muted-foreground">Belum ada jadwal aktif. Hubungi admin untuk mengatur jadwal kerja.</p>
              </Card>
            )}

            {/* Office Schedule */}
            <OfficeScheduleCard />

            {/* Monthly Holidays */}
            <MonthlyHolidaysCard />
          </div>

          <NavigationFooter />
        </main>
      </div>
    </SidebarProvider>
    </DesktopWarning>
  );
};

export default Schedule;
