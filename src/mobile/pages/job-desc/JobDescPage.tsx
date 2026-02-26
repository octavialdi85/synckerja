import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { SidebarTrigger } from '@/mobile/components/ui/sidebar';
import { Button } from '@/features/ui/button';
import { useStatusBarStyle } from '@/mobile/hooks/useStatusBarStyle';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { JobDescTracker } from './section';
import { useNotificationBadgeCount } from '@/mobile/hooks/useNotificationBadgeCount';
import { NotificationsModal } from '@/mobile/components/NotificationsModal';

export function JobDescPage() {
  useStatusBarStyle('light');
  const { t } = useAppTranslation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { totalCount: notificationBadgeCount } = useNotificationBadgeCount();

  return (
    <>
      <header className="flex-shrink-0 sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border safe-area-top">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="text-base font-semibold text-foreground">
              {t('jobDesc.page.title', 'Job Desc')}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t('jobDesc.page.subtitle', 'See active workload per employee')}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 relative"
            aria-label={t('mobileHome.notificationsTitle', 'Notifikasi')}
            onClick={() => setNotificationsOpen(true)}
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {notificationBadgeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium px-1">
                {notificationBadgeCount > 99 ? '99+' : notificationBadgeCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      <NotificationsModal open={notificationsOpen} onOpenChange={setNotificationsOpen} initialTab="tasks" />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="mx-auto w-full max-w-md px-2 pt-2 flex-1 min-h-0 flex flex-col">
            <JobDescTracker />
          </div>
        </div>
      </div>
    </>
  );
}
