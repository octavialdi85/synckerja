import React from 'react';
import { DesktopWarning } from '@/mobile/components/DesktopWarning';
import { SidebarProvider, SidebarTrigger } from '@/mobile/components/ui/sidebar';
import { AppSidebar } from '@/mobile/components/AppSidebar';
import { ToolsNavigationFooter } from '@/mobile/components/ToolsNavigationFooter';
import { useVisualViewport } from '@/mobile/hooks/useVisualViewport';
import { useStatusBarStyle } from '@/mobile/hooks/useStatusBarStyle';
import { DailyTaskReportProvider, useDailyTaskReport } from '@/features/8-2-DailyTaskReport/context/ReportContext';
import { OverviewCards } from './components/OverviewCards';
import { PerformanceTable } from './components/PerformanceTable';
import { BlockersAndUpdatesPanel } from './components/BlockersAndUpdatesPanel';
import { Filters } from './components/Filters';
import { DailyTaskReportPageSkeleton } from './DailyTaskReportPageSkeleton';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

const DailyTaskReportPage = () => {
  useStatusBarStyle('light');
  const { height: viewportHeight, offsetTop: viewportOffsetTop } = useVisualViewport();
  const { t } = useAppTranslation();

  return (
    <DesktopWarning>
      <SidebarProvider>
        <DailyTaskReportProvider>
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />

            {/* Layout per .cursor/rules/mobile-tools-layout-android.mdc */}
            <main
              className="flex flex-col bg-background fixed inset-x-0 z-0"
              style={{
                top: viewportOffsetTop,
                height: viewportHeight > 0 ? viewportHeight : undefined,
                minHeight: viewportHeight > 0 ? undefined : '100dvh',
              }}
            >
              <header className="flex-shrink-0 sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border safe-area-top">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="md:hidden" />
                  <div>
                    <h1 className="text-base font-semibold text-foreground">{t('dailyTaskReport.page.title', 'Daily Task Report')}</h1>
                    <p className="text-xs text-muted-foreground">{t('dailyTaskReport.page.subtitle', 'Ringkasan performa dan progress tugas')}</p>
                  </div>
                </div>
                <div></div>
              </header>

              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll min-h-0 flex flex-col">
                  <div className="mx-auto w-full max-w-md px-2 pt-2 content-padding-above-nav-daily-task-report space-y-1">
                    <DailyTaskReportContent />
                  </div>
                </div>
              </div>

              <ToolsNavigationFooter className="safe-area-bottom-lower" />
            </main>
          </div>
        </DailyTaskReportProvider>
      </SidebarProvider>
    </DesktopWarning>
  );
};

const DailyTaskReportContentInner = () => {
  const { loading } = useDailyTaskReport();

  if (loading) {
    return <DailyTaskReportPageSkeleton />;
  }

  return (
    <>
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <Filters />
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm">
        <OverviewCards />
      </div>

      <PerformanceTable />

      <div className="bg-card border border-border rounded-lg shadow-sm">
        <BlockersAndUpdatesPanel />
      </div>
    </>
  );
};

const DailyTaskReportContent = React.memo(DailyTaskReportContentInner);

export default DailyTaskReportPage;
