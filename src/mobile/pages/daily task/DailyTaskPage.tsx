import React from 'react';
import { DesktopWarning } from '@/mobile/components/DesktopWarning';
import { SidebarProvider, SidebarTrigger } from '@/mobile/components/ui/sidebar';
import { AppSidebar } from '@/mobile/components/AppSidebar';
import { ToolsNavigationFooter } from '@/mobile/components/ToolsNavigationFooter';
import { TaskList } from './section/TaskList';
import { DailyTaskProvider, useDailyTask } from '@/features/8-2-DailyTask/DailyTaskContext';
import { MeetingNotesProvider } from '@/features/8-1-meeting-notes/MeetingNotesContext';
import { LoadingDots } from '@/components/LoadingDots';

const DailyTaskPage = () => {
  return (
    <DesktopWarning>
      <SidebarProvider>
        <MeetingNotesProvider>
          <DailyTaskProvider>
            <div className="min-h-screen flex w-full bg-background">
              <AppSidebar />

              <main className="flex min-h-screen flex-1 flex-col bg-background pb-20 overflow-x-hidden">
                <div className="sticky top-0 z-30 border-b border-border bg-card">
                  <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <SidebarTrigger className="md:hidden" />
                      <div>
                        <h1 className="text-base font-semibold text-foreground">Daily Task</h1>
                        <p className="text-xs text-muted-foreground">Kelola tugas harian Anda di sini</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 min-h-0">
                  <div className="flex flex-1 flex-col min-h-0 rounded-xl bg-card/0 shadow-none">
                    <div className="flex-1 overflow-y-auto py-4 seamless-scroll max-h-[calc(100vh-120px)]">
                      <DailyTaskContent />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border bg-card">
                  <div className="mx-auto w-full max-w-md">
                    <ToolsNavigationFooter />
                  </div>
                </div>
              </main>
            </div>
          </DailyTaskProvider>
        </MeetingNotesProvider>
      </SidebarProvider>
    </DesktopWarning>
  );
};

const DailyTaskContent = () => {
  const { isLoading } = useDailyTask();

  // Show loading state while initial data is being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center space-y-3">
          <LoadingDots size="lg" />
          <p className="text-sm text-muted-foreground">Memuat halaman...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <TaskList />
    </div>
  );
};

export default DailyTaskPage;
