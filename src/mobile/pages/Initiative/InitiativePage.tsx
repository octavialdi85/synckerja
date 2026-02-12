import React, { useState } from 'react';
import { DesktopWarning } from '@/mobile/components/DesktopWarning';
import { SidebarProvider, SidebarTrigger } from '@/mobile/components/ui/sidebar';
import { AppSidebar } from '@/mobile/components/AppSidebar';
import { ToolsNavigationFooter } from '@/mobile/components/ToolsNavigationFooter';
import MobileTaskInitiative, { InitiativeStats } from './section/MobileTaskInitiative';
import { TaskInitiativeFooter } from '@/features/8-2-DailyTask/section/TaskInitiativeFooter';
import { DailyTaskProvider, useDailyTask } from '@/features/8-2-DailyTask/DailyTaskContext';
import { MeetingNotesProvider } from '@/features/8-1-meeting-notes/MeetingNotesContext';
import { LoadingDots } from '@/components/LoadingDots';

const InitiativePage = () => {
  return (
    <DesktopWarning>
      <SidebarProvider>
        <MeetingNotesProvider>
          <DailyTaskProvider>
            <div className="min-h-screen flex w-full bg-background">
              <AppSidebar />

              <main className="flex-1 bg-background overflow-x-hidden flex flex-col" style={{ height: '100vh' }}>
                <div className="sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger className="md:hidden" />
                    <div>
                      <h1 className="text-base font-semibold text-foreground">Initiative</h1>
                      <p className="text-xs text-muted-foreground">Track initiative progress</p>
                    </div>
                  </div>
                  <div></div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll" style={{ minHeight: 0 }}>
                  <InitiativeContent />
                </div>

                {/* Footer is fixed, so we don't need to render it here, but we keep the space */}
                <div className="flex-shrink-0" style={{ height: '80px' }}>
                  <ToolsNavigationFooter />
                </div>
              </main>
            </div>
          </DailyTaskProvider>
        </MeetingNotesProvider>
      </SidebarProvider>
    </DesktopWarning>
  );
};

const InitiativeContent = () => {
  const { isLoading } = useDailyTask();
  const [initiativeStats, setInitiativeStats] = useState<InitiativeStats>({ totalItems: 0, unassignedItems: 0 });

  // Show loading state while initial data is being fetched
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

