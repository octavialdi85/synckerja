import React from 'react';
import { DesktopWarning } from '@/mobile/components/DesktopWarning';
import { SidebarProvider, SidebarTrigger } from '@/mobile/components/ui/sidebar';
import { AppSidebar } from '@/mobile/components/AppSidebar';
import { ToolsNavigationFooter } from '@/mobile/components/ToolsNavigationFooter';
import {
  MeetingFilters,
  MeetingNotesInput,
  MeetingPointsTable,
  MeetingSummaryCards,
  MeetingTableFooter,
} from '@/features/8-1-meeting-notes/section';
import { MeetingNotesProvider, useMeetingNotes } from '@/features/8-1-meeting-notes/MeetingNotesContext';
import { LoadingDots } from '@/components/LoadingDots';
import { useIsMobile } from '@/mobile/hooks/use-mobile';

const MeetingNotesPage = () => {
  return (
    <DesktopWarning>
      <SidebarProvider>
        <MeetingNotesProvider>
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />

            <main className="flex-1 bg-background pb-20">
              <div className="sticky top-0 z-30 flex items-center gap-3 p-3 bg-card border-b border-border">
                <SidebarTrigger className="md:hidden" />
                <div>
                  <h1 className="text-base font-semibold text-foreground">Meeting Notes</h1>
                  <p className="text-xs text-muted-foreground">Catat dan tindak lanjuti poin rapat</p>
                </div>
              </div>

              <MeetingNotesContent />

              <ToolsNavigationFooter />
            </main>
          </div>
        </MeetingNotesProvider>
      </SidebarProvider>
    </DesktopWarning>
  );
};

const MeetingNotesContent = () => {
  const { meetingPoints, filters, isLoading } = useMeetingNotes();
  const isMobile = useIsMobile();
  const listHeightClass = isMobile ? 'max-h-[calc(100vh-420px)]' : 'max-h-[calc(100vh-460px)]';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center space-y-3">
          <LoadingDots size="lg" />
          <p className="text-sm text-muted-foreground">Memuat meeting notes...</p>
        </div>
      </div>
    );
  }

  const filteredPoints = meetingPoints.filter(point => {
    if (filters.search && !point.discussion_point.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.status && point.status !== filters.status) {
      return false;
    }
    if (filters.requestBy && point.request_by !== filters.requestBy) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-3 pb-24 space-y-3">
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-border">
          <MeetingFilters />
        </div>

        <div className="px-3 py-2 border-b border-border">
          <MeetingNotesInput />
        </div>

        <div className={`overflow-y-auto seamless-scroll px-3 py-3 ${listHeightClass}`}>
          <MeetingPointsTable />
        </div>

        <div className="border-t border-border">
          <MeetingTableFooter totalMeetingPoints={meetingPoints.length} filteredPoints={filteredPoints.length} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="px-3 py-3">
          <MeetingSummaryCards />
        </div>
      </div>
    </div>
  );
};

export default MeetingNotesPage;

