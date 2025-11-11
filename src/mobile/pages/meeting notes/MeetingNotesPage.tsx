import React from 'react';
import { DesktopWarning } from '@/mobile/components/DesktopWarning';
import { SidebarProvider, SidebarTrigger } from '@/mobile/components/ui/sidebar';
import { AppSidebar } from '@/mobile/components/AppSidebar';
import { ToolsNavigationFooter } from '@/mobile/components/ToolsNavigationFooter';
import { MeetingNotesProvider, useMeetingNotes } from '@/features/8-1-meeting-notes/MeetingNotesContext';
import { LoadingDots } from '@/components/LoadingDots';
import { MeetingNotesContent } from './section/MeetingNotesContent';

const MeetingNotesPage = () => {
  return (
    <DesktopWarning>
      <SidebarProvider>
        <MeetingNotesProvider>
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />

            <main className="flex-1 bg-background overflow-x-hidden flex flex-col" style={{ height: '100vh' }}>
              <div className="sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="md:hidden" />
                  <div>
                    <h1 className="text-base font-semibold text-foreground">Meeting Notes</h1>
                    <p className="text-xs text-muted-foreground">Catat dan tindak lanjuti poin rapat</p>
                  </div>
                </div>
                <div></div>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll" style={{ minHeight: 0 }}>
                <MeetingNotesContent />
              </div>

              {/* Footer is fixed, so we don't need to render it here, but we keep the space */}
              <div className="flex-shrink-0" style={{ height: '80px' }}>
                <ToolsNavigationFooter />
              </div>
            </main>
          </div>
        </MeetingNotesProvider>
      </SidebarProvider>
    </DesktopWarning>
  );
};

export default MeetingNotesPage;
