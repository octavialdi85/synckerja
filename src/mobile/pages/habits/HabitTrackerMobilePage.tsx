import React from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DesktopWarning } from '@/mobile/components/DesktopWarning';
import { SidebarProvider, SidebarTrigger } from '@/mobile/components/ui/sidebar';
import { AppSidebar } from '@/mobile/components/AppSidebar';
import { NavigationFooter } from '@/mobile/components/NavigationFooter';
import { useVisualViewport } from '@/mobile/hooks/useVisualViewport';
import { useStatusBarStyle } from '@/mobile/hooks/useStatusBarStyle';
import { HabitTrackerProvider } from '@/features/8-2-HabitTracker/context/HabitTrackerContext';
import { HabitFormModal } from '@/features/8-2-HabitTracker/components/HabitFormModal';
import { HabitTrackerMobileContent } from './section/HabitTrackerMobileContent';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { Button } from '@/features/ui/button';

const HabitTrackerMobilePage = () => {
  const navigate = useNavigate();
  useStatusBarStyle('light');
  const { height: viewportHeight, offsetTop: viewportOffsetTop } = useVisualViewport();
  const { t } = useAppTranslation();
  const [showAddModal, setShowAddModal] = React.useState(false);

  return (
    <DesktopWarning>
      <SidebarProvider>
        <HabitTrackerProvider>
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
                <div className="flex items-center gap-2 min-w-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0 md:hidden"
                    onClick={() => navigate('/')}
                    aria-label={t('common.backToHome', 'Kembali ke Home')}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <SidebarTrigger className="hidden md:flex" />
                  <div className="min-w-0">
                    <h1 className="text-base font-semibold text-foreground">{t('habitTracker.pageTitle', 'Habit Tracker')}</h1>
                    <p className="text-xs text-muted-foreground">{t('habitTracker.pageSubtitle', 'Kelola kebiasaan harian')}</p>
                  </div>
                </div>
              </header>

              <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
                <HabitTrackerMobileContent />
                <Button
                  aria-label={t('habitTracker.addHabit', 'Tambah habit')}
                  onClick={() => setShowAddModal(true)}
                  size="icon"
                  className="fixed right-4 z-40 h-14 w-14 rounded-full shadow-lg flex items-center justify-center p-0 safe-area-bottom"
                  style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}
                >
                  <span className="flex items-center justify-center w-full h-full" aria-hidden>
                    <Plus className="h-6 w-6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </span>
                </Button>
              </div>

              <NavigationFooter className="safe-area-bottom-lower" />
            </main>
          </div>
          <HabitFormModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
        </HabitTrackerProvider>
      </SidebarProvider>
    </DesktopWarning>
  );
};

export default HabitTrackerMobilePage;
