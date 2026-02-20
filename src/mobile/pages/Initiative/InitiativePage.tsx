import React, { useState } from 'react';
import { DesktopWarning } from '@/mobile/components/DesktopWarning';
import { SidebarProvider, SidebarTrigger } from '@/mobile/components/ui/sidebar';
import { AppSidebar } from '@/mobile/components/AppSidebar';
import { ToolsNavigationFooter } from '@/mobile/components/ToolsNavigationFooter';
import { useVisualViewport } from '@/mobile/hooks/useVisualViewport';
import { useStatusBarStyle } from '@/mobile/hooks/useStatusBarStyle';
import MobileTaskInitiative, { InitiativeStats } from './section/MobileTaskInitiative';
import { DailyTaskProvider } from '@/features/8-2-DailyTask/DailyTaskContext';
import { MeetingNotesProvider } from '@/features/8-1-meeting-notes/MeetingNotesContext';
import { InitiativePageSkeleton } from './InitiativePageSkeleton';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

/** Layout per .cursor/rules/mobile-tools-layout-android.mdc */
const InitiativeLayout = ({ children }: { children?: React.ReactNode }) => {
  useStatusBarStyle('light');
  const { height: viewportHeight, offsetTop: viewportOffsetTop } = useVisualViewport();
  const { t } = useAppTranslation();

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />

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
              <h1 className="text-base font-semibold text-foreground">{t('initiative.page.title', 'Initiative')}</h1>
              <p className="text-xs text-muted-foreground">{t('initiative.page.subtitle', 'Track initiative progress')}</p>
            </div>
          </div>
          <div></div>
        </header>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll min-h-0 flex flex-col">
            <div className="mx-auto w-full max-w-md px-2 pt-2 content-padding-above-nav-default space-y-1">
              {children ?? <InitiativeContent />}
            </div>
          </div>
        </div>

        <ToolsNavigationFooter className="safe-area-bottom-lower" />
      </main>
    </div>
  );
};

const InitiativePage = () => {
  return (
    <DesktopWarning>
      <SidebarProvider>
        <MeetingNotesProvider>
          <DailyTaskProvider>
            <InitiativeLayout />
          </DailyTaskProvider>
        </MeetingNotesProvider>
      </SidebarProvider>
    </DesktopWarning>
  );
};

const InitiativeContent = () => {
  const [initiativeStats, setInitiativeStats] = useState<InitiativeStats>({ totalItems: 0, unassignedItems: 0 });
  const [childLoading, setChildLoading] = useState(true);

  /* Always mount MobileTaskInitiative so it can run fetch and call onLoadingChange(false). Show skeleton until then. Parent provides single container per rule. */
  return (
    <>
      {childLoading && <InitiativePageSkeleton />}
      <div className="flex flex-col" style={childLoading ? { display: 'none' } : undefined}>
        <MobileTaskInitiative onStatsChange={setInitiativeStats} onLoadingChange={setChildLoading} />
      </div>
    </>
  );
};

export default InitiativePage;

