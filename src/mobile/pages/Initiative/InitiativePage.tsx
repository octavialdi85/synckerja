import React, { useState, useEffect } from 'react';
import { DesktopWarning } from '@/mobile/components/DesktopWarning';
import { SidebarProvider, SidebarTrigger } from '@/mobile/components/ui/sidebar';
import { AppSidebar } from '@/mobile/components/AppSidebar';
import { ToolsNavigationFooter } from '@/mobile/components/ToolsNavigationFooter';
import { useVisualViewport } from '@/mobile/hooks/useVisualViewport';
import MobileTaskInitiative, { InitiativeStats } from './section/MobileTaskInitiative';
import { TaskInitiativeFooter } from '@/features/8-2-DailyTask/section/TaskInitiativeFooter';
import { DailyTaskProvider, useDailyTask } from '@/features/8-2-DailyTask/DailyTaskContext';
import { MeetingNotesProvider } from '@/features/8-1-meeting-notes/MeetingNotesContext';
import { LoadingDots } from '@/components/LoadingDots';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

/** Waits for org to be synced from DB before rendering DailyTaskProvider, so no task data is fetched with cached org. */
const InitiativeOrgSyncGate = () => {
  const { refetch } = useCurrentOrg();
  const [synced, setSynced] = useState(false);
  const { height: viewportHeight, offsetTop: viewportOffsetTop } = useVisualViewport();
  useEffect(() => {
    refetch().then(() => setSynced(true));
  }, [refetch]);
  if (!synced) {
    return (
      <div className="min-h-screen flex w-full bg-background items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingDots size="lg" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DailyTaskProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        {/* Same structure as Home/Daily Task/LiveChat: fixed viewport container, header (safe-area-top), scrollable content, footer (safe-area-bottom-lower) */}
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
                <h1 className="text-base font-semibold text-foreground">Initiative</h1>
                <p className="text-xs text-muted-foreground">Track initiative progress</p>
              </div>
            </div>
            <div></div>
          </header>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll min-h-0">
              <InitiativeContent />
            </div>
          </div>

          <div className="flex-shrink-0" style={{ height: '80px' }} aria-hidden />
          <ToolsNavigationFooter className="safe-area-bottom-lower" />
        </main>
      </div>
    </DailyTaskProvider>
  );
};

const InitiativePage = () => {
  return (
    <DesktopWarning>
      <SidebarProvider>
        <MeetingNotesProvider>
          <InitiativeOrgSyncGate />
        </MeetingNotesProvider>
      </SidebarProvider>
    </DesktopWarning>
  );
};

const InitiativeContent = () => {
  const { isLoading } = useDailyTask();
  const [initiativeStats, setInitiativeStats] = useState<InitiativeStats>({ totalItems: 0, unassignedItems: 0 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 h-full">
        <div className="flex flex-col items-center space-y-3">
          <LoadingDots size="lg" />
          <p className="text-sm text-muted-foreground">Loading page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 pb-24">
      <MobileTaskInitiative onStatsChange={setInitiativeStats} />
    </div>
  );
};

export default InitiativePage;

