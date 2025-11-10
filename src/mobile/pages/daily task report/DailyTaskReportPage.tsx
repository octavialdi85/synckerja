import React from 'react';
import { DesktopWarning } from '@/mobile/components/DesktopWarning';
import { SidebarProvider, SidebarTrigger } from '@/mobile/components/ui/sidebar';
import { AppSidebar } from '@/mobile/components/AppSidebar';
import { ToolsNavigationFooter } from '@/mobile/components/ToolsNavigationFooter';
import { DailyTaskReportProvider, useDailyTaskReport } from '@/features/8-2-DailyTaskReport/context/ReportContext';
import { OverviewCards } from './components/OverviewCards';
import { PerformanceTable } from './components/PerformanceTable';
import { BlockersAndUpdatesPanel } from './components/BlockersAndUpdatesPanel';
import { Filters } from './components/Filters';
import { LoadingDots } from '@/components/LoadingDots';

const DailyTaskReportPage = () => {
  return (
    <DesktopWarning>
      <SidebarProvider>
        <DailyTaskReportProvider>
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />

            <main className="flex-1 bg-background overflow-x-hidden flex flex-col" style={{ height: '100vh' }}>
              <div className="sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="md:hidden" />
                  <div>
                    <h1 className="text-base font-semibold text-foreground">Daily Task Report</h1>
                    <p className="text-xs text-muted-foreground">Ringkasan performa dan progress tugas</p>
                  </div>
                </div>
                <div></div>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll" style={{ minHeight: 0 }}>
                <DailyTaskReportContent />
              </div>

              {/* Footer is fixed, so we keep the space */}
              <div className="flex-shrink-0" style={{ height: '80px' }}>
                <ToolsNavigationFooter />
              </div>
            </main>
          </div>
        </DailyTaskReportProvider>
      </SidebarProvider>
    </DesktopWarning>
  );
};

const DailyTaskReportContent = () => {
  const { loading } = useDailyTaskReport();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center space-y-3">
          <LoadingDots size="lg" />
          <p className="text-sm text-muted-foreground">Memuat laporan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 pb-24 space-y-3">
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <Filters />
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm">
        <OverviewCards />
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-2 md:p-3">
          <PerformanceTable />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm">
        <BlockersAndUpdatesPanel />
      </div>
    </div>
  );
};

export default DailyTaskReportPage;
